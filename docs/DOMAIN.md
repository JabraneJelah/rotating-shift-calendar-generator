# Schedule domain

This document defines the Phase 2A schedule contract. The engine models repeating calendar-day categories, not employment policy or exact work times.

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

The engine does not invent day/night rotation. Both presets require one fixed working-shift kind. Employer-specific alternating sequences need separately reviewed presets in a future phase.

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
type PresetScheduleConfig = {
  readonly kind: "preset";
  readonly version: 1;
  readonly presetId: "4-on-4-off" | "2-2-3";
  readonly startDate: ISODate;
  readonly workingShift: "day" | "night";
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
v=1&kind=custom&s=2026-10-01&cycle=d,d,n,n,o,o
v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&ws=sun
```

Cycle tokens are `d` (day), `n` (night), and `o` (off). Optional view month `m=2026-10` and week start are presentation state and never affect calculation. Omitted week start means Monday; Sunday is encoded as `ws=sun`; explicit Monday is omitted. Canonical order is `v`, `kind`, variant fields, optional `m`, then optional `ws`. Parsing accepts any parameter order but serialization always emits canonical order.

Unknown, duplicate, missing, empty, variant-inapplicable, or malformed parameters are rejected. Parsing and serialization are pure and do not read or write browser history.

## Error behavior

Untrusted input returns `DomainResult<T>`, a discriminated success or failure. Failures contain readonly `DomainError` objects with stable machine-readable codes and relevant path, value, index, or limit context. The current codes are:

```text
INVALID_DATE_FORMAT        INVALID_CALENDAR_DATE
UNSUPPORTED_YEAR           INVALID_VIEW_MONTH
INVALID_DAY_OFFSET         INVALID_CYCLE
EMPTY_CYCLE                CYCLE_TOO_LONG
NO_WORKING_SHIFT           INVALID_SHIFT_KIND
UNKNOWN_PRESET             INVALID_WORKING_SHIFT
INVALID_RANGE              RANGE_TOO_LARGE
UNSUPPORTED_CONFIG_VERSION INVALID_CONFIG_KIND
INVALID_CONFIGURATION      MISSING_FIELD
MISSING_PARAMETER          DUPLICATE_PARAMETER
UNKNOWN_PARAMETER          INVALID_CYCLE_TOKEN
```

UI code will map codes to accessible user-facing language later; domain errors do not contain presentation copy. Impossible states passed around as already validated types are programmer invariants and may throw.

## Deferred edge cases

Overnight timestamps, daylight-saving interpretation of shift times, time-zone conversion, exact start/end times, pay, breaks, overtime, and employer-specific alternating rotations remain deferred. Monthly and complete-year ICS export map existing date-only occurrences to all-day events with an exclusive next-calendar-date end; they do not add time-aware domain behavior. Any future timed behavior requires separate contracts and unit tests without weakening the date-only model.
