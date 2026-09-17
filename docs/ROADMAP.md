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

## Phase 3A — ICS export and explicit sharing (complete)

- Canonical V1 copy control including the currently visible month
- Accessible temporary feedback and manual-copy fallback for unavailable/rejected clipboard access
- Dependency-free RFC 5545 visible-month export with all-day Day, Night, and Off events
- Deterministic UIDs, injected UTC timestamps, escaped/folded text, safe filenames, and local Blob downloads
- Unit, component, and browser coverage for copying, fallback, download content, cleanup, and mobile overflow

## Phase 3B — yearly view and printing (complete)

- Transient accessible Month/Year selector with preserved V1 monthly URL state
- Single-expansion twelve-month overview, annual totals, and year navigation
- Native active-view printing with portrait monthly and two-part landscape yearly CSS
- Shared semantic calendar/legend presentation and mobile-to-desktop yearly layout
- Unit, component, browser, print-media, timezone, and accessibility-oriented coverage

## Phase 4 — content and discovery (complete)

- Server-rendered comparison hub plus substantive 4-on/4-off and fixed-shift 2-2-3 guides
- Engine-derived cycles, counts, and complete dated examples backed by content-integrity tests
- About methodology, privacy, export, accuracy, and limitation documentation
- Crawlable internal links, unique metadata/canonicals, exact sitemap expansion, and visible BreadcrumbList markup

Field performance and search measurement remain later work subject to privacy review; they were not introduced in Phase 4.

## Phase 5A — personal insights and year export (complete)

- Backward-compatible Monday/Sunday week-start preference in V1 share links
- Separate tomorrow and next-working-day information from date-only schedule rules
- Monthly and annual worked Saturday/Sunday date totals
- Explicit full-year ICS export with complete-range validation and 365/366 events
- Unit, component, timezone, browser, responsive, print, and boundary coverage without new dependencies or routes

## Phase 5B — verified preset library

### Phase 5B1 — research and specification (complete)

Eight named families were reviewed against authoritative sources, current domain fit, duplication risk, user value, and naming ambiguity. Four exact additions were approved; Evening/Swing patterns and ambiguous or specialized candidates were deferred.

### Phase 5B2 — implementation (complete)

- Six total presets in immutable discriminated fixed/rotating definitions
- Backward-compatible V1 fixed URLs and shift-free rotating URLs
- Grouped native selector with complete domain-derived cycle preview
- No Evening/Swing value, selector search, dependency, guide route, or sitemap change

Exit criteria were met: formatting, lint, type checking, all 199 unit/component tests, all 39 browser tests, and the production build passed. Legacy fixed URLs, shift-free rotating URLs, reload and history restoration, sharing, exports, print, keyboard use, and responsive layouts are covered.

## Later evaluation

Only after real usage: advertising, localization, saved schedules/accounts, and server persistence. Each requires a separate product, privacy, performance, and maintenance decision.
