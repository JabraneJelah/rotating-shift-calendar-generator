# Workbox and deterministic PWA build spike

**Phase:** 6B2B

**Status:** Completed spike; no production PWA implementation

**Date:** 2026-09-18

**Authoritative input:** `docs/research/pwa-offline-specification-2026-09.md`

## 1. Executive recommendation

**No-go for Phase 6B2C with `workbox-build@7.4.0`. Conditional go after approval to replace it with a small dependency-free Node 24 asset generator and application-owned classic service worker.**

The architecture itself is viable. Two clean Next.js 16.3.5/Turbopack builds exposed a stable, discoverable browser asset graph. The complete proposed release contains 19 entries, 1,326,082 raw bytes, 331,085–331,086 gzip bytes, and 281,637–281,640 Brotli bytes. The lazy timezone resolver is one automatically discoverable 331,913-byte chunk containing direct IANA `2026d`, no `2026b`, and no initial-route execution. Query normalization, offline route behavior, same-origin limits, atomic temporary-cache installation, and offline timezone retrieval all worked in an isolated Chromium harness.

The exact Workbox dependency does not meet the security/maintenance threshold. Its isolated install created 329 package entries and reported two deprecated packages plus three development dependency vulnerabilities: two moderate and one high. The high path is `workbox-build@7.4.0` → `@rollup/plugin-terser@0.4.4` → vulnerable `serialize-javascript`. `npm audit --omit=dev` found zero production vulnerabilities because Workbox was development-only, but a vulnerable build-time dependency still executes in CI/developer environments. Workbox also treats oversize files, empty globs, and duplicate conflicting URLs too permissively for this product: the first two are warnings and duplicates pass generation without a warning.

Workbox's useful contribution here is manifest enumeration/injection. The spike's application-specific discovery, validation, stable ordering, SHA-256 reporting, staging, query rules, cache lifecycle, and security checks remain custom. A native generator can perform the remaining JSON injection in a few auditable operations without 329 dependency entries. Do not silently substitute Workbox 7.4.1 or another library; that requires a separately approved focused verification.

## 2. Baseline Git and environment state

| Item                   | Observed baseline                                                |
| ---------------------- | ---------------------------------------------------------------- |
| Repository             | `C:\Users\STI\Desktop\rotating-shift-calendar-generator-main`    |
| Branch                 | `main`                                                           |
| Commit                 | `4d96300c48a9a86ff80e753b977ef2a4f88b05c2`                       |
| Upstream               | `origin/main` at `4d96300`                                       |
| Working tree           | Only `?? docs/research/pwa-offline-specification-2026-09.md`     |
| System Node            | `v22.17.1`                                                       |
| Supported/bundled Node | `v24.19.0`                                                       |
| npm                    | `10.9.2`                                                         |
| Framework              | Next.js `16.3.5` with Turbopack                                  |
| Workbox lab            | `workbox-build@7.4.0`, isolated under the OS temporary directory |

Baseline history:

```text
4d96300 (HEAD -> main, origin/main) feat: add local planner persistence and backups
f253076 docs: specify local persistence and backup architecture
15e1b52 feat: add timed work calendar export
77c1d0a docs: validate timed ICS timezone dependencies
ad078f6 docs: specify timed ICS timezone architecture
```

`npm.cmd` on this host is hard-wired to the system Node executable and reported Node 22 even after Node 24 was prepended to `PATH`. Required installs/builds were therefore run as `node-v24 npm-cli.js ...`, not through `npm.cmd`. Both clean production builds used Node `v24.19.0`.

The disposable worktree was checked out from `4d96300` with `core.autocrlf=false`; it intentionally did not include the untracked Phase 6B2A document. The document remained preserved in the main working tree.

## 3. Current build inventory

### Two-build summary

| Measure                                  |                 Build 1 |                 Build 2 |
| ---------------------------------------- | ----------------------: | ----------------------: |
| Next build ID                            | `n6U4TBMCFHM8SzcNUrpQl` | `Zm8-2IyG2C8mqKi6-7RLT` |
| `.next` files                            |                     306 |                     306 |
| `.next` raw bytes                        |              54,623,251 |              54,634,296 |
| `.next/static` files                     |                      16 |                      16 |
| `.next/static` raw bytes                 |               1,144,700 |               1,144,700 |
| Source maps under `.next`                |                      60 |                      60 |
| Browser source maps under `.next/static` |                       0 |                       0 |

The 16 static files were 11 JavaScript chunks, one CSS file, one emitted SVG, and three build-ID metadata scripts. The approved root browser graph used nine JavaScript chunks plus the CSS file. The timezone graph added one JavaScript chunk. One other JavaScript chunk, the emitted static-media SVG, and the three build-ID scripts were not referenced by the approved route HTML graph and were excluded.

### Output classification

| Class                  | Location/example                                                    | Publish/precache decision                                                                                                             |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Browser static         | `.next/static/chunks/*.js`, `*.css`                                 | Publish; precache only if reached from approved HTML/dynamic graph                                                                    |
| Route HTML             | `.next/server/app/index.html`, `about.html`, guide HTML             | Expose through Next; stage approved clean documents for revisions/precache URLs                                                       |
| RSC route payloads     | `.next/server/app/*.rsc`, `.segments/**`                            | Server output, not copied as arbitrary public files; offline client navigation may fall back to cached document navigation            |
| Server bundles         | `.next/server/app/**/page.js`, `.next/server/chunks/**`             | Never publish as browser assets or precache                                                                                           |
| Server traces          | `*.nft.json`, `trace`, `trace-build`                                | Docker/server packaging only; never precache                                                                                          |
| Build metadata         | `prerender-manifest.json`, routes manifests, BUILD_ID               | Read by the generator; never publish wholesale. `prerender-manifest.json` contains preview secrets and must never enter public output |
| Source maps            | 60 server maps                                                      | Excluded; no browser map was emitted                                                                                                  |
| Metadata bodies        | `manifest.webmanifest.body`, `icon.svg.body`, robots/sitemap bodies | Manifest/icon candidates; robots/sitemap network-only                                                                                 |
| Fonts                  | None                                                                | No action                                                                                                                             |
| Raster images          | None                                                                | Future approved icons will be explicit inputs                                                                                         |
| Development/test files | No `.next/static` development assets in production build            | Exclude by rule                                                                                                                       |

The full `.next` directory is unsuitable as a precache root. It contains server code, traces, cache metadata, preview credentials, source maps, RSC internals, and files with no browser URL.

## 4. Route inventory

All routes were verified from `app-path-routes-manifest.json`, `prerender-manifest.json`, emitted files, and the production build summary.

| Route                         | Mode                    | Generated response                      | Online result                 | Offline candidate               | Policy                                           |
| ----------------------------- | ----------------------- | --------------------------------------- | ----------------------------- | ------------------------------- | ------------------------------------------------ |
| `/`                           | Static                  | `index.html`, embedded RSC, root assets | 200 HTML                      | Cached clean document           | Minimal precache                                 |
| `/about`                      | Static                  | `about.html`                            | 200 HTML                      | Cached exact document           | Full content precache                            |
| `/shift-schedules`            | Static                  | `shift-schedules.html`                  | 200 HTML                      | Cached exact document           | Full content precache                            |
| `/shift-schedules/2-2-3`      | Static                  | guide HTML                              | 200 HTML                      | Cached exact document           | Full content precache                            |
| `/shift-schedules/4-on-4-off` | Static                  | guide HTML                              | 200 HTML                      | Cached exact document           | Full content precache                            |
| `/_not-found`                 | Static framework result | HTML/RSC/segments                       | 404 when used for unknown URL | Do not use as generic 200 shell | Network 404; offline document on network failure |
| `/icon.svg`                   | Static metadata route   | SVG body                                | 200 SVG                       | Cached icon                     | Minimal precache                                 |
| `/manifest.webmanifest`       | Static metadata route   | JSON body                               | 200 manifest                  | Cached manifest                 | Minimal precache                                 |
| `/robots.txt`                 | Static metadata route   | text body                               | 200                           | Not required                    | Network-only                                     |
| `/sitemap.xml`                | Static metadata route   | XML body                                | 200                           | Not required                    | Network-only                                     |

No additional public application route was present. The prototype `/offline` file existed only in the disposable staging directory and was never added to production source.

## 5. Workbox package findings

| Finding                    | Result                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package/version            | `workbox-build@7.4.0` exists and installed successfully                                                                                                                                                   |
| License                    | MIT                                                                                                                                                                                                       |
| Node engine                | `>=20.0.0`; Node 24.19.0 worked                                                                                                                                                                           |
| Package main               | CommonJS `build/index.js`                                                                                                                                                                                 |
| Unpacked package size      | 484,485 bytes reported by npm metadata                                                                                                                                                                    |
| Direct dependencies        | 37                                                                                                                                                                                                        |
| Installed package entries  | 329, all development-marked in the isolated project                                                                                                                                                       |
| Workbox packages installed | 16 packages at 7.4.0, including build, core, precaching, routing, strategies, window and optional feature packages                                                                                        |
| CommonJS API               | `require("workbox-build")` exported `copyWorkboxLibraries`, `generateSW`, `getManifest`, `getModuleURL`, `injectManifest`                                                                                 |
| ESM use                    | Node 24 ESM default import with named destructuring worked in the prototype                                                                                                                               |
| TypeScript                 | Package includes `build/index.d.ts`; application-side config can be typed, though the experiment used ESM JavaScript                                                                                      |
| Classic/module output      | `generateSW` emitted a self-contained classic IIFE when runtime was inlined; `injectManifest` preserved the source worker's syntax and does not bundle application imports                                |
| Generated runtime marker   | The 7.4.0-generated bundle contained internal `workbox:*:7.3.0` marker strings; this is an observed packaging detail and another reason not to use the generated runtime as an application version source |

Install warnings:

- deprecated `sourcemap-codec@1.4.8`;
- deprecated `glob@11.1.0` warning text; and
- three audit findings described in section 6.

Workbox's default 2 MiB single-file maximum is a warning/omission mechanism, not a build failure. The product wrapper must convert every warning into a failure and independently enforce its tighter budget.

## 6. Dependency and audit findings

### Isolated Workbox project

`npm audit` reported:

- **1 high:** `serialize-javascript` code-injection/RCE advisory through `@rollup/plugin-terser`;
- **2 moderate:** audit grouped the `serialize-javascript` CPU-exhaustion advisory and dependency path findings; and
- remediation proposed by npm required moving outside 7.4.0 to Workbox 7.4.1.

The authoritative advisories identify patched `serialize-javascript` versions 7.0.3 for GHSA-5c6j-r48x-rmvq and 7.0.5 for GHSA-qj8w-gfj5-8c6v. The locked transitive path selected by Workbox 7.4.0 remained affected.

`npm audit --omit=dev` returned **0 vulnerabilities**, because every Workbox package was development-only. This prevents vulnerable Workbox code from shipping to the browser as an npm runtime dependency, but it does not eliminate CI/developer build risk.

### Application repository

After a clean Node 24 `npm ci` in the disposable worktree:

- `npm audit`: 0 vulnerabilities;
- `npm audit --omit=dev`: 0 vulnerabilities; and
- one unrelated installation warning stated that `eslint@9.39.5` is no longer supported.

No Workbox package was added to the application package manifest or lockfile.

## 7. `generateSW` findings

`generateSW` succeeded against the validated staging tree and produced a classic, inline-runtime worker:

| Measure          |       Build 1 |       Build 2 |
| ---------------- | ------------: | ------------: |
| Precache entries |            19 |            19 |
| Input bytes      |     1,326,082 |     1,326,082 |
| Worker raw       |        15,880 |        15,880 |
| Worker gzip      |         5,781 |         5,776 |
| Worker Brotli    |         5,131 |         5,135 |
| SHA-256          | `254e8c…39ef` | `c1c3ee…46b6` |

It was configured with `skipWaiting:false`, `clientsClaim:false`, `cleanupOutdatedCaches:false`, `sourcemap:false`, and an inline runtime. It therefore avoided unconditional activation and source-map output. When `skipWaiting:false`, generated code accepts the generic `{type:"SKIP_WAITING"}` message without the application-specific release ID or strict payload validation required by Phase 6B2A.

`generateSW` is rejected for Phase 6B2C because:

- homepage query normalization must cover every query without creating V1 cache variants while leaving parsing to the application;
- unknown routes require a dedicated fallback rather than a universal app-shell fallback;
- activation messages need release validation and planner/multi-tab gating in the page;
- two release caches and custom delayed cleanup are not Workbox's default lifecycle;
- failed-install temporary-cache cleanup requires explicit logic;
- every cache allowlist/exclusion must remain auditable; and
- generated output brings runtime code and a broad package tree without removing custom architecture.

## 8. `injectManifest` findings

`injectManifest` found the exact `self.__WB_MANIFEST` marker, injected 19 stably ordered entries, and preserved the application-owned source unchanged otherwise.

| Measure                  |        Build 1 |        Build 2 |
| ------------------------ | -------------: | -------------: |
| Worker raw               |          4,719 |          4,719 |
| Worker gzip              |          1,795 |          1,795 |
| Worker Brotli            |          1,532 |          1,532 |
| First generation SHA-256 | `e7a447…65e7f` | `8b1f8d…4aacf` |
| Immediate repeat SHA-256 |           Same |           Same |

The per-build repeat was byte-identical. Across clean builds, only route HTML revisions—and therefore the injected worker—changed because Next generated a different build ID embedded once in each HTML document.

The missing-marker case rejected generation with an explicit error. However:

- an empty glob wrote a worker with zero entries and returned only a warning;
- an oversize file was silently omitted except for a warning; and
- duplicate `/` entries with conflicting revisions were returned with no warning.

Therefore `injectManifest` is preferable to `generateSW` as an API shape, but Workbox's injection must be wrapped by strict pre/post-validation. Since native injection of one sorted JSON array is straightforward, the exact dependency's audit cost is not justified.

## 9. Recommended Workbox integration

Do **not** integrate `workbox-build@7.4.0`.

Revise the Phase 6B2A provisional recommendation to:

1. a small Node 24 build script owned by Shift Calendar;
2. an explicit adapter that reads only the required Next output manifests and approved route files;
3. SHA-256 revisions for non-content-addressed files;
4. stable URL ordering and duplicate rejection before generation;
5. a literal, unique injection token in a classic application-owned worker;
6. write to a temporary file, syntax/JSON/size validate, then atomically rename;
7. no service-worker runtime library; and
8. snapshot/integration tests that fail when Next output shape changes.

If the user prefers Workbox despite this result, first authorize a narrow 7.4.1-or-current security spike. Do not infer that 7.4.1 is acceptable from npm's remediation message.

## 10. Asset-discovery method

The prototype used this deterministic algorithm:

1. read `.next/app-path-routes-manifest.json` for the actual route inventory;
2. read only the `routes` object of `.next/prerender-manifest.json` and require each approved document to be `compute: "static"`;
3. map approved routes to their emitted HTML (`index.html` or `<route>.html`);
4. extract and normalize `/_next/static/...` references from each approved HTML document;
5. require every referenced file to exist below `.next/static`;
6. identify the timezone chunk by both `TzDatabase` and exact IANA `2026d` sentinels;
7. require exactly one root browser chunk to reference that timezone chunk basename;
8. require the timezone chunk not to be an initial root asset;
9. copy only approved files into a disposable public-URL staging tree;
10. add fixed prototype offline HTML plus emitted icon/manifest bodies;
11. map staged `index.html` files to clean route URLs;
12. compute revisions, sort by URL, reject duplicates/warnings/oversize/unclassified files; and
13. inject only the resulting manifest into the worker source.

The algorithm uses no manually copied hashed filename. The timezone marker rule is an application assertion, not a generic search for the largest JavaScript file.

## 11. Inclusion rules

Include only:

- approved static HTML for `/` and, in the full configuration, the four content routes;
- every actual `/_next/static` script/style reference in those HTML documents;
- the unique direct timezone chunk reached from the approved root dynamic import;
- explicitly approved same-origin manifest and icon bodies;
- the fixed offline document; and
- later, reviewed icon files declared by the final manifest.

Each item must have a valid public URL, expected extension/MIME, successful file existence check, per-file size below budget, and SHA-256/content-addressed identity. The build fails if an approved route becomes dynamic or its graph cannot be explained.

## 12. Exclusion rules

Exclude:

- `.next/server` JavaScript bundles and chunks;
- RSC/segment payload files as arbitrary static files;
- `.nft.json`, traces, cache metadata, BUILD_ID files, server manifests, and preview keys;
- all source maps;
- unreferenced `.next/static` files;
- robots and sitemap from offline caching;
- development/HMR assets and tests;
- `node_modules`, build scripts, package archives, browser profiles, and reports;
- unknown or oversize files;
- cross-origin and opaque responses;
- uploaded/imported JSON, generated JSON/ICS, blobs, downloads, planner records, URLs with private state, and IndexedDB data; and
- arbitrary query variants or external sites.

`prerender-manifest.json` is generator input only. It contains preview-mode secret material and must never be copied, logged in full, published, or cached.

## 13. Reproducibility results

Two clean builds from the same commit, Node 24.19.0, npm lockfile, and environment produced:

- identical static filenames and static bytes;
- identical route inventory and asset relationships;
- identical timezone URL and bytes;
- identical entry counts and raw configuration sizes;
- different random Next build IDs;
- five different HTML files, each differing only by one embedded build-ID occurrence;
- consequently different HTML revisions, manifest SHA-256 values, and service-worker SHA-256 values; and
- byte-identical repeated injection when run twice against one build output.

This is acceptable, explainable per-build determinism. The worker is not expected to be identical across separately generated Next builds because it must revision their distinct HTML. Cache identity must use a content-derived release digest, not a wall-clock timestamp and not Next's build ID alone.

| Artifact                 | Build 1 SHA-256 | Build 2 SHA-256 |
| ------------------------ | --------------- | --------------- |
| Minimal manifest         | `524a2d…531d`   | `5e0469…9b7b`   |
| Core + timezone manifest | `0b4b69…6ca7`   | `2f4251…ae3f`   |
| Full content manifest    | `872fc4…c620`   | `b5a334…101d3`  |
| Injected worker          | `e7a447…65e7f`  | `8b1f8d…4aacf`  |

The roughly 11 KiB difference in total `.next` size came from non-browser build/server metadata; the 1,144,700-byte `.next/static` tree was identical.

## 14. Minimal-core measurements

The minimal prototype contains clean `/`, its exact initial browser graph, current manifest/icon, and fixed offline HTML.

| Measure                  |                      Value |
| ------------------------ | -------------------------: |
| Entries                  |                         14 |
| Raw                      |              843,746 bytes |
| Gzip                     |              246,485 bytes |
| Brotli                   |      211,353–211,358 bytes |
| JavaScript               | 757,849 bytes (89.82% raw) |
| CSS                      |       39,871 bytes (4.73%) |
| HTML                     |       45,484 bytes (5.39%) |
| SVG                      |                  295 bytes |
| Manifest                 |                  247 bytes |
| Fonts/raster images      |                          0 |
| Duplicate-content groups |                          0 |

Largest entries were the 229,156-byte framework chunk, 167,438-byte generator chunk, 165,743-byte framework chunk, 112,594-byte polyfill chunk, and 45,179-byte root HTML.

At 1 Mbit/s, gzip payload transfer alone is approximately 1.97 seconds; Brotli is approximately 1.69 seconds. At 10 Mbit/s those lower bounds are approximately 0.20 and 0.17 seconds. Request latency, TLS, contention, and device processing are additional.

## 15. Core-plus-timezone measurements

| Measure                  |                 Value |
| ------------------------ | --------------------: |
| Entries                  |                    15 |
| Raw                      |       1,175,659 bytes |
| Gzip                     |         304,009 bytes |
| Brotli                   | 259,248–259,253 bytes |
| Timezone addition raw    |         331,913 bytes |
| Timezone addition gzip   |          57,524 bytes |
| Timezone addition Brotli |          47,895 bytes |
| Timezone share raw       |                28.23% |
| Timezone share gzip      |                18.92% |
| Timezone share Brotli    |                18.47% |

The timezone download adds a payload lower bound of about 0.46 seconds at 1 Mbit/s gzip or 0.38 seconds Brotli; at 10 Mbit/s it adds roughly 0.05/0.04 seconds. Precaching downloads bytes but does not execute or parse the lazy chunk.

## 16. Core-plus-content measurements

The recommended release set adds four clean public documents. Their initial chunk graph is a subset of the core graph, so they add HTML but no additional JavaScript/CSS.

| Measure                        |                        Value |
| ------------------------------ | ---------------------------: |
| Entries                        |                           19 |
| Raw                            |              1,326,082 bytes |
| Gzip                           |        331,085–331,086 bytes |
| Brotli                         |        281,637–281,640 bytes |
| JavaScript                     | 1,089,762 bytes (82.18% raw) |
| CSS                            |         39,871 bytes (3.01%) |
| HTML                           |       195,907 bytes (14.77%) |
| SVG                            |            295 bytes (0.02%) |
| Manifest                       |            247 bytes (0.02%) |
| Fonts/raster images            |                            0 |
| Duplicate-content groups       |                            0 |
| Timezone share raw/gzip/Brotli |     25.03% / 17.37% / 17.01% |

Payload-only transfer lower bounds are approximately 2.65 seconds gzip or 2.25 seconds Brotli at 1 Mbit/s, and 0.26/0.23 seconds at 10 Mbit/s. There are 19 requests, but HTTP/2/3 multiplexing and connection reuse prevent a correct estimate by multiplying latency 19 times. Real throttled install testing remains required.

## 17. Timezone graph findings

| Check                               | Result                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| Lazy entry URL                      | `/_next/static/chunks/1j0psv6m5-v-x.js` in both builds   |
| Referring initial chunk             | `/_next/static/chunks/0wt--s0s7mfs0.js`                  |
| TimezoneComplete code               | Bundled in the lazy chunk                                |
| Direct `tzdata@1.0.51`              | Bundled in the same lazy chunk                           |
| IANA marker                         | `2026d` present                                          |
| Stale nested marker                 | `2026b` absent from the browser chunk                    |
| Initial route asset                 | No                                                       |
| Initial route byte/execution impact | No change; only service-worker installation downloads it |
| Cross-build graph                   | Exact URL, referrer, bytes and compressed sizes stable   |
| Private state required              | No; discovered from build output and sentinels only      |

The transitive browser graph for timed export is one additional chunk because its supporting application loader is already in the root graph. Discovery is reliable for the observed build if Phase 6B2C requires exactly one candidate, exact IANA version, one approved referrer, and absence from initial assets. Any changed cardinality or marker is a build failure requiring review, not a reason to cache all JavaScript.

## 18. Service-worker size measurements

| Worker                               |    Raw |        Gzip |      Brotli | Notes                                                                 |
| ------------------------------------ | -----: | ----------: | ----------: | --------------------------------------------------------------------- |
| Application-owned injected prototype |  4,719 |       1,795 |       1,532 | Custom classification, message validation and temporary-cache install |
| Workbox `generateSW` inline runtime  | 15,880 | 5,776–5,781 | 5,131–5,135 | Generic Workbox runtime; insufficient custom lifecycle                |

Both generated JavaScript files passed `node --check`. No service-worker source map was generated. The small custom output supports a 32 KiB raw/10 KiB gzip future budget with ample headroom.

## 19. Cache-budget recommendation

Phase 6B2C should fail the build on any exceeded limit; it must never omit a required file and continue.

| Budget                        |   Limit | Rationale                                                                              |
| ----------------------------- | ------: | -------------------------------------------------------------------------------------- |
| Precache entries              |      32 | Current full set is 19; allows optimized icons and modest route growth                 |
| Precache raw total            |   3 MiB | Current 1.33 MiB; allows required raster icons without normalizing uncontrolled growth |
| Precache gzip/Brotli estimate |   1 MiB | Current ~0.33/~0.28 MiB                                                                |
| Single asset raw              | 512 KiB | Current largest is 331,913 bytes                                                       |
| Worker raw                    |  32 KiB | Current custom prototype is 4,719 bytes                                                |
| Worker gzip                   |  10 KiB | Current custom prototype is 1,795 bytes                                                |
| Runtime document entries      |       8 | Five documents, offline fallback, and limited headroom                                 |
| Stable named asset entries    |      12 | Manifest/icons only; hashed assets stay release precache                               |
| Runtime total entries         |      20 | Prevents unbounded growth                                                              |
| Complete release versions     |       2 | Active/current plus immediate predecessor                                              |

Screenshots should not be precached unless a later product decision demonstrates offline need. Each final icon must be optimized and included in the measured build budget. The generator reports raw/gzip/Brotli by class, largest entries, duplicate hashes, and timezone share.

## 20. Query-normalization results

The prototype classified URLs by method, origin, request mode and pathname only. It never parsed schedule configuration.

| Request                                    | Action                                 | Cache lookup                               |
| ------------------------------------------ | -------------------------------------- | ------------------------------------------ |
| `/`                                        | Root navigation                        | `/`                                        |
| Valid `/?v=1&...`                          | Root navigation                        | `/`                                        |
| Valid V1 in noncanonical order             | Root navigation                        | `/`                                        |
| Invalid V1                                 | Root navigation                        | `/`; application shows existing validation |
| Unknown/duplicate/tracking root parameters | Root navigation                        | `/`                                        |
| `/about?x=1`                               | Known navigation                       | `/about`                                   |
| Unknown pathname/query                     | Offline fallback on navigation failure | `/offline`                                 |
| Hashed static asset with query             | Static allowlist                       | Query-free exact pathname                  |
| Cross-origin request                       | No interception/cache                  | None                                       |

The Chromium test retained `http://127.0.0.1:4179/?v=1&p=day` in the address bar while serving cached `/`. The existing client parser therefore retained ownership. Cache inspection showed no query-string entry. Offline Next Link navigation first logged an expected failed RSC request, then Next fell back to a browser navigation and loaded cached `/about` successfully.

Security consequences:

- no permanent entry is created for schedule URLs;
- tracking or malformed parameters cannot expand cache storage;
- private values are not logged by worker code;
- content queries do not become distinct documents; and
- cross-origin/unknown subresources remain network-only.

Phase 6B2C must test Next's fallback behavior after every Next upgrade. It must not broadly normalize `_rsc` responses into HTML cache entries.

## 21. Atomic-installation results

| Case                               | Observed result                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| All 19 resources succeed           | Custom temporary-cache install succeeded; Chromium activated and promoted 19 entries                                                         |
| Required resource 404              | VM simulation rejected install and removed the temporary cache                                                                               |
| Fetch/network failure              | Same rejection path as 404; a real truncated HTTP body was not separately browser-tested                                                     |
| Revision/build changes             | Five HTML revisions and worker digest changed; static revisions remained stable                                                              |
| Duplicate URL/conflicting revision | Workbox generation returned duplicates with no warning; future generator must reject before output                                           |
| Oversize file                      | Workbox omitted it and warned; future generator must treat warning/omission as fatal                                                         |
| Missing injection point            | `injectManifest` threw and produced no usable worker                                                                                         |
| Empty glob                         | Workbox wrote a zero-entry worker with a warning; future generator must fail                                                                 |
| Source maps                        | Default Workbox glob excluded `.map`; a broad `**/*` included it, proving explicit ignores are mandatory                                     |
| Interrupted generation             | Not process-kill tested; Workbox writes a destination path, so Phase 6B2C must write/validate a sibling temporary file and atomically rename |

Workbox precaching rejects the install event when a fetch/cache operation fails, so the new worker does not activate. Its implementation can leave partially populated entries in its precache cache. The product requires a build-specific temporary cache, deletion on failure, and promotion/activation only after completeness validation. The active prior release cache is never touched during a failed new install.

A content revision is a cache identity mechanism, not an authenticity boundary. HTTPS and deployment integrity remain required. The native generator should use SHA-256 rather than relying on Workbox's observed 32-hex revisions.

## 22. Update lifecycle results

The spike modeled two releases:

| Scenario                          | Required/validated behavior                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| A controls clients                | A cache and server assets remain available                                                    |
| B installs                        | B builds a separate temporary cache; A remains untouched                                      |
| B waits                           | No `skipWaiting`; A continues serving clients                                                 |
| User defers                       | B stays waiting; no reload or cleanup                                                         |
| Safe user acceptance              | Page commits pending state, validates release message, then tells B to activate               |
| B activation                      | Promote verified B assets, retain A, claim/reload only through coordinated application flow   |
| User offline while B exists       | A continues; no update activation requirement                                                 |
| B installation/activation failure | Keep A active/assets; delete incomplete B temporary cache; retry later                        |
| Rollback                          | Deploy prior source as a new complete release identity; never reuse an ID for different bytes |

The generated Workbox worker's generic `SKIP_WAITING` listener is too permissive. The custom prototype rejected wrong release IDs and extra message keys and accepted only `{type:"ACTIVATE_UPDATE", releaseId:<exact>}`. Runtime A→B waiting-worker activation was not completed in a browser; it remains a mandatory Phase 6B2C integration test.

## 23. Multi-tab findings

No production-safe multi-tab activation was implemented. Static modeling confirms the Phase 6B2A policy is feasible:

- page code, not the service worker, owns planner dirty/pending/conflict state;
- service-worker `clients.matchAll()` plus a private-free BroadcastChannel protocol establishes controlled tab count/readiness;
- B remains waiting while any A tab is dirty, pending, conflicted, unresponsive, or has not consented;
- no background tab is force-reloaded;
- revision conflict protection prevents stale planner overwrite independently of caches; and
- normal activation after all A clients close is the safest default.

Decision is conditional until automated two-context tests exercise pending saves, stale revisions, one unresponsive tab, user defer, tab close, activation and post-update restoration.

## 24. Cache-cleanup findings

Workbox's default precache uses one scope-derived cache and deletes entries not present in the newly activated manifest. That does not implement the required two-release retention. Phase 6B2C must own names such as:

- `shift-calendar-temp-<release>`;
- `shift-calendar-precache-<release>`; and
- bounded runtime cache names with an explicit policy version.

Cleanup rules:

1. never delete A during B installation;
2. never clean an incomplete B by touching A;
3. after B activation, retain A until no A clients exist and the operational retention minimum elapsed;
4. retain at most two complete versions under normal conditions;
5. if a third release arrives while an older client remains, defer cleanup or the new install rather than breaking the client;
6. delete only exact `shift-calendar-` prefixed names validated by the application; and
7. never clear IndexedDB, origin-wide storage, or unrelated caches.

“Two releases for 48 hours” is a deployment minimum, not a proof that no client needs A. Client/version awareness is the safety condition. Docker/static hosting must retain A files too; browser Cache Storage alone cannot repair an evicted/missed A asset.

## 25. Docker findings

No Dockerfile, Compose file, Nginx/reverse-proxy configuration, or deployment-specific server configuration exists in the repository. The spike therefore did not invent or commit infrastructure.

The production build and `next start` worked under Node 24 on localhost. Current observed headers were:

| Response      | Current `next start` behavior                                                            |
| ------------- | ---------------------------------------------------------------------------------------- |
| HTML          | `Cache-Control: s-maxage=31536000`, `X-Powered-By: Next.js`, no CSP                      |
| Manifest      | `application/manifest+json`, `public, max-age=0, must-revalidate`                        |
| Hashed JS     | `application/javascript`, `public, max-age=31536000, immutable`, `Vary: Accept-Encoding` |
| Icon          | `image/svg+xml`, revalidated                                                             |
| Robots        | `text/plain`, revalidated                                                                |
| Unknown route | 404, private no-cache/no-store                                                           |

Hashed-asset behavior is appropriate. A reverse proxy must not retain HTML for a year across releases without atomic cache invalidation; Phase 6B2C deployment configuration must explicitly revalidate documents or provide proven release-aware purging. There is currently no `/sw.js` to inspect.

## 26. Reverse-proxy header contract

| Resource                       | Required contract                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sw.js`                       | `200`; `text/javascript; charset=utf-8`; `Cache-Control: no-cache, max-age=0, must-revalidate` (or stricter `no-store` after browser testing); `Service-Worker-Allowed: /` if explicit root contract retained; CSP; nosniff; no HTML fallback or CDN transformation |
| `/manifest.webmanifest`        | `application/manifest+json`; `public, max-age=0, must-revalidate`; same-origin                                                                                                                                                                                      |
| `/_next/static/<content-hash>` | Correct MIME; `public, max-age=31536000, immutable`; Brotli/gzip; `Vary: Accept-Encoding`; old releases retained                                                                                                                                                    |
| HTML                           | `text/html; charset=utf-8`; browser revalidation and a documented shared-cache policy; never immutable; atomic purge/switch                                                                                                                                         |
| `/offline`                     | `text/html; charset=utf-8`; revalidated online and precached; `noindex` metadata                                                                                                                                                                                    |
| Stable icons                   | Correct image MIME; revalidated unless filename is content-versioned                                                                                                                                                                                                |
| Versioned icons                | Long-lived immutable                                                                                                                                                                                                                                                |
| Sitemap/robots                 | Correct XML/text MIME; revalidated; no worker fallback                                                                                                                                                                                                              |

All production responses should add the reviewed CSP, `X-Content-Type-Options: nosniff`, referrer policy, and framing policy. Disable `X-Powered-By`. The worker's CSP must prohibit remote scripts/imports and limit connections to same origin. HTTPS and HSTS are deployment prerequisites after the real domain is confirmed.

Deployment order: publish the new immutable assets, documents, manifest/icons and fallback; verify every precache URL; publish `/sw.js` last; health-check; switch traffic atomically; retain the previous complete image/assets for at least two releases and 48 hours; roll back the complete release, never only the worker.

## 27. Security findings

| Requirement                 | Evidence/result                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Same-origin only            | Classifier returned network-only for cross-origin; browser worker scope was isolated localhost         |
| No JSON/ICS/blob caching    | Manifest contained only 19 approved public URLs; no download/blob entry                                |
| No IndexedDB/planner access | Source scan and VM assertion found no IndexedDB access; cache inspection contained no planner URL/data |
| No query permutations       | Browser cache keys contained no query strings; V1 retained in address bar only                         |
| No private URL logging      | Worker prototype emitted no request logs                                                               |
| Message validation          | Wrong release and extra-key messages rejected; exact activation accepted                               |
| No opaque caching           | Install rejected non-OK/opaque responses in custom logic                                               |
| Strict allowlist            | Only known routes and exact `/_next/static` paths intercepted; all others network/fallback             |
| Source maps                 | Explicitly excluded; broad-glob test proved why this is necessary                                      |
| Bounded growth              | No generic runtime write; proposed limits in section 19                                                |
| CSP                         | Current app has none; future header contract is mandatory                                              |
| Development registration    | Prototype registered only on disposable port 4179/profile; application source unchanged                |
| Dependency supply chain     | Exact Workbox version fails recommendation due high/moderate development audit findings                |

The generator must never copy or print `prerender-manifest.json` because it includes preview secrets. Build reports should list routes/counts/digests, not secret-bearing manifest contents. Generated worker source and URL manifests are public release artifacts and must contain no absolute local paths or timestamps.

## 28. Formatting-discrepancy investigation

The 97-file failure is a Windows line-ending checkout effect, not repository content drift.

Evidence:

- global `core.autocrlf=true` came from `C:/Users/STI/.gitconfig`;
- there is no `.gitattributes` policy for `text` or `eol`;
- Prettier is pinned at 3.9.7 and has no `endOfLine` override, so its default expected output is LF;
- the normal checkout contained 98 tracked text files with CRLF and 54 with LF;
- all 98 CRLF files became byte-identical to their Git blobs after read-only CRLF→LF normalization; there were zero content mismatches;
- `git status` reported no tracked drift;
- the disposable worktree created with `core.autocrlf=false` passed repository-wide `npm run format:check` unchanged;
- Node 22 and Node 24 both reproduced the normal-checkout failure; and
- package, Prettier and ignore-file versions were identical.

The 97 Prettier failures comprised:

| Category                           | Count |
| ---------------------------------- | ----: |
| Root (`README.md`, `package.json`) |     2 |
| `docs`                             |    21 |
| `src`                              |    54 |
| `tests`                            |    20 |
| Total                              |    97 |

The extra CRLF tracked file was ignored/not formatted by the configured Prettier traversal. Generated `.next`, coverage, `node_modules`, lockfile, Playwright reports and test results are already ignored. The six temporary spike scripts also appeared while diagnostics ran; they are removed before handoff and are not part of the 97 baseline.

Safest correction is a separate authorized maintenance change that adds a deliberate `.gitattributes` LF policy (for example, text files as `eol=lf`), performs one reviewed renormalization, and documents Windows setup. Alternatively, local contributors can use `core.autocrlf=input`/`false` with a clean re-checkout. Do not run a repository-wide formatter merely to mask checkout conversion. This does not block the architecture or CI on an LF checkout, but it will keep local `format:check` red and should be resolved before Phase 6B2C acceptance.

## 29. Automated tests performed

### Build/dependency

- clean Node 24 `npm ci`;
- repository `npm audit` and `npm audit --omit=dev`;
- isolated exact Workbox install, full audit and production-only audit;
- CommonJS and ESM API loading;
- TypeScript declaration presence;
- two clean `npm run build` executions;
- route/build/static/source-map inventory;
- stable-order manifest generation and repeated injection;
- raw/gzip/Brotli/entry/class/duplicate measurements;
- JavaScript syntax checks for generated and injected workers; and
- JSON parsing for every generated result/manifest used by the scripts.

### Workbox edge cases

- `generateSW` and `injectManifest` output;
- missing injection point;
- empty glob;
- default and broad source-map globs;
- oversize file;
- duplicate URL with conflicting revisions; and
- immediate repeat determinism.

### Worker logic (VM simulation)

- all required query classes;
- same-origin static and cross-origin bypass;
- malformed and valid activation messages;
- successful 19-entry install;
- required-resource failure and temporary-cache cleanup; and
- no IndexedDB access.

### Isolated Chromium on port 4179

- registration, install and activation;
- exact cache-name/key inspection;
- offline clean/V1 navigation with original query retained;
- offline content route with query;
- offline Next Link RSC failure followed by successful document fallback;
- unknown route offline document;
- timezone chunk offline fetch and exact 331,913-byte body; and
- absence of private/query/download URLs in Cache Storage.

### Production server on port 4180

- current HTML, manifest, hashed JavaScript, icon, robots and unknown-route status/MIME/cache headers.

All browser/server ports and profiles were disposable and never used the normal application origin.

## 30. Manual or unperformed tests

Not completed and not claimed:

- real Android/iOS/iPadOS/macOS/Windows installation;
- Safari, Firefox, Edge or Samsung Internet service-worker behavior;
- actual Docker image or reverse proxy (none exists);
- TLS/HSTS/custom-domain behavior;
- real low-bandwidth/latency install timing;
- quota exhaustion, storage eviction or private browsing;
- a physically truncated HTTP response with misleading/no content length;
- process interruption during worker generation;
- browser A→B waiting-worker update and rollback;
- multiple real tabs with dirty/pending/conflicting planner state;
- schema migration across worker releases;
- final icon/manifest/offline-page behavior;
- JSON/ICS/print behavior in installed modes;
- screen-reader/safe-area/standalone UI; and
- server retention beyond the modeled two-release policy.

These are Phase 6B2C implementation/acceptance responsibilities, not reasons to register a production worker during this spike.

## 31. Decision matrix

|   # | Decision                       | Result                                                   | Condition/evidence                                                                                                                                             |
| --: | ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `workbox-build@7.4.0`          | **Fail**                                                 | Functional, but 329 package entries, two deprecations, and 3 dev vulnerabilities including high severity are unacceptable for its limited value                |
|   2 | Node.js 24 compatibility       | **Pass**                                                 | Install, APIs, two builds and prototypes worked on 24.19.0                                                                                                     |
|   3 | Current Next.js compatibility  | **Conditional pass**                                     | Actual 16.3.5/Turbopack graph works; output adapter uses partly undocumented build artifacts and must fail/snapshot on change                                  |
|   4 | `injectManifest`               | **Conditional pass**                                     | Deterministic per build and preserves custom code; Workbox package rejected, so use native equivalent unless a new dependency is approved                      |
|   5 | `generateSW`                   | **Fail**                                                 | Cannot safely express validated messages, atomic temporary caches, two-release cleanup and application-specific navigation policy                              |
|   6 | Hashed-asset discovery         | **Pass**                                                 | Extracted automatically from actual approved HTML; identical across builds                                                                                     |
|   7 | Static-route discovery         | **Pass**                                                 | Actual route/prerender manifests and emitted HTML validated all five documents                                                                                 |
|   8 | Timezone graph discovery       | **Pass**                                                 | Exactly one lazy `2026d` chunk, one referrer, stable URL/bytes, no `2026b`                                                                                     |
|   9 | Atomic precache installation   | **Conditional pass**                                     | Custom temporary-cache prototype passed success/404 cleanup; real truncation and activation failure still require tests; Workbox default alone is insufficient |
|  10 | Query normalization            | **Pass**                                                 | All requested classes passed VM; Chromium retained V1 URL and one clean cache key                                                                              |
|  11 | Unknown-route fallback         | **Pass**                                                 | Offline document served, online Next server retained 404; final fallback should return an intentional offline status where feasible                            |
|  12 | Waiting-worker updates         | **Conditional pass**                                     | Feasible/custom message validated; A→B browser lifecycle not run                                                                                               |
|  13 | Multi-tab safety               | **Conditional pass**                                     | Safe conservative model defined; real two-tab planner-state tests required                                                                                     |
|  14 | Cache cleanup                  | **Conditional pass**                                     | Release-aware rules defined; Workbox default incompatible; browser/server long-lived coexistence not run                                                       |
|  15 | Docker compatibility           | **Conditional pass**                                     | Self-hosted Next start works; no Docker files exist, so actual image behavior untested                                                                         |
|  16 | Reverse-proxy header contract  | **Conditional pass**                                     | Exact contract defined and current headers measured; no proxy exists to validate                                                                               |
|  17 | Security requirements          | **Fail for Workbox; conditional pass for native design** | Cache/message/privacy controls passed; exact dependency audit fails and CSP is not yet implemented                                                             |
|  18 | Reproducible build integration | **Pass**                                                 | Stable graph/order, per-build byte identity, cross-build differences isolated to random Next build ID in HTML                                                  |
|  19 | Cache budgets                  | **Pass**                                                 | Three measured configurations fit explicit budgets with substantial headroom                                                                                   |
|  20 | Readiness for Phase 6B2C       | **Fail pending approval**                                | Do not begin under Workbox 7.4.0; conditional go after approving native generator architecture and formatting-policy handling                                  |

## 32. Phase 6B2C go/no-go decision

**No-go now.** The approved provisional implementation named `workbox-build@7.4.0`, and that exact dependency failed the development security/maintenance gate. Phase 6B2C must not begin by silently changing the package version or accepting the advisories.

**Conditional go after two approvals:**

1. replace Workbox with the dependency-free generator/application-owned worker described in section 33; and
2. decide whether the CRLF `.gitattributes` correction happens before Phase 6B2C or as a separate prerequisite task.

No critical browser-graph, timezone, size, query, IndexedDB or self-hosting blocker was found. The no-go is narrow and actionable rather than a rejection of PWA/offline support.

## 33. Required Phase 6B2C architecture

If approved, Phase 6B2C must retain the Phase 6B2A product architecture with these spike-driven changes:

- no Workbox 7.4.0 dependency or runtime;
- a small Node 24 generator using built-in `fs`, `path`, `crypto` and `zlib` only;
- explicit Next 16.3.5 output adapter with fixture/snapshot tests;
- actual-route static validation, HTML reference extraction, exact timezone sentinels/referrer, and approved metadata/icon inputs;
- SHA-256 revisions, stable URL ordering, duplicate rejection and no timestamps/absolute paths;
- fail on every missing, empty, warning-equivalent, unclassified, source-map, secret-bearing, oversize or budget-violating input;
- temporary generated worker plus syntax/manifest/size validation and atomic rename;
- classic same-origin worker with no remote `importScripts`;
- separate temporary/current/previous cache names keyed by a content-derived release ID;
- all-or-nothing installation and failed-temporary-cache cleanup;
- clean `/` lookup for every homepage query without schedule parsing;
- exact known-route navigation, dedicated unknown-route fallback, and no RSC-as-HTML caching;
- no runtime caching of private/download/cross-origin/non-GET/opaque/error responses;
- waiting activation with exact release-message validation and page-owned dirty/save/conflict/multi-tab gates;
- service worker never opens IndexedDB;
- deployment retains two complete releases for at least 48 hours and while known old clients need them;
- production-only registration, explicit isolated-test opt-in, HTTPS/CSP/header contract; and
- all automated/manual acceptance work identified in sections 29–30.

This is an architecture constraint, not a Phase 6B2C implementation plan. No production file was created in this phase.

## 34. Open approvals

1. Approve replacing the Phase 6B2A `workbox-build@7.4.0` recommendation with a dependency-free Node generator.
2. Decide whether to run a separate exact-version spike for a newer Workbox release instead; do not combine both paths.
3. Approve the tightened budgets: 32 entries, 3 MiB raw, 1 MiB compressed estimate, 512 KiB single asset, 32 KiB worker, 20 runtime entries, two releases.
4. Approve the deterministic timezone rule: exactly one `2026d` chunk and one approved root referrer, with build failure on change.
5. Approve the separate LF `.gitattributes` maintenance correction or explicitly accept LF-only CI plus a locally failing Windows checkout until later.
6. Confirm the future deployment uses a dedicated root origin; a subpath/shared origin still changes scope and URL mapping.

## 35. Research limitations

The spike used one Windows host, Node 24.19.0, npm 10.9.2, Next 16.3.5, headless Chromium, and localhost. It did not test other browsers, real devices, HTTPS, a reverse proxy, Docker, quotas, long-duration updates, or actual final PWA assets. Next's build output formats are not all public API; the proposed adapter therefore needs defensive tests and explicit Next-version review.

The custom worker was deliberately minimal. It demonstrated feasibility, not production completeness. Its offline fallback returned the cached prototype's 200 status; Phase 6B2C should decide and test an explicit 503-style offline response without affecting known-route behavior. A real truncated response and OS-level interrupted generation were not tested.

Primary references accessed 2026-09-18:

- [Workbox build module and API options](https://developer.chrome.com/docs/workbox/modules/workbox-build), Google Chrome documentation;
- [Workbox precaching guidance](https://developer.chrome.com/docs/workbox/precaching-dos-and-donts), Google Chrome documentation;
- [Workbox service-worker lifecycle](https://developer.chrome.com/docs/workbox/service-worker-lifecycle), Google Chrome documentation;
- [Workbox v7.4.0 release](https://github.com/GoogleChrome/workbox/releases/tag/v7.4.0), official repository;
- [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq), GitHub Advisory Database; and
- [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v), GitHub Advisory Database.

Package metadata, dependency trees and audits were obtained directly through npm for the exact installed package. Repository/build observations came from the disposable worktree at `4d96300`.

## 36. Verification commands and results

The following required commands were run. Node/npm commands for the clean worktree were invoked through Node 24's executable and npm's CLI path to avoid the host's hard-wired Node 22 wrapper.

| Command/check                        | Result                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `node --version`                     | System `v22.17.1`; supported bundled runtime `v24.19.0`                            |
| `npm --version`                      | `10.9.2`                                                                           |
| `git status --short`                 | Baseline only Phase 6B2A untracked; final status recorded in section 40            |
| `git log -5 --oneline --decorate`    | Baseline in section 2                                                              |
| `npm ci`                             | Passed in disposable worktree; 464 packages, repository audit clean                |
| `npm run build`                      | Passed twice under Node 24; all current routes static                              |
| `npm run format:check`               | Passed in clean LF worktree; normal CRLF checkout failure explained in section 28  |
| `npm audit` (repository)             | 0 vulnerabilities                                                                  |
| `npm audit --omit=dev` (repository)  | 0 vulnerabilities                                                                  |
| `npm audit` (Workbox lab)            | 3 vulnerabilities: 2 moderate, 1 high                                              |
| `npm audit --omit=dev` (Workbox lab) | 0 vulnerabilities                                                                  |
| Compression                          | Node `zlib` level-9 gzip and quality-11 Brotli per file; results in sections 14–18 |
| JavaScript syntax                    | Both experimental worker outputs passed `node --check`                             |
| JSON                                 | Generated manifests/results parsed during generation and comparison                |
| `git diff --check`                   | Final result recorded after temporary cleanup                                      |

No repository-wide write-format command was run.

## 37. Files created

Permanent Phase 6B2B output:

- `docs/research/pwa-build-spike-2026-09.md`

Preserved prior untracked output:

- `docs/research/pwa-offline-specification-2026-09.md`

No implementation plan or production PWA file was created.

## 38. Files temporarily created and removed

Temporary main-worktree scripts under `.tmp-pwa-spike/`:

- `spike.mjs`;
- `worker-src.js`;
- `worker-tests.mjs`;
- `workbox-cases.mjs`;
- `server.mjs`; and
- `browser-test.mjs`.

Disposable OS-temporary content:

- detached clean Git worktree at commit `4d96300`;
- its `node_modules`, two `.next` builds, and temporary browser script;
- isolated Workbox lab `package.json`, lockfile and `node_modules`;
- staged browser assets for three configurations/two builds;
- generated manifests, workers, edge-case fixtures and measurement JSON; and
- disposable Chromium contexts plus localhost servers on ports 4179 and 4180.

All are removed before handoff. No downloaded test file, browser profile, generated worker, build output, archive, experimental cache or `node_modules` remains in the repository.

## 39. Dependency/package-file final state

`package.json` and `package-lock.json` in the application repository remain exactly as they were at `4d96300`. Workbox was installed only in the disposable temporary lab. No production or development dependency was retained. No override, resolution, audit fix, package upgrade or lockfile rewrite occurred.

The recommended future dependency state is unchanged (no Workbox) unless the user approves a separate version spike.

## 40. Git status and scope confirmation

The expected final status is exactly two untracked research documents:

```text
?? docs/research/pwa-build-spike-2026-09.md
?? docs/research/pwa-offline-specification-2026-09.md
```

Final commands after formatting and cleanup are the authority for this section. No production code, test, dependency, lockfile, manifest, icon, offline route, service-worker registration, generated worker, Next configuration, durable existing documentation, commit, push, release or deployment belongs to Phase 6B2B.
