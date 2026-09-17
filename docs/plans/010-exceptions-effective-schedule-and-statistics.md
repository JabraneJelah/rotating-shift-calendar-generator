# Plan 010 — Exceptions, effective schedule, and personal statistics

**Status:** Complete  
**Phase:** 6A3  
**Primary specification:** `docs/research/advanced-personal-planner-specification-2026-09.md`

## Objective

Add private, session-only one-date changes above the unchanged repeating schedule. A single pure projection will combine base occurrences, applied shift definitions, primary exceptions, optional additional work, and private note metadata. Month/year calendars, effective insights, personal statistics, print, and exception-aware all-day ICS will consume that projection without widening or mutating `ScheduleOccurrence`.

## Existing planner architecture

- The date-only engine exclusively owns Day/Night/Off generation, preset/custom cycles, anchoring, supported years, V1 links, and month/year expansion.
- Phase 6A2 owns immutable personal Day/Night definitions, strict local times, nominal gross/break/net calculations, and draft-versus-applied definition state.
- `ScheduleGenerator` is the single client boundary. Applied definitions are stored with generated state and are discarded on URL restoration.
- Calendar presentation may combine base occurrences with planner data, but the schedule engine imports no planner code.
- Existing ICS consumes complete base occurrence ranges and must remain byte-equivalent when no date exception is exported.

## Exception data model

An immutable `DateException` has a validated opaque, non-personal identifier, one ISO date, zero or one primary exception, zero or one additional-work occurrence, and zero or one normalized plain-text note.

Primary exceptions are a discriminated union:

- `replacement`: references an applied working definition;
- `leave`: absence replacing a generated Day/Night occurrence;
- `sick`: absence replacing a generated Day/Night occurrence;
- `training`: working replacement referencing an applied working definition.

Additional work references one applied working definition and is additive. Notes are NFC-normalized, line-ending-normalized, trimmed plain text of 1–500 Unicode code points; they are never interpreted as markup, linked, printed, shared, exported, or included in accessible cell names.

The collection rejects invalid or duplicate identifiers, duplicate dates, malformed dates, unsupported types, arrays containing more than one primary/additional value, missing or unknown definition references, invalid notes, and empty records.

## Cardinality rules

Each date has at most:

- one primary exception;
- one additional-work occurrence;
- one note.

All three may coexist. Validated objects expose singular fields, while the untrusted validator recognizes over-cardinality input and returns dedicated typed failures. Upsert replaces the one record for a date; independent removal deletes only the selected layer. Removing the final layer removes the record. “Restore generated schedule” deletes the record rather than creating a compensating exception.

## Primary versus additive behavior

- Replacement, Leave, Sick, and Training replace only the effective primary state.
- Replacement and Training are working primaries; Leave and Sick are non-working.
- Leave/Sick are rejected when the generated primary is Off.
- Replacement and Training may replace Off.
- Additional work never changes the primary and may coexist with every generated or primary-exception state.
- A note is metadata only and never affects counts, hours, ordering, insight results, or export.

## Effective-schedule projection

The pure projector receives an ordered bounded base range, a validated definition registry, and validated exceptions. It applies, per date:

1. resolve the supplied base occurrence;
2. apply the date’s primary exception;
3. add the optional additional-work occurrence;
4. attach note metadata.

It returns frozen `EffectiveScheduleDate` values distinguishing generated work, generated Off, replacement work, Leave, Sick, Training, optional additional work, origin, definitions, working status, overnight status, known gross/break/net minutes, and untimed-working count. It validates one-to-one ordered consecutive base dates, a maximum 366-date range, exception/base compatibility, and definition references. It never mutates the base occurrence array.

Presentation builds labels and accessible descriptions from this effective representation. React components only index already-projected dates; they do not implement exception precedence.

## Definition of a working date

A date is worked when its effective primary is generated work, replacement work, or Training, or when it has additional work. A date counts once even when it has both primary and additional work. Leave/Sick without additional work are not worked. Off plus additional work is worked.

## Exception precedence

- No primary exception: generated Day/Night/Off remains primary.
- Replacement: referenced definition becomes the primary and the generated category is excluded from effective counts.
- Leave/Sick: generated Day/Night work and hours are excluded; the corresponding absence date count increases.
- Training: becomes a working primary and uses the referenced definition’s time calculation.
- Additional work is counted after the primary and cannot replace it.
- Removing layers deterministically reveals the remaining layers; removing all reveals the exact base occurrence.

## Monthly statistics formulas

Statistics consume only effective dates whose start date is inside the active calendar month:

- working dates: unique effective dates with at least one working occurrence;
- Day/Evening/Night/Other: working-occurrence counts by definition category;
- Training: primary Training occurrences;
- additional work: additive occurrences;
- Leave/Sick: primary absence dates;
- weekend working dates: Saturday/Sunday dates with any working occurrence, counted once;
- overnight: timed working occurrences crossing midnight;
- known gross/break/net: sums across timed working occurrences;
- known additional gross/net: sums across timed additional occurrences;
- untimed count: working occurrences without time.

Counts intentionally overlap across semantic category, Training/Additional classification, and overnight status. All minute values use Phase 6A2 nominal wall-clock arithmetic and are formatted only in presentation.

## Yearly statistics formulas

The yearly formulas are identical but consume only January 1 through December 31 of the active year. Overnight work is attributed wholly to its start date and is never split across month/year boundaries. Annual statistics appear once above the year grid, never inside every month.

## Missing-time behavior

Known minute subtotals are always retained. `complete` is true only when `untimedWorkingOccurrences` is zero. Incomplete UI says “Known …” and pairs the subtotal with the exact missing-time count; it never labels an unknown total as zero or complete. Additional-work completeness is also exposed independently. All totals disclose that they are nominal wall-clock planning values and not payroll, timecard, legal-rest, or DST-adjusted elapsed time.

## Next-shift integration

An effective insight helper expands a bounded future horizon, runs the same projector, describes tomorrow’s effective primary state, and finds the first future date with any working occurrence. Today remains excluded. Primary work sorts before additional work; timed entries sort before untimed within a role. The search is capped at 366 dates and returns an explicit no-result state instead of searching indefinitely.

## Weekend-total integration

Effective weekend totals reuse the statistics result. Saturday and Sunday remain the only weekend days, independent of selected week-start order. A date with two working occurrences counts once; Leave/Sick count only when additional work coexists.

## All-day ICS integration

- Existing `generateICS` remains unchanged for exports without date exceptions.
- A separate effective all-day serializer consumes a complete effective month/year projection and reuses existing escaping, folding, date-only end dates, timestamps, filenames, and range validation.
- Each date emits one primary all-day event for generated/replacement work, Off, Leave, Sick, or Training; additional work emits a second all-day event.
- Notes are never serialized.
- Unchanged generated primary events retain the legacy UID. Exception primary UIDs include a non-personal logical role/type/definition identity; additional UIDs use a distinct role, preventing collisions. Re-export is deterministic and removing an exception restores the legacy base identity.
- No time, `TZID`, `VTIMEZONE`, timezone inference, or timed `DTSTART` is introduced.

## Print behavior

Print uses the same effective calendar and statistics shown on screen. Textual primary/additional/note-presence indicators and an exception legend remain understandable without backgrounds. Date-editor controls are `print-hidden`. Personal note contents are never rendered in calendar cells, statistics, legends, or print. Existing portrait-month and two-part landscape-year targets remain best effort.

## UI workflow

- A result-level “Add or edit date” action opens a focused in-page editor; the semantic calendar remains a read-only table.
- The native date input starts within the visible month, is bounded to years 0001–9999, and passes strict domain validation.
- Context shows the generated base occurrence, current effective primary, additional-work presence, and note presence.
- The editor offers primary type, applicable shift definition for Replacement/Training, optional Additional work plus definition, and a plain-text 500-character note.
- Save validates and atomically replaces that date’s planner record. Cancel discards draft edits. Separate controls remove primary, additional work, or note; Restore generated removes all three.
- Successful saves/removals use the existing polite status channel. Opening moves focus to the date field; closing restores focus to the launch action.
- Changing only the visible month/year preserves exceptions. A newly generated different base schedule clears date exceptions to avoid silently reinterpreting them; updating definitions for the same base preserves exceptions because stable definition IDs remain valid.

## Accessibility behavior

- Native date/select/checkbox/textarea/buttons with visible labels, descriptions, `aria-invalid`, and stable `aria-describedby` links.
- Failed saves use the existing focusable error summary and exhaustive human-readable error mapping.
- Keyboard-only open/edit/save/cancel/remove/restore paths; no drag selection, interactive grid, or focus trap.
- Calendar cells retain table semantics and full effective accessible descriptions. Visible text distinguishes Leave, Sick, Training, Additional work, and note presence without color alone.
- Note contents are shown only inside the editor, not repeated in dense cell accessible names.
- Touch targets remain at least 44px where practical, focus remains visible, and reduced-motion behavior is unchanged. No formal WCAG claim is made.

## Responsive behavior

The in-page editor and statistics stack at 320/390px and progressively use columns at wider widths. Long definition names wrap, additional/note indicators remain concise, calendar cells remain bounded, and the yearly view receives one annual statistics section. Verify 320, 390, 768, 1024, and 1440px with no document overflow.

## Privacy limitations

Definitions, exceptions, absences, additional work, and notes remain in-memory only. They never enter V1 URLs, copied links, history state, metadata, logs, network requests, cookies, browser storage, or a server. Refresh and shared-link restoration discard them. The UI states that personal changes are temporary and not saved. Copy warns that the link contains only the base rotation. ICS intentionally includes effective statuses but excludes notes and remains an explicit local download.

## Test matrix

### Pure planner

- all primary types; Replacement/Training/Additional on Off; Leave/Sick rejection on Off;
- primary/additional/note coexistence and over-cardinality failures;
- identifiers, duplicate IDs/dates, invalid dates/types/references, note normalization/type/empty/limit;
- immutable validation, projection, and base input preservation;
- precedence, independent removal, complete restoration;
- working-date, category, Training, Additional, Leave, Sick, weekend, and overnight counts;
- known gross/break/net/additional minutes and complete/incomplete states;
- month/year scope, leap year, boundaries, 366/367 range, years 0001/9999;
- timezone-independent Node runs and no `Date`/browser/locale dependency.

### Component/integration

- open/cancel/focus, date validation and generated/effective context;
- every primary type, additional work, note, combined state, independent removal, restore;
- Leave/Sick Off errors and previous valid result retention;
- effective month/year labels, accessible descriptions, exception legend, personal statistics, incomplete copy;
- effective next work and weekend values;
- base-only copied URL/privacy copy/refresh loss;
- month/year all-day effective export, deterministic roles, notes absent, unchanged base export regression;
- print hides editor/note text and retains effective labels/statistics.

### Browser/regression

- keyboard-only date workflow;
- replacement/Leave/Training/Additional/Note journeys and refresh reset;
- effective month/year download inspection;
- print media and 320/390/768/1024/1440 overflow;
- all six presets, custom cycles, V1 history, static routes, sitemap, existing no-planner generator, and no-exception exports remain unchanged.

## Files to create

- planner exception/projection/statistics modules under `src/features/schedule/planner/`;
- effective presentation/error helpers under `src/features/schedule/presentation/`;
- date-exception editor and personal-statistics components;
- pure exception/projection/statistics tests;
- `docs/plans/010-exceptions-effective-schedule-and-statistics.md`.

## Files to modify

- planner public types/error union and barrel;
- generator state and effective insight integration;
- monthly/yearly calendar, shared month grid, legend, insights, actions, and export public API;
- focused component, ICS, presentation, and Playwright tests;
- README, Product, Domain, Architecture, UI/UX, SEO, Security, Testing, Decisions, and Roadmap.

The file list may narrow during implementation. Expansion must be justified by an in-scope boundary.

## Non-goals

No timed ICS, timezone selection, `VTIMEZONE`, multiple additional occurrences, split shifts, ranges, recurrence, drag selection, leave balance, medical/sick details, approvals, payroll, wages, legal overtime, time tracking, browser storage, backup/import, PWA/offline cache, notifications, accounts, server persistence, multiple employees, staffing, swaps, AI, URL V2, dependencies, or SEO routes.

## Acceptance criteria

1. The unchanged generator remains identical without planner state.
2. Every approved primary/additive/note behavior follows the documented precedence and restrictions.
3. Removing one layer preserves the others; restoring removes the record and reveals the exact base occurrence.
4. Month/year calendars, insights, weekends, statistics, print, and exception-aware ICS reuse one effective projection.
5. Statistics are scoped, overlap only as documented, use integer nominal minutes, and disclose incomplete time.
6. Notes remain plain, private, unshared, unexported, and unprinted.
7. V1, presets, custom cycles, base occurrences, default ICS, routes, and sitemap remain unchanged.
8. Keyboard, focus, semantic-table, mobile, print, timezone, privacy, and typed-error checks pass.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ='UTC'; npm test -- tests/unit/schedule
$env:TZ='America/New_York'; npm test -- tests/unit/schedule
npm run test:e2e
npm run build
git diff --check
git status --short
```

Additional verification compares package manifests and sitemap, scans planner modules for browser/`Date`/timezone/storage APIs, scans the schedule feature for network/storage additions, inspects base and effective ICS, and checks all required responsive/print widths.

## Completion record

Phase 6A3 completed without dependency, route, sitemap, storage, URL-codec, timed-export, or base-engine changes. Final verification passed formatting, lint, type checking, 265 unit/component tests, 251 schedule tests in both UTC and America/New_York, 41 Playwright tests, and the production build. The build continued to prerender every application route as static content.
