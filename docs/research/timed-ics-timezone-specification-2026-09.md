# Timed ICS timezone and interoperability specification

Status: proposed architecture for Phase 6A4A

Date: 2026-09-18

Scope: research and specification only; no production implementation is authorized

## 1. Executive recommendation

Add one explicit **Download timed work calendar** flow alongside the unchanged all-day month and year exports. The flow must require the user to select or confirm an IANA timezone. Resolve every local event boundary against that zone using a lazy-loaded, versioned IANA timezone database, then serialize the resolved instants as UTC:

```text
DTSTART:20261001T210000Z
DTEND:20261002T050000Z
```

This is Approach A. It is the smallest standards-correct format with the broadest likely client interoperability. UTC `DATE-TIME` values do not use `TZID`, so this approach does not require `VTIMEZONE`. The selected work timezone remains important input to conversion and should be stated in non-private event description text, but calendar clients receive exact instants.

Do not build the production feature with host `Intl` data alone. On the inspected Node 24 runtime, `Africa/Casablanca` is already inconsistent with the current IANA rule after 2026-09-20. Provisionally approve `timezonecomplete@5.15.1` together with separately versioned `tzdata@1.0.51` (IANA 2026d at research time), behind a small application-owned adapter and a dynamic import. A bounded implementation spike must first verify its browser bundle, exact gap/overlap candidate enumeration, Next.js compatibility, and 1970–future range. If it fails those gates, stop rather than silently falling back to host data.

Existing all-day export behavior, identifiers, labels, and actions remain unchanged. Timed export omits Off days, rejects incomplete timed work rather than silently changing semantics, keeps Leave and Sick all-day, and never exports private notes.

## 2. Standards summary

RFC 5545 distinguishes three relevant `DATE-TIME` forms:

- UTC values end in `Z`. They identify an exact instant. `TZID` must not be applied to a UTC value.
- Zoned local values carry a `TZID` parameter. Every unique `TZID` referenced by calendar properties requires a corresponding `VTIMEZONE` component so recipients can resolve the local value consistently.
- Floating values have neither `Z` nor `TZID`. They follow the recipient's current timezone and are explicitly unsuitable for a shift tied to a user-selected work timezone.

For `VEVENT`, `DTSTART` is inclusive and `DTEND` is non-inclusive. This matches the current exclusive-end model and permits an overnight shift to end on the following local date without subtracting a second or minute.

A valid `VTIMEZONE` has a `TZID` and at least one `STANDARD` or `DAYLIGHT` observance. Observances require `DTSTART`, `TZOFFSETFROM`, and `TZOFFSETTO`; transition sets may use `RRULE` or `RDATE`. Correct generation is not merely printing a current offset: it needs the relevant historical and future transition rules, including political changes that do not follow stable annual recurrences.

IANA identifiers such as `Africa/Casablanca`, `Europe/Paris`, and `Asia/Kolkata` identify rule sets, not fixed offsets. Abbreviations such as EST and CST are ambiguous and must not be accepted as authoritative identifiers.

RFC 5545 has default rules for ambiguous and nonexistent local times, but an interactive export can be safer. This specification deliberately rejects gaps and requires an explicit choice for overlaps before conversion.

## 3. Current ICS baseline

The repository currently provides deterministic all-day month and year ICS downloads. The implementation already has the following contracts, all of which must remain intact:

- effective occurrences are projected separately from the serializer;
- all-day `DTSTART;VALUE=DATE` and exclusive `DTEND;VALUE=DATE` are used;
- generated, replacement, Training, Leave, Sick, additional work, and Off occurrences are represented;
- private notes are excluded;
- UIDs use a deterministic configuration hash and occurrence identity;
- `DTSTAMP` is injected and rendered in UTC;
- content lines use CRLF, include a terminal CRLF, and fold at 75 UTF-8 octets;
- text is escaped and event ordering is deterministic;
- downloads use a Blob URL and revoke it after use;
- month and year are explicit, separate all-day actions.

The schedule time model stores optional local `HH:mm` start/end values, an explicit 24-hour flag, and an unpaid break duration. An earlier end means the next local date; equal times require the explicit 24-hour flag. Existing duration calculations are nominal wall-clock calculations and intentionally do not assign a timezone.

The supported repository runtime is Node `>=24 <25`. The inspected runtime was Node 24.12.0 with ICU 77.1, CLDR 47.0, and timezone data 2025b. Production dependencies are currently limited to the existing Next.js/React and UI utilities; no date-time or calendar package is installed.

## 4. Approach comparison

| Criterion         | A — resolve to UTC                                             | B — `TZID` + `VTIMEZONE`                                                         | C — floating local time                                        |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Meaning           | Exact instants                                                 | Local wall times in a named zone                                                 | Wall times in the viewer's zone                                |
| Correctness       | High if local-to-instant conversion uses current IANA data     | High only if the embedded observances cover every relevant transition            | Wrong for explicitly selected work zones when viewed elsewhere |
| DST gaps/overlaps | Resolve before serialization under explicit application policy | Still must resolve/validate local boundaries and generate correct rules          | Delegated silently to each client                              |
| Overnight         | Resolve local start date and local next-day end independently  | Same date calculation, then emit local values                                    | Date calculation works but zone meaning is lost                |
| `VTIMEZONE`       | Not required; `TZID` forbidden on UTC values                   | Required by RFC 5545                                                             | Not applicable                                                 |
| Calendar display  | Same instant; displayed in the calendar's viewing zone         | Intended wall time in the embedded zone                                          | Changes with viewer/device zone                                |
| Determinism       | Deterministic with pinned timezone data and injected `DTSTAMP` | Also depends on deterministic transition-window generation                       | Client-dependent                                               |
| File size         | Smallest                                                       | Larger; one observance component per referenced zone/range                       | Small, but semantically unsafe                                 |
| Maintenance       | Conversion engine and tzdata refresh                           | Conversion plus standards-correct transition generator and compatibility testing | Low implementation effort, unacceptable behavior               |
| Recommendation    | **Selected**                                                   | Complete but deferred                                                            | Rejected                                                       |

Approach A's deliberate tradeoff is display behavior while travelling: an event created for 08:00 in Paris displays at the equivalent instant in the calendar viewer's current zone, not permanently as “08:00”. This is normal for timed calendar events and preferable to a floating event that changes its instant. The description may state `Work timezone: Europe/Paris`; clients must not be expected to interpret that text.

Approach B is not selected merely because many clients accept `TZID`. A correct generator must decide a transition coverage range, represent irregular changes, map aliases, and be verified across clients. `@touch4it/ical-timezones` is too stale for this purpose and `ical-generator` delegates timezone generation rather than solving it. This complexity brings no benefit for a download-only exact-instant work calendar.

Approach C is rejected. `DTSTART:20261001T220000` means floating 22:00 and ignores the explicit IANA selection. A recipient in a different zone would attach a different instant to the shift.

## 5. Library comparison

Versions and release recency are snapshots accessed on 2026-09-18. Bundle values are upstream or approximate compressed figures and must be measured in the actual Next.js build before approval.

| Candidate                                              | Version / license / maintenance                                                             | Runtime and bundle                                                                                                | Timezone-data and DST behavior                                                                                                    | ICS / state / risk                                                                                       | Decision                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| No dependency: `Intl.DateTimeFormat` search/round-trip | Platform API                                                                                | Zero bundle; Node/browser support varies                                                                          | Host ICU/TZDB; candidate enumeration must be written; Morocco test proved host data can be stale                                  | No `VTIMEZONE`; no package supply chain; correctness tied to devices                                     | Prototype and fallback diagnostics only, not the production resolver                            |
| Native Temporal                                        | Platform API; specification current                                                         | Zero bundle, but unavailable in inspected Node 24 and not Baseline across target browsers                         | Excellent explicit `reject`/`earlier`/`later`; still uses host timezone data                                                      | No `VTIMEZONE`; no global mutation                                                                       | Future optimization only, not sole implementation                                               |
| `timezonecomplete` + `tzdata`                          | 5.15.1 MIT, published about 3 months ago; `tzdata` 1.0.51, IANA 2026d, published 3 days ago | Browser and Node; TypeScript declarations; older CommonJS/AMD/UMD packaging; bundle and tree-shaking need a spike | Versioned data independent of host; `DateTime.exists` handles gaps; lower-level database/round-trip logic must enumerate overlaps | No `VTIMEZONE`; database singleton initialization is global within module; two packages and data updates | **Provisional recommendation**, isolated behind adapter and lazy import                         |
| `temporal-polyfill`                                    | 1.0.5 MIT, active, published 6 days ago                                                     | Node 16+ and modern browsers; about 19.4 kB gzip full API, tree-shakeable ESM                                     | Temporal disambiguation; delegates named zones to host `Intl`, so stale host data remains                                         | No `VTIMEZONE`; no intentional global patch in function API                                              | Best Temporal API ergonomics, rejected as sole resolver for current Morocco correctness         |
| `@js-temporal/polyfill`                                | 0.5.1 ISC, proposal-champion project; last release 2025-03-31; pre-1.0                      | Node 14+ / ES2020 browsers; about 52 kB gzip plus JSBI; ESM/CJS                                                   | Explicit disambiguation; named zones still depend on host data                                                                    | No `VTIMEZONE`; does not install global `Temporal` automatically                                         | Too large and does not solve data freshness                                                     |
| Luxon                                                  | 3.7.2 MIT, maintained; last stable 2025-07-09                                               | Browser/Node, roughly 20–25 kB gzip; effectively broad import rather than fine tree-shaking                       | Uses host `Intl`; exposes possible offsets, but normalization defaults require careful guarding                                   | No `VTIMEZONE`; avoid mutable global `Settings`                                                          | Clear API, but no timezone-data correctness advantage                                           |
| `@date-fns/tz`                                         | 1.5.0 MIT, active, published about 4 months ago                                             | Browser/Node/React Native; zero dependencies; `TZDateMini` documented at 1.34 kB; ESM/CJS                         | Uses host `Intl`; offset/transition helpers but no first-class reject/choose local resolver                                       | No `VTIMEZONE`; no required global mutation                                                              | Small, but application would own too much edge-case logic and stale data remains                |
| Moment Timezone                                        | 0.6.4 MIT, data updated recently; explicitly legacy/maintenance mode                        | Browser/Node; bundled-data builds are relatively large and not tree-shake-friendly                                | Bundled IANA data (recent releases tracked 2026c); mature transitions but default ambiguity behavior needs overrides              | No `VTIMEZONE`; Moment has mutable objects/global locale/data surfaces                                   | Reliable data precedent, rejected for new architecture because upstream recommends alternatives |
| `ical-generator`                                       | 11.1.1 MIT, active, published 23 days ago; zero dependencies                                | Browser/Node; exact app cost not measured                                                                         | Accepts several date libraries; `VTIMEZONE` needs a separate generator                                                            | Would replace mature repository serialization and risk formatting/UID churn                              | Do not add                                                                                      |
| `@touch4it/ical-timezones`                             | 1.9.0 ISC, last release about 3 years ago                                                   | Browser-capable; zero dependencies; size not measured                                                             | Generates `VTIMEZONE`, but published examples identify old Olson-era data                                                         | Generates observances; stale-data and maintenance risk, especially for Morocco                           | Reject                                                                                          |

Supply-chain controls for any approved dependency: pin exact versions in the lockfile, review transitive dependencies and published package contents, run the existing audit process, keep timezone access behind one adapter, verify the embedded tzdb version in tests, and schedule deliberate tzdata updates. No runtime CDN or timezone API is permitted.

## 6. Native-platform capability analysis

`Intl.DateTimeFormat` validates many IANA identifiers and formats an instant in a zone. It does not directly provide a standard local-date-time-to-instant operation or a tzdb version. A dependency-free prototype can search a bounded UTC interval, format candidate instants into the selected zone, and retain exact local-field matches. That yields zero, one, or two candidates for a gap, normal time, or overlap. The experiment correctly classified representative London, Paris, New York, Kolkata, and Chatham cases according to the host database, but it is inefficient and only as current as host ICU.

`Intl.supportedValuesOf("timeZone")` is available in the inspected Node runtime and returned 418 identifiers. It is useful for selector options, but older browsers may not expose it and returned identifiers can differ because ECMA-402 follows implementation-provided IANA/CLDR data. `UTC` must be added explicitly where absent. Feature detection is required.

Native `Temporal` was `undefined` in Node 24.12.0. Temporal's model and disambiguation API are appropriate, but current availability does not justify relying on it. Both evaluated Temporal polyfills still use the platform for named-zone rules and therefore do not repair stale ICU data.

Node reported timezone database 2025b. IANA had released 2026c by 2026-07-08, and the separately versioned `tzdata` package exposed 2026d during research. This is direct evidence that a nominally supported current runtime can lag political timezone changes.

No handwritten complete IANA list is allowed. Preferred option discovery is the approved timezone database's canonical names. `Intl.supportedValuesOf` may enhance labels or serve as a guarded fallback only when its coverage includes the chosen resolver data. A very small curated suggestion list is acceptable for convenience but must never be presented as the complete list.

Exact dependency-free experiment, run without writing files or installing packages:

```text
node -e <inline script using Intl.DateTimeFormat round trips over a bounded ±18h minute range>
```

Observed candidate counts included: London spring gap 0, Paris spring gap 0, New York spring gap 0, New York fall overlap 2, Kolkata normal 1, Chatham normal 1, and Casablanca 2026-09-21 12:00 mapped using the stale +01:00 rule. No temporary artifacts were created.

## 7. Selected timezone architecture

The production design, subject to dependency approval, is:

1. Build effective occurrences using the existing pure domain functions.
2. Require an explicit IANA timezone and validate it against the lazy-loaded resolver database.
3. Project local event boundaries as `{ date, hour, minute }`. Compute overnight/24-hour local end dates before any timezone conversion.
4. Resolve each boundary through an application-owned `TimeZoneResolver` that returns zero, one, or multiple exact candidates and tzdb version metadata.
5. Apply the policies in sections 9 and 10. Never use a library's silent compatible/default disambiguation.
6. Serialize chosen instants in UTC using the existing escaping, folding, CRLF, ordering, and download infrastructure.
7. Include a non-private description line such as `Work timezone: Africa/Casablanca`; do not depend on non-standard `X-WR-TIMEZONE` behavior.

Proposed pure boundary:

```ts
type LocalDateTime = Readonly<{
  date: LocalDate;
  hour: number;
  minute: number;
}>;

type LocalResolution =
  | { kind: "unique"; instantMs: number; offsetMinutes: number }
  | { kind: "gap" }
  | {
      kind: "overlap";
      candidates: readonly [
        { instantMs: number; offsetMinutes: number },
        { instantMs: number; offsetMinutes: number },
      ];
    };
```

The adapter must also expose canonical supported identifiers and a data-version string. Its output, not a JavaScript `Date` constructed in the machine zone, is the only input to UTC serialization. A unit test must assert the current `Africa/Casablanca` sentinel rule. A stale or unidentifiable database is a typed failure, never a switch to browser-local behavior.

## 8. Timezone-selector UX

Recommend an accessible searchable combobox in the timed-export disclosure/dialog:

- label it **Work timezone** and explain that it controls conversion to exact calendar times;
- require a user action to select or confirm; never preselect and silently accept the browser timezone;
- the detected browser identifier may appear as a clearly labelled suggestion, for example “Detected on this device — select to use”; detection itself does not confirm it;
- search canonical, human-readable IANA identifiers, preserving region and city (`America/Indiana/Indianapolis` rather than “Eastern”);
- support typing, arrow keys, Enter, Escape, visible focus, an announced result count, and validation messaging;
- distinguish aliases and canonical values; persist only the canonical resolver identifier for the active export flow;
- add `UTC` explicitly; do not accept abbreviations or fixed offsets as substitutes;
- keep the selection in React memory for Phase 6A4; do not write storage and do not put it in V1 share URLs.

A native select is technically accessible but unwieldy with hundreds of similar options. Hundreds of radios are unacceptable. A region-grouped native select improves scanning but not search. A curated common list plus an “advanced” complete list risks making the correct zone look exceptional and maintaining biased guesses. The searchable combobox best matches the data size; use established repository dialog/field/focus patterns and test it with keyboard and screen readers.

## 9. DST gap policy

If a boundary maps to zero instants, reject the entire timed export atomically. Do not shift forward, shorten a shift, or choose an RFC-compatible default silently.

Machine-readable error:

```text
NONEXISTENT_LOCAL_TIME
```

Required structured context: timezone, local date, local time, occurrence identity, boundary (`start` or `end`), and definition label. User-facing form:

> “02:30 on 29 March 2026 does not occur in Europe/Paris because the clock moves forward. Change this shift time, choose another timezone, or use the existing all-day export.”

All candidate boundaries should be validated so the UI can report the complete set of conflicts in one pass without exposing private notes.

## 10. DST overlap policy

If a boundary maps to two instants, do not silently select RFC 5545's first occurrence or a library default. Reject pending an explicit earlier/later choice for that local boundary. The confirmation must display both offsets and resulting UTC instants, not only “DST/standard”, because some backward transitions are political rather than conventional DST.

Machine-readable error:

```text
AMBIGUOUS_LOCAL_TIME
```

The error carries ordered earlier and later candidates. User-facing form:

> “01:30 on 1 November 2026 occurs twice in America/New_York. Choose the first occurrence (UTC−04:00) or the second (UTC−05:00).”

The choice is export-scoped and in memory. It is applied to the exact occurrence boundary only; it does not alter the shift definition or share URL. If the approved UI scope cannot present this safely in Phase 6A4, timed export remains blocked for overlaps and the user can use the all-day export.

## 11. Overnight-event behavior

Determine the local end date before resolution. For a definition starting 22:00 on 2026-10-01 and ending 06:00, create these local boundaries:

```text
start = 2026-10-01 22:00
end   = 2026-10-02 06:00
```

Resolve start and end independently in the same selected zone, then require `endInstant > startInstant`. This correctly handles an offset transition during the shift. Do not add a nominal eight-hour UTC duration to the resolved start; the elapsed instant duration may differ from the wall-clock definition across a transition. `DTEND` remains exclusive.

The calendar event spans the whole shift. An unpaid break does not split it or reduce `DTEND`; include a non-private `Break: 30 minutes` description line when present.

## 12. Explicit 24-hour behavior

An explicit 24-hour definition is a timed event from its start local time to the same time on the following local calendar date. It is not an all-day event and is not rejected merely because it is 24 nominal hours.

Resolve the two local boundaries independently. Across an offset transition the exact UTC duration may be 23, 24, or 25 hours; this is correct because the user defined a full local civil-day span. Gap and overlap policies apply to either boundary. Existing nominal statistics remain 1,440 minutes and are outside this export change.

## 13. Untimed-occurrence behavior

Timed export is atomic and rejects when any included working occurrence lacks a complete valid timed definition. It must not silently skip work or mix all-day work with timed work. The confirmation reports the number and identifies the affected shift labels/dates without private notes, then points to personal shift definitions or the existing all-day export.

Machine-readable failure:

```text
UNTIMED_WORK_OCCURRENCES
```

This is safer than mixed semantics and keeps the action name honest. The existing all-day month/year exports remain the complete fallback. A future product decision could permit an explicitly disclosed mixed file, but it is not in the proposed implementation scope.

## 14. Leave/Sick/Training behavior

- Leave and Sick remain all-day events with exclusive next-date `DTEND`. They carry the distinct timed-export UID namespace even though their value type is `DATE`.
- Training is timed when its effective shift definition has valid times; otherwise it contributes to `UNTIMED_WORK_OCCURRENCES`.
- Replacement work follows the replacement shift's definition and preserves its replacement identity.
- Private exception notes remain excluded in all cases.

This produces a work calendar rather than pretending an absence occupies a timezone-dependent instant.

## 15. Additional-work behavior

Additional work remains a distinct second event on its date. A timed definition produces its own timed `VEVENT`; an untimed/invalid definition blocks the export under the same completeness policy. It must not be merged with the primary occurrence even when their labels or times match. Independent identity allows clients to update it separately in principle.

## 16. Off-event policy

The proposed timed work-calendar export omits Off occurrences to reduce noise and keep the action comprehensible. Existing all-day schedule exports continue to include Off exactly as today.

The smallest action set is therefore:

1. existing all-day month export;
2. existing all-day year export;
3. one new timed work-calendar action operating on the currently selected month/year scope and explaining that Off is omitted while Leave/Sick remain all-day.

Do not add separate “timed work” and “timed complete including Off” buttons in Phase 6A4. A complete timed schedule is an open product option, not an initial requirement.

## 17. UID and duplicate-import policy

Do not change existing all-day UIDs. Timed export uses a distinct namespace/version so importing all-day and timed files cannot cause accidental replacement of one by the other.

Proposed logical identity inputs:

```text
product namespace + export-kind(timed-v1) + base schedule hash
+ local occurrence date + occurrence role + exception/additional stable role key
```

Roles distinguish generated primary work, replacement, Training, additional work, Leave, and Sick. The UID must not include title, start/end time, timezone, display color, or `DTSTAMP`; changing time details or timezone therefore preserves the timed event's logical UID. Exceptions replace the primary event identity for that local date/role rather than inheriting a generated event's descriptive fields. Additional work always has a separate role key.

The same inputs and injected `DTSTAMP` produce byte-deterministic output. `SEQUENCE` is not useful yet because there is no persisted revision counter; omit it. Re-import behavior is client-specific: some clients may update by UID, some may create duplicates, and changed `DTSTAMP`/time alone is not a portable synchronization protocol. The UI/documentation must describe the file as import, not synchronization, and the interoperability matrix must test both identical and changed-time re-imports.

## 18. Serialization requirements

Timed serialization must reuse or preserve all current contracts:

- `VCALENDAR` / `VEVENT` structure and deterministic event order;
- UTC `DTSTAMP` injection;
- UTC `DTSTART` and `DTEND` formatted as `YYYYMMDDTHHMMSSZ`;
- exclusive `DTEND`;
- no `TZID` on UTC properties and no `VTIMEZONE` in the selected architecture;
- `VALUE=DATE` only for Leave/Sick entries;
- CRLF content-line endings and terminal CRLF;
- UTF-8-aware folding at 75 octets, including continuation-space accounting;
- existing safe text escaping;
- Blob download and URL revocation;
- explicit calendar name/action copy that says timed work calendar and identifies the chosen timezone;
- no private notes, raw internal IDs, or unescaped user text.

The serializer accepts already-resolved event instants. It must not know the machine timezone or perform local conversion itself.

## 19. Typed-error proposal

Use a discriminated result rather than throwing untyped UI-facing errors:

| Code                            | Meaning / handling                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `MISSING_TIME_ZONE`             | No explicit confirmed selection; prompt for one                                               |
| `UNKNOWN_TIME_ZONE`             | Identifier is absent from approved resolver data; reselect                                    |
| `UNSUPPORTED_TIME_ZONE_RUNTIME` | Required APIs/module/data cannot run or data version is unverifiable; retain all-day fallback |
| `NONEXISTENT_LOCAL_TIME`        | Gap; include occurrence and boundary context, reject                                          |
| `AMBIGUOUS_LOCAL_TIME`          | Overlap; include ordered candidates, request explicit choice                                  |
| `INVALID_TIMED_DEFINITION`      | Malformed/equal-without-24h/out-of-range definition; reject                                   |
| `DATE_OVERFLOW`                 | Following-date calculation exceeds supported domain; reject                                   |
| `TIME_ZONE_CONVERSION_FAILED`   | Unexpected resolver failure after validation; reject and retain safe fallback                 |
| `VTIMEZONE_GENERATION_FAILED`   | Reserved for a future Approach B; unreachable in selected UTC architecture                    |
| `UNTIMED_WORK_OCCURRENCES`      | Included work lacks time details; report count/details, reject                                |

The domain layer returns structured data; user copy is mapped at the interaction boundary. Error analytics, if later added, may contain only the code, app version, and resolver/tzdb version—never schedule dates, times, labels, timezone choice, or notes.

## 20. Performance and bundle analysis

For a month, there can be at most 31 primary effective occurrences plus 31 additional-work occurrences: 62 events before Off omission. For a leap year, the corresponding upper bound is 732. Leave/Sick occupy a primary slot; they do not increase that bound.

With UTC serialization, `VTIMEZONE` contributes zero bytes. At a rough 300–500 bytes per folded event, expected files are approximately 10–30 kB monthly and 100–360 kB yearly, depending on labels/descriptions. These are estimates to replace with measured fixtures.

Resolution and serialization are O(events), bounded by 732 events for the current year export. Memory should remain comfortably within mobile limits if candidate records are streamed/projected once, but year export must be profiled on a representative low-end phone.

The timezone engine and data must be dynamically imported only after the timed action is opened. The selected library's older packaging and full database can materially increase a chunk; the implementation spike must record raw, parsed, minified, and gzip/brotli chunk sizes. Set an approval budget after measurement rather than inventing one here. If full data is excessive, investigate supported region-data chunks loaded from the application bundle based on the selected canonical zone; never fetch a third-party runtime API. Do not split by a guessed fixed offset.

The main generator's initial client bundle should have no timezone-library increase beyond the small interaction loader. A visible progress state is warranted for first lazy load/year export; no network request should contain schedule data.

## 21. Privacy and security analysis

- Timezone choice and schedule details stay client-side.
- No external timezone API is required at runtime; approved tzdata ships with application assets.
- No Google, Outlook, Apple, or other calendar-provider credentials are requested.
- No direct provider integration is introduced.
- Private notes never enter event summaries, descriptions, errors, filenames, or telemetry.
- Analytics must not contain schedule details, timezone choice, local/UTC times, or labels.
- ICS generation and download occur only after an explicit user action.
- All user-visible ICS text uses the existing escaping and folding path to prevent content-line injection.
- The dependency adapter constrains parsing and conversion; exact dependency versions and tzdb data version are test-visible.
- Dependency updates require license/security review plus Morocco, DST, serialization, and bundle regression tests.

Downloaded calendars themselves contain sensitive work-pattern information. The confirmation should state that the file is saved on the device and may be uploaded to the user's chosen calendar only when the user imports it.

## 22. Interoperability test matrix

No client compatibility is claimed by this research. Phase 6A4 implementation cannot be called interoperable until the following manual matrix records client version, platform, import route, result, and screenshots/notes.

| Client                         | Exact local start/end | Overnight | Gap/overlap fixture | Additional work | Leave/Sick all-day | Duplicate import | Changed-time re-import | Month/year |
| ------------------------------ | --------------------- | --------- | ------------------- | --------------- | ------------------ | ---------------- | ---------------------- | ---------- |
| Google Calendar web            | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |
| Outlook web                    | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |
| Outlook desktop, if available  | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |
| Apple Calendar, if available   | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |
| Thunderbird                    | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |
| Android importer, if practical | Pending               | Pending   | Pending             | Pending         | Pending            | Pending          | Pending                | Pending    |

Test at minimum UTC, Europe/London, Europe/Paris, America/New_York, Asia/Kolkata (no DST and half-hour offset), Pacific/Chatham (45-minute offset), and Africa/Casablanca. Verify source ICS with a parser and raw-byte assertions before client import. Gap exports must fail; overlap tests must exercise both explicit candidates. Re-import observations must be phrased per tested client, not generalized.

## 23. Morocco `Africa/Casablanca` verification

Morocco must never be represented as a fixed `+00:00` or `+01:00`. Its rules have included Ramadan-related seasonal transitions and can change with short political notice.

IANA tzdb 2026c, released 2026-07-08, changed `Africa/Casablanca` and `Africa/El_Aaiun` to permanent UTC effective 2026-09-20 at 02:00. The inspected Node 24.12.0 runtime reported tzdata 2025b and formatted 2026-09-21 12:00 in Casablanca as UTC+01:00. Its host-only conversion therefore produced 11:00Z, while current IANA rules require 12:00Z. It also failed to expose the transition's expected repeated local interval.

This is the decisive rejection of host-only `Intl`/Temporal-polyfill conversion for production. The recommended separately versioned data was IANA 2026d at research time. Required automated sentinel fixtures include:

- 2026-09-19 normal pre-transition local-to-UTC conversion;
- both candidates in the backward transition interval on 2026-09-20;
- 2026-09-21 12:00 mapping to 12:00Z under permanent UTC;
- a historical Ramadan forward gap and backward overlap supported by the pinned database;
- `Africa/El_Aaiun` parity where IANA specifies it.

Future tzdb changes can invalidate future exports. Pinning data makes builds deterministic but not eternally correct, so dependency maintenance must monitor IANA releases and ship reviewed data updates promptly.

## 24. Proposed Phase 6A4 implementation scope

After architecture and dependency approval, a separate implementation phase should:

1. create a pure timezone-resolver adapter and local-boundary projection outside React;
2. add exact timezone/tzdb packages only after the spike gates pass;
3. add exhaustive resolver fixtures, especially gaps, overlaps, non-hour offsets, overnight, 24-hour, and Morocco;
4. add a timed effective-event projector and UTC serializer while reusing current ICS primitives;
5. add distinct timed UID derivation without touching all-day UID code;
6. add the accessible explicit timezone combobox and a single timed export flow;
7. show completeness, omission, gap, and overlap confirmation/errors;
8. lazy-load conversion/export code;
9. add unit, integration, download, accessibility, bundle, and manual interoperability verification;
10. update durable domain, architecture, UI, security, testing, decision, and roadmap documents.

Explicitly out of scope: modifying existing all-day exports, persistence, share-URL fields, provider APIs, direct calendar synchronization, recurring `RRULE` events, `VTIMEZONE`, saved timezone preferences (Phase 6B), private notes, and a complete timed export including Off.

## 25. Dependencies requiring approval

No dependency was installed during this phase.

Request approval, before implementation, for this provisional pair:

- `timezonecomplete@5.15.1` — local/UTC calculation API and timezone database access, MIT;
- `tzdata@1.0.51` — separately versioned IANA 2026d JSON data, zero dependencies at research time.

Approval is conditional on a temporary isolated spike proving:

- exact zero/one/two-candidate resolution without silent normalization;
- `Africa/Casablanca` 2026c/2026d fixtures;
- support for every canonical selector identifier;
- Next.js client-only dynamic import with no server/global leakage;
- acceptable browser chunk and mobile parsing cost;
- compatibility with Node 24 and supported browsers;
- license, package provenance, audit, and transitive dependency review.

Do not approve `ical-generator`, a `VTIMEZONE` generator, or a Temporal polyfill for this architecture. Native Temporal can later replace calculation mechanics only when target support and timezone-data freshness are both proven.

## 26. Open decisions

The approving reviewer must decide:

1. whether to approve the provisional `timezonecomplete` + `tzdata` spike and subsequent dependency addition if gates pass;
2. the measured lazy-chunk budget and whether full or application-bundled regional data is acceptable;
3. whether Phase 6A4 UI includes earlier/later overlap choice immediately or blocks overlaps until a follow-up (this specification prefers the choice);
4. whether the single timed action follows the current visible month/year context or uses one scope control in its dialog;
5. exact public copy for “work timezone,” Off omission, all-day Leave/Sick, incomplete definitions, and import-not-sync behavior;
6. how frequently IANA release monitoring and tzdata refresh review occur;
7. which optional client/platforms are available for the manual matrix.

None of these decisions permits silent browser-zone inference, stale-data fallback, floating times, or changes to the existing all-day export.

## 27. Direct primary-source URLs

Accessed 2026-09-18 unless otherwise stated.

### Standards and platform

- RFC 5545, iCalendar: <https://www.rfc-editor.org/rfc/rfc5545.html>
- ECMA-402 Internationalization API specification: <https://tc39.es/ecma402/>
- TC39 Temporal timezone and ambiguity documentation: <https://tc39.es/proposal-temporal/docs/timezone.html>
- MDN Temporal reference and browser availability: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal>
- IANA tzdb 2026c release announcement: <https://lists.iana.org/hyperkitty/list/tz@iana.org/thread/NVHSX2PAQIT44U5FCCEVNJJYXQMMTJSA/>
- IANA Time Zone Database: <https://www.iana.org/time-zones>

### Candidate package primary pages

- TimezoneComplete repository: <https://github.com/rogierschouten/timezonecomplete>
- TimezoneComplete package: <https://www.npmjs.com/package/timezonecomplete>
- `tzdata` package and included IANA version: <https://www.npmjs.com/package/tzdata>
- `temporal-polyfill` repository: <https://github.com/fullcalendar/temporal-polyfill>
- `temporal-polyfill` package: <https://www.npmjs.com/package/temporal-polyfill>
- TC39 Temporal polyfill repository: <https://github.com/js-temporal/temporal-polyfill>
- TC39 Temporal polyfill package: <https://www.npmjs.com/package/@js-temporal/polyfill>
- Luxon repository: <https://github.com/moment/luxon>
- Luxon package: <https://www.npmjs.com/package/luxon>
- `@date-fns/tz` repository: <https://github.com/date-fns/tz>
- `@date-fns/tz` package: <https://www.npmjs.com/package/@date-fns/tz>
- Moment Timezone repository/releases: <https://github.com/moment/moment-timezone/releases>
- Moment Timezone package and maintenance notice: <https://www.npmjs.com/package/moment-timezone>
- `ical-generator` repository: <https://github.com/sebbo2002/ical-generator>
- `ical-generator` package: <https://www.npmjs.com/package/ical-generator>
- `@touch4it/ical-timezones` package: <https://www.npmjs.com/package/@touch4it/ical-timezones>

## Completion boundary

This document is the complete Phase 6A4A output. It recommends one conversion strategy, justifies omission of `VTIMEZONE`, defines timezone UX and every required event/error policy, records the Morocco failure and dependency decision, and limits interoperability claims. It does not authorize or contain application implementation.
