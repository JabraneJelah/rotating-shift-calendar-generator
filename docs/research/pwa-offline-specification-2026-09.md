# PWA and offline architecture specification

**Phase:** 6B2A

**Status:** Research and architecture only

**Date:** 2026-09-18
**Target implementation:** Phase 6B2, after the Phase 6B2B spike and approval of the open decisions

## 1. Executive summary

Shift Calendar should become installable and support a deliberately bounded offline mode. The application is unusually well suited to this: schedule calculation, persistence, backup, printing, and calendar-file generation are browser-local; all five current HTML routes are statically rendered; and production makes no application fetches to external services. Installation must remain an enhancement. The normal website, its server-rendered content, and its clean canonical URLs remain authoritative.

The recommended design is an application-owned service worker whose precache list is injected at build time by `workbox-build@7.4.0` as a development dependency. It should not use Workbox routing at runtime unless the spike proves a concrete benefit. This keeps request policy, update coordination, and IndexedDB separation explicit while avoiding a hand-maintained list of Next.js hashes. Serwist is not recommended for this release because its Next.js/Turbopack integration surface is larger and still has documented integration churn. A wholly dependency-free generator is the fallback only if the Phase 6B2B spike proves that Next's emitted metadata can be consumed through a small stable adapter.

The initial install must precache the complete versioned application shell, all five approved public documents, the offline document, icons, and the lazy timed-export timezone dependency graph. Dynamic import remains in place, so this does not add timezone code to the initial JavaScript execution path. It does make first-use timed export available offline after a successful service-worker installation.

Updates use a waiting worker and user-mediated activation. There is no unconditional `skipWaiting`, forced refresh, or planner access from the service worker. An update can activate only after the application has committed pending edits, confirmed no conflict, and either established that this is the sole controlled tab or asked the user to close the others. Cache Storage contains public application assets only; planners remain exclusively in the validated IndexedDB repository.

A focused Phase 6B2B build/dependency spike is required before implementation. It must prove deterministic Next.js 16.3.5/Turbopack asset discovery, timezone-chunk inclusion, generated-worker serving and headers, Docker behavior, update coexistence, and output-size budgets.

## 2. Verified current application state

The repository was inspected at `4d96300` on `main`; `origin/main` pointed to the same commit and the working tree was clean before this document was created. The preceding commits were `f253076`, `15e1b52`, `77c1d0a`, and `ad078f6`.

| Area               | Verified state                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js `16.3.5`, React `19.3.0`, App Router, Node `>=24 <25`                                                                                                  |
| Rendering          | All current application and metadata routes are emitted as static output by the production build                                                               |
| Client boundary    | The generator and browser persistence are client-side; route shells and content are server components/static HTML                                              |
| Network            | No production `fetch`, XHR, WebSocket, beacon, analytics, ad, font, or third-party runtime request was found                                                   |
| Persistence        | IndexedDB database `shift-calendar-local`, schema version 1; `planners` and `meta` stores; validated migrations and revision conflict protection               |
| Cross-tab          | `BroadcastChannel` sends action, planner ID, and revision only; it does not send planner contents                                                              |
| Clean-root loading | A clean `/` restores the last-opened saved planner after hydration; any non-empty query suppresses that restoration and enters V1 URL parsing/canonicalization |
| Backups            | Strict V1 JSON format, 5 MiB input limit, 20-planner limit, validation before import, imported as new records                                                  |
| Downloads          | JSON and ICS are generated in memory as `Blob` object URLs and revoked after use                                                                               |
| Printing           | Browser `window.print()` with existing print styles                                                                                                            |
| Timed export       | Lazy dynamic import; `timezonecomplete@5.15.1`; pinned `tzdata@1.0.51`; explicit `TzDatabase.init(tzdata)`; IANA release `2026d` verification                  |
| Metadata           | Existing generated `/manifest.webmanifest`, `/icon.svg`, robots and sitemap routes; no Apple touch PNG or maskable icon                                        |
| Security headers   | `next.config.ts` currently defines no CSP or security headers. The inspected development response had no CSP and exposed `X-Powered-By`                        |
| Service worker     | None; no registration, cache policy, offline page, install interface, or service-worker test harness                                                           |

The implementation confirms the Phase 6B1 and 6A4 architecture: planner persistence and Cache Storage can be kept completely independent, and timed export does not need a network timezone service.

## 3. Current route inventory

This is the complete route inventory observed in `src/app`, the sitemap, and `.next/server/app`. “Static” means emitted by the inspected production build, not a promise that future code cannot change it.

| Route                         | Purpose                           | Indexable                           | Rendering                        | Offline requirement               | Cache disposition                                                                                  | Offline result                                                                     |
| ----------------------------- | --------------------------------- | ----------------------------------- | -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/`                           | Generator and planner application | Yes, clean canonical only           | Static shell plus client state   | Required                          | Precache clean document; network-first refresh                                                     | Cached shell; restore IndexedDB planner or show default generator                  |
| `/?v=1&...`                   | V1 base-schedule share link       | No separate canonical/indexed state | Same static shell; client parser | Required when shell is installed  | Never cache the query permutation; reuse cached `/`                                                | Keep requested URL, load clean shell, parse/validate query locally                 |
| `/about`                      | Product/privacy explanation       | Yes                                 | Static                           | Optional but recommended          | Precache                                                                                           | Cached document                                                                    |
| `/shift-schedules`            | Schedule-guide index              | Yes                                 | Static                           | Optional but recommended          | Precache                                                                                           | Cached document                                                                    |
| `/shift-schedules/4-on-4-off` | Public guide                      | Yes                                 | Static                           | Optional but recommended          | Precache                                                                                           | Cached document                                                                    |
| `/shift-schedules/2-2-3`      | Public guide                      | Yes                                 | Static                           | Optional but recommended          | Precache                                                                                           | Cached document                                                                    |
| `/_not-found`                 | Next.js not-found output          | No                                  | Static build output              | Not a navigation fallback         | Do not map unknown URLs to it as a 200; optional internal precache only if status can be preserved | Dedicated offline response when network unavailable; normal server 404 when online |
| `/manifest.webmanifest`       | Install metadata                  | No                                  | Generated static metadata        | Required for install, not runtime | Precache or stale-while-revalidate with strict same-origin allowlist                               | Last validated manifest                                                            |
| `/icon.svg`                   | Current browser icon              | No                                  | Generated static metadata        | Required shell asset              | Precache                                                                                           | Cached icon                                                                        |
| `/robots.txt`                 | Crawler policy                    | No                                  | Generated static metadata        | Online-only                       | Network-only                                                                                       | Network failure; never substitute app shell                                        |
| `/sitemap.xml`                | Discovery                         | No                                  | Generated static metadata        | Online-only                       | Network-only                                                                                       | Network failure; never substitute app shell                                        |

No additional approved application route was found. A future `/offline` document is proposed for Phase 6B2; it must be `noindex`, excluded from the sitemap, and used only when an uncached document cannot be obtained.

## 4. Current production asset inventory

The existing `.next` production output was inspected rather than inferred from source documentation.

| Class            | Observed                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- |
| JavaScript       | 14 files in `.next/static`, 1,104,534 raw bytes total                                    |
| CSS              | 1 file, 39,871 raw bytes                                                                 |
| Static SVG       | 1 file, 295 bytes, in addition to generated route output for `/icon.svg`                 |
| Route documents  | Static HTML/RSC/segment output for all five public HTML routes and metadata route bodies |
| Fonts            | No emitted or remotely requested font assets found                                       |
| Public directory | No `public/` directory exists                                                            |
| Images           | No current public raster image inventory                                                 |

The largest JavaScript file is the lazy timezone payload at 331,913 bytes raw. The approved Phase 6A4 measurement was 57,524 bytes gzip and 47,895 bytes Brotli; it was absent from initial route chunks. Other large chunks measured 229,156, 167,438, 165,743, and 112,594 raw bytes. The Phase 6B2B generator must discover the exact post-build dependency graph rather than identify timezone code by a filename or size.

Next's hashed static files are content-addressed and appropriate for immutable HTTP caching. HTML, the manifest, and the service-worker script are not immutable and require revalidation. Build artifacts are evidence for this specification only; Phase 6B2A does not alter them.

## 5. Product goals

The installable application should, after one successful online installation of its asset set, allow a user on the same browser and device to:

1. launch the application from browser or operating-system surfaces where supported;
2. restore, list, create, edit, autosave, switch, duplicate, and delete local planners offline;
3. generate monthly/yearly views, exceptions, statistics, and insights offline;
4. create and import JSON backups locally;
5. print and generate all-day or timed ICS files where the platform permits those browser actions;
6. navigate the cached public guide routes;
7. understand degraded connectivity without losing focus or seeing repeated alarms;
8. defer an application update until local state is safe; and
9. recover intelligibly when a requested route or required asset is not cached.

The website must remain fully functional without installation. Offline capability is a returning-visit property, not a prerequisite for the online experience.

## 6. Explicit non-goals

Phase 6B2 does not include push notifications, schedule reminders, Background Sync, Periodic Background Sync, geofencing, location or contacts access, provider calendar synchronization, accounts, cloud or server planner storage, cross-device synchronization, team/business workspaces, Slack, Teams, email, analytics, advertising, URL V2, payroll, attendance monitoring, unsafe automatic refreshes, arbitrary external-site caching, or caching backup contents.

It also does not promise first-visit offline use, permanent browser storage, uniform installation UX, unattended synchronization, or availability of uncached external destinations. A service worker is not a substitute for JSON backups.

## 7. Offline product promise

Recommended public wording:

> After Shift Calendar has loaded successfully on this browser and device, the planner and locally saved schedules can usually continue working offline. Timed calendar export requires the matching application and timezone assets to have finished installing. Browser or app storage can still be cleared or evicted, so export a private JSON backup for important planners. Installing Shift Calendar does not create an account or synchronize devices.

Supporting distinctions:

| Situation                           | Promise                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| First visit while offline           | Unsupported; no application assets or planner database can be assumed                                  |
| Returning browser visit             | Core planner works if the current/retained shell finished caching                                      |
| Installed launch                    | Same capability and storage as the site's origin; install is not a separate durable database guarantee |
| Saved planner                       | Available from IndexedDB on the same origin/profile if storage still exists and schema is compatible   |
| Content guide                       | Available only if included in the current completed precache or previously retained approved cache     |
| Timed export                        | Available offline only when the pinned timezone dependency graph for that app release is cached        |
| Storage eviction/site-data clearing | Can remove both planners and caches; recovery requires a user-held JSON backup                         |
| Private/incognito                   | Storage lifetime and Cache API support vary and may end with the private session                       |
| Unsupported browser                 | Normal website remains available online; install/offline controls are hidden or explained accurately   |

Copy-link generation can work offline because serialization is local. The copied URL cannot be expected to open on a different browser/device until that recipient has network access; on the same installed browser it can use the cached root shell.

## 8. PWA browser/platform findings

The table records documented capability, not testing performed in this phase. Installation rules are browser product behavior and are not uniform requirements of the manifest specification.

| Platform         | Manifest / service worker                                                                | Installation                                                                                      | Custom prompt                                               | Standalone/offline and storage caveats                                                                                                   | Required manual test                                            |
| ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Chrome Android   | Supported                                                                                | Browser install; WebAPK behavior depends on Chrome/Google services                                | `beforeinstallprompt` on supporting Chromium configurations | Strong standalone/SW support; origin storage can still be evicted                                                                        | Install, offline restart, downloads, print, update, low storage |
| Chrome desktop   | Supported                                                                                | Address-bar/menu installation when criteria/product rules are met                                 | Chromium-only non-standard event                            | Installed window; storage remains origin-scoped                                                                                          | Windows/macOS/Linux install and update                          |
| Edge Windows     | Supported; Edge documents SW as optional for installation but necessary here for offline | Address bar/app menu and Windows integration                                                      | Chromium event where exposed                                | Installed-window behavior and OS integration vary                                                                                        | Windows install/uninstall, shortcuts, multi-tab update          |
| Safari iPhone    | Manifest and SW supported                                                                | Share menu, Add to Home Screen/Open as Web App; modern iOS also permits web-app opening for sites | No Chromium programmatic prompt                             | Standalone has platform-specific download/print/storage behavior; first-party Home Screen apps receive distinct WebKit storage treatment | Real device, restart, safe area, JSON/ICS, print, clear data    |
| Safari iPad      | Supported                                                                                | Add to Home Screen/Open as Web App                                                                | No                                                          | Tablet multitasking, orientation, keyboard and storage need device testing                                                               | Real iPad portrait/landscape and split view                     |
| Safari macOS     | Manifest/SW supported                                                                    | Add to Dock available on current macOS Safari                                                     | No Chromium event                                           | Separate app window; platform version materially affects behavior                                                                        | Current and oldest supported macOS                              |
| Firefox desktop  | Manifest and SW supported; service-worker offline pages work                             | Mozilla documentation does not provide Chromium-style desktop PWA installation                    | No                                                          | Website offline may work; do not promise OS installation                                                                                 | Offline website, private window, cache/update                   |
| Firefox Android  | Manifest/SW supported                                                                    | Firefox documents “Install”/home-screen web apps                                                  | No Chromium event                                           | Product/version behavior and private mode require testing                                                                                | Install, launch, storage eviction, downloads                    |
| Samsung Internet | Manifest/SW supported in current Android implementations                                 | Documented by MDN as a WebAPK-capable Android browser                                             | Do not assume Chromium event parity                         | OEM/browser versions vary                                                                                                                | Current Samsung device install/offline/update                   |

No platform in this table was manually certified during Phase 6B2A. The only local browser observation was the current non-PWA application; it is not evidence of installed behavior.

## 9. Installation architecture

Installation is progressive enhancement over the same origin and routes. Register the service worker only in a production build, after the first page becomes interactive, and only when `navigator.serviceWorker` and a secure context are available. Development and automated tests must opt in explicitly on an isolated origin; a developer service worker must never silently control `localhost:3000` during normal work.

Installed launch behavior:

- `/` is the launch target. It follows existing clean-root restoration: restore the last-opened planner when one exists, otherwise show the unsaved default generator.
- A V1 link opened from another application retains its query. Existing behavior suppresses last-planner restoration, validates the V1 state, and canonicalizes as currently specified.
- Public content routes remain normal same-origin navigations. The application does not imitate native chrome or capture unrelated URLs.
- Browser Back remains history-based. Installation must not replace history, force `/`, or trap the user.
- Cross-origin links open according to browser/standalone policy and are never intercepted by the service worker.
- The origin should be dedicated to Shift Calendar. If unrelated future applications must share the host, move Shift Calendar to a dedicated hostname or constrain its base path and service-worker scope before release.

Do not show an install banner on first visit. A settings/help action may be offered only after meaningful use, with capability detection and a remembered, non-authoritative dismissal preference.

## 10. Manifest specification

Future `/manifest.webmanifest` contents should be equivalent to this valid JSON. Phase 6B2A does not create it.

```json
{
  "id": "/",
  "name": "Shift Calendar — Rotating Shift Planner",
  "short_name": "Shift Calendar",
  "description": "Create, save, print and export rotating shift schedules on your device.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f7faf9",
  "theme_color": "#176b64",
  "lang": "en",
  "dir": "ltr",
  "categories": ["productivity", "utilities"],
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/shift-calendar-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/shift-calendar-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/shift-calendar-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/shift-calendar-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Decisions:

- `id`, `start_url`, and `scope` are clean `/`. They contain no planner ID, query state, tracking token, locale token, or user data.
- `display` is `standalone`. Do not add `display_override` yet: window-controls overlay creates extra layout/security testing with no planner benefit.
- `orientation` is `any`; month/year views, keyboard use, and tablets must remain usable in portrait and landscape.
- No initial shortcuts are recommended because `/` already opens the generator/restoration flow. Add only task-specific, clean, stable shortcuts after user research.
- Add two optional screenshots after real assets exist: a labelled narrow screenshot around 390×844 with `form_factor` omitted/narrow behavior, and a labelled 1440×900 screenshot with `form_factor: "wide"`. Screenshots improve install presentation but are not an offline dependency.
- The manifest response must be `application/manifest+json`, same-origin, revalidated, and protected by the site's CSP/security posture.

## 11. Branding and icon requirements

The current mark is a 64×64 scalable SVG: a teal (`#176b64`) rounded square and white calendar glyph. Preserve that recognizable identity while redrawing and visually checking raster variants; do not mechanically upscale a raster.

| Size / asset                   | Decision                                                                        | Purpose                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 16×16, 32×32, 48×48            | Required as frames in `favicon.ico`; keep SVG favicon as scalable modern source | Browser tabs/bookmarks and legacy fallback                              |
| 72×72, 96×96, 128×128, 144×144 | Do not generate initially                                                       | Legacy density duplicates add maintenance without a current requirement |
| 152×152                        | Not initially required; test 180 fallback on supported iPad targets             | Older Apple touch recommendation                                        |
| 180×180                        | Required opaque `apple-touch-icon.png`                                          | Current iPhone/iPad touch icon fallback                                 |
| 192×192                        | Required PNG, `purpose: any`                                                    | Manifest/install baseline                                               |
| 384×384                        | Optional; omit unless install testing demonstrates a platform benefit           | Intermediate scaling only                                               |
| 512×512                        | Required PNG, `purpose: any`                                                    | Manifest/install/high-resolution surfaces                               |
| Maskable 192×192               | Required opaque PNG                                                             | Android adaptive mask surfaces                                          |
| Maskable 512×512               | Required opaque PNG                                                             | High-resolution adaptive surfaces                                       |
| Monochrome SVG                 | Recommended future asset after platform testing; not required for first release | OS monochrome/badging surfaces                                          |
| Install screenshots            | Recommended, not required for first functional release                          | Rich install UI                                                         |

PNG install/touch assets use an opaque teal background and strong white glyph contrast. The ordinary SVG/favicon may retain transparency where browser chrome expects it, but “any” PNGs should be checked against light and dark launchers. In maskable files, all essential glyph content must remain inside the specification's central safe zone (a circle of radius 40% of the icon width); background color/art may extend to every edge. Do not combine `any maskable` in one icon record because browsers may crop the same artwork differently.

Every file must be inspected at native size, under circular, squircle, rounded-square, and high-contrast contexts. Icon color is not the only carrier of meaning. The Apple touch icon must be referenced explicitly in metadata; Safari does not rely on manifest icons identically across versions.

## 12. Service-worker scope

For the intended dedicated root deployment:

- script URL: `/sw.js`;
- registration scope: `/`;
- allowed header: `Service-Worker-Allowed: /` (explicit even though the default directory already permits it);
- secure context: HTTPS in production; browser-recognized localhost only for controlled development;
- content type: `text/javascript; charset=utf-8`;
- cache control: `Cache-Control: no-cache, no-store, must-revalidate` for `/sw.js` so update checks reach the current release;
- `updateViaCache: "none"` at registration so imported worker code is not held behind HTTP cache.

The worker handles only same-origin HTTP(S) requests inside its scope and returns without `respondWith` for excluded requests. It must not attempt to intercept extension schemes, blob/data URLs, browser internals, or cross-origin navigation/subresources.

If Shift Calendar is later deployed below `/shift-calendar/`, the manifest ID/start/scope, asset URLs, router base path, worker path, and registration scope must all use that base path. Prefer placing the worker inside the base directory. Do not use `Service-Worker-Allowed` to broaden a subpath worker over unrelated applications. A reverse proxy must preserve the request path, MIME type, scope header, query string, and cache headers exactly.

## 13. Request and asset classification

The worker uses an allowlist, not “cache everything that succeeds.” Cache writes require a `GET`, same origin, an approved destination/path, a successful non-opaque response, an expected content type, and an entry-size/budget check.

| Request class                                       | Strategy / cache                                                                                     | Version, limits, expiration                                                                                        | Offline behavior                                                                     | Security/update notes                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Known HTML documents (`/` and four content routes)  | Precache; online navigation is network-first with a short timeout and validated refresh into `pages` | Build ID; 6 entries including future offline document; retain current and previous release; 30-day runtime ceiling | Current precached document                                                           | Cache only 200 HTML; never cache redirects, errors, or query variants        |
| Clean `/`                                           | Same as known HTML                                                                                   | One normalized entry                                                                                               | Generator shell                                                                      | IndexedDB state loads independently                                          |
| Valid or malformed V1 query on `/`                  | Network-first request; cache lookup and write key normalize to clean `/`                             | Never creates a query entry                                                                                        | Clean shell while address bar retains query; client parser owns valid/error behavior | Prevent URL data from entering Cache Storage                                 |
| Unknown/deep-link document                          | Network-only, then dedicated offline fallback if fetch fails                                         | No runtime entry                                                                                                   | `/offline` response with unavailable wording                                         | Do not return fake homepage/200; preserve online 404                         |
| Hashed Next.js JS/CSS                               | Precache + cache-first from `precache`                                                               | Content revision/build ID; size budget; current + prior deployment                                                 | Exact cached asset or controlled asset-missing recovery                              | Only emitted allowlisted paths; immutable HTTP cache                         |
| Lazy timezone resolver/data chunks                  | Precache in `timezone` group; cache-first                                                            | Build ID plus `iana-2026d`; exact dependency graph; current + prior                                                | First-use timed export works after completed install                                 | Reject unexpected nested/duplicate timezone package data in generation audit |
| Icons                                               | Precache; optional stale-while-revalidate only for stable named files                                | `shell-v1`; max 10; 30 days                                                                                        | Last validated icon                                                                  | Validate MIME and byte cap; icon changes should normally ship with release   |
| Manifest                                            | Precache release copy; network-first/SWR for online refresh                                          | Max 2; 1 day                                                                                                       | Last validated manifest                                                              | Never accept cross-origin or non-manifest/JSON response                      |
| Same-origin images                                  | Precache only approved branding/screenshots; otherwise cache-first-on-approved-list                  | Max 10; 30 days                                                                                                    | Placeholder/omit if unavailable                                                      | No blanket image cache                                                       |
| Fonts                                               | None exist. If self-hosted later, precache versioned files                                           | Explicit budget                                                                                                    | Browser fallback font                                                                | Never cache remote font by default                                           |
| Sitemap and robots                                  | Network-only                                                                                         | None                                                                                                               | Network error, no substitution                                                       | Crawlers receive origin response                                             |
| JSON backup export/import                           | Bypass; local `Blob`/file input                                                                      | Never cached                                                                                                       | Works locally if browser file/download APIs work                                     | Never inspect/log/cache contents                                             |
| Generated ICS                                       | Bypass; local `Blob`                                                                                 | Never cached                                                                                                       | Works locally subject to platform download behavior                                  | Never cache calendar data                                                    |
| Blob/data URLs                                      | Bypass                                                                                               | None                                                                                                               | Browser-native                                                                       | May contain private data                                                     |
| Source maps                                         | Exclude from precache and runtime cache; do not publish in production unless separately authorized   | None                                                                                                               | None                                                                                 | Can expose source; not runtime assets                                        |
| Development/HMR assets                              | Bypass; SW registration disabled                                                                     | None                                                                                                               | Not applicable                                                                       | Prevent development worker persistence                                       |
| Browser-extension/internal schemes                  | Bypass                                                                                               | None                                                                                                               | Browser-native                                                                       | Outside scope and HTTP(S) rules                                              |
| Cross-origin and third-party                        | Bypass/network only                                                                                  | None                                                                                                               | Normal network failure                                                               | No opaque-response cache or tracking surface                                 |
| Non-GET, Range, download/attachment, API-like paths | Network only                                                                                         | None                                                                                                               | Normal failure/local handler                                                         | Avoid mutation/auth/large partial-response caching                           |

Cache Storage never contains planner records, private notes, exceptions, custom shift definitions, imported JSON, generated backup/ICS bodies, or a URL that encodes those values.

## 14. Precache strategy

### Required release set

Each release must precache atomically:

1. the clean `/` document and all resources needed to hydrate and operate the generator;
2. the four current static content documents;
3. the dedicated offline document;
4. all emitted, browser-referenced Next.js JS and CSS chunks for those documents, including dynamic imports;
5. the full lazy timezone resolver/data dependency graph for the pinned IANA release;
6. manifest, favicon, Apple touch icon, `any` icons, and maskable icons; and
7. a tiny release metadata record containing build ID, schema compatibility range, and IANA version—never planner data.

Installation succeeds only when every required response is fetched, validated, and written to a temporary build cache. A partial install must fail and delete its temporary cache; the existing worker/cache remains active.

### Deterministic generation

Do not manually list Next.js chunk hashes. After `next build`, an explicit script should consume Next's emitted route/build metadata plus the selected static route outputs, enumerate referenced `.next/static` files and dynamic imports, map them to public URLs, hash/revision non-hashed files, sort deterministically, and run Workbox `injectManifest`. The script must fail on:

- a referenced missing file;
- a URL outside the same-origin allowlist;
- duplicate URLs with differing hashes;
- source maps, development assets, server-only files, or secrets;
- unclassified dynamic imports;
- more than 10 MiB raw or 5 MiB transfer-estimated required assets without explicit review; or
- failure to locate exactly one approved pinned timezone data graph.

`workbox-build@7.4.0` should be a development dependency only. The generated worker is a release artifact, not a source of route truth. The Phase 6B2B spike must establish which Next 16.3.5 output metadata is stable enough to adapt and snapshot-test; undocumented file formats must be isolated behind one tested adapter.

Precache responses should be fetched with credentials appropriate for same-origin public assets but must not include user-specific/authenticated material. There are currently no accounts.

## 15. Runtime-cache strategy

Runtime caching is intentionally narrow:

- **Known navigations:** network-first with a 2–3 second timeout, falling back to the matching current/previous precached document. On success, cache only status 200, same-origin, expected `text/html`, approved clean pathname, and a query-normalized cache key.
- **Hashed chunks:** cache-first from the precache. A network fallback may retrieve an exact same-origin hashed URL, but should not populate an unbounded generic cache.
- **Manifest and stable named brand files:** stale-while-revalidate or network-first, at most 10 assets and 30 days. A release precache remains authoritative offline.
- **Everything else:** no runtime write. Cross-origin requests, unknown routes, sitemap/robots, downloads, non-GET, errors, redirects, and opaque responses remain uncached.

The total application-managed cache target is 15 MiB raw with a hard 25 MiB rejection threshold during installation. Retain at most two complete release precaches (active and immediate predecessor) plus the bounded named-asset cache. Browser quota remains implementation-defined; these limits reduce risk but do not create a storage guarantee.

No expiration decision may delete assets required by a controlled client. Cleanup is release-aware, not just time-based.

## 16. Navigation handling

| Navigation                  | Online                                                              | Offline                                                                                          |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Clean `/`                   | Network-first server HTML, then existing restoration                | Cached clean shell; restore last planner or default generator                                    |
| Valid `/?v=1&...`           | Request normally; store only under normalized `/`; parse V1 locally | Cached `/` shell returned while requested URL remains; parse and canonicalize locally            |
| Malformed/non-V1 query      | Existing client validation/error/canonical policy                   | Same cached shell and same local validation; no query cache entry                                |
| Known content route         | Network-first and refresh exact clean route                         | Exact cached content                                                                             |
| Unknown route               | Network; preserve server 404                                        | Dedicated offline document with an offline/unavailable status representation; never the homepage |
| Uncached known future route | Network if available                                                | Offline document with link to main planner and retry                                             |
| Reload/deep link            | Same decision by pathname                                           | Cached exact route or fallback                                                                   |
| Installed launch            | Clean `/`                                                           | Cached `/` with normal restoration                                                               |
| Same-origin link            | Normal navigation inside scope                                      | Known cached route or fallback                                                                   |
| Cross-origin link           | Browser/network                                                     | Browser offline error; worker does not intercept                                                 |

The query-normalization function recognizes only the homepage navigation key. It removes the entire search string and fragment for cache lookup/write but does not mutate `location` before the existing V1 parser runs. Arbitrary query permutations are never permanent entries. Canonicals, metadata, and server-rendered initial documents remain unchanged.

Next.js client transitions can request RSC/flight representations with framework-specific query/headers. The spike must inventory these requests. The first release should prefer full-document/offline-safe navigation for content routes unless a precisely tested allowlist maps the required RSC artifacts to the same release. Never generically strip Next internal query parameters and cache a possibly incompatible RSC response as HTML.

## 17. Offline fallback

Create one future static `/offline` document, precached, non-indexable, omitted from the sitemap, and not linked as a separate product surface. It should use the normal accessible visual system and say, in plain language:

> This page is not available offline. You can open Shift Calendar to use planners saved on this browser, or try this page again when you’re connected.

Actions: **Open Shift Calendar** (`/`) and **Try again** (repeat the original navigation when online). The fallback must have a document title, main heading, focus-visible controls, no technical stack text, and no claim that requested content or unsaved server data was preserved. It may report the original pathname as text only after safe encoding; simpler is to omit it.

If even the fallback is unavailable, allow the browser's native failure. Do not synthesize a successful homepage response for every pathname. A missing hashed chunk is an application-version failure, not an ordinary offline navigation; show a controlled “required application files are unavailable” recovery state when the loaded app can do so, preserve IndexedDB, and offer retry/update without clearing data.

## 18. Timezone resolver offline behavior

Preserve the Phase 6A4 design exactly: dynamic import, `timezonecomplete`, explicit initialization with the direct pinned `tzdata` object, release verification, and no host-only `Intl` fallback.

The required behavior is:

- The build generator identifies and precaches the timezone dynamic-import chunk and every transitive browser asset. Precache downloads do not execute or parse it, so the initial route's execution/hydration cost remains lightweight.
- The assets live in `shift-calendar-timezone-<build-id>-iana-2026d` or an equivalently explicit group and are cache-first.
- If service-worker installation has not completed, timed export offline must fail closed with: “Timed export needs timezone files that have not finished installing. Connect and try again.” It must not silently reinterpret times.
- A new IANA version ships only with a new app build, cache namespace, tests, and verified explicit initialization. The worker never fetches timezone data from a CDN.
- Retain only current and immediate previous build/IANA groups while their clients may exist. An app build must never consume a timezone chunk from another build.
- The build audit rejects nested/stale copies by checking the resolved package path, lockfile versions, embedded release sentinel, expected graph, and duplicate timezone signatures.
- Display the active IANA release in the timed-export help/diagnostic UI and application diagnostics/About detail; do not store it in planners or expose private values. Existing ICS semantics need not gain a proprietary version field.

Tests must cover first-use timed export offline after successful installation, failure before installation completes, DST gap/overlap resolution, new IANA release activation, rollback, and absence of stale nested data.

## 19. IndexedDB compatibility

The recommended separation is confirmed:

- the service worker never opens, reads, writes, migrates, enumerates, exports, or logs planner IndexedDB;
- planner data is never copied into Cache Storage;
- only application code through the validated persistence adapter controls schema and records;
- installation, activation, cache cleanup, and worker failure never delete site storage; and
- “Clear cache” recovery must not call `Clear-Site-Data` or remove IndexedDB.

Each release metadata record should declare an application build ID and the minimum/maximum planner schema it can safely open. The loaded application already rejects unknown schemas; future migrations must remain transactional, monotonic, validation-first, and backed by tests. Before code that writes a new schema is activated, it must be able to read the previous schema and recover from interrupted migration.

An older open tab after a new deployment keeps its old worker/assets and may continue writing only the schema it understands. It must not activate new code underneath itself. Once a newer application migrates a planner to a schema an old tab does not understand, that old tab must become read-only/blocked on next repository access, display “A newer version updated this planner,” and never overwrite it. Revision checks remain authoritative.

An offline old application confronted with newer data must fail closed and preserve bytes; it may offer JSON export only if the existing adapter can export without lossy interpretation. It must not downgrade records. Schema-breaking releases require explicit compatibility review and may require all old tabs to close plus a backup recommendation before activation.

## 20. Update lifecycle

The policy is a hybrid: ordinary browser lifecycle plus user-mediated activation when an active client exists. Never immediately force `skipWaiting`.

| State                      | Required behavior                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. No worker               | Website works normally; register production worker after interactivity                                                                     |
| 2. Installing              | Build a temporary complete cache; no user notification unless installation fails in a user-visible install attempt                         |
| 3. Installed               | If first worker, wait for normal activation; if update, remain waiting                                                                     |
| 4. Activated               | Claim only after activation policy permits; report build compatibility; keep old caches needed by old clients                              |
| 5. Update found            | Silent while downloading/validating                                                                                                        |
| 6. New worker waiting      | Application validates worker message/build metadata                                                                                        |
| 7. User notified           | Non-modal status: “An update is ready.” Actions: **Update now**, **Later**                                                                 |
| 8. Update accepted         | Freeze new mutations briefly, flush pending autosave, await committed revision, check conflicts and controlled clients                     |
| 9. State protected         | Serialize only ephemeral UI needed across reload to session storage; planner remains committed in IndexedDB                                |
| 10. Refresh                | Send a validated `ACTIVATE_UPDATE` message, waiting worker calls `skipWaiting`, reload once on `controllerchange`                          |
| 11. Validate/migrate       | New app opens repository, validates schema, performs tested migration, then restores planner                                               |
| 12. Update failure         | Keep old active worker/app; explain retry without clearing planner storage                                                                 |
| 13. Offline update attempt | Keep current app; “Update when connected”; no repeated alarms                                                                              |
| 14. Multiple tabs          | Defer activation; identify that other Shift Calendar tabs must close or become safe, using client count plus BroadcastChannel coordination |
| 15. Cleanup                | After successful activation/health confirmation, remove only prefixed caches outside current/prior safe set and not needed by clients      |

“Update now” is enabled only when there are no raw unsaved edits, no pending IndexedDB transaction, no unresolved revision conflict/import, the active build declares schema compatibility, and the tab coordination check is safe. “Refresh required” is reserved for an unrecoverable version mismatch or missing required chunk; it still must wait for a committed planner and explicit action.

Routine install, fetch, activation, and connectivity events must not generate notifications. **Later** keeps the waiting worker. Closing every old client allows normal activation; a later clean launch uses the new version.

## 21. Cache versioning and cleanup

Recommended names (exact separators can be finalized by the spike):

- `shift-calendar-precache-<build-id>`
- `shift-calendar-pages-<build-id>`
- `shift-calendar-timezone-<build-id>-iana-2026d`
- `shift-calendar-assets-v1`
- `shift-calendar-temp-<build-id>` during installation

The build ID is a deterministic release/content identifier, not a timestamp generated differently across identical builds. Runtime policy versions are explicit (`v1`) and change only when semantics change.

Install into temporary caches, verify every entry, then mark the release ready. During coexistence, retain the active build and one immediate predecessor. Do not delete predecessor assets during the new worker's `install`; old controlled clients may still request their chunks. Cleanup occurs after activation and a client/health check. Delete only cache names with the exact Shift Calendar prefix and only versions proven obsolete; never call broad `caches.keys()` deletion by exclusion alone.

Production must retain old hashed files on the server for at least the maximum rollout/rollback window—recommended two releases and at least 48 hours—so an old client can recover even if its cache misses. A rollback is a new deployment with its own build ID or a redeployment of the prior complete immutable asset set; it must not reuse a build ID for different bytes.

Maximum retained release caches: two complete versions. If a third arrives while a known old client remains, defer cleanup; if storage pressure prevents install, fail the new installation and keep the active release. Never trade planner data for cache space.

## 22. Multi-tab behavior

Use the existing BroadcastChannel concept with a distinct, validated application-update protocol that contains only build IDs, tab IDs, dirty/pending/conflict booleans, and acknowledgements—no planner content. Also query service-worker clients because BroadcastChannel messages can be missed.

When an update waits:

1. each tab reports whether it has raw edits, a pending save/import, conflict, or active destructive confirmation;
2. if more than one tab is controlled, **Update now** explains that other Shift Calendar tabs must be closed, unless a later tested protocol can make all tabs commit and consent;
3. no tab is auto-reloaded in the background;
4. stale tabs receiving a newer planner revision retain existing conflict protection and must not overwrite it; and
5. activation after every old tab closes is safe and quiet.

If a tab becomes unresponsive, wait for it to close. Do not bypass the guard with a timeout. This prioritizes local data over immediate deployment uptake.

## 23. Install interface

Start with browser-native install controls plus a restrained **Install Shift Calendar** action inside settings/help after the user has created or saved a planner. Do not show a first-visit banner, modal, or repeated toast.

- On Chromium where `beforeinstallprompt` is delivered, retain the event only for the current page lifetime and invoke it from a user gesture. The event is non-standard and must not be the product's only install path.
- On iPhone/iPad, show concise version-appropriate Share → Add to Home Screen/Open as Web App instructions only after the user asks for install help.
- On Safari macOS, point to Add to Dock where supported.
- On Firefox desktop or other browsers without an OS install path, omit the install action and keep an offline-capability/help explanation only when accurate.
- Never hide browser controls or claim installation is mandatory.

A dismissal timestamp may be stored in `localStorage` as non-authoritative UI preference state, e.g. suppress the optional suggestion for 90 days. It must not enter planner records, analytics, URLs, or backups. A settings action remains available. Installed-mode detection is an enhancement and must not change planner semantics.

## 24. Connectivity interface

Show no permanent green “online” indicator. When an `offline` event occurs, show a small non-alarming status near application status controls and announce once through a polite live region:

> You’re offline. Saved planners and cached features remain available.

When an `online` event follows, announce once: “Connection restored.” Remove the status after a short nonessential interval, respecting reduced motion. Do not move focus.

`navigator.onLine` and online/offline events are hints: browsers use differing heuristics and a LAN connection can report online without Internet reachability. Never disable local features solely because it is false or enable network-dependent claims solely because it is true. Actual navigation/update fetch failure determines “requested page unavailable” or “update unavailable.”

An action missing a cached dependency gets an action-specific inline error and **Retry**, distinct from generic network status. Live regions must deduplicate transitions, avoid announcing on every failed fetch, and not use color alone. Offline fallback recovery buttons remain keyboard accessible.

## 25. Security threat model

| Threat                             | Control                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overbroad service-worker control   | Dedicated origin; exact `/` scope; subpath scope if shared; no cross-origin interception; explicit allowed path                                                        |
| Stale vulnerable code              | Revalidated worker, bounded two-release retention, visible safe update, release health/rollback process                                                                |
| Cache poisoning                    | Same-origin HTTPS, allowlisted paths/types/status, content revisions, atomic install, no opaque/error/redirect cache writes                                            |
| Same-origin XSS                    | Preserve/tighten CSP and escaping; service worker does not mitigate an origin XSS and must not expose message commands without validation                              |
| Cached private data                | Normalize homepage query, never cache planner/backup/ICS/blob bodies, never log request URLs containing V1 data                                                        |
| Query URL leakage                  | No query cache keys; V1 remains base schedule only; no private notes/exceptions in URLs                                                                                |
| Cached errors                      | Cache only approved status 200/content types; fallback is explicit, not stored from a transient server error                                                           |
| Third-party compromise             | No third-party runtime assets; no cross-origin caching; dependency pinning and lockfile review                                                                         |
| Dependency supply chain            | Exact Workbox dev version, provenance/license/advisory review, generated-output inspection, Dependabot or equivalent review—not automatic upgrades                     |
| Manifest manipulation              | HTTPS, same origin, correct MIME, CSP, no user data/start parameters, review generated manifest                                                                        |
| Malicious update/server compromise | HTTPS and deployment controls; immutable image/artifact provenance; CSP. A compromised origin can update a worker, so protect CI/server credentials and audit releases |
| Downgrade/reused IDs               | Never publish different bytes under one build ID; schema compatibility checks; rollback as a complete signed/audited release                                           |
| Cache exhaustion/DoS               | Allowlist, entry/byte budgets, no arbitrary query/images/API caches, max two versions                                                                                  |
| Large Range responses              | Network-only for Range; no partial-response caching                                                                                                                    |
| Development worker escapes         | Production-only registration; explicit opt-in test origin; unregister/clear documented for test teardown                                                               |
| Shared device exposure             | Clear privacy copy; no account lock; recommend OS/browser profile controls and JSON backup handling                                                                    |
| Service-worker messages            | Validate source, type, build ID, and allowed state transition; reject unknown payloads; no eval/dynamic script URLs                                                    |

Production requires HTTPS. The `/sw.js` response should have `Content-Type: text/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`, `X-Content-Type-Options: nosniff`, the site's `Content-Security-Policy`, `Referrer-Policy`, and frame protection (`frame-ancestors` in CSP). The service-worker specification applies the worker script's CSP to the worker; use at least `default-src 'self'; script-src 'self'; connect-src 'self'` adjusted to the final site policy. Do not allow remote `importScripts`, unsafe evaluation, or third-party connections.

## 26. Privacy model

- Offline application assets are stored locally in Cache Storage; planner data remains separately in IndexedDB.
- Installation creates no account, server record, analytics identity, synchronization, or cross-device copy.
- Clearing browser/site/app data can remove planners, settings, service workers, and cached assets. Browser storage can also be evicted under implementation-specific storage pressure.
- Uninstall behavior differs by platform and may or may not clear the origin's browser storage. The product must not promise either outcome; provide explicit site-data guidance per platform after testing.
- A private JSON backup remains the durable, user-controlled recovery path. It can contain sensitive notes and must be stored and shared carefully.
- Offline use prevents network dependency for core work but does not protect data from people with the unlocked device/profile, local malware, browser extensions, backups of the browser profile, or operating-system access.
- Service workers can run for event handling within browser-controlled lifetimes when no visible page is open. Phase 6B2 registers no background reporting, push, sync, analytics, or tracking event.
- Install-prompt dismissal is an optional local UI preference only. It is not used for behavioral profiling and is not exported.

The application should request persistent storage through `navigator.storage.persist()` only after a meaningful user action such as saving an important planner, and only with explanatory copy. Browsers may deny it; success reduces but does not eliminate loss risk. Never make persistence permission a prerequisite for saving or installation.

## 27. SEO impact

Service-worker support must not change the server response, metadata, canonical, structured data, static generation, sitemap, robots, or clean `/` indexing policy. Crawlers and first-time visitors receive ordinary server-rendered HTML before a worker can control the page. The service worker must not be required to see indexable content.

The five current clean HTML routes stay in the sitemap. V1 query state remains canonical to clean `/` and never creates cache/index pages. `/offline` is `noindex`, omitted from the sitemap, and returned only as an offline failure response. There is no separate indexable installed-app route or mass-generated offline copy.

Online unknown URLs reach the server and retain proper 404 semantics. Sitemap/robots are network-only. Structured-data URLs may point to external canonical resources but do not cause the worker to fetch or cache them. Test server HTML with the worker disabled and validate that navigation interception does not replace an online crawl response.

## 28. Accessibility strategy

- The install action has a direct accessible name and exposes availability, not a generic icon-only label.
- The update notice is a non-modal status region. It does not steal focus; **Update now** and **Later** are keyboard reachable; focus returns logically if a disclosure closes.
- Offline/reconnected status uses one deduplicated polite announcement and visible text/icon, never color alone.
- No automatic refresh occurs while a person is typing, using a menu/dialog, reviewing a conflict, or printing. An accepted update saves first and announces that the page will reload.
- Respect `prefers-reduced-motion`; connectivity/install/update UI needs no essential animation.
- Standalone mode preserves zoom, text resizing, landmarks, skip links, focus indicators, browser/OS accessibility APIs, and 44px-class touch targets where established by UI guidance.
- The offline page has a descriptive title, one main landmark, heading, explanatory text, and accessible recovery actions.
- Maskable and monochrome assets maintain contrast under light/dark/high-contrast treatments, but the mark is not the sole status signal.
- Safe-area padding must not hide controls, and orientation is not locked.
- Do not announce every service-worker event, cache miss, save, or reconnect retry.

No WCAG conformance claim follows from this architecture. Screen-reader, keyboard, zoom, contrast, and reflow testing are still required.

## 29. Responsive and standalone behavior

Automated and manual layouts must cover 320, 390, 768, 1024, and 1440 CSS pixels. Test browser and standalone display separately on Android, iPhone/iPad, macOS, and Windows.

Requirements:

- use CSS `env(safe-area-inset-*)` only where needed and ensure zero-inset browsers are unchanged;
- theme/status-bar color should align with `#176b64` without placing essential text beneath system chrome;
- support display cutouts, portrait/landscape, iPad split view, desktop minimum window widths, 200% text, and virtual-keyboard viewport changes;
- keep browser Back/history semantics; do not draw a fake native title bar or browser frame;
- make external-link behavior understandable in standalone mode and do not force external sites into the app scope;
- verify print preview and return-to-app behavior in installed mode; and
- avoid relying on hover, window controls overlay, or a fixed viewport height.

The year view may use existing responsive/print layouts. Installation must not introduce horizontal document overflow at any required width.

## 30. Dependency comparison

Versions and maintenance observations are as of 2026-09-18.

| Approach                                               | Version/license                                                    | Next 16.3.5/App Router/Turbopack fit                                                                                                                                                                                                                     | Build/runtime impact                                                                              | Update/security/testing                                                                                           | Decision                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Fully native custom worker + custom manifest generator | No package                                                         | Maximum control, but must interpret Next output and revisions itself                                                                                                                                                                                     | Smallest worker; highest bespoke build code                                                       | Excellent policy control; cryptographic/revision and dependency-graph logic becomes project maintenance           | Fallback if spike proves a small stable generator |
| Workbox `workbox-build`                                | `7.4.0`, MIT; current release observed Nov 2025                    | Framework-neutral; `injectManifest` can run after Next build, including Turbopack output, provided our adapter supplies correct URLs                                                                                                                     | Dev dependency; generated precache/runtime helpers add measured worker bytes, no app-route bundle | Mature precache primitives; app still owns routing, messages, and update gates; good unit/integration testability | **Recommended**, subject to spike                 |
| Serwist Next integration                               | `@serwist/next`, `serwist` `9.5.12`, MIT; active July 2026 release | App Router support exists; official Next guide notes webpack-oriented setup, package source says `@serwist/next` does not directly support Turbopack and points to experimental/config alternatives; current issue history shows Next 16/Turbopack churn | Largest integration/config surface; may alter build mode                                          | Convenient generated precache and recipes, but more framework coupling and upgrade risk for this bounded app      | Not recommended for Phase 6B2                     |
| Serwist Turbopack/config mode                          | `@serwist/turbopack`/Serwist `9.5.12`, MIT                         | Specifically targets newer builds but is described as experimental/integration-sensitive                                                                                                                                                                 | Extra config/build system                                                                         | Needs broader acceptance matrix and ties release to evolving adapter                                              | Re-evaluate later, not initial choice             |

No fourth dependency is justified. Next's official PWA guide provides manifest patterns and names Serwist for offline support, but it does not remove this application's need for query normalization, privacy exclusions, timezone verification, or safe planner-aware updates.

### Dependency recommendation

Add exactly `workbox-build@7.4.0` as a development dependency only if Phase 6B2B succeeds. Use `injectManifest` against an application-owned worker source and an application-owned deterministic asset enumeration. Do not add `workbox-window` initially; a small typed registration/message controller is sufficient. Do not use a generated “cache all” runtime route.

The spike must measure lockfile/package impact, generated worker raw/gzip size, build duration, license/provenance, known advisories, deterministic output across two clean builds, and Docker/self-hosted behavior. If it fails, implement the same architecture with a small native generator rather than switching silently to Serwist.

## 31. Recommended implementation architecture

The 30 required recommendations are:

1. **Proceed with installation:** yes, as progressive enhancement after Phase 6B2B.
2. **Offline promise:** use the exact wording in section 7.
3. **Worker approach:** small application-owned worker plus build-time injected asset metadata.
4. **Dependency:** yes, provisionally, development-only.
5. **Exact dependency:** `workbox-build@7.4.0`, MIT, subject to spike/security review.
6. **Manifest identity/scope:** ID `/`, scope `/` on a dedicated origin.
7. **Start URL:** clean `/`, no tracking/configuration/planner data.
8. **Display:** `standalone`; no initial `display_override`.
9. **Orientation:** `any`.
10. **Icons:** favicon 16/32/48, Apple touch 180, PNG any 192/512, PNG maskable 192/512; optional tested monochrome SVG/screenshots.
11. **Precache:** deterministic complete, atomic build set including all routes and timezone graph.
12. **Runtime cache:** bounded known same-origin documents/brand assets only; no catch-all.
13. **Navigation:** network-first known documents, cache-first hashed assets, exact-route fallback.
14. **Offline fallback:** one static noindex `/offline`; never fake homepage for unknown URLs.
15. **V1:** keep URL, reuse clean cached root, parse locally, never cache query variants.
16. **Timezone:** precache matching dynamic graph while preserving lazy execution; fail closed if absent.
17. **Versioning:** deterministic build ID, IANA version, policy version; retain current + previous.
18. **Activation:** waiting worker, explicit safe update; no immediate forced `skipWaiting`.
19. **Multi-tab:** defer until other old tabs close or all tested safety conditions are met.
20. **IndexedDB/schema:** worker never touches data; validated application migrations; old code fails closed on new schema.
21. **Install prompt:** native controls first; restrained settings/help action after meaningful use; respect dismissal.
22. **Offline status:** small status and deduplicated polite announcements; `navigator.onLine` is a hint only.
23. **Limits:** target 15 MiB, hard install threshold 25 MiB, two release versions, 6 document and 10 named-asset runtime entries.
24. **Headers:** immutable hashed assets; revalidated HTML/manifest; no-store SW; correct MIME, CSP, nosniff, scope header.
25. **Deployment:** atomic complete release, publish assets before HTML/SW, retain two releases/48 hours, health-check then cleanup.
26. **Automated tests:** unit policy tests, worker integration harness, isolated Playwright production server, manifest/header/audit checks.
27. **Manual matrix:** Chrome Android/desktop, Edge Windows, Safari iPhone/iPad/macOS, Firefox desktop/Android, Samsung Internet.
28. **Phase 6B2B:** required before implementation.
29. **Later 6B2 scope:** manifest/assets, offline page, build generator, worker/registration/update/connectivity/install UX, headers/docs/tests/deployment changes only.
30. **Deferred:** every section 6 non-goal, URL V2, background APIs, sync/accounts/notifications/analytics, richer shortcuts and display override.

## 32. Deployment requirements

The target is a user-owned Ubuntu server, Docker, custom domain, and HTTPS.

### Response headers

| Resource                  | Required production policy                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sw.js`                  | `text/javascript; charset=utf-8`; `Cache-Control: no-cache, no-store, must-revalidate`; `Service-Worker-Allowed: /`; CSP; nosniff; no CDN transformation  |
| `/manifest.webmanifest`   | `application/manifest+json`; `Cache-Control: public, max-age=0, must-revalidate`; CSP/nosniff                                                             |
| `/_next/static/<hash>...` | Correct JS/CSS/image MIME; `Cache-Control: public, max-age=31536000, immutable`; Brotli/gzip with correct `Vary: Accept-Encoding`                         |
| HTML documents            | `text/html; charset=utf-8`; `Cache-Control: public, max-age=0, must-revalidate` (or documented CDN equivalent preserving freshness); CSP/security headers |
| Icons/screenshots         | Correct image MIME; versioned files immutable; stable named files revalidated                                                                             |
| Sitemap/robots            | Correct XML/text MIME; short/revalidated public cache; never service-worker fallback                                                                      |
| Build metadata JSON       | Same-origin; correct JSON MIME; no-store/revalidate according to role; contains no private data                                                           |

Disable `X-Powered-By` in the implementation and define a reviewed production CSP compatible with Next's actual output. HTTPS redirect and HSTS belong at the reverse proxy after domain validation. Compression must not change content identity or omit `Vary`; never compress already compressed PNGs unnecessarily.

### Release ordering and rollback

1. Build and test one immutable Docker image/artifact containing HTML, worker, manifest, and every referenced static file.
2. Upload/start the new revision while the previous revision/assets remain reachable.
3. Publish new hashed assets first, then documents/manifest, and `/sw.js` last.
4. Health-check HTTPS, content types, headers, precache URLs, service-worker installation, root/content routes, and offline smoke test.
5. Shift traffic atomically only after health checks.
6. Retain the prior complete assets and image for at least 48 hours/two releases.
7. Roll back the complete release, never only HTML or only the worker. Do not reuse a build ID for changed bytes.

A reverse proxy must not cache `/sw.js` beyond its directives, rewrite it to HTML, strip the scope header, or serve a stale error with status 200. Docker health checks should verify build ID consistency and sample referenced chunks, not merely process liveness.

## 33. Automated test matrix

### Unit tests

- deterministic cache/build/timezone name generation;
- request classification for method, origin, destination, pathname, query, Range, content type, status, redirect, and opaque response;
- root/V1/Next-internal query normalization without loss of browser URL;
- cache allowlist and every exclusion (backup, ICS/blob, maps, dev, extension, cross-origin, unknown route);
- known-route and offline-fallback selection;
- update-state transition table, invalid messages, dirty/pending/conflict/multi-tab gates;
- manifest schema/values, clean start/scope/ID, icon purpose/size/type, screenshot metadata;
- cleanup decisions with current/previous/unknown/unrelated caches and active clients;
- size/entry budgets and deterministic manifest ordering; and
- timezone graph/version validation including nested stale-copy rejection.

### Service-worker integration tests

Use a real production build on an isolated HTTPS-equivalent localhost origin with SW registration explicitly enabled. Test install, atomic precache completion/failure, activation, fetch routing, query normalization, runtime limits, offline known/unknown navigation, fallback, old/new coexistence, waiting behavior, user activation, failed assets, stale chunk recovery, network restoration, cleanup, excluded downloads/imports/exports, and timezone first-use behavior. Inspect Cache Storage to prove no query/private/blob content was written.

### Playwright

Add a dedicated production PWA project, initially Chromium plus browser-specific CI where reliable. Required scenarios:

1. first online visit and uncontrolled-to-controlled transition;
2. registration and reload under worker control;
3. offline reload of `/`;
4. IndexedDB planner restoration offline;
5. edit/autosave/reopen offline;
6. list/create/switch/duplicate/delete planners offline;
7. monthly/yearly calendar, exceptions, statistics, and insights offline;
8. JSON export and import offline without cache entries;
9. all-day ICS offline;
10. timed ICS offline after timezone precache;
11. timed ICS failure before timezone availability;
12. timezone search and DST gap/overlap offline;
13. valid and malformed V1 query behavior offline;
14. cached content navigation and uncached deep-link fallback;
15. online unknown route remains 404;
16. update available, deferred, accepted after committed save, and failed update;
17. two-tab defer/close/activate flow and stale-tab conflict protection;
18. planner survival and schema validation after update/rollback;
19. all static routes, canonicals, sitemap, robots, and structured data online;
20. no private-data network request/cache entry/log;
21. no overflow at 320, 390, 768, 1024, and 1440 pixels;
22. keyboard/live-region/focus/reduced-motion behavior; and
23. standalone display emulation only where reliable, labelled as emulation.

Test teardown unregisters the worker and clears only the isolated test origin. Development's ordinary `npm run dev` must not register it.

### Manifest and audit checks

Validate JSON/schema, referenced files, image dimensions/purposes/safe-zone review, clean ID/start/scope, HTTPS and response headers, worker scope, offline readiness, CSP, accessibility, SEO, and best practices. Run current Lighthouse checks as one signal while recording that Lighthouse's historical PWA category/criteria have changed; no score is the acceptance criterion.

## 34. Manual test matrix

| Area                | Platforms                                                                                         | Checks                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Installation        | Chrome Android/desktop, Edge Windows, Safari iPhone/iPad/macOS, Firefox Android, Samsung Internet | Native controls, optional custom action, dismissal, icon/name, launch scope                 |
| Unsupported install | Firefox desktop and any unsupported/version-specific browser                                      | Normal website remains usable; no misleading button                                         |
| Offline launch      | All install-capable platforms                                                                     | Launch after successful install and device/browser restart; saved planner restore           |
| Storage             | iOS/iPadOS/macOS Safari, Android browsers, desktop browsers                                       | site-data clearing, uninstall, storage pressure/eviction where practical, private/incognito |
| Updates             | Chromium, WebKit, Firefox                                                                         | waiting notice, Later, single-tab safe update, multiple tabs, offline update, rollback      |
| Files/print         | Every target                                                                                      | JSON/ICS download and import, timed export, print from browser and installed mode           |
| UI/accessibility    | Required devices plus NVDA/Edge or Chrome, VoiceOver/Safari, TalkBack/Chrome                      | keyboard, screen reader, zoom/text size, live regions, focus, contrast, reduced motion      |
| Layout              | 320/390/768/1024/1440 and real devices                                                            | cutout/safe area, keyboard, portrait/landscape, split view, minimum desktop window          |
| Deployment          | Production-like Ubuntu/Docker/reverse proxy                                                       | HTTPS, MIME, CSP, cache headers, scope, compression, atomic release, old assets             |

Manual reports must record browser/OS/device/version and distinguish observed results from documentation. “Works on Safari” is not an acceptable aggregate result.

## 35. Documentation impact

Do not edit these in Phase 6B2A. Later implementation should update:

| Document               | Future change and reason                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `README.md`            | Install/offline development, production build, test flag, generated worker, deployment headers  |
| `docs/PRODUCT.md`      | Bounded returning-visit offline promise and install capability; explicit storage limits         |
| `docs/DOMAIN.md`       | No schedule-rule change expected; add nothing unless version terminology becomes domain-visible |
| `docs/ARCHITECTURE.md` | SW/cache boundaries, generated build metadata, IndexedDB independence, update protocol          |
| `docs/UI-UX.md`        | Install/help, offline status, update/fallback interactions and accessibility copy               |
| `docs/SEO.md`          | Navigation interception rules, `/offline` noindex, query normalization, crawler invariants      |
| `docs/TESTING.md`      | Unit/SW/Playwright/manual PWA matrix and isolated teardown                                      |
| `docs/SECURITY.md`     | SW scope, cache exclusions, CSP/headers, dependency/update/cache threat model                   |
| `docs/DECISIONS.md`    | Workbox/native choice, precache promise, waiting activation, two-version retention              |
| `docs/ROADMAP.md`      | Mark 6B2A/6B2B/implementation sequencing and deferred features                                  |
| Deployment docs        | Ubuntu/Docker/reverse-proxy HTTPS, MIME/cache/scope headers, atomic rollout/rollback            |
| Privacy/public copy    | Local caches, IndexedDB, no account/sync, eviction/clearing/uninstall caveats, backup advice    |

## 36. Proposed Phase 6B2 implementation scope

### Phase 6B2B — mandatory focused spike

Without changing product behavior, prove:

1. exact Next 16.3.5/Turbopack asset and dynamic-import discovery;
2. deterministic Workbox `injectManifest` output across two clean builds;
3. inclusion and independent identification of IANA `2026d` assets;
4. generated worker size/build-time/lockfile/security/license impact;
5. `next start` and Docker serving at `/sw.js` with required headers;
6. root and possible base-path URL mapping;
7. atomic failed install and two-build coexistence;
8. isolated Playwright service-worker control; and
9. no source maps, server files, query pages, nested timezone data, or private data in the manifest/cache.

The spike returns measurements and a go/no-go recommendation. It must not silently begin the full UI or production rollout.

### Later Phase 6B2 implementation

After approval: create final icons/screenshots; extend the manifest; add the noindex offline route; add deterministic build generation and application-owned worker; add production-only registration; implement typed update/multi-tab coordination, install help, and connectivity status; configure headers/CSP; add automated/manual tests; update durable docs/deployment; and verify production-like Docker behavior. No feature beyond this specification enters that phase.

## 37. Deferred features

All explicit non-goals in section 6 remain beyond Phase 6B2. Also defer manifest shortcuts, `display_override`/window controls overlay, badge APIs, protocol/file handlers, share-target/file-handling registration, richer screenshot galleries, background update messaging, and storage-management UI until separate evidence and approval exist.

## 38. Open decisions requiring approval

1. **Approve the Phase 6B2B Workbox spike:** `workbox-build@7.4.0` as a development dependency, with native generation as the fallback.
2. **Approve precaching the timezone graph:** approximately 331,913 raw bytes in the inspected build, preserving lazy execution but enabling first-use offline timed export.
3. **Approve the public promise and 15/25 MiB cache budgets:** wording and limits in sections 7 and 15.
4. **Confirm deployment origin:** a dedicated root origin is assumed. A shared origin or required subpath changes manifest/scope/navigation design and must be decided before implementation.
5. **Approve conservative multi-tab updates:** activation waits for other tabs to close rather than forcing them to reload.

No other architectural question blocks the focused spike.

## 39. Acceptance criteria

Phase 6B2A is complete when this document is reviewed and the following remain true:

- current source, production output, routes, metadata, assets, client boundaries, persistence, V1, backup/export/print/timezone, headers, scripts, dependencies, and tests were inspected;
- all current routes and request classes are classified;
- primary sources and browser differences are recorded without claiming manual certification;
- manifest identity, fields, icons, scope, install UX, offline promise/fallback/status, and responsive/accessibility behavior are explicit;
- precache/runtime/navigation/query/timezone rules are deterministic and bounded;
- IndexedDB and Cache Storage are independent;
- update activation cannot silently discard active planner state, including multiple tabs;
- cache coexistence, cleanup, deployment, rollback, security, privacy, SEO, and testing are specified;
- one dependency recommendation and one mandatory spike are identified; and
- Phase 6B2A changes only this research document and creates no commit, push, deployment, implementation plan, or production implementation.

## 40. Sources

All external sources were accessed on **2026-09-18**. “Specification” means normative/standards-track material; “browser documentation” means vendor or MDN behavior guidance; “observed” means repository/build/package state inspected for this report.

| Source                                                                                                                                                                                                    | Publisher       | Evidence type                    | Use                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| [Web Application Manifest](https://www.w3.org/TR/appmanifest/)                                                                                                                                            | W3C             | Specification                    | Identity, start URL, scope, display, icons, safe zone, install non-uniformity |
| [Manifest application information](https://www.w3.org/TR/manifest-app-info/)                                                                                                                              | W3C             | Specification                    | Screenshots, labels, form factor                                              |
| [Service Workers](https://www.w3.org/TR/service-workers/)                                                                                                                                                 | W3C             | Specification                    | Lifecycle, secure context, scope/allowed header, worker MIME/CSP              |
| [Storage Standard](https://storage.spec.whatwg.org/)                                                                                                                                                      | WHATWG          | Specification                    | Buckets, persistence, implementation-defined quota/eviction                   |
| [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)                                                                                                                             | MDN/Mozilla     | Browser documentation            | Secure context and private-mode caveats                                       |
| [Using service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)                                                                                        | MDN/Mozilla     | Browser documentation            | Registration, install/activate/fetch patterns                                 |
| [Service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)                                                                                                                             | Google/web.dev  | Browser documentation            | Waiting workers, version coexistence, skipWaiting risk                        |
| [Handling service-worker updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates)                                                                                              | Google Chrome   | Browser documentation            | User-mediated update patterns                                                 |
| [`updateViaCache`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache)                                                                                             | MDN/Mozilla     | Browser documentation            | Worker import cache policy                                                    |
| [`navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)                                                                                                                   | MDN/Mozilla     | Browser documentation            | Connectivity heuristics are inherently unreliable                             |
| [Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)                                                                               | MDN/Mozilla     | Browser documentation            | Cross-browser install differences                                             |
| [Triggering installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt)                                                                                | MDN/Mozilla     | Browser documentation            | `beforeinstallprompt` is non-standard/Chromium-specific                       |
| [Defining app icons](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons)                                                                                           | MDN/Mozilla     | Browser documentation            | Icon formats and purpose guidance                                             |
| [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)                                                                                                                              | Vercel/Next.js  | Framework documentation          | Built-in manifest and current offline-tool guidance                           |
| [Next.js manifest convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)                                                                                               | Vercel/Next.js  | Framework documentation          | App Router manifest generation                                                |
| [Next.js app icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)                                                                                                        | Vercel/Next.js  | Framework documentation          | Icon metadata/file behavior                                                   |
| [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)                                                                                                                                   | Vercel/Next.js  | Framework documentation          | Reverse proxy and immutable static caching                                    |
| [Next.js headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)                                                                                                                | Vercel/Next.js  | Framework documentation          | Response header configuration                                                 |
| [Installable manifest audit](https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest)                                                                                                       | Google Chrome   | Browser documentation            | Chromium icon/install history and Lighthouse deprecation context              |
| [Edge PWA setup](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/)                                                                                                           | Microsoft       | Browser documentation            | Edge manifest/install/SW behavior                                             |
| [Edge installed UX](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/ux)                                                                                                    | Microsoft       | Browser documentation            | Windows/Edge installation surfaces                                            |
| [Bookmark a website in Safari on iPhone](https://support.apple.com/en-lb/guide/iphone/iphea86e5236/ios)                                                                                                   | Apple           | Browser/platform documentation   | Add to Home Screen/Open as Web App                                            |
| [Web Push for web apps on iOS/iPadOS 16.4](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)                                                                                        | WebKit          | Browser documentation            | Home-screen web app manifest/display behavior                                 |
| [WebKit features in Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)                                                                                                             | WebKit          | Browser documentation            | Current Safari add-to-home/dock behavior                                      |
| [Safari web application configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) | Apple           | Browser documentation (archived) | Apple touch icon sizes; requires current-device verification                  |
| [Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)                                                                                                                     | WebKit          | Browser documentation            | WebKit quotas and origin-wide eviction                                        |
| [Tracking Prevention](https://webkit.org/tracking-prevention/)                                                                                                                                            | WebKit          | Browser documentation            | Home-screen first-party storage distinction                                   |
| [Firefox Android web apps](https://support.mozilla.org/en-US/kb/use-web-apps-firefox-android)                                                                                                             | Mozilla         | Browser documentation            | Android install behavior                                                      |
| [Workbox caching strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)                                                                                                       | Google Chrome   | Library/browser documentation    | Strategy trade-offs                                                           |
| [Workbox repository/releases](https://github.com/GoogleChrome/workbox)                                                                                                                                    | Google Chrome   | Official project documentation   | Version 7.4.0, license, maintenance                                           |
| [Serwist releases](https://github.com/serwist/serwist/releases)                                                                                                                                           | Serwist project | Official project documentation   | Version 9.5.12 and maintenance                                                |
| [`@serwist/next`](https://www.npmjs.com/package/@serwist/next)                                                                                                                                            | Serwist/npm     | Official package metadata        | Package version/license                                                       |
| [Serwist Next integration source](https://github.com/serwist/serwist/blob/main/packages/next/src/index.ts)                                                                                                | Serwist project | Official project source          | Turbopack support warning/config mode                                         |
| [Serwist Next 16 support issue](https://github.com/serwist/serwist/issues/301)                                                                                                                            | Serwist project | Official issue tracker           | Compatibility history                                                         |
| [Serwist Turbopack discussion](https://github.com/serwist/serwist/discussions/314)                                                                                                                        | Serwist project | Official discussion              | Current integration path/complexity                                           |
| [Serwist Next 16.2 runtime issue](https://github.com/serwist/serwist/issues/360)                                                                                                                          | Serwist project | Official issue tracker           | Residual integration risk; not a universal failure claim                      |

Repository evidence is the source tree and `.next` production output at `4d96300`, plus the prior approved local-persistence and Phase 6A4 research/plan documents. Package versions came from the committed package manifest/lockfile. No external blog was used for a critical decision.

## 41. Git status and scope confirmation

Before research, `git status --short` was empty. The inspected branch was `main`; `HEAD` and `origin/main` both referenced `4d96300` (`feat: add local planner persistence and backups`). The five-entry history was:

```text
4d96300 (HEAD -> main, origin/main) feat: add local planner persistence and backups
f253076 docs: specify local persistence and backup architecture
15e1b52 feat: add timed work calendar export
77c1d0a docs: validate timed ICS timezone dependencies
ad078f6 docs: specify timed ICS timezone architecture
```

Phase 6B2A creates exactly this research document. It does not change production source, tests, dependencies, lockfiles, the existing manifest, service-worker files, icons, existing durable documentation, Next.js configuration, or an implementation plan. Final post-format status and verification are recorded in the task handoff rather than asserted in advance here.
