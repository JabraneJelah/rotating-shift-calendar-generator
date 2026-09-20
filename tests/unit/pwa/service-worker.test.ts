// @vitest-environment node

// @ts-expect-error The service-worker generator is intentionally Node-native ESM.
const buildLibrary = await import("../../../scripts/pwa/pwa-build-lib.mjs");
const { injectRelease, sha256 } = buildLibrary;
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

import { beforeEach, describe, expect, it, vi } from "vitest";

const origin = "https://shift-calendar.test";

class FakeCache {
  readonly values = new Map<string, Response>();

  key(value: string | Request): string {
    const url = typeof value === "string" ? value : value.url;
    return new URL(url, origin).pathname;
  }

  async put(value: string | Request, response: Response) {
    this.values.set(this.key(value), response.clone());
  }

  async match(value: string | Request) {
    return this.values.get(this.key(value))?.clone();
  }

  async keys() {
    return [...this.values.keys()].map((key) => ({ url: `${origin}${key}` }));
  }
}

class FakeCaches {
  readonly stores = new Map<string, FakeCache>();

  async open(name: string) {
    let cache = this.stores.get(name);
    if (cache === undefined) {
      cache = new FakeCache();
      this.stores.set(name, cache);
    }
    return cache;
  }

  async delete(name: string) {
    return this.stores.delete(name);
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async match(value: string | Request, options?: { cacheName?: string }) {
    if (options?.cacheName !== undefined) {
      return this.stores.get(options.cacheName)?.match(value);
    }
    for (const cache of this.stores.values()) {
      const response = await cache.match(value);
      if (response !== undefined) return response;
    }
    return undefined;
  }
}

type WorkerListeners = Record<string, (event: Record<string, unknown>) => void>;

async function createHarness(options?: { failUrl?: string }) {
  const rootBody = Buffer.from("<!doctype html><title>Shift Calendar</title>");
  const offlineBody = Buffer.from("<!doctype html><title>Offline</title>");
  const aboutBody = Buffer.from("<!doctype html><title>About</title>");
  const assetBody = Buffer.from("console.log('asset');");
  const entries = [
    {
      url: "/",
      revision: sha256(rootBody),
      size: rootBody.byteLength,
      gzipSize: 1,
      brotliSize: 1,
      contentType: "text/html",
      kind: "document",
    },
    {
      url: "/offline",
      revision: sha256(offlineBody),
      size: offlineBody.byteLength,
      gzipSize: 1,
      brotliSize: 1,
      contentType: "text/html",
      kind: "document",
    },
    {
      url: "/about",
      revision: sha256(aboutBody),
      size: aboutBody.byteLength,
      gzipSize: 1,
      brotliSize: 1,
      contentType: "text/html",
      kind: "document",
    },
    {
      url: "/asset.js",
      revision: sha256(assetBody),
      size: assetBody.byteLength,
      gzipSize: 1,
      brotliSize: 1,
      contentType: "text/javascript",
      kind: "static",
    },
  ];
  const template = await readFile(
    path.join(process.cwd(), "src", "pwa", "service-worker-template.js"),
    "utf8",
  );
  const source = injectRelease(template, {
    releaseId: "test-release",
    ianaVersion: "2026d",
    documentUrls: ["/", "/about", "/offline"],
    entries,
  });
  const listeners: WorkerListeners = {};
  const caches = new FakeCaches();
  const skipWaiting = vi.fn(async () => undefined);
  const postMessage = vi.fn();
  const client = { url: `${origin}/`, postMessage };
  const self = {
    location: { origin },
    clients: {
      matchAll: vi.fn(async () => [client]),
    },
    skipWaiting,
    addEventListener(type: string, listener: WorkerListeners[string]) {
      listeners[type] = listener;
    },
  };
  const bodies = new Map([
    ["/", rootBody],
    ["/offline", offlineBody],
    ["/about", aboutBody],
    ["/asset.js", assetBody],
  ]);
  const fetch = vi.fn(async (request: Request | { url: string }) => {
    const pathname = new URL(request.url).pathname;
    if (options?.failUrl === pathname) throw new Error("offline");
    const body = bodies.get(pathname);
    if (body === undefined) return new Response("missing", { status: 404 });
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": pathname.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "text/html; charset=utf-8",
      },
    });
  });
  vm.runInNewContext(source, {
    self,
    caches,
    fetch,
    Request,
    Response,
    Headers,
    URL,
    Map,
    Set,
    Object,
    Promise,
    Error,
    Uint8Array,
    crypto: webcrypto,
  });
  return { listeners, caches, fetch, skipWaiting, postMessage, client };
}

async function dispatchExtendable(
  listener: WorkerListeners[string],
  values: Record<string, unknown> = {},
) {
  let pending: Promise<unknown> | undefined;
  listener({
    ...values,
    waitUntil(value: Promise<unknown>) {
      pending = value;
    },
  });
  await pending;
}

describe("application-owned service worker", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("installs into a temporary cache and promotes atomically", async () => {
    const harness = await createHarness();
    await dispatchExtendable(harness.listeners.install);
    expect(await harness.caches.keys()).toEqual([
      "shift-calendar-temp-test-release",
    ]);
    await dispatchExtendable(harness.listeners.activate);
    expect(await harness.caches.keys()).toEqual([
      "shift-calendar-precache-test-release",
    ]);
    expect(
      await harness.caches.stores
        .get("shift-calendar-precache-test-release")
        ?.match("/"),
    ).toBeInstanceOf(Response);
  });

  it("deletes an incomplete temporary cache and leaves no active release", async () => {
    const harness = await createHarness({ failUrl: "/offline" });
    await expect(dispatchExtendable(harness.listeners.install)).rejects.toThrow(
      "offline",
    );
    expect(await harness.caches.keys()).toEqual([]);
  });

  it("normalizes homepage queries and uses the dedicated unknown fallback", async () => {
    const harness = await createHarness();
    await dispatchExtendable(harness.listeners.install);
    await dispatchExtendable(harness.listeners.activate);
    harness.fetch.mockRejectedValue(new Error("offline"));

    let response: Promise<Response> | undefined;
    harness.listeners.fetch({
      request: {
        method: "GET",
        headers: new Headers(),
        mode: "navigate",
        destination: "document",
        url: `${origin}/?v=1&kind=preset`,
      },
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    expect(await (await response)?.text()).toContain("Shift Calendar");

    harness.listeners.fetch({
      request: {
        method: "GET",
        headers: new Headers(),
        mode: "navigate",
        destination: "document",
        url: `${origin}/unknown`,
      },
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    const fallback = await response;
    expect(fallback?.status).toBe(503);
    expect(await fallback?.text()).toContain("Offline");
  });

  it("bypasses cross-origin and non-GET requests", async () => {
    const harness = await createHarness();
    const respondWith = vi.fn();
    harness.listeners.fetch({
      request: {
        method: "POST",
        headers: new Headers(),
        mode: "same-origin",
        destination: "",
        url: `${origin}/api`,
      },
      respondWith,
    });
    harness.listeners.fetch({
      request: {
        method: "GET",
        headers: new Headers(),
        mode: "cors",
        destination: "script",
        url: "https://example.com/external.js",
      },
      respondWith,
    });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it("serves approved documents and queryless static assets from cache only", async () => {
    const harness = await createHarness();
    await dispatchExtendable(harness.listeners.install);
    await dispatchExtendable(harness.listeners.activate);
    harness.fetch.mockRejectedValue(new Error("offline"));

    let response: Promise<Response> | undefined;
    harness.listeners.fetch({
      request: {
        method: "GET",
        headers: new Headers(),
        mode: "navigate",
        destination: "document",
        url: `${origin}/about`,
      },
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    expect(await (await response)?.text()).toContain("About");

    harness.listeners.fetch({
      request: {
        method: "GET",
        headers: new Headers(),
        mode: "same-origin",
        destination: "script",
        url: `${origin}/asset.js`,
      },
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    expect(await (await response)?.text()).toContain("asset");
  });

  it("does not intercept ranges, URL queries, downloads, blobs or unknown assets", async () => {
    const harness = await createHarness();
    const requests = [
      {
        method: "GET",
        headers: new Headers({ range: "bytes=0-1" }),
        mode: "same-origin",
        destination: "script",
        url: `${origin}/asset.js`,
      },
      {
        method: "GET",
        headers: new Headers(),
        mode: "same-origin",
        destination: "script",
        url: `${origin}/asset.js?private=value`,
      },
      {
        method: "GET",
        headers: new Headers(),
        mode: "same-origin",
        destination: "",
        url: `${origin}/planner-backup.json`,
      },
      {
        method: "GET",
        headers: new Headers(),
        mode: "same-origin",
        destination: "",
        url: `${origin}/calendar.ics`,
      },
      {
        method: "GET",
        headers: new Headers(),
        mode: "same-origin",
        destination: "",
        url: `blob:${origin}/private-download`,
      },
    ];
    for (const request of requests) {
      const respondWith = vi.fn();
      harness.listeners.fetch({ request, respondWith });
      expect(respondWith).not.toHaveBeenCalled();
    }
  });

  it("rejects partial activation and retains only two application generations", async () => {
    const partial = await createHarness();
    await expect(
      dispatchExtendable(partial.listeners.activate),
    ).rejects.toThrow("unavailable");
    expect(await partial.caches.keys()).toEqual([]);

    const harness = await createHarness();
    await harness.caches.open("unrelated-cache");
    await harness.caches.open("shift-calendar-precache-old-a");
    await harness.caches.open("shift-calendar-precache-old-b");
    await harness.caches.open("shift-calendar-temp-abandoned");
    await dispatchExtendable(harness.listeners.install);
    await dispatchExtendable(harness.listeners.activate);
    expect(await harness.caches.keys()).toEqual([
      "unrelated-cache",
      "shift-calendar-precache-old-b",
      "shift-calendar-precache-test-release",
    ]);
  });

  it("reports release and controlled-client count only to same-origin clients", async () => {
    const harness = await createHarness();
    harness.listeners.message({
      source: harness.client,
      data: { type: "GET_RELEASE", requestId: "release-request" },
      waitUntil: vi.fn(),
    });
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: "RELEASE_INFO",
      requestId: "release-request",
      releaseId: "test-release",
    });

    await dispatchExtendable(harness.listeners.message, {
      source: harness.client,
      data: { type: "QUERY_CLIENTS", requestId: "clients-request" },
    });
    expect(harness.postMessage).toHaveBeenCalledWith({
      type: "CLIENT_COUNT",
      requestId: "clients-request",
      releaseId: "test-release",
      count: 1,
    });

    harness.postMessage.mockClear();
    harness.listeners.message({
      source: { url: "https://example.com/", postMessage: harness.postMessage },
      data: { type: "GET_RELEASE", requestId: "external" },
      waitUntil: vi.fn(),
    });
    expect(harness.postMessage).not.toHaveBeenCalled();
  });

  it("accepts only the exact release activation message", async () => {
    const harness = await createHarness();
    harness.listeners.message({
      source: harness.client,
      data: {
        type: "ACTIVATE_UPDATE",
        releaseId: "test-release",
        extra: true,
      },
      waitUntil: vi.fn(),
    });
    expect(harness.skipWaiting).not.toHaveBeenCalled();

    await dispatchExtendable(harness.listeners.message, {
      source: harness.client,
      data: { type: "ACTIVATE_UPDATE", releaseId: "test-release" },
    });
    expect(harness.skipWaiting).toHaveBeenCalledOnce();
  });
});
