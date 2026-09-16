# Plan 002 — schedule domain engine

**Status:** Complete  
**Scope:** Phase 2A only

## Objective

Implement a framework-independent schedule domain that validates ISO calendar dates, resolves approved repeating shift cycles in both directions, expands bounded inclusive ranges, and parses or serializes a stable version-1 share configuration. Keep all behavior deterministic, timezone-independent, explicit about malformed input, and reusable by later UI, print, export, and server-rendered features.

## Current repository observations

- Phase 1 is present in an otherwise uncommitted repository; all existing files are user work and must be preserved.
- `src/features/schedule` currently contains only the visual placeholder. No schedule domain code exists.
- Vitest discovers `tests/unit/**/*.test.{ts,tsx}` in jsdom and already has one homepage component test.
- Strict TypeScript, ESLint, Prettier, Playwright, and production-build scripts are configured.
- The existing architecture already requires a pure TypeScript domain beneath the schedule feature.
- `docs/DOMAIN.md` deliberately deferred exact preset semantics. This Phase 2A brief resolves them without contradicting the documented product direction.
- `docs/ROADMAP.md` currently groups domain and UI work into Phase 2; it needs an explicit 2A/2B split.
- No new dependency is necessary. Integer Gregorian calendar arithmetic is small enough to implement and test directly without `Date`, locale APIs, or a date package.

## Domain decisions

- `ShiftKind` is exactly `"day" | "night" | "off"`; fixed preset working shifts exclude `"off"`.
- Public dates use branded, validated `ISODate` strings in strict `YYYY-MM-DD` form.
- Supported years are `0001` through `9999`, matching the four-digit contract. Year `0000` is rejected.
- Date conversion uses pure integer proleptic-Gregorian arithmetic. It does not construct or mutate JavaScript `Date` objects and is unaffected by locale, timezone, or daylight-saving transitions.
- The pattern start date is cycle index zero. Dates before it use positive modulo to wrap backward.
- Custom cycles contain 1–56 entries and at least one day or night shift.
- Inclusive expansion ranges contain at most 366 dates.
- The public configuration is a version-1 discriminated union for preset and custom schedules.
- Query parsing rejects unknown and duplicate parameters. This catches typos and prevents ambiguous interpretation.
- An optional branded `ISOYearMonth` is presentation state in the share codec, not schedule calculation input.
- Untrusted input returns a discriminated `DomainResult`; only impossible programmer invariants may throw.

## Files to create

- `src/features/schedule/domain/date-only.ts`
- `src/features/schedule/domain/schedule-types.ts`
- `src/features/schedule/domain/presets.ts`
- `src/features/schedule/domain/schedule-engine.ts`
- `src/features/schedule/domain/schedule-config.ts`
- `src/features/schedule/domain/index.ts`
- `tests/unit/schedule/date-only.test.ts`
- `tests/unit/schedule/presets.test.ts`
- `tests/unit/schedule/schedule-engine.test.ts`
- `tests/unit/schedule/schedule-config.test.ts`

## Files to modify

- `docs/DOMAIN.md`
- `docs/ARCHITECTURE.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- `docs/plans/002-schedule-domain-engine.md` at completion

No UI or homepage file will be modified.

## Public types and functions

The schedule-domain barrel will intentionally expose:

- Types: `ShiftKind`, `WorkingShiftKind`, `ISODate`, `ISOYearMonth`, `PresetId`, `SchedulePattern`, `PresetScheduleConfig`, `CustomScheduleConfig`, `ScheduleConfig`, `ScheduleOccurrence`, `ScheduleShareState`, `DomainError`, `DomainErrorCode`, and `DomainResult`.
- Limits and identifiers: `MIN_SUPPORTED_YEAR`, `MAX_SUPPORTED_YEAR`, `MAX_CUSTOM_CYCLE_LENGTH`, `MAX_EXPANSION_DAYS`, and `PRESET_IDS`.
- Date API: `parseISODate`, `parseISOYearMonth`, `addCalendarDays`, `compareISODate`, and `differenceInCalendarDays`.
- Pattern/configuration API: `resolvePresetPattern`, `validateCustomPattern`, and `validateScheduleConfig`.
- Schedule API: `resolveScheduleOccurrence` and `expandSchedule`.
- Share codec: `parseScheduleQuery` and `serializeScheduleQuery`.

Internal Gregorian conversion, modulo, token maps, and trusted pattern resolution remain unexported.

## Validation rules

- Dates must exactly match `YYYY-MM-DD`, exist in the Gregorian calendar, and fall in years 0001–9999.
- Year-month values must exactly match `YYYY-MM` and use months 01–12.
- Preset IDs are `4-on-4-off` or `2-2-3`.
- Preset working shifts are only `day` or `night`.
- Custom cycles are arrays of known shift kinds, contain 1–56 entries, and contain at least one working shift.
- Schedule configuration version is numeric `1` and its discriminant is `preset` or `custom`.
- Expansion requires `from <= to` and an inclusive length no greater than 366 dates.
- Share queries reject missing, duplicate, unknown, variant-inapplicable, or malformed parameters.
- Cycle query tokens are only `d`, `n`, and `o`; empty tokens are invalid.

Malformed input is never silently normalized or corrected.

## Error behavior

`DomainResult<T>` is either `{ ok: true, value: T }` or `{ ok: false, errors: readonly DomainError[] }`. Errors have stable codes plus a path and relevant value, index, or limit context. Planned codes cover date format/calendar/range errors, cycle shape and length errors, shift/preset errors, configuration version/kind/field errors, query parameter errors, cycle tokens, and view months.

Parsing ordinary untrusted share input must not throw. Serialization validates its input before emitting output. Trusted branded values and validated configuration are the contract for calculation functions; an impossible exhaustive branch may throw as a programmer invariant.

## Test matrix

- ISO dates: ordinary dates, leap rules, invalid format/month/day, empty values, years 0001 and 9999, and unsupported year 0000.
- Calendar arithmetic: add/subtract, month/year/leap boundaries, daylight-saving-adjacent dates, comparisons, and day differences.
- 4-on/4-off: exact day/night cycles, index zero, final position, forward wrap, backward wrap, and multiple cycles both directions.
- 2-2-3: exact 14-day day/night cycles, forward/backward wrap, and seven work/seven off positions.
- Custom patterns: mixed/day-only/night-only, empty, all-off, invalid values, maximum length, and excessive length.
- Range expansion: one date, full month, month/year/leap boundaries, reversed range, 366-date limit, excessive range, ascending order, and no gaps/duplicates.
- Configuration objects: preset/custom success plus version, discriminant, date, preset, working-shift, and cycle failures.
- Query codec: preset/custom round trips, optional view month, canonical ordering, noncanonical input normalization, unsupported version, missing/duplicate/unknown parameters, unknown preset, invalid date/shift/token, empty token, long cycle, and malformed month.
- Run domain tests under `TZ=UTC` and `TZ=America/New_York` in addition to the normal suite.

Snapshots will not be used for schedule behavior.

## Documentation updates

- `DOMAIN.md`: exact presets and identifiers, Panama alias, fixed-shift policy, date contract, limits, backward behavior, errors, and schema versioning.
- `ARCHITECTURE.md`: concrete domain modules and one-way dependency direction.
- `SEO.md`: canonical versioned query serialization and non-indexability of configured results.
- `TESTING.md`: required domain boundary, timezone, and regression coverage.
- `DECISIONS.md`: ISO dates, integer UTC-safe arithmetic, presets, Panama policy, V1 codec, and typed validation results.
- `ROADMAP.md`: Phase 1 complete, Phase 2A complete after verification, and UI deferred to Phase 2B.

## Explicit non-goals

No generator or calendar UI, homepage redesign, yearly view, ICS/PDF/print output, sharing controls, browser-history integration, persistence, database, authentication, analytics, ads, pay/overtime/break rules, shift times, timezone conversion, localization, SEO landing pages, or automatic day/night rotation.

## Acceptance criteria

- Exact fixed-shift presets resolve for day and night workers.
- Strict date and custom-cycle validation return typed results.
- Pure arithmetic resolves dates before and after the pattern start without timezone dependence.
- Inclusive ranges enforce the 366-date maximum and remain ordered and gap-free.
- V1 query parsing and canonical serialization round-trip valid meaning and reject ambiguity.
- Comprehensive explicit tests pass in the normal suite and two timezone settings.
- Existing homepage smoke coverage and the production build continue to pass.
- No UI file or dependency changes occur.
- Owning documentation matches the final implementation.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ='UTC'; npx vitest run tests/unit/schedule
$env:TZ='America/New_York'; npx vitest run tests/unit/schedule
npm run test:e2e
npm run build
rg 'from ["''](react|next)|window|document|localStorage|sessionStorage' src/features/schedule/domain
npm ls --depth=0
git status --short
```

## Completion record

### Actual files created

- `src/features/schedule/domain/date-only.ts`
- `src/features/schedule/domain/schedule-types.ts`
- `src/features/schedule/domain/presets.ts`
- `src/features/schedule/domain/schedule-engine.ts`
- `src/features/schedule/domain/schedule-config.ts`
- `src/features/schedule/domain/index.ts`
- `tests/unit/schedule/date-only.test.ts`
- `tests/unit/schedule/presets.test.ts`
- `tests/unit/schedule/schedule-engine.test.ts`
- `tests/unit/schedule/schedule-config.test.ts`
- `docs/plans/002-schedule-domain-engine.md`

### Actual files modified

- `docs/DOMAIN.md`
- `docs/ARCHITECTURE.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`

No UI, package manifest, or lockfile was changed.

### Deviations

There were no scope or architecture deviations. The planned `schedule-config.ts` owns both object validation and the pure query codec because they share the V1 schema and boundary validation. The calendar implementation improved on the minimum UTC-safe requirement by using integer Gregorian arithmetic without constructing `Date` objects.

### Verification results

- `npm run format` — passed.
- `npm run format:check` — passed.
- `npm run lint` — passed with no warnings.
- `npm run typecheck` — passed.
- `npm test` — 5 files and 88 tests passed.
- `TZ=UTC` domain run — 4 files and 87 tests passed.
- `TZ=America/New_York` domain run — 4 files and 87 tests passed with identical assertions.
- `npm run test:e2e` — 1 Chromium homepage smoke test passed.
- `npm run build` — passed; all existing routes remained statically generated.
- Domain scan — no React/Next imports, browser globals, or JavaScript `Date` API usage found.
- Dependency review — no dependency was added or changed.

### Remaining Phase 2B work

- Build accessible preset, fixed-shift, start-date, and custom-cycle controls.
- Map stable domain error codes to concise accessible interface messages.
- Render a mobile-first monthly calendar entirely from `ScheduleOccurrence` values.
- Integrate the V1 query codec with routing/history while retaining clean canonicals and non-indexable configured results.
- Add component and mobile/desktop browser tests for the complete generation journey.

Yearly view, print, ICS, and share controls remain Phase 3 work.
