# Plan 005 — yearly view and printing

**Status:** Complete
**Scope:** Phase 3B only

## Objective

Add an accessible twelve-month schedule overview, annual totals, year navigation, and browser-native printing for the active monthly or yearly view. Preserve every Phase 2 and Phase 3A URL, calculation, sharing, export, focus, and mobile contract without adding a dependency or URL schema.

## Current architecture observations

- The worktree is clean on `main` at `c1ca573`, matching `origin/main`.
- `ScheduleGenerator` is the single deep Client Component and already owns validated generated state, native history, focus, and status announcements. The route, layout, metadata, header, and marketing content remain Server Components.
- `MonthlyCalendarView` contains one domain-expanded month, Monday-first weeks, and totals. Its pure presentation helpers can be reused without changing schedule arithmetic.
- `MonthlyCalendar` currently combines result heading, month navigation, summary, Phase 3A actions, semantic table, and legend. Only the read-only table and legend warrant extraction; a broad rewrite would add risk.
- `ScheduleActions` owns canonical copying and visible-month ICS download. It can remain bound to the preserved monthly view while gaining a native print action for whichever view is active.
- The domain supports inclusive ranges up to 366 days, exactly enough for a common or leap calendar year. No domain change is required.
- Global Tailwind CSS is imported once from the root layout. Dedicated semantic print classes and one `@media print` section in `globals.css` fit the current Next.js 16 guidance.
- Current Vitest and Playwright coverage provides stable accessible selectors for monthly behavior, URL restoration, copy fallback, real downloads, and responsive overflow.
- The system `node` command exposes Node 22.17.1 and no `nvm` command, but the Codex workspace runtime includes Node 24.19.0. Final verification uses that repository-compatible Node 24 binary explicitly.

## Existing monthly behavior to preserve

- Month is the default after generation, direct-link restoration, Back, and Forward.
- Previous/next month navigation continues to replace only canonical V1 `m` state.
- The monthly semantic table, totals, full date labels, focus behavior, mobile layout, copy link, manual fallback, and visible-month ICS export remain behaviorally unchanged.
- Switching to year mode never mutates the current month or V1 query. Returning to month mode restores that same monthly result.
- A newly generated or restored schedule resets transient view mode to month.

## Yearly-view data flow

1. `ScheduleGenerator` receives only a validated `ScheduleConfig` and the current validated monthly view.
2. Switching to Year reads the four-digit year from the preserved `viewMonth`.
3. A pure yearly presentation helper validates `<year>-01-01` and `<year>-12-31` through `parseISODate`.
4. It calls `expandSchedule(config, from, to)` exactly once.
5. It groups the resulting ordered 365/366 occurrences into twelve month presentation objects.
6. Shared pure week/count helpers derive Monday-first structural cells and annual totals without recalculating shifts.
7. `YearlyCalendar` renders the resulting immutable view; year navigation repeats this one annual expansion for the adjacent supported year.

## View-state model

`ScheduleViewMode` is the presentation-only union `"month" | "year"`, owned by `ScheduleGenerator` alongside an optional `YearlyCalendarView`. It is not exported from or stored in the schedule domain.

- Default: month.
- Year selection begins from the preserved monthly view year.
- Month navigation remains unchanged and is unavailable only because the monthly component is not rendered while in year mode.
- Year navigation changes only the derived yearly view and status announcement.
- Returning to month renders the preserved `generated.view` without changing form values, configuration, URL, copy-link state, or ICS range.
- View switching writes no history entry and creates no V2 state. Reloaded/shared URLs restore month mode.

## Component boundaries

- `ScheduleGenerator`: owns transient view mode/year view, validated state, URL lifecycle, and orientation/status behavior.
- `ScheduleViewControls`: labelled Month/Year radio group plus active-view print button; rendered only for a valid result.
- `MonthlyCalendar`: retains month navigation, monthly summary, and monthly print document context.
- `YearlyCalendar`: owns year navigation, annual summary, two screen/print month groups, yearly heading, and shared legend.
- `CalendarMonthGrid`: reusable semantic Monday-first table with `monthly` and `compact` presentation variants. It never expands a schedule.
- `ShiftLegend`: reusable visible Day/Night/Off legend with text and non-color cues.
- `yearly-calendar-view.ts`: pure one-expansion annual grouping, totals, and supported-boundary navigation.
- `ScheduleActions`: remains canonical monthly copy/ICS behavior and adds `Print calendar`, which calls a supplied active-view print handler.

## Screen layout strategy

- Monthly layout retains its current sizing and hierarchy.
- Year view uses consistent month cards with one shared legend and annual summary.
- Wide layouts use three columns, tablet layouts two, and phones one.
- Month tables are fixed-width within their cards, use compact weekday headings, and show `D`, `N`, or `O` in every in-month cell.
- Empty structural cells align the first/last week; adjacent-month dates are never repeated.
- Calendar cards avoid decorative excess and keep readable spacing rather than compressing all twelve months into a single viewport.

## Mobile yearly-view strategy

- At 320–430px, cards render one per row and use normal vertical scrolling.
- Seven columns stay within each card using concise weekday labels, day numbers, and visible D/N/O markers.
- Full accessible date/shift names remain on cells; the shared legend expands every abbreviation.
- Controls use 44px targets, wrap vertically where needed, and introduce no page-level horizontal overflow.

## Print architecture

- `window.print()` is called only from the explicit button.
- Existing semantic HTML is printed; no cloned DOM, canvas, screenshot, endpoint, PDF generator, remote asset, or print service is introduced.
- Global print CSS hides elements marked `print-hidden` and reveals small `print-only` context blocks.
- Site header, skip link, hero, marketing/privacy content, generator introduction/form/errors, view selector, navigation, share/export/print actions, fallback fields, and live status are excluded without reserved gaps.
- Printed result sections include product name, view title, schedule identity/start/working shift, relevant totals, calendar content, legend, and a concise browser-print note.
- Backgrounds/shadows are removed; borders plus textual Day/Night/Off indicators preserve meaning without background graphics.

## Monthly print design

- Named page intent requests portrait where supported.
- The result heading, monthly summary, semantic month table, and legend stay together on one page when practical.
- The table and summary use `break-inside: avoid`; controls and the Phase 3A action panel are hidden.
- Cell text remains Day/Night/Off, so grayscale or disabled background printing stays understandable.

## Yearly print design

- Named page intent requests landscape where supported.
- The twelve cards are split semantically into two groups of six, each printed as three columns by two rows where page size allows.
- Each month card uses modern and legacy break-avoidance properties. The first six-month group requests a page break after it without inserting blank pages.
- Print typography and spacing are compact but retain D/N/O, weekday headings, borders, annual context, and one shared legend.
- Exact two-page pagination is browser/printer dependent; priorities are intact cards, legibility, all twelve months, predictable grouping, and low ink use.

## Browser limitations

- Browsers and printer drivers may ignore named `@page` orientation, exact margins, or a requested break between CSS-grid groups.
- Header/footer content controlled by the browser print dialog cannot be removed by application CSS.
- “Save as PDF” is a browser feature, not an application-generated file.
- Tests can validate print media styles and break-avoidance values in Chromium, but not every physical printer's pagination.

## Accessibility strategy

- Use a labelled native radio group for `Calendar view`; checked state is exposed without custom ARIA.
- Keep real buttons with descriptive year targets and disabled supported-year boundaries.
- Switching modes focuses the new result heading after the explicit action and announces the change; year navigation updates the heading/status without a page reload.
- Year mode has one main result heading, visible month captions, semantic tables, scoped weekday headers, full cell names, visible D/N/O, and a shared full-word legend.
- No meaning depends solely on color or `title`; focus styles and DOM order remain intact.
- Print source remains semantic HTML and never rasterizes text.

## Test matrix

### Pure presentation

- One annual expansion yields exactly twelve ordered months.
- Common year: January 1 through December 31 exactly once, 365 unique dates, valid Monday alignment, and totals summing to 365.
- Leap year: February 29 present exactly once, 366 unique dates, and totals summing to 366.
- Empty leading structural cells and no adjacent-month repetition.
- Previous/next year behavior at ordinary and years 0001/9999 boundaries.

### Component

- View/print controls hidden before valid generation and after invalid URL state.
- Controls visible after generation; Month checked by default.
- Year switching renders twelve headings, common/leap totals, representative dates, and annual counts.
- Previous/next year navigation and disabled boundaries.
- Returning to month preserves the prior month and its URL.
- `window.print()` is called once without changing the URL.
- Copy remains canonical for the preserved visible month; ICS Blob remains that month after visiting year mode.
- Existing monthly tests remain green.

### End to end and print media

- Preset yearly workflow, next-year navigation, and return to the preserved monthly view.
- Leap and common year date/total checks.
- Monthly and yearly `print` media hide all interactive/unrelated content while retaining title, summary, legend, and calendars.
- Year print contains all twelve cards, visible D/N/O, break avoidance, and no horizontal overflow.
- Print invocation is stubbed and produces no URL or resource-request change.
- 390×844 yearly mode is one column, readable, reachable, and overflow-free.
- Screen widths 320, 390, 768, 1024, and 1440 plus portrait/landscape/Letter-like print viewports are inspected with uncommitted screenshots where practical.

## Files to create

- `src/features/schedule/components/calendar-month-grid.tsx`
- `src/features/schedule/components/schedule-view-controls.tsx`
- `src/features/schedule/components/shift-legend.tsx`
- `src/features/schedule/components/yearly-calendar.tsx`
- `src/features/schedule/presentation/yearly-calendar-view.ts`
- `tests/unit/schedule/yearly-calendar-view.test.ts`
- `docs/plans/005-yearly-view-and-printing.md`

## Files to modify

- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/components/schedule-actions.tsx`
- `src/features/schedule/presentation/calendar-view.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/styles/globals.css`
- `tests/unit/schedule/calendar-view.test.ts`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- This plan at completion

No package manifest or lockfile change is planned.

## Explicit non-goals

No year-wide ICS, arbitrary range, V2 URL, persisted view mode, print preview modal, generated/downloaded PDF, PDF/print/calendar/state library, canvas/screenshot output, server endpoint, account, persistence, database, authentication, payment, analytics, ads/cookies, localization, week-start setting, new preset, multiple employees, hours/pay/overtime, notification, email sharing, printer integration, SEO landing page, or post-MVP growth work.

## Acceptance criteria

- Month remains the default and all existing monthly/share/export/history behavior passes unchanged.
- Valid results expose keyboard-accessible Month/Year and print controls; invalid/empty states do not.
- One domain expansion produces twelve semantic compact month tables and correct 365/366 totals.
- Year navigation respects years 0001–9999 and never changes URL/configuration/monthly ICS state.
- Returning to Month restores the preserved monthly result.
- Screen layouts use one/two/three columns without horizontal overflow or color-only meaning.
- Native printing prints only the active relevant result, with readable grayscale monthly/yearly layouts and intact month cards.
- Unit, component, browser, print-media, timezone, static, and production-build checks pass with no dependency change.
- Documentation matches final behavior and no out-of-scope work is introduced.

## Verification commands

```text
node --version
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ='UTC'; npx vitest run tests/unit/schedule
$env:TZ='America/New_York'; npx vitest run tests/unit/schedule
npm run test:e2e
npm run build
git diff --check
git status --short
```

Additional checks:

```text
rg 'from ["''](react|next)|window|document|navigator|Blob' src/features/schedule/domain
rg 'from ["''](react|next)|window|document|navigator|Blob' src/features/schedule/export/ics-types.ts src/features/schedule/export/ics-escape.ts src/features/schedule/export/ics-serializer.ts
npm ls --depth=0
```

## Completion record

Implemented the pure annual presentation model, shared semantic month grid and legend, transient view controls, yearly navigation/summary, and active-view native printing. The yearly helper expands January 1 through December 31 once, partitions the ordered result into twelve month models, and derives totals without changing domain rules.

Actual files created:

- `src/features/schedule/components/calendar-month-grid.tsx`
- `src/features/schedule/components/schedule-view-controls.tsx`
- `src/features/schedule/components/shift-legend.tsx`
- `src/features/schedule/components/yearly-calendar.tsx`
- `src/features/schedule/presentation/yearly-calendar-view.ts`
- `tests/unit/schedule/yearly-calendar-view.test.ts`
- `docs/plans/005-yearly-view-and-printing.md`

Actual files modified:

- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/components/schedule-actions.tsx`
- `src/features/schedule/presentation/calendar-view.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/layout/site-header.tsx`
- `src/styles/globals.css`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`

The generator preserves its validated monthly view as the V1 URL/copy/ICS source. Year switching and year navigation are transient; generation, reload, and history restoration reset to Month. The print action uses the currently rendered semantic view, while print CSS removes unrelated UI and requests one portrait monthly page or two landscape six-month yearly pages.

Documentation was updated in the product, architecture, UX, SEO, security, testing, decision, roadmap, and README sources. DOMAIN did not require an edit because no schedule rule changed and the existing 366-day expansion contract already covers leap years. The final component split leaves Print in `ScheduleActions` beside Copy and Download rather than in `ScheduleViewControls`; the selector remains a focused native radio group.

Final verification used Node 24.19.0 with npm 10.9.2:

- Clean `npm ci`: passed; 461 packages installed and 0 vulnerabilities reported.
- Prettier format and format check: passed.
- ESLint and strict TypeScript: passed.
- Vitest: 10 files and 138 tests passed.
- Schedule tests under `TZ=UTC`: 9 files and 137 tests passed.
- Schedule tests under `TZ=America/New_York`: 9 files and 137 tests passed.
- Playwright Chromium: 14 tests passed across monthly/yearly workflows, print media, native print activation, history, export, and 320/390/768/1440px overflow checks.
- Next.js production build: passed; all application routes remained static.
- Chromium PDF inspection: monthly output was one portrait Letter page; yearly output was exactly two landscape Letter pages with January–June and July–December, intact cards, text markers, totals/context, and legend.
- `git diff --check` passed aside from informational LF-to-CRLF warnings from the Windows checkout.
- Domain and pure ICS serializer boundary searches returned no React, Next.js, or browser-global imports.
- No package manifest or lockfile changed. `npm ls --depth=0` reported pre-existing extraneous optional WASM/image packages in `node_modules`; declared dependencies resolved.

The system PATH still defaults to Node 22.17.1, so finalization invoked the bundled Node 24.19.0 binary explicitly without changing `.nvmrc`. Exact print orientation and pagination remain best-effort outside the inspected Chromium configuration because browser and printer settings are authoritative.

Remaining work begins with the separately scoped Phase 4 content and discovery roadmap. No unfinished Phase 3B product behavior is known; broader physical-printer/browser sampling can follow only if production evidence warrants it.
