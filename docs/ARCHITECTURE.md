# Architecture

## System shape

Shift Calendar is a Next.js App Router application deployed as a server-rendered, cache-friendly website. The root layout, homepage, introductory content, and metadata routes are React Server Components or native Next.js route conventions. Browser code begins at the schedule generator, where controlled inputs, focus, and native history require it.

```text
Routes and content (src/app, src/content)
              ↓
Feature composition (src/features/schedule)
              ↓
Pure ICS export formatting (src/features/schedule/export)
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
- `src/features/schedule`: schedule-specific components, presentation helpers, and pure domain modules
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

## Calendar export boundary

`src/features/schedule/export/index.ts` is the calendar-export API. Its serializer consumes a validated configuration, the already generated visible-month occurrences, a validated view month, and an injected basic UTC timestamp. It never expands a schedule or independently calculates cycle positions. It imports only the public schedule domain for canonical configuration identity and next-calendar-date arithmetic.

The pure serializer and its escaping/types modules do not import React, Next.js, or browser globals. They emit typed success/failure results, escaped and UTF-8-folded RFC 5545 content, deterministic UIDs, and stable file metadata. `ics-download.ts` is the explicit browser boundary: it creates the UTF-8 `Blob`, clicks one temporary download anchor, and revokes the object URL in `finally`.

`ScheduleActions` is nested under the existing `ScheduleGenerator` client graph. It uses the existing V1 codec to build a current-origin canonical link with visible-month state, owns Clipboard API feedback and the labelled manual-copy fallback, and invokes the export/download APIs. Dependency direction remains UI/browser effects → pure export → public domain; neither export formatting nor the domain imports UI code.

## Rendering and state

Server Components remain the default. `src/features/schedule/components/schedule-generator.tsx` is the single explicit Client Component boundary; its form, calendar, and presentation imports form the smallest practical client graph. `page.tsx`, layout, header, metadata, and introductory content remain server-rendered.

The generator separates editable form values from validated generated state. Submission passes untrusted values through `validateScheduleConfig`; only validated `ScheduleConfig` reaches the month-view helper and `expandSchedule`. Presentation helpers derive Monday-first rows, English labels, counts, and adjacent months without duplicating occurrence rules.

Initial and `popstate` queries are parsed only through `parseScheduleQuery`. Valid state is immediately reserialized through `serializeScheduleQuery`: manual generation uses `pushState`, while month navigation and canonicalization use `replaceState`. Empty and invalid queries leave a usable form. The server renders stable empty defaults, keeps the form disabled only until URL restoration completes after hydration, and does not make the page dynamic.

## Yearly presentation and printing

The yearly presentation helper receives the same validated configuration and a supported year. It performs one bounded `expandSchedule` call for January 1 through December 31, then partitions those immutable occurrences into twelve semantic month tables and derives annual totals. Shared table and legend components keep monthly and yearly meanings aligned while leaving all cycle calculation in the domain.

View mode and year navigation are transient client presentation state. Selecting Year derives the year from the preserved monthly view; returning to Month restores that exact month. Neither operation changes the V1 URL. New generation, reload, and `popstate` restoration reset presentation to Month. `ScheduleActions` therefore continues to serialize and export the monthly view while its print button invokes the browser's native `window.print()` for the currently rendered view.

Print output uses the same semantic result DOM rather than a cloned or separately calculated document. Global print CSS removes site chrome, configuration, view controls, and actions; it retains schedule identity, totals, tables, and the legend. Named pages request portrait monthly output and landscape yearly output, with the seventh yearly month starting a new page. Those CSS requests are best effort because browser and printer settings retain final pagination control.

## Configuration

`NEXT_PUBLIC_SITE_URL` is parsed centrally in `src/lib/site.ts`. It must be an HTTP(S) origin without a path. Local development falls back to `http://localhost:3000`; production must provide the real origin. Secrets must never use the `NEXT_PUBLIC_` prefix or be committed.

## Dependencies

Runtime dependencies are limited to the framework, React, icons, and class-name utilities used by the UI foundation. Phase 2A uses no date or schema dependency: its small calendar and validation surface is implemented explicitly and covered by boundary tests. A new package still requires a concrete use, maintenance review, and consideration of client bundle cost.
