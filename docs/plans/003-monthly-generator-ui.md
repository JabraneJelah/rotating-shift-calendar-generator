# Plan 003 — monthly generator UI

**Status:** Complete
**Scope:** Phase 2B only

## Objective

Replace the Phase 1 placeholder with an accessible, responsive monthly schedule generator that uses the Phase 2A domain as its only source of schedule truth. Users will be able to configure either approved fixed-shift preset or an editable custom cycle, generate a month, navigate between months, and restore or canonicalize versioned configuration URLs without a backend.

## Existing UI and domain observations

- `src/app/page.tsx` and the root layout are Server Components with a clean homepage canonical.
- The homepage currently pairs introductory content with a deliberately disabled generator placeholder; that component can be removed once the real generator is integrated.
- The established visual language uses restrained teal, warm/indigo/green shift tokens, system typography, moderate radii, and visible focus rings.
- The single `Button` primitive supports default and outline variants; native inputs, radios, and selects are sufficient for this phase.
- The Phase 2A barrel exposes strict date/month parsing, validated schedule configuration, bounded expansion, V1 parsing/serialization, error codes, and documented limits.
- Existing tests use Vitest, jsdom, React Testing Library, and Playwright Chromium. No additional testing dependency is required.
- The repository is clean on `main`; the final Git diff can be reviewed precisely.
- The installed Next.js 16 guidance confirms that the page can remain prerendered while a deep Client Component owns state and browser APIs. Native history calls integrate with the App Router.
- `README.md` still describes a non-interactive Phase 1 homepage and must be updated when the generator ships.

There is no blocking contradiction. Phase 2B implements the interface explicitly deferred by Phase 2A without changing domain behavior.

## Proposed component boundaries

- `ScheduleGenerator`: the only explicit Client Component; owns editable form, validated/generated state, URL restoration, history, focus, and status announcements.
- `ScheduleForm`: semantic form, mode/preset/working-shift fields, date input, primary action, and field-level errors.
- `CustomCycleEditor`: ordered native-select editor with add/remove controls and the 56-position limit.
- `MonthlyCalendar`: read-only semantic table, navigation, summary counts, and legend.
- `calendar-view.ts`: tested presentation-only month range, Monday offset, labels, week rows, counts, and previous/next month helpers; it delegates every shift result to `expandSchedule`.
- `schedule-error-messages.ts`: exhaustive `DomainErrorCode` to English mapping plus field/summary classification.
- `src/features/schedule/index.ts`: feature entry point used by the server page.

The old placeholder component will be deleted rather than retained as dead code.

## Server and Client Component boundaries

`src/app/layout.tsx`, `src/app/page.tsx`, header, metadata, and introductory content remain Server Components. `page.tsx` renders `ScheduleGenerator`, whose file alone declares `"use client"`. Components and presentation helpers imported beneath it enter the client graph, while the pure domain remains framework-independent.

The generator reads the initial query only after hydration. This preserves predictable server/client initial markup and keeps the homepage statically rendered. No `useSearchParams` or dynamic page `searchParams` prop is needed.

## Form state model

Editable state is separate from trusted state:

- Mode: `preset | custom`
- Raw preset ID and fixed working shift, both controlled from allowed values
- Raw start-date string, initially empty
- Custom shift array, initially `day, day, off, off`
- Field errors for start date and cycle
- URL/configuration alert errors
- Generated state containing validated `ScheduleConfig`, branded `ISOYearMonth`, and a derived monthly view

Submission constructs an untrusted configuration object and passes it to `validateScheduleConfig`. Partially edited values never reach `expandSchedule`.

## URL-state lifecycle

- Empty initial query: retain the predictable default form and no result.
- Valid initial query: parse only through `parseScheduleQuery`, restore the form, derive the start month when `m` is absent, generate the month, and `replaceState` with `serializeScheduleQuery` output in canonical order.
- Invalid initial query: keep the usable default form, show a focusable accessible link-error alert, and render no calendar.
- Successful manual generation: serialize validated configuration plus view month and use `pushState`.
- Month navigation: generate the adjacent month, serialize again, and use `replaceState` so browsing months does not flood history.
- `popstate`: reparse the current query and restore the corresponding form/result or the empty base state. State changes never trigger a second URL-writing effect, preventing loops.

Only controlled codec output is passed to the native history API.

## Calendar rendering approach

`calendar-view.ts` derives the first/last date, Monday-first offset, rows, full English date labels, and counts for one validated month. It uses fixed English month/weekday labels; it does not use locale detection or `Date`.

It calls `expandSchedule(config, from, to)` exactly once for a generated month. The component renders those occurrences as a native table with caption, scoped weekday headers, non-announced empty cells, and one labelled cell per date. Previous/next helpers return `null` at supported year boundaries.

## Accessibility design

- Native form, fieldset, legend, radio, select, date input, button, table, caption, headings, and status semantics
- Visible labels and supporting copy for the pattern-start meaning
- `aria-invalid` and `aria-describedby` only where needed
- Focusable error summary after failed submission
- Result heading focused after successful manual generation
- Polite status announcement for generation and month changes
- Unambiguous cycle labels/removal names and disabled removal at one position
- Day number, visible text label, icon, and full accessible date/shift label in every calendar cell
- Monday-first column headers with full-name abbreviations
- Strong existing focus indicators and no drag-and-drop or interactive grid role

## Responsive behavior

- One-column form and calendar at phone widths, with full-width controls and 44px targets
- Compact fixed-layout seven-column table; three/five-letter visible shift labels are kept concise while full labels remain accessible
- Cycle rows use a bounded grid that does not overflow at 320px
- Summary counts use a three-column compact grid, then gain spacing on wider screens
- Generator content remains connected inside a sensible maximum width; desktop avoids dashboard-like empty space
- Automated overflow checks cover 320, 390, 768, and 1440px; visual inspection covers representative phone, tablet, and desktop screenshots

## Error-mapping strategy

Create an exhaustive `Record<DomainErrorCode, string>` so a new domain code fails TypeScript until presentation copy is added. Paths `startDate`/`s` map to the date field; `cycle` maps to the editor; remaining validation failures appear in the summary. URL failures lead with a shared-link explanation and include the mapped reason without exposing a raw code as the only message.

## Files to create

- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/schedule-form.tsx`
- `src/features/schedule/components/custom-cycle-editor.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/presentation/calendar-view.ts`
- `src/features/schedule/presentation/schedule-error-messages.ts`
- `src/features/schedule/index.ts`
- `tests/unit/schedule/calendar-view.test.ts`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `docs/plans/003-monthly-generator-ui.md`

## Files to modify

- `src/app/page.tsx`
- `tests/unit/homepage.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/UI-UX.md`
- `docs/ARCHITECTURE.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- This plan at completion

## File to delete

- `src/features/schedule/components/generator-placeholder.tsx`

No package or lockfile change is planned.

## Tests to add

- Presentation helpers: month range, Monday offsets, leap February, year-boundary navigation, six-row month, counts, and full labels
- Component behavior: defaults, preset/custom mode, day/night choice, cycle add/remove/minimum/maximum behavior, start-date and all-off errors, focus, preset/custom generation, counts, date cells, leap February, query restore/error, canonical query, year navigation, and visible shift text
- Playwright desktop: preset generation/navigation, custom generation/reload, invalid submission recovery, and invalid link
- Playwright mobile: generation, navigation, readable result, reachable controls, and no clipping/overflow
- Automated viewport overflow checks at 320, 390, 768, and 1440px

Existing 88 tests remain required.

## Documentation updates

- `UI-UX.md`: shipped workflow, editor, semantic calendar, visual language, focus, Monday-first behavior, and navigation
- `ARCHITECTURE.md`: component/client boundary, presentation helpers, and history lifecycle
- `SEO.md`: clean canonical, query non-indexability, sitemap exclusion, and preserved server content
- `TESTING.md`: generator/component, URL, desktop/mobile, selector, and visual verification requirements
- `DECISIONS.md`: Monday-first table, native history policy, state separation, client boundary, and no UI/form/state library
- `ROADMAP.md`: Phase 2B completion status and Phase 3 boundary
- `README.md`: current working generator rather than Phase 1 placeholder

## Non-goals

No yearly view, ICS/calendar integration, print/PDF/image export, sharing or copy-link control, accounts, persistence, synchronization, authentication, payment, analytics, advertising, notifications, exact hours, pay/overtime/break logic, teams, localization, locale detection, configurable week start, dark mode, rotating day/night presets, extra named presets, or SEO landing pages.

## Acceptance criteria

- Placeholder is replaced by a functional generator using both approved presets and validated custom cycles.
- Raw form/query input passes through Phase 2A validators/codecs; React does not reproduce schedule rules.
- Every generated date has visible and accessible text, and the calendar is a Monday-first table.
- Inclusive visible-month results, counts, navigation, and year boundaries are correct.
- Valid links restore and canonicalize; invalid links fail safely; back/forward does not loop.
- Validation retains input and manages focus accessibly.
- The page remains server-rendered outside the deep client boundary, with a clean canonical and no query sitemap variants.
- Keyboard and 320–1440px layouts are usable without horizontal overflow.
- Component, desktop/mobile browser, legacy, static, and production-build checks pass.
- No dependency or Phase 3 feature is introduced.

## Verification procedure

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Additional verification:

- Inspect mobile, tablet, and desktop screenshots outside the repository.
- Check overflow at 320, 390, 768, and 1440px.
- Exercise generation and month navigation using only the keyboard.
- Confirm error-summary and result focus behavior.
- Scan the schedule domain for React/Next imports and browser globals.
- Confirm only the codec parses incoming query values.
- Inspect built HTML for meaningful introductory content and a clean canonical.
- Confirm sitemap contains only clean URLs.
- Compare dependency manifests and review `git diff --check`, `git diff --stat`, and the full scoped diff.

## Completion record

Completed on 2026-09-16. All planned production and test files were created, the Phase 1 placeholder was deleted, and the listed documentation was updated. No dependency or lockfile change was needed.

Actual files created:

- `src/features/schedule/components/custom-cycle-editor.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/schedule/components/schedule-form.tsx`
- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/presentation/calendar-view.ts`
- `src/features/schedule/presentation/schedule-error-messages.ts`
- `src/features/schedule/index.ts`
- `tests/unit/schedule/calendar-view.test.ts`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `docs/plans/003-monthly-generator-ui.md`

Actual files modified:

- `src/app/page.tsx`
- `tests/setup.ts`
- `tests/unit/homepage.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/UI-UX.md`

Deleted: `src/features/schedule/components/generator-placeholder.tsx`.

Implementation follows the planned component boundary and state model. One small hardening refinement was added during browser testing: form controls render disabled until the hydration effect has restored URL state, preventing a fast interaction from being overwritten by server-default state. The deep client boundary, codec-only URL parsing, `pushState`/`replaceState` policy, Monday-first semantic table, explicit labels/icons, focus behavior, and four-width responsive strategy remain as planned.

Verification passed for formatting, lint, strict type checking, 110 unit/component tests, 8 Playwright journeys, production build, timezone-specific domain runs, domain-boundary scans, canonical/sitemap inspection, and Git whitespace checks. Mobile, tablet, and desktop generated-state screenshots were inspected outside the repository. Phase 3 still owns yearly output, print, export, and explicit share controls.
