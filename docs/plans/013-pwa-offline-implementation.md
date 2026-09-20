# Plan 013 — Dependency-free PWA and offline support

- **Status:** Complete
- **Phase:** 6B2C
- **Architecture:** `docs/research/pwa-offline-specification-2026-09.md`
- **Build spike:** `docs/research/pwa-build-spike-2026-09.md`

## Verified application and route inventory

- The implementation baseline is `da402fa` on `main`, with Phase 6B2A at `16a0c47` and Phase 6B2B at `da402fa`.
- Next.js is `16.3.5` with App Router and Turbopack. The repository requires Node 24; the supported bundled runtime is Node 24.19.0 while the host wrapper reports Node 22.
- The production route set is `/`, `/about`, `/shift-schedules`, `/shift-schedules/4-on-4-off`, and `/shift-schedules/2-2-3`, plus framework not-found and metadata routes. All current application routes build statically.
- The future `/offline` route is static, non-indexable, excluded from the sitemap, and used only after an unavailable navigation.
- `ScheduleGenerator` is the established client boundary. IndexedDB lives behind `IndexedDBPlannerRepository`; generated JSON/ICS downloads use local Blob URLs; printing uses `window.print()`.
- Timed export dynamically imports `timed-export-runtime`, which owns `timezonecomplete@5.15.1`, direct `tzdata@1.0.51`, and pinned IANA `2026d` verification. The timezone graph is not an initial root asset.
- No Docker, reverse-proxy, or deployment files exist. Deployment requirements remain a documented contract rather than invented infrastructure.

## Approved architecture

Use a dependency-free Node 24 post-build generator and a small application-owned classic service worker. The generator consumes actual Next.js output, validates the approved route and browser asset graph, injects a strict ordered manifest into the worker template, and writes public build artifacts atomically. The worker caches public application assets only and never opens IndexedDB.

Installation remains progressive enhancement. The normal server-rendered website, crawlable documents, metadata, canonicals, sitemap, robots, and V1 client parser remain authoritative.

## Manifest design

`src/app/manifest.ts` will declare stable ID `/`, clean start URL `/`, scope `/`, standalone display, unrestricted orientation, English LTR metadata, productivity/utilities categories, the established teal/background colors, and explicit ordinary and maskable PNG icons. It will contain no planner identifier, query, tracking token, or private state.

Root metadata will reference the Apple touch icon and retain the scalable SVG/favicon behavior. The manifest stays available as `/manifest.webmanifest` with Next's manifest MIME type and revalidation policy.

## Icon and branding assets

Preserve the existing teal rounded-square calendar mark. Add reviewed opaque PNGs at 192×192 and 512×512 for ordinary install surfaces, 192×192 and 512×512 maskable variants with essential artwork inside the central 80% safe diameter, and an opaque 180×180 Apple touch icon. Add a multi-frame favicon only if the available isolated generation path can validate its frames without adding a dependency; otherwise retain Next's existing SVG favicon as the browser icon and document the deferred legacy ICO frame.

All committed PNGs will be dimension-checked and budgeted. No icon-generation package enters `package.json` or the lockfile.

## Build-generator architecture

Create Node-only modules under `scripts/pwa/`:

1. validate Next `16.3.5` route and prerender metadata;
2. map the approved static routes to emitted HTML;
3. extract actual `/_next/static/` script and stylesheet references from emitted HTML;
4. require each referenced browser file below `.next/static`;
5. discover exactly one non-initial timezone chunk containing `TzDatabase` and IANA `2026d`, require one approved root referrer, and reject browser assets containing stale `2026b`;
6. add the manifest, approved icons, and offline document from the built server output/public assets;
7. reject source maps, server files, traces, previews/secrets, development assets, unknown URLs, duplicate URLs, conflicting revisions, missing/empty files, and absolute filesystem paths;
8. calculate SHA-256 revisions, stable-sort by URL, and derive the release ID from the complete canonical manifest;
9. enforce all approved byte/entry budgets;
10. inject a unique literal placeholder into the worker template, syntax-check the result, write a machine-readable summary, and atomically replace `public/sw.js` and its summary only after validation.

The package build script will run `next build` followed by the generator. The generator uses only `node:fs`, `node:path`, `node:crypto`, `node:zlib`, `node:url`, and `node:child_process` where syntax validation is required.

## Asset inclusion and exclusion

Include the clean homepage, four approved content documents, offline document, every actual browser JS/CSS dependency of those documents, the lazy timezone graph, manifest, multi-size ICO favicon, Apple touch icon, ordinary install icons, and maskable icons.

Exclude RSC/segment payloads as generic public files, server bundles, traces, build metadata copies, preview secrets, source maps, tests, reports, development assets, robots, sitemap, arbitrary query variants, uploaded/imported JSON, generated JSON/ICS, Blob URLs, planner data, IndexedDB data, cross-origin assets, and unknown requests.

## Cache budgets

The build fails rather than omitting an asset when any approved limit is exceeded:

- at most 24 precache entries;
- at most 2 MiB raw total;
- at most 500 KiB estimated gzip total;
- at most 512 KiB for one asset;
- at most two complete application cache versions.

The summary records entry count, total raw/gzip/Brotli estimates, largest entry, timezone bytes, worker raw/gzip/Brotli bytes, release ID, and IANA version.

## Service-worker lifecycle and atomic installation

The generated classic worker is same-origin only and has no external imports. During `install`, it creates `shift-calendar-temp-<release>`, fetches every manifest URL with explicit same-origin credentials/cache policy, validates status/type/body/revision, and deletes the temporary cache on any failure. It does not call `skipWaiting()` automatically.

On first installation, normal browser activation proceeds. For updates, the complete worker remains waiting. It accepts only an exact `{ type: "ACTIVATE_UPDATE", releaseId }` message with no extra fields; accepted activation calls `skipWaiting()`. Activation promotes/copies the verified temporary entries into `shift-calendar-precache-<release>`, retains the current and immediate predecessor release, removes obsolete Shift Calendar temporary caches, and never touches unrelated caches or IndexedDB.

## Navigation, V1 normalization, and fallback

- Clean `/`: network-first while online, cached clean root when unavailable.
- Any homepage query: preserve the address bar, use clean `/` as the only cache key, and leave valid/malformed V1 interpretation to the existing client parser.
- Approved content routes: network-first with exact cached-document fallback.
- Unknown route: preserve the online server response, including 404; use the dedicated cached offline document only when the navigation fetch fails.
- Static precache URLs: exact cache-first lookup; do not normalize arbitrary asset queries into another resource.
- RSC/internal navigation requests are not cached as HTML. Next may fall back to a full document navigation offline.
- Robots and sitemap remain network-only.

The offline document works without JavaScript, uses normal landmarks and focus styles, links to `/`, offers a retry action, explains saved planners may still be available, and is `noindex`.

## Runtime caching

Prefer no separate runtime cache. Required public documents and brand assets are release precached. Successful online known-document responses may refresh only their exact release document entries if revision-safe replacement can be proven; otherwise they remain network-first plus immutable release fallback. No generic runtime writes, arbitrary query caches, cross-origin caching, API caching, or download caching are added.

## Timezone graph and offline export

The generator precaches the exact lazy timezone graph without adding it to initial route execution. It requires IANA `2026d`, rejects `2026b`, and fails on zero/multiple ambiguous graph candidates. Timed export retains the current dynamic import and fails closed if required code/data cannot load. A timezone-byte change necessarily changes asset revision and release identity.

## IndexedDB isolation

The worker contains no IndexedDB calls and never receives planner contents. Cache Storage contains public release assets only. Existing validated repository reads, migrations, optimistic revisions, autosave, import, backup, and conflict handling remain authoritative. Updating the worker cannot clear, migrate, or downgrade planners.

## Update state machine and multi-tab coordination

A client-only controller registers only in production secure contexts after page stability. Tests require an explicit isolated opt-in. It detects waiting workers and shows a restrained non-modal update status with **Update now** and **Later**.

The generator exposes only private-free safety facts: whether a planner write is pending/failed/conflicted and whether the page is safe to reload. A dedicated BroadcastChannel exchanges tab ID, application release, safe/unsafe status, and update intent only. It never sends names, schedules, definitions, exceptions, notes, or backup contents.

**Update now** is allowed only when the current tab is safe and no other controlled tab is unsafe. If safety cannot be established or another tab remains open without consenting, the UI asks the user to close the other Shift Calendar tabs. There is no timeout override. After the exact activation message, the page waits for `controllerchange` and reloads once only when safe. **Later** leaves the worker waiting.

## Install and connectivity UX

Use browser-native installation controls first. Capture `beforeinstallprompt` only for the page lifetime and expose a restrained **Install Shift Calendar** action after meaningful planner use. Unsupported browsers receive concise install/offline help rather than a false install button. Do not show a first-visit banner or repeated prompt.

Use `navigator.onLine` only as a connectivity hint. A small status announces one offline transition and one restoration through a deduplicated polite live region without moving focus. Local planner actions remain enabled. Specific uncached/update failures provide their own retry guidance.

## Accessibility, privacy, security, and SEO

- Install, update, retry, and dismissal actions use labelled native buttons with visible focus and keyboard operation.
- Routine worker/connectivity events do not steal focus or create repeated live-region noise. Reduced-motion behavior and established touch targets remain intact.
- The offline route has one main landmark and heading; state is never color-only.
- Registration is production-only, secure-context-only, delayed, and explicitly controllable in isolated tests.
- Worker requests are `GET`, same-origin, allowlisted, non-opaque, and expected-content-type only. Messages are exact-shape validated. No `eval`, `new Function`, remote `importScripts`, tracking, background sync, push, or private logging exists.
- Existing server-rendered metadata, canonicals, structured data, sitemap, robots, and clean-root indexing remain unchanged. `/offline` is noindex and absent from the sitemap.

## Deployment header and release contract

`next.config.ts` will disable `X-Powered-By` and define reviewed headers for `/sw.js`, the manifest, offline document, and global security controls. `/sw.js` requires JavaScript MIME, `no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`, CSP, and nosniff. Hashed assets remain immutable; HTML/manifest/offline/stable icons revalidate and are never immutable.

The production operator must publish complete assets before `/sw.js`, switch releases atomically, retain current and previous complete release assets for at least 48 hours, health-check every precache URL/header, and roll back a complete release. No deployment configuration is invented in this repository.

## Testing matrix

- **Unit/build generator:** sorting, revisions, inclusion/exclusion, route discovery, duplicate/conflict/missing/malformed inputs, every budget, timezone graph/version/stale rejection, deterministic output, syntax validation, manifest metadata and icon dimensions.
- **Worker VM:** atomic success/failure cleanup, strict message validation, request classification, same-origin/method exclusions, root/query normalization, known/unknown navigation, exact static assets, cache names, and cleanup selection.
- **Components:** install availability/unsupported/dismissed states, offline/reconnection announcements, waiting update, Later, safe activation, current-save block, other-tab block, focus and keyboard behavior.
- **Playwright production project:** manifest/icons/headers, registration/control, cache completion, offline root/planner lifecycle/views/backup/ICS/timed export, V1/malformed queries, content routes, unknown fallback, update lifecycle, multiple tabs, Cache Storage privacy, responsive widths, keyboard and print regression.
- **Regression:** all existing unit/component and Chromium journeys, plus schedule suites under UTC, America/New_York, and Africa/Casablanca.

Manual-only verification remains required for Android/iOS/iPad/desktop installation, Safari standalone, offline launch after restart, uninstall, site-data clearing, eviction/private mode, screen readers, real reverse proxy/Docker, and atomic rollback.

## Files to create

- `src/app/offline/page.tsx`
- `src/features/pwa/pwa-controller.tsx`
- `src/features/pwa/pwa-client.ts`
- `src/features/pwa/pwa-protocol.ts`
- `src/features/pwa/index.ts`
- `src/pwa/service-worker-template.js`
- `scripts/pwa/pwa-build-lib.mjs`
- `scripts/pwa/generate-pwa.mjs`
- approved files below `public/icons/`
- focused unit/build/worker/component tests and production PWA Playwright coverage

## Files to modify

- `package.json` scripts only; no dependency or lockfile change expected
- `src/app/manifest.ts`
- `src/app/layout.tsx`
- `src/styles/globals.css`
- `src/features/schedule/components/schedule-generator.tsx` for private-free save-safety signalling
- `next.config.ts`
- `playwright.config.ts` and relevant existing tests
- `README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/UI-UX.md`, `docs/SEO.md`, `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, and this plan

## Explicit non-goals

No Workbox, Serwist, next-pwa, service-worker framework, state-management package, manifest/icon runtime dependency, push, background sync, reminders, accounts, cloud/cross-device synchronization, server planner storage, collaboration, integrations, analytics, advertising, URL V2, payroll, attendance, device APIs, provider calendar sync, or deployment.

## Acceptance criteria

The manifest and icons validate; offline HTML works without JavaScript; the post-build generator deterministically discovers and validates the real browser graph; all budgets are fatal; timezone `2026d` is precached but remains lazy; atomic installation cannot activate partial content; query permutations never expand caches; unknown routes receive the offline document only on network failure; the worker never accesses IndexedDB; updates remain waiting until explicit safe activation; multiple tabs are conservative; install/connectivity/update UI is accessible; no private data reaches cache/messages/network; regression tests and two clean builds pass; documentation is current; no dependency, commit, push, or deployment occurs.

## Verification commands

Use Node 24 for `npm ci`, lint, typecheck, unit/component tests, production Playwright, two clean builds, audits, and build comparison. Run schedule tests with `TZ=UTC`, `TZ=America/New_York`, and `TZ=Africa/Casablanca`. Validate generated manifest JSON, PNG dimensions, worker syntax/size, build summary, cache contents, no private data, responsive widths, Prettier only on changed files, `git diff --check`, and final `git status --short`.

## Implementation result

Phase 6B2C ships the dependency-free architecture described above. The final production graph contains exactly 24 entries: six static documents, ten initial root assets, the single lazy timezone asset, the manifest, favicon, Apple touch icon, and four ordinary/maskable install icons. The current measured graph is 1,369,956 raw bytes, 348,347 gzip bytes, and 297,101 Brotli bytes. The generated worker is 11,927 raw, 3,936 gzip, and 3,337 Brotli bytes. The largest asset is the 331,913-byte pinned IANA 2026d timezone chunk (57,524 gzip; 47,895 Brotli); it has exactly one lazy referrer and remains outside the ten-entry initial graph, whose measured size is 809,145 raw and 240,481 gzip bytes.

Two clean final builds produced an identical static asset graph, identical entry ordering, identical byte counts, and the same timezone/referrer graph. Next.js emitted a fresh build identifier into each of the six equal-size HTML documents, so their content revisions, release ID, and compressed totals changed as designed; revision generation remained a deterministic function of each build's actual bytes. No timestamp, absolute path, locale, or manually maintained chunk name enters the release identity.

Verification used bundled Node 24.19.0 and npm 10.9.2. The Windows `npm.cmd` launcher itself is tied to host Node 22, so Node 24 invoked npm's CLI directly and was prepended to child-process `PATH`; `.nvmrc` was unchanged. `npm ci`, ESLint, TypeScript, all 355 unit/component tests, the 304 schedule assertions under UTC, America/New_York, and Africa/Casablanca, all 48 existing Playwright journeys, all five production PWA journeys, both production builds, full and production-only dependency audits, changed-file Prettier, and whitespace checks passed. The New York matrix's interaction-heavy 56-position case exceeded its unchanged timeout only inside the combined constrained-host run and passed unchanged in isolation; Vitest now uses isolated serial `vmThreads`, and the exact final `npm test` passes without weakening any timeout or assertion.

The production PWA journey performs a real release-A-to-release-B worker update, proves waiting and Later behavior, blocks activation for an unsafe second tab, activates only after that tab closes, preserves the saved planner, and retains no more than two application caches. Other production coverage verifies exact cache contents, headers, offline saved-planner editing/autosave, month/year views, JSON export/import, all-day and timed ICS, V1 and malformed queries, cached content, cross-origin exclusion, unknown-route 503 fallback, absence of a private planner name in Cache Storage, and all required viewport widths.

Manual release checks remain required for install/uninstall and standalone behavior on Android, iPhone/iPad, macOS, Windows, Firefox and Samsung Internet where relevant; device restart, storage eviction, clearing site data, private browsing, real screen readers, print/download behavior in installed mode, safe-area/display-cutout behavior, and the actual Ubuntu/Docker/reverse-proxy HTTPS headers and 48-hour two-release retention. No dependency, commit, push, release, or deployment was created by this phase.
