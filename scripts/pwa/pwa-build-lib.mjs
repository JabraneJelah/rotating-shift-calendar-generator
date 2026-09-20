import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

export const PWA_LIMITS = Object.freeze({
  maximumEntries: 24,
  maximumRawBytes: 2 * 1024 * 1024,
  maximumGzipBytes: 500 * 1024,
  maximumAssetBytes: 512 * 1024,
  maximumRetainedReleases: 2,
});

export const APPROVED_DOCUMENT_ROUTES = Object.freeze([
  "/",
  "/about",
  "/offline",
  "/shift-schedules",
  "/shift-schedules/2-2-3",
  "/shift-schedules/4-on-4-off",
]);

export const APPROVED_ICON_URLS = Object.freeze([
  "/favicon.ico",
  "/icons/apple-touch-icon.png",
  "/icons/shift-calendar-192.png",
  "/icons/shift-calendar-512.png",
  "/icons/shift-calendar-maskable-192.png",
  "/icons/shift-calendar-maskable-512.png",
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function compressedSizes(value) {
  return Object.freeze({
    gzip: gzipSync(value, { level: 9 }).byteLength,
    brotli: brotliCompressSync(value, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength,
  });
}

export function routeHtmlRelativePath(route) {
  if (route === "/") return "index.html";
  return `${route.slice(1)}.html`;
}

export function extractStaticAssetUrls(html) {
  const urls = new Set();
  const pattern = /(?:src|href)=["']([^"']+)["']/gu;
  for (const match of html.matchAll(pattern)) {
    const candidate = match[1];
    if (candidate?.startsWith("/_next/static/")) {
      if (candidate.includes("?") || candidate.includes("#")) {
        throw new Error(`Static asset URL must be exact: ${candidate}`);
      }
      urls.add(candidate);
    }
  }
  return Object.freeze([...urls].sort());
}

export function contentTypeForUrl(url) {
  if (url.endsWith(".js")) return "application/javascript";
  if (url.endsWith(".css")) return "text/css";
  if (url.endsWith(".png")) return "image/png";
  if (url.endsWith(".ico")) return "image/x-icon";
  if (url.endsWith(".svg")) return "image/svg+xml";
  if (url === "/manifest.webmanifest") return "application/manifest+json";
  if (APPROVED_DOCUMENT_ROUTES.includes(url)) return "text/html";
  throw new Error(`No approved content type for ${url}.`);
}

export function createManifestEntry({ url, bytes, kind }) {
  if (!url.startsWith("/") || url.includes("\\") || url.includes("..")) {
    throw new Error(`Invalid public asset URL: ${url}`);
  }
  if (!ArrayBuffer.isView(bytes) || bytes.byteLength === 0) {
    throw new Error(`Required asset is empty: ${url}`);
  }
  const compressed = compressedSizes(bytes);
  return Object.freeze({
    url,
    revision: sha256(bytes),
    size: bytes.byteLength,
    gzipSize: compressed.gzip,
    brotliSize: compressed.brotli,
    contentType: contentTypeForUrl(url),
    kind,
  });
}

export function validateManifestEntries(entries, limits = PWA_LIMITS) {
  const ordered = [...entries].sort((left, right) =>
    left.url.localeCompare(right.url),
  );
  const urls = new Map();
  for (const entry of ordered) {
    const previous = urls.get(entry.url);
    if (previous !== undefined) {
      throw new Error(
        previous === entry.revision
          ? `Duplicate precache URL: ${entry.url}`
          : `Conflicting precache revisions for ${entry.url}`,
      );
    }
    urls.set(entry.url, entry.revision);
    if (entry.size > limits.maximumAssetBytes) {
      throw new Error(
        `Asset ${entry.url} is ${entry.size} bytes; limit is ${limits.maximumAssetBytes}.`,
      );
    }
  }
  const rawBytes = ordered.reduce((total, entry) => total + entry.size, 0);
  const gzipBytes = ordered.reduce((total, entry) => total + entry.gzipSize, 0);
  if (ordered.length > limits.maximumEntries) {
    throw new Error(
      `Precache has ${ordered.length} entries; limit is ${limits.maximumEntries}.`,
    );
  }
  if (rawBytes > limits.maximumRawBytes) {
    throw new Error(
      `Precache is ${rawBytes} raw bytes; limit is ${limits.maximumRawBytes}.`,
    );
  }
  if (gzipBytes > limits.maximumGzipBytes) {
    throw new Error(
      `Precache is ${gzipBytes} estimated gzip bytes; limit is ${limits.maximumGzipBytes}.`,
    );
  }
  return Object.freeze(ordered);
}

export function releaseIdentity(entries) {
  const canonical = entries
    .map(({ url, revision, size, contentType, kind }) => ({
      url,
      revision,
      size,
      contentType,
      kind,
    }))
    .sort((left, right) => left.url.localeCompare(right.url));
  return sha256(JSON.stringify(canonical)).slice(0, 24);
}

export function validateManifestContract(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The generated web app manifest is not an object.");
  }
  const required = {
    id: "/",
    name: "Shift Calendar — Rotating Shift Planner",
    short_name: "Shift Calendar",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
  };
  for (const [key, expected] of Object.entries(required)) {
    if (value[key] !== expected) {
      throw new Error(`Manifest field ${key} does not match the contract.`);
    }
  }
  if (!Array.isArray(value.icons) || value.icons.length !== 4) {
    throw new Error("Manifest must declare four install icon entries.");
  }
  const iconKeys = value.icons
    .map((icon) => `${icon.src}|${icon.sizes}|${icon.type}|${icon.purpose}`)
    .sort();
  const expectedIcons = [
    "/icons/shift-calendar-192.png|192x192|image/png|any",
    "/icons/shift-calendar-512.png|512x512|image/png|any",
    "/icons/shift-calendar-maskable-192.png|192x192|image/png|maskable",
    "/icons/shift-calendar-maskable-512.png|512x512|image/png|maskable",
  ].sort();
  if (JSON.stringify(iconKeys) !== JSON.stringify(expectedIcons)) {
    throw new Error("Manifest icon metadata does not match approved assets.");
  }
}

export async function listFiles(root) {
  const results = [];
  async function visit(directory) {
    for (const name of await readdir(directory)) {
      const absolute = path.join(directory, name);
      const details = await stat(absolute);
      if (details.isDirectory()) await visit(absolute);
      else results.push(absolute);
    }
  }
  await visit(root);
  return Object.freeze(results.sort());
}

export async function discoverTimezoneGraph({
  staticRoot,
  initialAssetUrls,
  expectedIanaVersion = "2026d",
  staleIanaVersion = "2026b",
}) {
  const files = (await listFiles(staticRoot)).filter((file) =>
    file.endsWith(".js"),
  );
  const candidates = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (source.includes(staleIanaVersion)) {
      throw new Error(
        `Stale IANA ${staleIanaVersion} data appears in browser asset ${path.basename(file)}.`,
      );
    }
    if (source.includes("TzDatabase") && source.includes(expectedIanaVersion)) {
      candidates.push(file);
    }
  }
  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one IANA ${expectedIanaVersion} timezone chunk; found ${candidates.length}.`,
    );
  }
  const candidate = candidates[0];
  const relative = path
    .relative(staticRoot, candidate)
    .split(path.sep)
    .join("/");
  const url = `/_next/static/${relative}`;
  if (initialAssetUrls.includes(url)) {
    throw new Error("Timezone data entered the initial route asset graph.");
  }
  const basename = path.basename(candidate);
  const referrers = [];
  for (const initialUrl of initialAssetUrls.filter((value) =>
    value.endsWith(".js"),
  )) {
    const file = path.join(
      staticRoot,
      initialUrl.slice("/_next/static/".length),
    );
    const source = await readFile(file, "utf8");
    if (source.includes(basename)) referrers.push(initialUrl);
  }
  if (referrers.length !== 1) {
    throw new Error(
      `Expected one approved root referrer for timezone chunk; found ${referrers.length}.`,
    );
  }
  return Object.freeze({
    file: candidate,
    url,
    referrer: referrers[0],
    ianaVersion: expectedIanaVersion,
  });
}

export function injectRelease(template, release) {
  const marker = "/*__SHIFT_CALENDAR_GENERATED__*/";
  const occurrences = template.split(marker).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Worker template must contain one injection marker; found ${occurrences}.`,
    );
  }
  const publicRelease = {
    releaseId: release.releaseId,
    ianaVersion: release.ianaVersion,
    documentUrls: release.documentUrls,
    entries: release.entries.map(
      ({ url, revision, size, contentType, kind }) => ({
        url,
        revision,
        size,
        contentType,
        kind,
      }),
    ),
  };
  return template.replace(
    marker,
    `const RELEASE = Object.freeze(${JSON.stringify(publicRelease)});`,
  );
}
