# Plan 007 — personal insights and year export

**Status:** Complete  
**Scope:** Phase 5A only

## Objective

Add a URL-backed Monday/Sunday week-start preference, concise next-schedule and next-working-day information, Saturday/Sunday worked-date totals, and explicit full-year ICS export. Preserve the private, account-free, single-worker, deterministic date-only product and every existing valid V1 link.

## Current implementation observations

- `ScheduleGenerator` is the only explicit Client Component. It owns validated generated state, transient month/year mode, native history, restoration, focus, and announcements.
- `ScheduleShareState` already permits optional presentation state through `m`; the V1 parser rejects duplicates, unknown parameters, and variant-inapplicable parameters.
- Monthly and yearly presentation helpers each expand through the public domain API. Calendar rows are currently hard-coded Monday-first in `createCalendarWeeks` and the shared table header.
- A yearly view already contains the exact ordered 365/366 occurrences for its active year. It should be passed to export rather than expanded again in React or in the serializer.
- The pure ICS serializer accepts precomputed occurrences, validates them, uses date-only `addCalendarDays` for exclusive `DTEND`, and the browser helper owns Blob/object-URL effects.
- The existing 366-day expansion limit is sufficient for insight searches and full years. Valid cycles contain at most 56 positions and at least one working shift.
- The current repository has an untracked competitive audit under `docs/research`; it is existing work and must be preserved.
- Pre-change verification passed: 13 Vitest files / 151 tests and 26 Playwright tests.
- Installed Next.js guidance confirms that browser date acquisition, state, history, and download actions belong under the existing deep Client Component; no route or server boundary change is needed.

## Week-start state model

Introduce presentation type `WeekStart = "monday" | "sunday"`. It is not part of `ScheduleConfig` and never affects occurrences.

- Generator state defaults to `monday`.
- Parsed links restore `weekStart`; omission resolves to `monday`.
- Manual generation preserves the selected preference.
- Month navigation, year switching/navigation, copy, refresh, and Back/Forward preserve the preference.
- Changing only week start rebuilds presentation views and calls `replaceState`; it does not push history or move focus.
- No local storage is used.

The visible control will be a labelled native radio group next to, but distinct from, the Month/Year view group. Controls retain 44 px targets and wrap on phones.

## URL compatibility decision

Safely extend V1 with optional presentation parameter `ws`:

- no `ws` or `ws=monday` in in-memory input means Monday;
- canonical serialization omits Monday;
- Sunday serializes as `ws=sun` after optional `m`;
- `ws` is permitted for both preset and custom variants;
- duplicate `ws`, empty values, and values other than `sun` are rejected by existing typed query error behavior;
- every existing valid V1 URL parses to the same configuration and Monday-first presentation.

This is consistent with the existing V1 contract because `m` already establishes optional non-calculation presentation state, omission has a stable legacy meaning, and schedule configuration identity used by ICS UIDs excludes presentation fields. No V2 schema is introduced.

Canonical order becomes configuration fields, optional `m`, then optional non-default `ws`.

## Monday-first and Sunday-first grid calculation

- Retain the integer Gregorian Monday anchor and expose a generalized `getWeekdayIndex(date, weekStart)`.
- Monday-first order is Mon–Sun and preserves all current results.
- Sunday-first order is Sun–Sat. It is a rotation of labels and changes only the leading structural null count.
- `createCalendarWeeks(occurrences, weekStart)` pads complete seven-cell rows; in-month occurrences remain ordered and appear exactly once. Adjacent-month dates remain structural blanks, so weekend totals never include them.
- `formatFullDate` continues to derive the real weekday independently of display order.
- Monthly and yearly view builders accept `weekStart` and store it on the view so the shared grid renders matching headings.
- Print reuses the same semantic DOM, so the chosen order automatically applies to monthly and yearly output without a second calculation.

## Next-shift calculation contract

Create a pure domain-adjacent presentation helper that receives validated `ScheduleConfig` plus injected validated `today: ISODate`.

- “Next schedule position” is exactly tomorrow: the first supported date strictly after today, including Off.
- “Next working day” is the first future Day or Night occurrence, excluding Off.
- Today is never returned.
- The helper uses `addCalendarDays` and `resolveScheduleOccurrence`; it never constructs a JavaScript `Date` or duplicates cycle arithmetic.
- Search is bounded by the validated cycle length (preset cycle length or custom cycle length), which is at most 56. Because valid cycles contain a working position, a working result exists within one full cycle unless the supported upper date boundary is reached first.
- Boundary failure returns a typed presentation result with no partial or invented date.
- Negative offsets, long Off sequences, custom cycles, leap days, and month/year changes are inherited from the domain resolver and covered explicitly.

The browser's current local civil date is acquired once after hydration at the Client Component boundary, formatted as `YYYY-MM-DD`, then validated through `parseISODate`. It is injected into the pure helper. There is no live countdown or timer, preventing hydration mismatch and noisy announcements.

The shared result panel will use plain, separate lines such as `Next schedule position: Off tomorrow` and `Next working day: Day shift on September 24, 2026`. Routine display is not a live region; generated/view status remains in the existing polite announcer.

## Weekend definition and counting rules

- Weekend means Saturday and Sunday for this English-first phase.
- A worked weekend date has shift `day` or `night`; `off` is excluded.
- Counts are dates, not complete weekends.
- Monthly totals use only the active month's occurrence array.
- Yearly totals use only the active year's occurrence array.
- Display week start does not affect weekday identity or the count.
- A pure helper returns `{ worked, total }` and is reused by monthly/yearly view builders.
- Direct copy is `4 of 9 weekend dates worked` or equivalent; no percentage is needed.

## Full-year ICS export behavior

- Preserve the existing monthly call shape and `shift-calendar-YYYY-MM.ics` behavior.
- Extend the pure serializer input as a typed month/year union. Year input carries `year` instead of `viewMonth`.
- A year export must receive exactly one complete, ordered, gap-free January 1–December 31 collection with 365/366 occurrences. Partial, duplicate, descending, out-of-year, or gapped data fails with a typed error.
- Output reuses the same calendar/event serialization, escaping, UTF-8 folding, deterministic UIDs, injected UTC `DTSTAMP`, CRLF, terminal CRLF, all-day start, and exclusive next-date end.
- Filename is `shift-calendar-YYYY.ics`; description identifies the year.
- Active Year mode shows `Export this year (.ics)` and uses the currently displayed `YearlyCalendarView`, including a navigated year. The monthly action remains separately labelled `Export this month (.ics)` and retains the preserved visible month.
- At year 9999, December 31 cannot produce the required exclusive `DTEND`; serialization returns `DATE_OVERFLOW`, no file is downloaded, and accessible failure feedback is shown. No incomplete 9999 file is emitted.
- The action panel explains that repeated import may create duplicates in some calendar applications.

## Export size and duplicate-import considerations

A year contains at most 366 small all-day events, so client-side string and Blob creation remain bounded and appropriate. Export is user-initiated; data is not uploaded or persisted. Stable UIDs help calendar clients identify matching events, but import behavior varies and some clients may still duplicate repeated file imports. The UI must state this without promising synchronization or deduplication.

## Component boundaries

- `ScheduleGenerator`: owns week-start state, URL/history restoration, hydrated local date, view rebuilding, and passes current month/year data to children.
- `ScheduleViewControls`: renders distinct native groups for Month/Year and Monday/Sunday.
- `schedule-insights.ts`: pure next-position, next-working-day, weekend-count, and date-label helpers.
- `ScheduleInsights`: one compact shared panel per generated schedule; never repeated inside each year month.
- `calendar-view.ts` / `yearly-calendar-view.ts`: apply week start structurally and include scoped weekend totals.
- `CalendarMonthGrid`: reads ordered weekday headings from its view's week-start value.
- `ScheduleActions`: canonical copy with week start plus separate month/year export actions and shared feedback.
- ICS modules remain framework-independent; only `ics-download.ts` touches browser download APIs.

## Accessibility behavior

- Native labelled radios for week start; checked state and keyboard behavior remain native.
- Changing week start does not move focus and does not announce every structural cell change.
- Weekday header text and `abbr` values match the chosen order.
- Insight and weekend-stat wording is meaningful without color or layout.
- Export actions have unambiguous visible names and existing focus/44 px styles.
- Success/failure is announced politely through the action status region.
- Interactive controls and action notes remain hidden in print; printed summaries retain weekend totals and selected weekday ordering.

## Responsive and print behavior

- Control groups wrap rather than compress at 320 and 390 px.
- The single insights panel uses compact stacked text on phones and does not repeat in the twelve-month year grid.
- Export buttons may wrap and remain text-labelled.
- Calendar cell sizing and existing one/two/three-column year grid stay unchanged.
- Print uses the existing DOM and pagination classes; adding one annual statistic must not add a repeated panel or destabilize the six-month page split.
- Verify 320, 390, 768, 1024, and 1440 px with no document-level overflow.

## Test matrix

### Pure/helper

- Legacy Monday-first and new Sunday-first headings/offsets.
- Complete rows with no missing/duplicate in-month dates, including boundary and six-row months.
- Next schedule position and next working day; tomorrow working/off, long Off run, custom cycle, negative anchor offset, month/year/leap boundaries, and year-9999 boundary.
- Weekend totals for Day, Night, and Off; months with 8, 9, and 10 weekend dates; leap/common years; monthly/yearly scoping; week-start independence.
- V1 omission/Monday canonical behavior; Sunday round trip/order; duplicate/empty/unsupported `ws` rejection.
- Year ICS normal/leap exact event counts, exact year scope, filename/MIME, gap/out-of-year failures, and upper-bound `DATE_OVERFLOW`.
- Existing monthly ICS, Blob creation, click, and URL cleanup remain unchanged.

### Component

- Week-start controls appear only with valid generated state and default Monday for existing links.
- Sunday selection updates headings/grid and canonical URL without pushing a new history entry.
- URL restore, refresh-equivalent remount, and popstate restore Sunday.
- Copy includes `ws=sun` and omits Monday.
- Injected/frozen current date produces stable next-position/working-day copy.
- Monthly/yearly weekend totals render once at the proper scope.
- Month export remains available; year export appears only with an active yearly view and follows year navigation.
- Success and controlled year-boundary failure remain accessible.

### Playwright

1. Existing V1 link renders Monday-first.
2. Sunday change updates headings and canonical URL; reload restores it.
3. Back/Forward restores URL-backed preferences without a history-entry flood.
4. Month view displays deterministic next information and scoped weekend dates.
5. Year view displays annual weekend dates once.
6. Normal-year download contains 365 events; leap-year download contains 366.
7. Monthly download filename/content remains unchanged.
8. Required five widths have no document overflow.
9. Month/year print media retain valid calendars, chosen weekday order, and summaries while controls remain hidden.

## Files to create

- `src/features/schedule/presentation/schedule-insights.ts`
- `src/features/schedule/components/schedule-insights.tsx`
- `tests/unit/schedule/schedule-insights.test.ts`
- `docs/plans/007-personal-insights-and-year-export.md`

## Files to modify

- `src/features/schedule/domain/schedule-types.ts`
- `src/features/schedule/domain/schedule-config.ts`
- `src/features/schedule/domain/index.ts`
- `src/features/schedule/presentation/calendar-view.ts`
- `src/features/schedule/presentation/yearly-calendar-view.ts`
- `src/features/schedule/components/calendar-month-grid.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/components/yearly-calendar.tsx`
- `src/features/schedule/components/schedule-view-controls.tsx`
- `src/features/schedule/components/schedule-actions.tsx`
- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/export/ics-types.ts`
- `src/features/schedule/export/ics-serializer.ts`
- relevant unit/component and Playwright tests
- `README.md`
- `docs/PRODUCT.md`
- `docs/DOMAIN.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- this plan at completion

## Non-goals

No presets or SEO routes; no exact times, countdown timer, wages, overtime, labor rules, complete-weekend statistic, local storage, accounts, database, server export, multiple workers, staffing, swaps, leave approval, provider/OAuth integration, AI, analytics, ads, arbitrary date ranges, CSV/PDF generator, localization, or dependency addition.

## Acceptance criteria

1. All existing V1 URLs retain their meaning and default to Monday; canonical Monday links remain byte-for-byte unchanged.
2. `ws=sun` is canonical, copied, refreshed, and restored through native history; invalid/duplicate values fail through typed codec errors.
3. Monthly, yearly, screen, and print grids use the selected weekday order without changing, missing, or duplicating occurrences.
4. One concise generated insight panel distinguishes tomorrow's schedule position from the next Day/Night working occurrence using bounded date-only domain operations.
5. Month/year summaries count Saturday/Sunday worked dates only within their occurrence scope and independently of display week start.
6. Month ICS remains behaviorally unchanged; active-year ICS contains exactly 365/366 all-day events or fails atomically at an unsupported exclusive-end boundary.
7. All new controls, messages, tables, and statistics are keyboard/screen-reader understandable and phone-safe.
8. No schedule data leaves the browser; no dependency, route, preset, tracking, account, database, or direct provider integration is introduced.
9. Required formatting, lint, types, tests in two time zones, Playwright, build, static-route, boundary, dependency, responsive, print, and diff checks pass.

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

Inspect build route output for static generation, real month/year downloads for selected-year containment, print media, browser history, and screenshots at 320/390/768/1024/1440 px.

## Completion record

Completed on 2026-09-17.

- Added optional V1 `ws=sun` state with Monday omission/default, canonical ordering, typed rejection, native-history restoration, and unchanged configuration identity.
- Generalized semantic month/year grids and print output for Monday/Sunday headings without altering occurrence order, labels, or weekend identity.
- Added one shared `Up next` panel with tomorrow and next-working-day values derived by pure date-only logic bounded to one validated cycle.
- Added month/year worked Saturday/Sunday date totals and explicit wording that counts dates rather than complete weekends.
- Added exact complete-year ICS export with distinct filename/action, 365/366 events, strict range validation, existing UID/folding/escaping behavior, and atomic year-9999 overflow failure.
- Updated product, domain, architecture, UI/UX, SEO, security, testing, decision, roadmap, and README sources of truth. No route, preset, dependency, persistence, provider integration, or analytics surface was added.
- `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (170 tests), UTC schedule tests (156), America/New_York schedule tests (156), `npm run test:e2e` (32), `npm run build`, `git diff --check`, dependency/boundary checks, and static-route inspection passed.
- Playwright download inspection confirmed 365 events for 2026 and 366 for 2028. Print-media coverage confirmed Monday-first month, Sunday-first month, and Sunday-first year headings. Screenshot/layout inspection confirmed no horizontal overflow at 320, 390, 768, 1024, or 1440 px.
