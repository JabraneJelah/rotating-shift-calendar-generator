# Shift Calendar

Shift Calendar is a fast, accessible, mobile-first rotating-shift calendar generator. It turns approved fixed-shift patterns or an editable Day/Night/Off cycle into clear monthly and yearly calendars without an account or backend.

The current Phase 6A2 product supports six verified presets: fixed `4 on / 4 off`, fixed `2-2-3`, fixed `7 on / 7 off`, rotating `2 Day / 2 Night / 4 Off`, the exact 28-day DuPont rotation, and rotating `7 Day / 7 Off / 7 Night / 7 Off`. It also supports custom cycles, month and year navigation, Monday- or Sunday-first calendars, next-schedule insights, worked-weekend-date totals, restorable versioned URLs, explicit link copying, monthly and full-year ICS downloads, and native printing of the active calendar view. An optional collapsed Shift details section can apply private Day/Night names, short labels, curated colors, and nominal wall-clock hours with overnight, explicit 24-hour, and unpaid-break calculations. These details are session-only, excluded from shared V1 links, and do not change the all-day ICS exports. A small server-rendered discovery cluster continues to explain the two individually reviewed preset guides and the product methodology; adding a generator preset does not create a content route. Schedule calculations, sharing, file generation, and printing preparation happen locally in the browser.

The year selector remains transient, while the optional Sunday-first preference is saved in compatible V1 links as `ws=sun`; old links and Monday-first links remain unchanged. Month export targets the preserved visible month and year export targets the actively displayed year. Print output hides page chrome and controls; monthly output requests portrait and yearly output requests landscape with a break after six months. Final pagination, headers, margins, and background-color handling remain subject to the browser and printer dialog.

## Requirements

- Node.js 24 LTS (`.nvmrc` is included)
- npm 10 or newer

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. On macOS or Linux, replace `copy` with `cp`.

Public content routes are `/shift-schedules`, `/shift-schedules/4-on-4-off`, `/shift-schedules/2-2-3`, and `/about`. Their metadata, canonicals, breadcrumbs, and sitemap entries use the validated site origin.

`NEXT_PUBLIC_SITE_URL` must be an absolute HTTP(S) origin with no path. The local fallback is `http://localhost:3000`; deployment must set the real HTTPS origin so canonical URLs, the sitemap, and robots metadata are correct.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Use `npm run format` to apply formatting and `npm run test:watch` during unit/component test development. The end-to-end command requires a Playwright Chromium installation (`npx playwright install chromium`).

## Project map

```text
src/app/                 Routes, layouts, and metadata
src/components/ui/       Reusable shadcn/ui-style primitives
src/components/layout/   Shared page chrome
src/features/schedule/   Generator UI, presentation helpers, and pure domain modules
src/lib/                 Generic configuration and utilities
src/content/             Typed editorial and route metadata sources
src/styles/              Global styles and design tokens
tests/unit/              Unit and component tests
tests/e2e/               Playwright journeys
docs/                    Product and engineering sources of truth
```

Empty future directories are documented but are added only when they contain real code or content.

## Documentation

Start with [the product definition](docs/PRODUCT.md), [domain terminology](docs/DOMAIN.md), and [architecture](docs/ARCHITECTURE.md). Contributors and coding agents must also follow [AGENTS.md](AGENTS.md).
