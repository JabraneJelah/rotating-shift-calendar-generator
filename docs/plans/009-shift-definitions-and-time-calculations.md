# Plan 009 — Shift definitions and nominal time calculations

**Status:** Complete  
**Phase:** 6A2  
**Primary specification:** `docs/research/advanced-personal-planner-specification-2026-09.md`

## Objective

Add optional, ephemeral personal details for the existing Day and Night occurrences without changing the date-only schedule engine, V1 URLs, preset cycles, all-day iCalendar output, or the fast default generator flow.

Phase 6A2 introduces a separate pure planner domain for validated working-shift definitions and nominal wall-clock calculations. The interface exposes one editable Day definition and one editable Night definition through a collapsed “Shift details (optional)” section. Valid details apply only when the existing Generate/Update action succeeds.

## Existing date-only engine boundaries

The existing schedule domain remains the sole source of truth for:

- `day | night | off` cycle positions;
- all six preset sequences and fixed/rotating preset discrimination;
- custom Day/Night/Off cycles;
- the pattern start date and cycle index;
- pure proleptic-Gregorian date arithmetic;
- monthly/yearly expansion and navigation;
- V1 parsing and serialization;
- month/year date counts, weekend counts, and current insights;
- all-day month/year ICS occurrence identity and serialization.

`ScheduleOccurrence` remains `{ date, shift, cycleIndex }`. No clock, label, color, planner identifier, or break property is added to it. The schedule engine will not import the planner domain.

## New planner-layer boundaries

Create a framework-independent module under `src/features/schedule/planner/` that owns:

- branded validated local `HH:mm` values;
- stable definition identifiers and built-in Day/Night identifiers;
- semantic working categories `day | evening | night | other`;
- curated color tokens;
- immutable working-shift definitions;
- a bounded registry that maps generated Day and Night occurrences to definitions;
- nominal duration and break calculations;
- typed machine-readable planner validation failures.

The planner layer imports no React, Next.js, browser API, `Date`, locale formatter, timezone API, storage API, or schedule-expansion implementation. Presentation code may consume both the base occurrence and an applied registry, but neither domain depends on presentation.

## Shift-definition model

Each working definition contains:

- stable `ShiftDefinitionId`;
- trimmed display name;
- trimmed short label;
- semantic category;
- curated `ShiftColorToken`;
- optional validated time details containing start, end, explicit 24-hour flag, and unpaid-break minutes.

The initial applied registry contains deterministic `builtin-day` and `builtin-night` definitions. Off remains an un-timed base occurrence and is not a working definition. Evening and Other are valid domain categories for later exception work but are not exposed as repeating cycle positions or creation controls in 6A2.

Validated definitions, time details, calculations, definition arrays, registries, errors, and result containers are frozen at the untrusted boundary.

## Stable identifier strategy

- Built-ins use deterministic, non-personal `builtin-day` and `builtin-night` IDs.
- IDs are trimmed ASCII values matching a conservative lowercase letter/digit/hyphen/underscore grammar and a maximum of 64 characters.
- Names never become identifiers; renaming preserves mappings.
- Registry validation rejects duplicate IDs and missing/incorrect Day or Night mappings.
- Phase 6A2 does not create custom definitions in the UI, so it does not need runtime ID generation. A later phase may generate opaque IDs in response to a user action and pass them through this validator; no identifier is generated during server rendering.
- Planner identifiers never enter V1 URLs.

## Validation policy

- At most 12 working definitions per registry.
- Names are trimmed and contain 1–40 characters.
- Short labels are trimmed and contain 1–4 characters.
- Duplicate names are rejected after trimming and locale-independent lowercase comparison.
- Duplicate short labels are allowed because every calendar and legend representation retains an accessible full name.
- Categories must be Day, Evening, Night, or Other.
- Colors must be one of Amber, Blue, Indigo, Violet, Teal, Green, Rose, or Slate.
- Arbitrary CSS/color strings are rejected.
- Break minutes must be a non-negative safe integer.
- Every error uses a stable `PlannerErrorCode`, path, and bounded context.
- Presentation owns an exhaustive `Record<PlannerErrorCode, string>` and maps field paths to inline errors plus an error-summary list.

## Time-only representation

`LocalTime` is a branded canonical string accepted only by a strict parser matching two-digit `HH:mm`, hours 00–23, and minutes 00–59. Pure helpers:

- parse untrusted input;
- return the canonical format;
- convert to minutes after midnight;
- compare validated values.

No seconds, dates, offsets, zones, locale parsing, coercion, or `Date` objects are permitted.

## Nominal-duration algorithm

For unequal valid times:

```text
gross = endMinutes - startMinutes
if gross < 0: gross += 1,440
net = gross - breakMinutes
```

The calculation returns gross nominal minutes, break minutes, net nominal minutes, whether the shift crosses midnight, and whether it is explicitly 24 hours.

### Overnight rule

An end earlier than the start crosses midnight. `22:00 → 06:00` is 480 nominal minutes and “Ends next day.” The occurrence remains associated with its base start date; Phase 6A2 does not alter dates or split the duration.

### Explicit 24-hour behavior

Equal start/end values are invalid unless `is24Hours` is explicitly true. With the flag, gross duration is 1,440 minutes and the shift crosses into the following date for explanatory purposes. Unequal times with `is24Hours: true` are invalid. The UI never infers the flag.

### Break validation

- An untimed definition must have no start/end, `is24Hours: false`, and zero break.
- Partial start/end values fail.
- Break must be a safe integer at least zero.
- Break must be strictly less than gross duration.
- Net duration must remain positive.
- No duration can exceed 1,440 minutes.

All values are nominal local wall-clock calculations. When at least one applied definition is timed, the UI displays: “Shift hours are calculated from the entered wall-clock times. Actual elapsed time can differ during daylight-saving changes.” No timezone is requested or inferred.

## Built-in Day/Night mapping

Defaults:

- Day: `builtin-day`, “Day shift”, `D`, category Day, Amber, untimed.
- Night: `builtin-night`, “Night shift”, `N`, category Night, Indigo, untimed.

The applied registry maps generated `day` to the Day ID and generated `night` to the Night ID. Off resolves to no working definition and retains current presentation. The Day mapping must reference a Day-category definition and Night mapping a Night-category definition.

## Optional UI flow

1. Base pattern, working shift, cycle, and start date remain first.
2. A native `<details>` section labelled “Shift details (optional)” follows the start date and is collapsed initially.
3. Only working kinds present in the editable base configuration are shown: Day-only fixed presets show Day; Night-only fixed presets show Night; rotating/custom cycles show the kinds actually present.
4. Each definition editor has visible name, short-label, color, optional start/end time, explicit 24-hour checkbox, and break fields.
5. A valid timed definition shows gross, break, net, and textual overnight/24-hour status.
6. A reset control restores both editable definitions to default untimed values without changing the base form or URL. Reset remains an edit until Generate/Update is activated.
7. Before first success the submit label is “Generate schedule”; afterwards it is “Update schedule.”
8. Applied definitions update month/year cell labels, accessible names, legends, and insight wording. Date counts remain base counts.
9. The result keeps the last successfully applied registry when later edits are invalid.

Extra Evening/Other definition creation is deliberately absent because those definitions cannot yet affect a repeating occurrence and would create a dead-end UI.

## Form-state ownership

`ScheduleGenerator` owns two separate planner states:

- editable raw Day/Night definition fields, which may be incomplete or invalid;
- the last successfully applied validated registry stored with generated result state.

URL restoration resets editable definitions to defaults and renders the restored base schedule with no personal registry applied. Planner edits do not update history. Submitting validates base schedule and planner fields, then commits both together. Invalid planner input focuses the existing error summary and leaves the previous generated result intact.

No auto-save, cookie, `localStorage`, IndexedDB, or server request is introduced.

## Sharing and URL boundaries

- `serializeScheduleQuery` is unchanged.
- Copy Schedule continues to receive only the base `ScheduleConfig`, view month, and week start.
- Applied names, labels, colors, times, breaks, definition IDs, and planner state are excluded.
- When applied details differ from defaults, the actions area says that shared links contain the base rotation but not private shift details.
- Existing V1 parsing, canonical ordering, history behavior, reload behavior, and UIDs remain unchanged.
- Monthly/yearly ICS actions continue using raw base occurrences and produce the current all-day output.

## Presentation mapping

A small presentation helper resolves Day/Night definitions and maps curated tokens to complete static class-name sets. Calendar cells always show a short text label and keep full date plus shift name/time in `aria-label`. The normal monthly view does not place clock text in each cell. The legend displays full name, short label, optional time span, nominal net duration, and overnight/24-hour wording. Compact year cells keep a one-character visual label while retaining their full accessible description.

Default/no-applied-registry rendering follows the existing labels, colors, icons, and wording exactly.

## Accessibility strategy

- Use native `<details>/<summary>`, time inputs, checkbox, number input, buttons, radio inputs, and labelled fieldsets.
- Every control has a visible label and stable `aria-describedby` help/error linkage.
- Invalid controls use `aria-invalid`.
- Color choices expose visible names, radio checked state, short label/name preview, and never use color alone.
- Duration output is a semantic definition list and available to screen readers.
- Overnight and 24-hour states are textual.
- Collapsed content is removed from focus order by native `<details>` behavior.
- Application failures use the established focusable error summary; successful application retains result-heading focus.
- Controls keep practical 44px targets and visible focus treatment.
- Reduced-motion behavior continues through the global media query.
- No formal WCAG-conformance claim is made.

## Responsive and print behavior

- Definition cards use one column by default and two columns only when space permits.
- Start/end fields stack at narrow widths.
- Palette choices wrap and use bounded, readable option cards.
- Short-label fields receive a sensible maximum width above mobile sizes.
- The collapsed section adds only one summary row to the base flow.
- Calendar cells keep concise labels and do not add visible per-cell hours.
- Legends wrap at all supported widths.
- The existing `.schedule-form-region` print exclusion hides all planner controls.
- Applied legends remain printable and understandable without backgrounds.
- Verify 320, 390, 768, 1024, and 1440 CSS-pixel widths with no document overflow.

## Test matrix

### Pure planner domain

- strict valid/invalid `HH:mm` syntax and bounds;
- canonical formatting, comparison, and minutes-after-midnight;
- same-day, overnight, and explicit 24-hour gross/net calculations;
- equal-time, unequal-with-24-hour, partial-time, untimed-break, invalid-break, and non-positive-net failures;
- limit/name/label trimming and lengths;
- stable-ID syntax, duplicate IDs, duplicate-name policy, allowed duplicate labels;
- category and curated-color validation;
- maximum 12 definitions;
- required Day/Night mappings;
- frozen/immutable validated output;
- machine-readable error codes and paths;
- tests run in UTC and America/New_York with identical results and no browser/Date dependency.

### Component and integration

- details panel collapsed initially and native expand/collapse behavior;
- default Day/Night editors;
- correct visible editors for fixed Day, fixed Night, rotating, and custom cycles;
- name, label, palette, same-day, overnight, 24-hour, and break editing;
- inline errors plus focused summary;
- reset edits and apply behavior;
- invalid edit leaves prior generated result visible;
- applied calendar and legend labels in month/year;
- base-only copied URL and private-details explanation;
- reload restores base but not details;
- all-day month/year ICS regressions;
- keyboard operation, print visibility, and responsive overflow.

### Regression

- all existing schedule-domain, presentation, sharing, history, content, export, component, and e2e tests;
- all six exact presets and custom cycle behavior;
- sitemap/static routes remain unchanged.

## Files to create

- `src/features/schedule/planner/planner-types.ts`
- `src/features/schedule/planner/time-only.ts`
- `src/features/schedule/planner/shift-definitions.ts`
- `src/features/schedule/planner/index.ts`
- `src/features/schedule/presentation/planner-error-messages.ts`
- `src/features/schedule/presentation/planner-shift-presentation.ts`
- `src/features/schedule/components/shift-details-panel.tsx`
- `tests/unit/schedule/planner-time.test.ts`
- `tests/unit/schedule/shift-definitions.test.ts`
- this implementation plan

## Files to modify

- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/schedule-form.tsx`
- `src/features/schedule/components/calendar-month-grid.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/components/yearly-calendar.tsx`
- `src/features/schedule/components/shift-legend.tsx`
- `src/features/schedule/components/schedule-insights.tsx`
- `src/features/schedule/components/schedule-actions.tsx`
- focused existing component/e2e tests
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

The file list may narrow during implementation; expansion requires an in-scope reason.

## Explicit non-goals

No date exceptions, leave, sickness, training overrides, additional work, notes, aggregate hour totals, timed ICS, timezone selection, `VTIMEZONE`, URL V2, browser persistence, backup/import, PWA/offline cache, notifications, split shifts, multiple shifts per date, accounts, server storage, wages, payroll, compliance, teams, staffing, approvals, or AI generation.

## Acceptance criteria

1. Existing generation works without opening Shift details.
2. Fixed Day and Night presets expose only their relevant definition.
3. Rotating/custom schedules expose the working kinds they contain.
4. `22:00 → 06:00` resolves to 480 nominal minutes and “Ends next day.”
5. Equal times fail unless 24 hours is explicit; explicit equality resolves to 1,440 minutes.
6. Invalid breaks prevent application and do not replace the last result.
7. Applied names/labels/colors appear accessibly in month/year calendars and legends.
8. No schedule-wide hours are introduced.
9. Sharing excludes planner state and explains this when relevant.
10. Reload keeps V1 base state and discards ephemeral planner details.
11. Month/year ICS output and deterministic UIDs are unchanged.
12. V1 URLs, six presets, custom cycles, static routes, and sitemap are unchanged.
13. No dependency or browser storage is added.
14. Keyboard, mobile, print, and accessibility-oriented checks pass.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ='UTC'; npm test -- --run tests/unit/schedule
$env:TZ='America/New_York'; npm test -- --run tests/unit/schedule
npm run test:e2e
npm run build
git diff --check
git status --short
```

Additional verification compares package manifests/lockfiles, sitemap output, V1 codec fixtures, preset fixtures, and ICS snapshots; checks for storage/timezone/network additions; and runs responsive/print browser coverage at the required widths.
