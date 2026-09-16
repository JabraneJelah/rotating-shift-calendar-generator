# Architecture

## System shape

Shift Calendar is a Next.js App Router application deployed as a server-rendered, cache-friendly website. The Phase 1 homepage and metadata routes are React Server Components or native Next.js route conventions. Browser code is introduced only where interaction requires it.

```text
Routes and content (src/app, src/content)
              ↓
Feature composition (src/features/schedule)
              ↓
Pure schedule domain modules (framework-independent)
              ↓
Small generic utilities (src/lib)
```

UI primitives in `src/components/ui` and shared chrome in `src/components/layout` support route and feature composition; they do not own schedule rules.

## Directory responsibilities

- `src/app`: routes, layouts, route metadata, sitemap, robots, and composition
- `src/components/ui`: reusable, accessible shadcn/ui-style primitives
- `src/components/layout`: shared site-level layout components
- `src/features/schedule`: schedule-specific UI and future domain modules
- `src/lib`: generic utilities and validated application configuration
- `src/content`: structured SEO/editorial content once real content exists
- `src/styles`: global CSS and stable design tokens
- `tests`: shared setup plus unit/component and end-to-end tests

Do not create empty abstractions or barrel files in anticipation of later work.

## Schedule boundary

The public schedule API is `src/features/schedule/domain/index.ts`. Consumers should import from that deliberate barrel rather than reaching into internal files. Its concrete modules are:

- `schedule-types.ts`: branded calendar values, configuration unions, occurrences, and typed results
- `date-only.ts`: strict parsing and integer Gregorian calendar arithmetic
- `presets.ts`: approved fixed-shift cycles and custom-pattern validation
- `schedule-engine.ts`: positive-modulo occurrence resolution and bounded inclusive expansion
- `schedule-config.ts`: untrusted configuration validation and the V1 share-query codec

Dependency direction is one way: routes, UI, print, and export features may import the public domain API; the domain never imports those consumers. Domain modules import only other domain modules. They do not import React, Next.js, UI components, browser state, locale formatters, persistence, authentication, or network code.

Date-only operations remain date-only. The domain exposes strings and readonly result objects, never JavaScript `Date` instances. This makes the same rules usable by server rendering, client interaction, future calendar views, printing, export, and tests without duplication.

## Rendering and state

Server Components are the default. A minimal Client Component boundary should own interactive form state when Phase 2 begins; its validated configuration can be passed to pure domain functions. Durable/shareable state belongs in a versioned URL representation where practical. No global state library is justified yet.

## Configuration

`NEXT_PUBLIC_SITE_URL` is parsed centrally in `src/lib/site.ts`. It must be an HTTP(S) origin without a path. Local development falls back to `http://localhost:3000`; production must provide the real origin. Secrets must never use the `NEXT_PUBLIC_` prefix or be committed.

## Dependencies

Runtime dependencies are limited to the framework, React, icons, and class-name utilities used by the UI foundation. Phase 2A uses no date or schema dependency: its small calendar and validation surface is implemented explicitly and covered by boundary tests. A new package still requires a concrete use, maintenance review, and consideration of client bundle cost.
