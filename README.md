# Shift Calendar

Shift Calendar is the foundation for a fast, mobile-first rotating-shift calendar generator. It will help workers translate repeating day, night, and off-duty patterns into clear monthly or yearly calendars that can be printed or exported.

Phase 1 establishes the production stack, project boundaries, documentation, SEO primitives, test tooling, and a deliberately non-interactive homepage. Schedule generation begins in a later phase.

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
src/features/schedule/   Schedule feature UI and, later, its domain modules
src/lib/                 Generic configuration and utilities
src/content/             Future structured editorial content
src/styles/              Global styles and design tokens
tests/unit/              Unit and component tests
tests/e2e/               Playwright journeys
docs/                    Product and engineering sources of truth
```

Empty future directories are documented but are added only when they contain real code or content.

## Documentation

Start with [the product definition](docs/PRODUCT.md), [domain terminology](docs/DOMAIN.md), and [architecture](docs/ARCHITECTURE.md). Contributors and coding agents must also follow [AGENTS.md](AGENTS.md).
