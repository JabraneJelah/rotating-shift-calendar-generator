# Roadmap

## Phase 1 — foundation (complete)

- Production Next.js, TypeScript, Tailwind CSS, and shadcn/ui-compatible foundation
- Accessible responsive homepage and global design tokens
- Metadata, robots, sitemap, manifest, and validated site origin
- Unit/component and Playwright test harnesses
- Durable product, domain, architecture, UX, SEO, testing, and security documentation

Exit criteria were met: static checks and unit tests passed, the production build and local server succeeded, and the browser smoke test passed.

## Phase 2A — schedule domain engine (complete)

- Exact fixed-shift `4-on-4-off` and `2-2-3` presets
- Strict branded ISO date-only values and timezone-independent Gregorian arithmetic
- Validated custom cycles and backward/forward occurrence resolution
- Bounded inclusive range expansion
- Version-1 pure share-configuration codec
- Comprehensive explicit unit and timezone-environment tests

Phase 2A contains no generator or calendar UI.

## Phase 2B — monthly generator interface (complete)

- Accessible pattern and fixed working-shift selection
- Start-date input and custom day/night/off cycle editing
- Mobile-first monthly calendar result using the Phase 2A public API
- Accessible validation messages mapped from stable domain error codes
- URL state integration using the V1 codec, without making configured results indexable
- Component and end-to-end coverage for the completed journey

Exit criteria were met: preset and custom workflows use the Phase 2A API, URL restoration/history and accessible focus behavior are covered, responsive overflow checks pass from 320–1440px, and static, unit, browser, and production-build checks pass.

## Phase 3 — calendar output

- Year view and print layout
- ICS export with explicit all-day/timed behavior
- Share controls built on the resilient configuration loading shipped in Phase 2B
- Expanded browser and accessibility coverage

## Phase 4 — content and discovery

- Verified pattern directory and a small set of substantive pattern pages
- Guides and calculators chosen from demonstrated user needs
- Internal linking, sitemap expansion, and structured data where eligible
- Field performance and search measurement after privacy review

## Later evaluation

Only after real usage: advertising, localization, saved schedules/accounts, and server persistence. Each requires a separate product, privacy, performance, and maintenance decision.
