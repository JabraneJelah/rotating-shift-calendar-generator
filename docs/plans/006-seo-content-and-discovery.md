# Phase 4: SEO content and discovery

## Status

Complete. Phase 4 was implemented and verified under Node 24 without adding a production or development dependency.

## Current crawlable route inventory

- `/` is the only HTML page. It statically renders the generator and accepts canonical V1 schedule query state.
- `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest` are metadata routes, not content pages.
- The sitemap currently contains only `/`.
- The header links only to the homepage, so there is no discovery hierarchy yet.

## Current metadata and sitemap behavior

The root layout defines an environment-aware `metadataBase`, default title and title template, description, homepage canonical, Open Graph defaults, and index/follow policy. The sitemap and robots route use the same validated site origin from `siteConfig`. The sitemap has a homepage entry with no fabricated modification date. Configured schedule query URLs are not included.

## Content gap analysis

The working generator explains its controls but does not provide standalone, crawlable guidance for choosing or checking either supported preset. There is no comparison hub, no methodology/about page, no visible breadcrumb hierarchy, and no route-specific metadata. This leaves product utility disconnected from the informational questions that naturally precede use.

## Search-intent hypotheses

- Visitors searching for rotating shift patterns want a plain comparison before choosing a calendar preset.
- Visitors searching for “4 on 4 off schedule” want the exact cycle, a dated example, and clarity about start-date anchoring and fixed day/night behavior.
- Visitors searching for “2-2-3” or “Panama schedule” need a precise sequence and a warning that employer terminology and implementations vary.
- Visitors evaluating the tool want to understand calculation methodology, privacy, exports, and limitations before relying on a result.

These hypotheses guide useful content only; they are not claims about keyword volume or ranking.

## Proposed information architecture

```text
Home
├── Shift schedules
│   ├── 4 on / 4 off
│   └── 2-2-3
└── About
```

Exactly four indexable routes will be added: `/shift-schedules`, `/shift-schedules/4-on-4-off`, `/shift-schedules/2-2-3`, and `/about`.

## Page purpose and unique value

### `/shift-schedules`

Provides the pattern concept, an engine-aligned comparison of cycle lengths and work/off positions, fixed Day/Night support, custom-pattern context, accuracy caveat, and direct links to both guides and the generator.

### `/shift-schedules/4-on-4-off`

Explains the exact eight-day fixed-shift implementation, shows its full cycle and an engine-generated example beginning 2026-01-05, explains the first-work-position anchor, evaluates practical strengths and tradeoffs without legal or hours claims, and connects visitors to the other guide and generator.

### `/shift-schedules/2-2-3`

Explains the exact fourteen-day fixed-shift implementation with seven work and seven off positions, shows a full engine-generated example, qualifies “Panama schedule” terminology, distinguishes employer variations, and avoids implying automatic day/night rotation.

### `/about`

Documents the product purpose, intended users, repeating-cycle and exact-date method, local calculation/storage behavior, ICS and print behavior, verification expectations, and present limitations without inventing an author, team, history, or credentials.

## Internal-linking model

- The header exposes crawlable links to `/#generator`, `/shift-schedules`, and `/about`.
- The homepage adds a concise discovery section linking to the hub, both guides, and About after the generator.
- The hub links to the generator, both detail pages, and About.
- Each detail page links to the generator, hub, other detail page, and About.
- About links to the generator and hub.
- Hub and detail pages use one shared visible breadcrumb model; detail breadcrumbs include the hub.

## Structured-data policy

Only `BreadcrumbList` JSON-LD will be emitted, and only on pages with matching visible breadcrumbs. A small helper will create absolute URLs with `siteConfig.url` and serialize JSON safely by escaping `<`. No FAQ, HowTo, Article, author, organization, review, rating, pricing, or unsupported schema will be added.

## Content source-of-truth strategy

Typed content definitions will hold editorial copy and stable route/metadata facts. Preset cycles, counts, labels, and dated examples will be derived at module initialization from the public schedule-domain API rather than copied into independent calculation logic. Tests will compare all presented sequences and examples with `resolvePresetPattern` and `expandSchedule`. The domain remains independent of content and React.

## Server and Client Component boundaries

All new pages and content components are React Server Components and statically prerenderable. Fixed examples are calculated synchronously with pure domain functions during server/build rendering. No new browser state, client boundary, CMS, database, runtime fetch, or static-prose JavaScript is introduced. The existing generator remains the only interactive product boundary.

## Testing strategy

- Unit tests validate typed content identifiers, sequences, counts, fixed-shift wording flags, accuracy notes, and engine-generated dated examples.
- Component tests validate one H1 per page, hub/detail/About content, crawlable links, accessible breadcrumbs, header navigation, and existing generator controls.
- Metadata tests validate unique titles/descriptions, canonical paths, Open Graph URLs, sitemap membership/exclusions, robots sitemap, JSON-LD validity and absolute URLs, and absence of unsupported schema fields.
- Playwright tests cover the requested discovery flows, direct route access, metadata/status/server-rendered content, mobile overflow at 320/390/768/1024/1440, and existing generator/ICS/share/print regressions.
- The production build output and built HTML will be inspected for static rendering and initial-response content.

## Files to create

- `src/content/content-types.ts`
- `src/content/shift-schedules.ts`
- `src/content/site-pages.ts`
- `src/components/content/breadcrumbs.tsx`
- `src/components/content/generator-cta.tsx`
- `src/components/content/pattern-guide.tsx`
- `src/lib/metadata.ts`
- `src/lib/structured-data.ts`
- `src/app/shift-schedules/page.tsx`
- `src/app/shift-schedules/4-on-4-off/page.tsx`
- `src/app/shift-schedules/2-2-3/page.tsx`
- `src/app/about/page.tsx`
- `tests/unit/content/content-integrity.test.ts`
- `tests/unit/content/content-pages.test.tsx`
- `tests/unit/content/seo.test.ts`
- `tests/e2e/discovery.spec.ts`

Exact filenames may be consolidated where that makes the boundary clearer; any deviation will be reflected in the completion record.

## Files to modify

- `src/app/page.tsx`
- `src/app/sitemap.ts`
- `src/components/layout/site-header.tsx`
- `tests/unit/homepage.test.tsx`
- `tests/e2e/homepage.spec.ts` only if the existing regression suite needs shared assertions
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- this plan

`robots.ts` will remain unchanged if review confirms it already allows public routes and references the canonical sitemap.

## Explicit non-goals

No additional, year, location, profession, employer, or automatically generated pages; no blog, CMS, database, search, user content, localization, analytics, advertising, Search Console, indexing API, newsletter, affiliate, rank tracking, generated social images, FAQ schema, ratings, fabricated identity, production-domain change, deployment change, dependencies, or Phase 5 work.

## Acceptance criteria

1. The four approved routes exist, are statically prerendered, return 200, and each has one H1 and meaningful initial HTML.
2. The hub provides a useful engine-aligned comparison.
3. Both detail pages contain unique accurate prose, exact cycles, full engine-generated examples, anchor/fixed-shift explanations, practical considerations, FAQs, employer-variation notes, and complete internal links.
4. About documents purpose, methodology, privacy, exports, accuracy approach, and limitations.
5. Titles, descriptions, canonicals, and Open Graph values are unique and correct.
6. Visible accessible breadcrumbs and matching safe `BreadcrumbList` JSON-LD appear on the hub and details.
7. The sitemap contains only the homepage and four approved routes; robots remains correct.
8. All pages are linked through ordinary anchors, with no orphans or invalid schedule queries.
9. The existing generator, canonical URLs, monthly/yearly views, ICS, sharing, and printing remain functional.
10. Tests, build, diff checks, required viewport review, documentation, and content integrity checks pass under Node 24 with no dependency change or unrelated/sensitive files.

## Verification commands

Run under the repository-declared Node 24 runtime:

```text
node --version
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check
git status --short
```

Also inspect the production route manifest/build output, initial built HTML, route HTTP status and metadata, JSON-LD, sitemap/robots responses, internal links, dependency diff, and horizontal overflow at 320, 390, 768, 1024, and 1440 pixels.

## Completion record

### Routes created

- `/shift-schedules`
- `/shift-schedules/4-on-4-off`
- `/shift-schedules/2-2-3`
- `/about`

All four are explicit static Server Component routes and returned 200 in browser tests.

### Files created

- `src/content/content-types.ts`
- `src/content/shift-schedules.ts`
- `src/content/site-pages.ts`
- `src/components/content/breadcrumbs.tsx`
- `src/components/content/generator-cta.tsx`
- `src/components/content/pattern-guide.tsx`
- `src/lib/metadata.ts`
- `src/lib/structured-data.ts`
- the four route `page.tsx` files
- `tests/unit/content/content-integrity.test.ts`
- `tests/unit/content/content-pages.test.tsx`
- `tests/unit/content/seo.test.ts`
- `tests/e2e/discovery.spec.ts`

### Files modified

The homepage, root layout, header, sitemap, homepage unit test, README, architecture/UX/SEO/security/testing/decision/roadmap documentation, and this plan were updated. `robots.ts`, schedule rules, generator behavior, V1 URLs, ICS, and print implementation did not require changes.

### Final metadata and canonical map

| Path                          | Rendered title                                            | Canonical                     |
| ----------------------------- | --------------------------------------------------------- | ----------------------------- |
| `/shift-schedules`            | `Rotating Shift Schedule Patterns \| Shift Calendar`      | `/shift-schedules`            |
| `/shift-schedules/4-on-4-off` | `4 On 4 Off Schedule Calendar & Guide \| Shift Calendar`  | `/shift-schedules/4-on-4-off` |
| `/shift-schedules/2-2-3`      | `2-2-3 Shift Schedule Calendar & Guide \| Shift Calendar` | `/shift-schedules/2-2-3`      |
| `/about`                      | `About Shift Calendar`                                    | `/about`                      |

Each canonical and Open Graph URL becomes absolute through `siteConfig.url`; each description is separately authored.

### Structured data and sitemap

The hub and both detail pages render visible accessible breadcrumbs and matching `BreadcrumbList` JSON-LD. Serialization escapes `<`, and tests reject FAQ/review/rating/author schema. About has no breadcrumb schema because no visible breadcrumb is rendered there. The sitemap contains only `/`, the hub, both guides, and About, with no query URLs or invented modification dates. Existing robots output allows public routes and points to that sitemap.

### Internal-link graph

The header links to the generator, hub, and About. Homepage discovery links reach the hub, both details, and About. The hub links to the generator, both details, and About. Each detail links to the generator, hub, sibling detail, and About. About links to the generator and hub. No approved route is orphaned.

### Content verification

The typed guide builder calls `resolvePresetPattern("day")` and `expandSchedule` with the parsed 2026-01-05 anchor. Cycle lengths, work/off counts, visible positions, and complete example rows therefore share the product domain source. Unit tests independently recreate and compare those values, identifiers, paths, fixed-shift safeguards, and employer-variation notes.

### Verification results

- Node: `v24.19.0`
- Clean install: `npm ci` completed after stopping a repository-local dev-server process that initially locked a native dependency on Windows.
- `npm run format`: passed; no further formatting changes.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 13 files and 151 tests passed (the previous 138 plus 13 Phase 4 tests).
- `npm run test:e2e`: 26 tests passed (the previous 14 plus 12 Phase 4 tests).
- `npm run build`: passed; Next.js reported `/`, all four new routes, sitemap, and robots as static.
- Built HTML inspection: every new route has meaningful main content, one H1, description, canonical, and Open Graph URL; hub/details have BreadcrumbList; none has FAQ/rating markup.
- Browser widths: every new route was exercised at 320, 390, 768, 1024, and 1440 CSS pixels with usable primary navigation and no document overflow; representative visual review covered all four layouts.
- `git diff --check` and final status are recorded at handoff.

### Remaining discovery work

No additional routes are approved. A future phase may evaluate field performance/search measurement after privacy review and use real user needs to propose separately reviewed content. It should not infer year, location, profession, employer, or mass-generated variants from this cluster.
