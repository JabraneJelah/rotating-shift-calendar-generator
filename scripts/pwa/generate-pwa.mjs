import { spawnSync } from "node:child_process";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED_DOCUMENT_ROUTES,
  APPROVED_ICON_URLS,
  compressedSizes,
  createManifestEntry,
  discoverTimezoneGraph,
  extractStaticAssetUrls,
  injectRelease,
  releaseIdentity,
  routeHtmlRelativePath,
  validateManifestContract,
  validateManifestEntries,
} from "./pwa-build-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");
const nextRoot = path.join(root, ".next");
const serverAppRoot = path.join(nextRoot, "server", "app");
const staticRoot = path.join(nextRoot, "static");
const publicRoot = path.join(root, "public");

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function requireStaticRoute(route, appRoutes, prerender) {
  if (!Object.values(appRoutes).includes(route)) {
    throw new Error(`Required application route is missing: ${route}`);
  }
  const details = prerender.routes?.[route];
  if (
    details?.routeType !== "page" ||
    details?.compute !== "static" ||
    details?.response !== "complete"
  ) {
    throw new Error(`Required route is not a complete static page: ${route}`);
  }
}

async function atomicWrite(file, content) {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, content);
  try {
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function main() {
  const packageManifest = await json(path.join(root, "package.json"));
  if (packageManifest.engines?.node !== ">=24 <25") {
    throw new Error("PWA generation requires the repository Node 24 contract.");
  }
  const major = Number(process.versions.node.split(".")[0]);
  if (major !== 24) {
    throw new Error(
      `PWA generation requires Node 24; found ${process.version}.`,
    );
  }

  const appRoutes = await json(
    path.join(nextRoot, "app-path-routes-manifest.json"),
  );
  const prerender = await json(path.join(nextRoot, "prerender-manifest.json"));
  for (const route of APPROVED_DOCUMENT_ROUTES) {
    requireStaticRoute(route, appRoutes, prerender);
  }

  const entries = [];
  const allStaticUrls = new Set();
  let rootInitialUrls = [];
  for (const route of APPROVED_DOCUMENT_ROUTES) {
    const file = path.join(serverAppRoot, routeHtmlRelativePath(route));
    const bytes = await readFile(file);
    const html = bytes.toString("utf8");
    const assets = extractStaticAssetUrls(html);
    if (route === "/") rootInitialUrls = assets;
    assets.forEach((url) => allStaticUrls.add(url));
    entries.push(createManifestEntry({ url: route, bytes, kind: "document" }));
  }

  for (const url of [...allStaticUrls].sort()) {
    const file = path.join(staticRoot, url.slice("/_next/static/".length));
    entries.push(
      createManifestEntry({
        url,
        bytes: await readFile(file),
        kind: "static",
      }),
    );
  }

  const timezone = await discoverTimezoneGraph({
    staticRoot,
    initialAssetUrls: rootInitialUrls,
  });
  if (!allStaticUrls.has(timezone.url)) {
    entries.push(
      createManifestEntry({
        url: timezone.url,
        bytes: await readFile(timezone.file),
        kind: "timezone",
      }),
    );
  }

  const manifestFile = path.join(serverAppRoot, "manifest.webmanifest.body");
  const manifestBytes = await readFile(manifestFile);
  validateManifestContract(JSON.parse(manifestBytes.toString("utf8")));
  entries.push(
    createManifestEntry({
      url: "/manifest.webmanifest",
      bytes: manifestBytes,
      kind: "manifest",
    }),
  );

  for (const url of APPROVED_ICON_URLS) {
    const publicRelative = url.slice(1);
    const source =
      url === "/favicon.ico"
        ? path.join(root, "src", "app", "favicon.ico")
        : path.join(publicRoot, publicRelative);
    entries.push(
      createManifestEntry({
        url,
        bytes: await readFile(source),
        kind: "icon",
      }),
    );
  }

  const ordered = validateManifestEntries(entries);
  if (ordered.length !== 24) {
    throw new Error(
      `The approved release currently requires exactly 24 entries; discovered ${ordered.length}.`,
    );
  }
  const releaseId = releaseIdentity(ordered);
  const template = await readFile(
    path.join(root, "src", "pwa", "service-worker-template.js"),
    "utf8",
  );
  const worker = injectRelease(template, {
    releaseId,
    ianaVersion: timezone.ianaVersion,
    documentUrls: APPROVED_DOCUMENT_ROUTES,
    entries: ordered,
  });
  if (worker.includes(root) || worker.includes(root.replaceAll("\\", "/"))) {
    throw new Error("Generated worker contains an absolute filesystem path.");
  }

  const workerFile = path.join(publicRoot, "sw.js");
  const workerTemporary = `${workerFile}.syntax-check.js`;
  await writeFile(workerTemporary, worker);
  const syntax = spawnSync(process.execPath, ["--check", workerTemporary], {
    encoding: "utf8",
  });
  await rm(workerTemporary, { force: true });
  if (syntax.status !== 0) {
    throw new Error(
      `Generated worker failed syntax validation: ${syntax.stderr}`,
    );
  }

  await atomicWrite(workerFile, worker);
  const totals = ordered.reduce(
    (result, entry) => ({
      rawBytes: result.rawBytes + entry.size,
      gzipBytes: result.gzipBytes + entry.gzipSize,
      brotliBytes: result.brotliBytes + entry.brotliSize,
    }),
    { rawBytes: 0, gzipBytes: 0, brotliBytes: 0 },
  );
  const workerSizes = compressedSizes(Buffer.from(worker));
  const timezoneEntry = ordered.find((entry) => entry.url === timezone.url);
  const initialEntries = ordered.filter((entry) =>
    rootInitialUrls.includes(entry.url),
  );
  const summary = {
    format: "shift-calendar-pwa-build-summary",
    version: 1,
    releaseId,
    ianaVersion: timezone.ianaVersion,
    entryCount: ordered.length,
    ...totals,
    largestAsset: ordered.reduce((largest, entry) =>
      entry.size > largest.size
        ? { url: entry.url, size: entry.size }
        : largest,
    ),
    worker: {
      rawBytes: Buffer.byteLength(worker),
      gzipBytes: workerSizes.gzip,
      brotliBytes: workerSizes.brotli,
    },
    timezone: {
      url: timezone.url,
      referrer: timezone.referrer,
      rawBytes: timezoneEntry?.size ?? 0,
      gzipBytes: timezoneEntry?.gzipSize ?? 0,
      brotliBytes: timezoneEntry?.brotliSize ?? 0,
    },
    initialRoute: initialEntries.reduce(
      (result, entry) => ({
        entryCount: result.entryCount + 1,
        rawBytes: result.rawBytes + entry.size,
        gzipBytes: result.gzipBytes + entry.gzipSize,
      }),
      { entryCount: 0, rawBytes: 0, gzipBytes: 0 },
    ),
    entries: ordered.map(
      ({ url, revision, size, gzipSize, brotliSize, kind }) => ({
        url,
        revision,
        size,
        gzipSize,
        brotliSize,
        kind,
      }),
    ),
  };
  await atomicWrite(
    path.join(nextRoot, "pwa-build-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  process.stdout.write(
    `PWA release ${releaseId}: ${ordered.length} entries, ${totals.rawBytes} raw bytes, ${totals.gzipBytes} gzip bytes.\n`,
  );
}

await main();
