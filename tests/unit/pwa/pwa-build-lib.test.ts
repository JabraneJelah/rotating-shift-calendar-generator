// @vitest-environment node

// The production generator is native ESM JavaScript executed directly by Node 24.
// @ts-expect-error It intentionally has no application TypeScript declaration surface.
const buildLibrary = await import("../../../scripts/pwa/pwa-build-lib.mjs");
const {
  createManifestEntry,
  discoverTimezoneGraph,
  extractStaticAssetUrls,
  injectRelease,
  releaseIdentity,
  validateManifestEntries,
} = buildLibrary;
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const generousLimits = {
  maximumEntries: 10,
  maximumRawBytes: 10_000,
  maximumGzipBytes: 10_000,
  maximumAssetBytes: 10_000,
};

describe("PWA build generator", () => {
  it("extracts unique stable static references", () => {
    expect(
      extractStaticAssetUrls(
        '<script src="/_next/static/z.js"></script><link href="/_next/static/a.css"><script src="/_next/static/z.js"></script>',
      ),
    ).toEqual(["/_next/static/a.css", "/_next/static/z.js"]);
  });

  it("stable-sorts entries and derives content identities", () => {
    const right = createManifestEntry({
      url: "/b.js",
      bytes: new TextEncoder().encode("right"),
      kind: "static",
    });
    const left = createManifestEntry({
      url: "/a.js",
      bytes: new TextEncoder().encode("left"),
      kind: "static",
    });
    const ordered = validateManifestEntries([right, left], generousLimits);
    expect(ordered.map(({ url }: { url: string }) => url)).toEqual([
      "/a.js",
      "/b.js",
    ]);
    expect(releaseIdentity(ordered)).toHaveLength(24);
    expect(releaseIdentity(ordered)).toBe(releaseIdentity([...ordered]));
  });

  it("rejects duplicate and conflicting URLs", () => {
    const first = createManifestEntry({
      url: "/a.js",
      bytes: new TextEncoder().encode("one"),
      kind: "static",
    });
    const second = createManifestEntry({
      url: "/a.js",
      bytes: new TextEncoder().encode("two"),
      kind: "static",
    });
    expect(() =>
      validateManifestEntries([first, first], generousLimits),
    ).toThrow("Duplicate precache URL");
    expect(() =>
      validateManifestEntries([first, second], generousLimits),
    ).toThrow("Conflicting precache revisions");
  });

  it.each([
    ["entry count", { ...generousLimits, maximumEntries: 1 }],
    ["raw total", { ...generousLimits, maximumRawBytes: 5 }],
    ["gzip total", { ...generousLimits, maximumGzipBytes: 1 }],
    ["individual size", { ...generousLimits, maximumAssetBytes: 3 }],
  ])("fails the %s budget", (_label, limits) => {
    const entries = [
      createManifestEntry({
        url: "/a.js",
        bytes: new TextEncoder().encode("one-one"),
        kind: "static",
      }),
      createManifestEntry({
        url: "/b.js",
        bytes: new TextEncoder().encode("two-two"),
        kind: "static",
      }),
    ];
    expect(() => validateManifestEntries(entries, limits)).toThrow();
  });

  it("discovers one lazy 2026d timezone chunk and rejects stale data", async () => {
    const root = path.join(
      tmpdir(),
      `shift-calendar-pwa-${crypto.randomUUID()}`,
    );
    const chunks = path.join(root, "chunks");
    await mkdir(chunks, { recursive: true });
    await writeFile(path.join(chunks, "root.js"), 'import("timezone.js")');
    await writeFile(
      path.join(chunks, "timezone.js"),
      "TzDatabase direct pinned 2026d",
    );
    const graph = await discoverTimezoneGraph({
      staticRoot: root,
      initialAssetUrls: ["/_next/static/chunks/root.js"],
    });
    expect(graph.url).toBe("/_next/static/chunks/timezone.js");
    expect(graph.referrer).toBe("/_next/static/chunks/root.js");

    await writeFile(path.join(chunks, "stale.js"), "nested 2026b");
    await expect(
      discoverTimezoneGraph({
        staticRoot: root,
        initialAssetUrls: ["/_next/static/chunks/root.js"],
      }),
    ).rejects.toThrow("Stale IANA 2026b");
  });

  it("injects exactly one deterministic worker release", () => {
    const entry = createManifestEntry({
      url: "/a.js",
      bytes: new TextEncoder().encode("asset"),
      kind: "static",
    });
    const release = {
      releaseId: "release-id",
      ianaVersion: "2026d",
      documentUrls: ["/"],
      entries: [entry],
    };
    const first = injectRelease(
      "/*__SHIFT_CALENDAR_GENERATED__*/\nself.value = RELEASE;",
      release,
    );
    const second = injectRelease(
      "/*__SHIFT_CALENDAR_GENERATED__*/\nself.value = RELEASE;",
      release,
    );
    expect(first).toBe(second);
    expect(first).toContain('"releaseId":"release-id"');
    expect(first).not.toContain("SHIFT_CALENDAR_GENERATED");
  });
});
