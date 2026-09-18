# Schedule domain

This document defines the schedule, optional personal-planner, and persisted-planner contracts through Phase 6B1. The base engine models repeating calendar-day categories, not employment policy or exact work times.

## Terms

- **Shift:** one scheduled work period associated with a calendar occurrence. Exact times are outside Phase 2A.
- **Shift kind:** exactly `day`, `night`, or `off`. Day and night are categories, not implied hours.
- **Working shift kind:** `day` or `night`; `off` is never a preset's working shift.
- **Rotation cycle:** a finite, ordered, non-empty sequence of shift kinds that repeats indefinitely.
- **Pattern:** a validated concrete cycle, whether produced by a preset or custom input.
- **Pattern start date:** the civil calendar date assigned to cycle index `0`.
- **Custom pattern:** a user-authored cycle of supported shift kinds.
- **Calendar occurrence:** an ISO date, its resolved shift kind, and the zero-based cycle index used.
- **Week start:** presentation-only ordering, exactly `monday` or `sunday`; it never changes an occurrence.

Each calendar date resolves to exactly one shift kind. A night shift may eventually cross midnight, but the current domain does not model its start or end time. Phase 3A calendar exports therefore represent Day, Night, and Off occurrences as all-day events without inventing hours or time zones.

## Approved presets

Preset names identify these exact sequences; an employer's similarly named schedule may differ.

### `4-on-4-off`

Eight positions: `WORK, WORK, WORK, WORK, OFF, OFF, OFF, OFF`.

- Day: `day, day, day, day, off, off, off, off`
- Night: `night, night, night, night, off, off, off, off`

### `2-2-3`

Fourteen positions: `WORK, WORK, OFF, OFF, WORK, WORK, WORK, OFF, OFF, WORK, WORK, OFF, OFF, OFF`.

- Day: `day, day, off, off, day, day, day, off, off, day, day, off, off, off`
- Night: `night, night, off, off, night, night, night, off, off, night, night, off, off, off`

This is a fixed-shift preset with seven working and seven off positions. “Panama schedule” may be described in content as a common alternative name for the 2-2-3 family, but it is not a separate preset or a guarantee that every Panama implementation matches this sequence.

### `7-on-7-off-fixed`

Fourteen positions: seven `WORK`, then seven `OFF`. All working positions resolve to the selected Day or Night value. The start date is the first working position.

### `2-day-2-night-4-off`

Eight concrete positions: `day, day, night, night, off, off, off, off`. The start date is the first Day position.

### `dupont-28-day`

Twenty-eight concrete positions: `night, night, night, night, off, off, off, day, day, day, off, night, night, night, off, off, off, day, day, day, day, off, off, off, off, off, off, off`. The start date is the first Night in the opening four-Night block. Similar employer schedules may differ; this identifier always means this exact order.

### `7-day-7-off-7-night-7-off`

Twenty-eight concrete positions: seven Day, seven Off, seven Night, then seven Off. The start date is the first Day position. It is distinct from fixed `7-on-7-off-fixed`.

Preset definitions are discriminated as fixed or rotating. Fixed presets contain `work | off` positions and require one working-shift kind. Rotating presets contain final `day | night | off` values and reject a separate working shift. Pitman and Panama are not separate identifiers because their fixed work/off skeleton duplicates `2-2-3` and workplace rotation rules vary. Evening and Swing are not supported shift kinds.

## Date-only contract

Public calendar dates are branded `ISODate` strings in strict `YYYY-MM-DD` format. Years `0001` through `9999` are supported. Year `0000`, nonexistent dates, non-four-digit years, and locale formats are rejected.

Date-only calculations use pure integer proleptic-Gregorian arithmetic. They do not construct JavaScript `Date` objects and do not depend on local time, UTC offsets, daylight-saving transitions, locale formatting, or browser APIs. `ISOYearMonth` uses strict `YYYY-MM` for optional calendar-view state.

Calendar dates and future shift times must remain separate. Time zones become relevant only when a later feature creates timestamped events; a browser zone must never silently reinterpret this date-only cycle.

## Start and wrapping behavior

The pattern start date is cycle index `0`. For example, with a start of `2026-10-01`, position zero applies to that date. Later dates advance one position per calendar day. Earlier dates wrap backward using positive modulo, so the day immediately before the start maps to the cycle's last position. This behavior works across month, year, leap-day, and daylight-saving boundaries.

## Validation and limits

- A custom cycle contains 1–56 shift kinds.
- Only `day`, `night`, and `off` are accepted.
- A custom cycle must contain at least one `day` or `night`; an all-off cycle is invalid.
- An inclusive expansion range contains at most 366 calendar dates.
- A range must satisfy `from <= to`.
- Unknown preset IDs, configuration versions, shift kinds, and working shifts are invalid.
- Input is never silently corrected.

Validated objects and cycles are exposed as readonly values and frozen when created at an untrusted boundary.

## Occurrences and expansion

An occurrence contains only stable domain data:

```ts
type ScheduleOccurrence = {
  readonly date: ISODate;
  readonly shift: ShiftKind;
  readonly cycleIndex: number;
};
```

It contains no label, color, icon, localized text, shift time, pay data, or presentation state. Range expansion is inclusive and returns occurrences in ascending date order without gaps or duplicates.

## Version-1 share configuration

Schedule configuration is a discriminated union with numeric version `1`:

```ts
type FixedPresetScheduleConfig = {
  readonly kind: "preset";
  readonly version: 1;
  readonly presetId: "4-on-4-off" | "2-2-3" | "7-on-7-off-fixed";
  readonly startDate: ISODate;
  readonly workingShift: "day" | "night";
};

type RotatingPresetScheduleConfig = {
  readonly kind: "preset";
  readonly version: 1;
  readonly presetId:
    "2-day-2-night-4-off" | "dupont-28-day" | "7-day-7-off-7-night-7-off";
  readonly startDate: ISODate;
};

type CustomScheduleConfig = {
  readonly kind: "custom";
  readonly version: 1;
  readonly startDate: ISODate;
  readonly cycle: readonly ShiftKind[];
};
```

Canonical query forms are:

```text
v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day
v=1&kind=preset&p=2-day-2-night-4-off&s=2026-10-01
v=1&kind=custom&s=2026-10-01&cycle=d,d,n,n,o,o
v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&ws=sun
```

Cycle tokens are `d` (day), `n` (night), and `o` (off). Optional view month `m=2026-10` and week start are presentation state and never affect calculation. Omitted week start means Monday; Sunday is encoded as `ws=sun`; explicit Monday is omitted. Canonical order is `v`, `kind`, variant fields, optional `m`, then optional `ws`. Parsing accepts any parameter order but serialization always emits canonical order.

Fixed preset queries require `shift`; rotating preset queries forbid it. Unknown, duplicate, missing, empty, variant-inapplicable, or malformed parameters are rejected. Parsing and serialization are pure and do not read or write browser history.

## Error behavior

Untrusted input returns `DomainResult<T>`, a discriminated success or failure. Failures contain readonly `DomainError` objects with stable machine-readable codes and relevant path, value, index, or limit context. The current codes are:

```text
INVALID_DATE_FORMAT        INVALID_CALENDAR_DATE
UNSUPPORTED_YEAR           INVALID_VIEW_MONTH
INVALID_DAY_OFFSET         INVALID_CYCLE
EMPTY_CYCLE                CYCLE_TOO_LONG
NO_WORKING_SHIFT           INVALID_SHIFT_KIND
UNKNOWN_PRESET             INVALID_WORKING_SHIFT
INAPPLICABLE_WORKING_SHIFT
INVALID_RANGE              RANGE_TOO_LARGE
UNSUPPORTED_CONFIG_VERSION INVALID_CONFIG_KIND
INVALID_CONFIGURATION      MISSING_FIELD
MISSING_PARAMETER          DUPLICATE_PARAMETER
UNKNOWN_PARAMETER          INVALID_CYCLE_TOKEN
```

UI code will map codes to accessible user-facing language later; domain errors do not contain presentation copy. Impossible states passed around as already validated types are programmer invariants and may throw.

## Optional personal shift-definition layer

Phase 6A2 adds a separate pure planner domain without widening `ScheduleOccurrence`. Generated `day` and `night` values may map to immutable personal working definitions; `off` remains a base schedule occurrence and has no working definition. The initial UI owns deterministic `builtin-day` and `builtin-night` definitions. The domain also recognizes Evening and Other categories as future exception groundwork, but they are not preset/custom-cycle tokens or repeating positions.

A registry contains at most 12 definitions. Each has a validated stable ID, a trimmed unique name of 1–40 characters, a trimmed short label of 1–4 characters, a semantic category, and one of the curated Amber, Blue, Indigo, Violet, Teal, Green, Rose, or Slate tokens. Duplicate IDs and case-insensitive duplicate names are invalid; duplicate short labels are permitted because accessible full names remain present. Raw CSS colors are never accepted.

Local times are branded canonical `HH:mm` strings with hours 00–23 and minutes 00–59. They contain no date, locale, offset, or timezone. A definition is either untimed with zero break or has both start and end values. An end earlier than the start crosses midnight. Equal times are invalid unless `is24Hours` is explicitly true, in which case gross duration is 1,440 minutes. Unequal times reject the 24-hour flag. Break minutes are a non-negative safe integer strictly less than gross duration.

```text
gross = endMinutes + (crossesMidnight ? 1,440 : 0) - startMinutes
net = gross - unpaidBreakMinutes
```

For explicit equal-time 24-hour shifts, gross is 1,440. Calculations are nominal wall-clock minutes and do not adjust across daylight-saving changes. The planner domain imports no `Date`, timezone, locale, React, Next.js, browser, or storage API.

Personal definitions do not enter V1 URLs, history state, copied links, `ScheduleConfig`, `ScheduleOccurrence`, or all-day ICS identity/content. An explicitly saved Phase 6B1 planner may persist validated definitions locally as part of its atomic aggregate; an unsaved or V1 URL session remains ephemeral.

## Date exceptions and effective projection

Phase 6A3 keeps each generated `ScheduleOccurrence` immutable and derives an effective date as `base occurrence → primary exception → additional work → note metadata`. A date has at most one primary exception (Replacement, Leave, Sick, or Training), one additional-work occurrence, and one normalized plain-text note of at most 500 characters. Replacement and Training reference validated working definitions and may replace Off. Leave and Sick replace only generated Day/Night work. Additional work references a working definition, never replaces the primary, and may coexist with every primary state. Removing all layers reveals the exact generated occurrence.

A working date contains at least one effective working occurrence and is counted once even when primary and additional work coexist. Category, Training, Additional, and overnight measures count occurrences and intentionally overlap. Saturday/Sunday working dates are counted once. Timed occurrences contribute known nominal gross, break, and net minutes to their start date; an untimed occurrence marks totals incomplete while known subtotals remain available. Notes affect no calculation and are excluded from sharing, print, and ICS.

Effective all-day export emits one primary event per date and a second event for additional work. Generated primary UIDs retain legacy identity; exception/additional roles use deterministic non-personal suffixes. No timed value, timezone, `TZID`, or `VTIMEZONE` is emitted.

## Deferred edge cases

Recurring/range exceptions, multiple additional occurrences, pay, employer-specific alternating rotations, and split shifts remain deferred. Existing month and complete-year all-day ICS retain exclusive next-calendar-date ends.

Phase 6A4 projects only effective working occurrences into a separate timed representation. Each local start and end boundary is resolved independently in an explicitly selected IANA timezone using pinned 2026d rules. A nonexistent local time is an atomic failure; a repeated local time has no default and requires an explicit earlier/later choice. Overnight work advances the civil end date before resolution. Equal-time explicit 24-hour work ends at the same wall time on the following civil date, so its exact duration may be 23, 24, or 25 hours.

Timed occurrence starts are supported only from `1970-01-01` through `2037-12-31`. A qualifying overnight or explicit 24-hour occurrence starting on the maximum date may resolve its exclusive end on `2038-01-01`. Other occurrences beginning outside the range fail atomically with `UNSUPPORTED_TIMED_EXPORT_YEAR`; they are never clamped or skipped. This conservative timed-only boundary does not affect date-only generation, views, all-day export, print, sharing, or V1 URLs.

## Persisted planner contract

Planner schema version 1 and domain-data version 1 are independent from IndexedDB database version 1, backup format version 1, and the V1 schedule-link version. A persisted planner owns a UUID, normalized unique name, positive monotonic revision, UTC creation/update timestamps, validated `ScheduleConfig`, week start, the complete validated definition registry, validated date exceptions, and an optional explicitly confirmed IANA timezone. The IndexedDB-only `nameKey` is derived and excluded from backups.

Expanded occurrences, effective projections, statistics, insights, calendar navigation, ICS content, invalid drafts, focus/status state, and DST overlap choices are not authoritative data. They are recomputed or discarded. Every stored/imported aggregate is runtime validated before use. One stale revision cannot overwrite another; imported planners receive new planner IDs and revision 1 while preserving valid internal definition and exception references.
