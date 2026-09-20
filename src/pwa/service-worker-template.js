/*__SHIFT_CALENDAR_GENERATED__*/

const CACHE_PREFIX = "shift-calendar-";
const PRECACHE_PREFIX = `${CACHE_PREFIX}precache-`;
const TEMP_PREFIX = `${CACHE_PREFIX}temp-`;
const PRECACHE_NAME = `${PRECACHE_PREFIX}${RELEASE.releaseId}`;
const TEMP_CACHE_NAME = `${TEMP_PREFIX}${RELEASE.releaseId}`;
const OFFLINE_URL = "/offline";
const ROOT_URL = "/";
const MANIFEST_BY_URL = new Map(
  RELEASE.entries.map((entry) => [entry.url, entry]),
);
const PRECACHE_URLS = new Set(RELEASE.entries.map((entry) => entry.url));
const DOCUMENT_URLS = new Set(RELEASE.documentUrls);

function exactKeys(value, keys) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function sameOriginClient(source) {
  if (source === null || typeof source.url !== "string") return false;
  try {
    return new URL(source.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function verifiedResponse(entry) {
  const request = new Request(new URL(entry.url, self.location.origin), {
    cache: "reload",
    credentials: "same-origin",
    redirect: "error",
  });
  const response = await fetch(request);
  if (!response.ok || response.type === "opaque" || response.redirected) {
    throw new Error("Required application asset was unavailable.");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith(entry.contentType)) {
    throw new Error("Required application asset had an unexpected type.");
  }
  const body = await response.arrayBuffer();
  if (body.byteLength !== entry.size) {
    throw new Error("Required application asset had an unexpected size.");
  }
  const revision = bytesToHex(await crypto.subtle.digest("SHA-256", body));
  if (revision !== entry.revision) {
    throw new Error("Required application asset failed validation.");
  }
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("vary");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function installRelease() {
  await caches.delete(TEMP_CACHE_NAME);
  const cache = await caches.open(TEMP_CACHE_NAME);
  try {
    for (const entry of RELEASE.entries) {
      await cache.put(entry.url, await verifiedResponse(entry));
    }
    const keys = await cache.keys();
    if (keys.length !== RELEASE.entries.length) {
      throw new Error("The application cache is incomplete.");
    }
  } catch (error) {
    await caches.delete(TEMP_CACHE_NAME);
    throw error;
  }
}

async function promoteRelease() {
  const temporary = await caches.open(TEMP_CACHE_NAME);
  const temporaryKeys = await temporary.keys();
  if (temporaryKeys.length !== RELEASE.entries.length) {
    await caches.delete(TEMP_CACHE_NAME);
    throw new Error("The verified application cache is unavailable.");
  }

  await caches.delete(PRECACHE_NAME);
  const precache = await caches.open(PRECACHE_NAME);
  try {
    for (const entry of RELEASE.entries) {
      const response = await temporary.match(entry.url);
      if (response === undefined) {
        throw new Error("A verified application asset is missing.");
      }
      await precache.put(entry.url, response);
    }
  } catch (error) {
    await caches.delete(PRECACHE_NAME);
    throw error;
  }
  await caches.delete(TEMP_CACHE_NAME);

  const names = await caches.keys();
  const previous = names
    .filter(
      (name) => name.startsWith(PRECACHE_PREFIX) && name !== PRECACHE_NAME,
    )
    .slice(-1);
  const retained = new Set([PRECACHE_NAME, ...previous]);
  await Promise.all(
    names.map((name) => {
      if (name.startsWith(TEMP_PREFIX)) return caches.delete(name);
      if (name.startsWith(PRECACHE_PREFIX) && !retained.has(name)) {
        return caches.delete(name);
      }
      return Promise.resolve(false);
    }),
  );
}

async function cacheMatch(url) {
  const current = await caches.open(PRECACHE_NAME);
  const currentMatch = await current.match(url);
  if (currentMatch !== undefined) return currentMatch;

  const names = await caches.keys();
  const previousName = names
    .filter(
      (name) => name.startsWith(PRECACHE_PREFIX) && name !== PRECACHE_NAME,
    )
    .slice(-1)[0];
  if (previousName === undefined) return undefined;
  return caches.match(url, { cacheName: previousName });
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  const normalizedPath = url.pathname === ROOT_URL ? ROOT_URL : url.pathname;
  try {
    return await fetch(request);
  } catch {
    if (DOCUMENT_URLS.has(normalizedPath)) {
      const cached = await cacheMatch(normalizedPath);
      if (cached !== undefined) return cached;
    }
    const fallback = await cacheMatch(OFFLINE_URL);
    if (fallback === undefined)
      throw new Error("Offline fallback unavailable.");
    return new Response(await fallback.arrayBuffer(), {
      status: 503,
      statusText: "Service Unavailable",
      headers: fallback.headers,
    });
  }
}

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

self.addEventListener("install", (event) => {
  event.waitUntil(installRelease());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(promoteRelease());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigation(request)) {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.search !== "" || !PRECACHE_URLS.has(url.pathname)) return;
  const entry = MANIFEST_BY_URL.get(url.pathname);
  if (entry === undefined || entry.kind === "document") return;
  event.respondWith(
    cacheMatch(url.pathname).then((cached) => cached ?? fetch(request)),
  );
});

self.addEventListener("message", (event) => {
  if (!sameOriginClient(event.source)) return;
  const value = event.data;
  if (
    exactKeys(value, ["requestId", "type"]) &&
    value.type === "GET_RELEASE" &&
    typeof value.requestId === "string"
  ) {
    event.source.postMessage({
      type: "RELEASE_INFO",
      requestId: value.requestId,
      releaseId: RELEASE.releaseId,
    });
    return;
  }
  if (
    exactKeys(value, ["requestId", "type"]) &&
    value.type === "QUERY_CLIENTS" &&
    typeof value.requestId === "string"
  ) {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: false, type: "window" })
        .then((clients) => {
          event.source.postMessage({
            type: "CLIENT_COUNT",
            requestId: value.requestId,
            releaseId: RELEASE.releaseId,
            count: clients.length,
          });
        }),
    );
    return;
  }
  if (
    exactKeys(value, ["releaseId", "type"]) &&
    value.type === "ACTIVATE_UPDATE" &&
    value.releaseId === RELEASE.releaseId
  ) {
    event.waitUntil(self.skipWaiting());
  }
});
