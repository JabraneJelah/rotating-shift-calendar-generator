# Shift Calendar

Shift Calendar is a fast, accessible, mobile-first rotating-shift calendar generator. It turns approved fixed-shift patterns or an editable Day/Night/Off cycle into a clear monthly calendar without an account or backend.

The current Phase 3A interface supports `4 on / 4 off`, `2-2-3`, fixed Day or Night shifts, custom cycles, month navigation, restorable versioned URLs, explicit link copying, and visible-month ICS downloads. Schedule calculations, sharing, and file generation happen locally in the browser; yearly output and printing remain later Phase 3 work.

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
src/features/schedule/   Generator UI, presentation helpers, and pure domain modules
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
