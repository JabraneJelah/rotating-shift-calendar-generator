# SEO strategy

## Rendering and route direction

Indexable landing pages are server-rendered and useful without client JavaScript. The intended route families are:

- `/` — product entry point
- `/shift-schedules` — pattern directory
- `/shift-schedules/[pattern]` — explanatory pattern pages
- `/calculators/[calculator]` — focused scheduling utilities
- `/guides/[slug]` — editorial guidance

Only `/` exists through Phase 2B. New routes require distinct search intent and substantive content; route count is not a goal.

## URL conventions

Use lowercase kebab-case, stable descriptive slugs, no file extensions, and no trailing-slash variants. Query parameters may carry generator state, but configurable result permutations are not landing pages. Changing a published slug requires a permanent redirect and link updates.

Future share URLs use the versioned domain codec. Version 1 emits one canonical parameter order, rejects duplicate or unknown parameters, and uses stable short cycle tokens. Valid noncanonical ordering may be parsed, but links are reserialized to the canonical form before they are presented for sharing.

The shipped generator restores V1 query state in its client boundary and canonicalizes it with native history. The document canonical remains the clean `/` URL, and configured query variants are excluded from `sitemap.xml`. Server-rendered homepage copy and metadata do not depend on a configuration query.

Phase 3A's explicit copy action serializes the already validated configuration through the same V1 codec, includes the currently visible `m`, and combines it only with the current clean origin and pathname. It never preserves unrelated parameters or fragments and introduces no second share schema. Shared configuration URLs remain user state rather than landing pages: they retain the clean document canonical and are not added to the sitemap.

Phase 3B's yearly view is transient presentation state. It adds no query parameter, V2 schema, route, metadata variant, or sitemap entry. Shared V1 URLs continue to restore the configured monthly view, and yearly user results remain non-indexable client-rendered state under the clean homepage canonical.

Phase 5A adds only optional presentation state to the existing codec: omission means Monday-first and `ws=sun` means Sunday-first. The parameter follows optional `m` in canonical serialization, is excluded from configuration identity, and creates no indexable route or metadata variant. Next-schedule information, weekend totals, and year downloads remain client-generated user results under the clean homepage canonical.

Phase 5B2 extends V1 additively. Fixed preset URLs require `shift=day|night`; concrete rotating preset URLs omit and reject `shift`. New preset identifiers remain query configuration under the homepage canonical. No guide, sitemap entry, metadata variant, dynamic pattern route, or programmatically generated page is created. Future DuPont, 2D/2N/4O, or combined 7-on/7-off content requires separate editorial review.

Phase 6A2 personal shift names, labels, colors, times, breaks, and definition IDs are intentionally excluded from V1 query parameters, copied links, canonicals, metadata, and structured data. Reload and shared-link restoration recover only the compatible base rotation. No V2 schema, compressed payload, content route, or sitemap entry is introduced.

Phase 6A3 date replacements, Leave, Sick, Training, Additional work, notes, and effective totals are likewise client-only state. They create no route, query parameter, canonical variant, metadata, structured data, or sitemap entry. Copy continues emitting only the compatible V1 base rotation.

Phase 6A4 timezone choice, DST disambiguation, timed filenames, and UTC event values are browser-only export state. They add no route, query parameter, canonical, metadata, structured data, sitemap entry, or V1 field.

Phase 6B1 saved-planner IDs, names, revisions, definitions, exceptions, notes, timezone and backup metadata remain in browser storage/files only. They never enter V1 links, canonicals, metadata, JSON-LD, referrers, server logs, analytics, or the sitemap. A clean `/` may restore a planner after hydration without changing server-rendered SEO content; any V1 query remains an unsaved base-only session. No planner-management route or URL V2 is introduced.

## Metadata and canonicals

Every indexable route needs a unique, accurate title and description written for the page. Use native Next.js metadata APIs. Titles should lead with the page purpose and inherit the site-name template. Canonicals must resolve against the validated `NEXT_PUBLIC_SITE_URL` origin and normally point to the clean route without tracking or configuration parameters.

Deployment must set the real HTTPS site origin. The repository uses `http://localhost:3000` only as a safe build/development fallback.

## Discovery controls

Use native `sitemap.ts` and `robots.ts`; the sitemap contains canonical, indexable URLs only. Drafts, internal tools, error pages, thin search/filter pages, and user-specific or configurable result URLs must not be indexed. `robots.txt` is not a security boundary. The web manifest supports installation, while the `/offline` document is excluded from the sitemap and carries `noindex, nofollow, noarchive` metadata and response headers.

The service worker is a returning-browser enhancement. Crawlers and first visits receive the normal server-rendered documents, metadata, canonicals, structured data, sitemap, robots response, and status codes without depending on it. It does not turn unknown paths into successful homepage responses. All `/?v=1&...` requests reuse one cached clean-root shell offline while client-side validation retains the actual query; query permutations are never separate cached pages.

## Internal links and content

Link related pattern pages, calculators, and guides using descriptive anchor text within genuinely helpful context. Each indexable page must answer its stated question, expose exact pattern assumptions, show worked examples where appropriate, name limitations, and be reviewed for accuracy. Avoid filler introductions, fake expertise, fabricated claims, and pages differing only by substituted keywords.

## Structured data

Add JSON-LD only for a schema type accurately represented by visible page content. Validate it, keep it consistent with metadata, and do not add ratings, FAQs, or other rich-result markup solely to attract search features. There is no structured data through Phase 2B.

## Programmatic SEO safeguards

Pattern pages may be data-backed only when every page has a verified schedule definition, unique explanatory value, and a deliberate canonical URL. Do not index arbitrary generated date ranges, custom configurations, or combinations of query parameters. Apply quality review and an explicit allowlist before sitemap inclusion.

## Core Web Vitals

- Keep primary content server-rendered and JavaScript budgets small.
- Size or reserve media, calendar results, consent surfaces, and any future ads to protect CLS.
- Use optimized local/font framework behavior and avoid render-blocking third parties.
- Keep interaction handlers small and move calculations out of rendering paths.
- Measure LCP, INP, and CLS with field data before making performance claims.

Duplicate result pages are prevented through clean-route canonicals, non-indexing of configuration URLs, and exclusion from the sitemap. A valid share configuration does not make a URL indexable: configured calendar results must canonicalize to the clean generator route unless a separately reviewed, substantive landing page exists.

## Phase 4 published discovery cluster

The final indexable inventory is `/`, `/shift-schedules`, `/shift-schedules/4-on-4-off`, `/shift-schedules/2-2-3`, and `/about`. Their intents are respectively product use, pattern comparison, exact eight-day guidance, exact fixed-shift fourteen-day guidance, and product methodology/trust. Each has unique authored metadata and a one-to-one clean canonical resolved through the validated site origin; query state remains canonicalized to `/`.

The header links to the generator, hub, and About. The homepage links to the hub, both guides, and About; the hub links to both guides, the generator, and About; each guide links to its sibling, hub, generator, and About; About links to the hub and generator. These are ordinary crawlable anchors.

Visible hub/detail breadcrumbs emit matching `BreadcrumbList` JSON-LD with absolute URLs. No FAQPage, HowTo, Article, author, organization, review, rating, or pricing schema is emitted. The sitemap contains exactly the five approved HTML routes and omits arbitrary modification dates, query URLs, exports, and print states.

There is no dynamic page generator. Each guide has unique editorial treatment and a complete domain-derived example. Any future route requires manual intent, factual, metadata, internal-link, thin-content, visible/schema, and standalone-utility review before sitemap approval.
