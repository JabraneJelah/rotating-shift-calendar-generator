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

## Metadata and canonicals

Every indexable route needs a unique, accurate title and description written for the page. Use native Next.js metadata APIs. Titles should lead with the page purpose and inherit the site-name template. Canonicals must resolve against the validated `NEXT_PUBLIC_SITE_URL` origin and normally point to the clean route without tracking or configuration parameters.

Deployment must set the real HTTPS site origin. The repository uses `http://localhost:3000` only as a safe build/development fallback.

## Discovery controls

Use native `sitemap.ts` and `robots.ts`; the sitemap contains canonical, indexable URLs only. Drafts, internal tools, error pages, thin search/filter pages, and user-specific or configurable result URLs must not be indexed. `robots.txt` is not a security boundary. The web manifest supports repeat mobile visits but does not imply offline behavior.

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
