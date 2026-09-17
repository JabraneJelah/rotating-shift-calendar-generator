# Advanced Personal Planner Specification

**Status:** Proposed for approval  
**Research date:** 2026-09  
**Target product:** Shift Calendar  
**Primary implementation phases:** 6A2, 6A3, 6A4, and 6B

## 1. Executive summary

Shift Calendar should evolve from a dependable rotating-pattern generator into a stronger personal shift planner without becoming workforce-management software. The recommended direction is additive: preserve the current date-only schedule engine, preset definitions, V1 URLs, month/year views, insights, and all-day iCalendar export, then place a private, local-first planning layer above them.

That layer should introduce:

- reusable personal shift definitions with names, short labels, semantic categories, accessible palette colors, and optional working times and unpaid breaks;
- date-specific replacements for leave, sickness, training, or a different shift;
- additive overtime/additional-work entries and private notes;
- effective month and year projections with exact, consistently defined counts and nominal scheduled-hour totals;
- a separate timed iCalendar export path, gated by an explicitly selected IANA time zone;
- versioned browser-local persistence in IndexedDB, plus validated JSON backup and restore;
- an installable offline-capable PWA only after persistence and recovery behavior are proven.

The core product boundary remains one person planning their own rotating schedule. Multi-employee rostering, availability collection, approvals, shift swaps, payroll, wages, timekeeping, compliance decisions, location tracking, and management dashboards are out of scope. This boundary is both a product advantage and a privacy safeguard.

The central architectural decision is to **not widen or replace the existing `ScheduleOccurrence` contract**. The current engine continues to answer the pure question, “What Day, Night, or Off occurrence does this configuration generate on this date?” An advanced planner aggregate resolves those occurrences to reusable definitions and applies local exceptions in a separate pure projection. This keeps all existing presets and shared links stable and makes every later capability optional.

## 2. Product opportunity and principles

This document formalizes the research, product decisions, domain contracts, UX requirements, and implementation sequence for an advanced personal planner. It is a specification, not implementation authorization.

The feature must follow these principles:

1. **The generated rotation remains the source of truth.** Advanced data decorates or overrides particular dates; it does not rewrite the cycle invisibly.
2. **Existing schedules keep their meaning.** A current preset, custom Day/Night/Off cycle, V1 link, or all-day export must produce the same dated categories after advanced features ship.
3. **Advanced planning stays optional.** A user who only wants a fast rotating calendar should not encounter setup friction, account prompts, or advanced terminology.
4. **Local-first means genuinely local.** No schedule, absence, note, or working-time data should leave the browser in the approved scope.
5. **Accuracy is named precisely.** Scheduled hours are nominal wall-clock planning totals, not payroll, legal working time, or DST-adjusted elapsed time.
6. **Accessibility is structural.** Meaning must never depend on color alone, controls must remain keyboard operable, and print/export output must preserve understandable labels.
7. **Complexity is introduced in layers.** Definitions, exceptions, timed export, persistence, and offline installation should be independently testable and reversible.

## 3. Competitor observations and evidence

### 3.1 Evidence labels

Claims in this section use three labels:

- **Directly observed:** behavior or documentation visible on a public first-party page.
- **Marketing claim:** capability described by a vendor but not exercised in an authenticated product flow.
- **Inference:** a product conclusion drawn from the cited evidence and Shift Calendar's current architecture.

No authenticated competitor accounts were created, and no paid flows were exercised. The findings therefore support product direction, not exact feature parity claims.

### 3.2 Closest generator and scheduling products

| Product     | Public evidence                                                                                                                                                                                                                                                                                                           | Relevant lesson                                                                                                                                                                                          | Evidence label                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| RotaPlanner | Its public pattern generator exposes custom shift types, colors, start/end times, Day/Evening/Night/Off concepts, full-year output, hours/pay fields, weekend treatment, and print/PDF-oriented output. Its broader employee-scheduling pages describe templates, sharing, leave, swaps, payroll, and holiday management. | Shift Calendar can match the personally useful definition/time concepts while refusing the manager, employee, payroll, and approval surface.                                                             | Generator behavior directly observed; broader suite capabilities are marketing claims.            |
| WhosOffice  | Public support material describes pattern codes with a name, code, times, and paid hours, including an overnight example. Its knowledge base describes colors, leave, events, overtime indicators, work/leave views, and print/export.                                                                                    | Short codes, overnight shifts, and visually distinct exceptions are established scheduling conventions. They still need more precise personal-planner semantics than a workforce suite normally exposes. | Directly observed public documentation; mobile manager capabilities are marketing claims.         |
| Taskade     | Its calendar documentation centers on project tasks and deadlines. Its HR material includes attendance concepts such as sick, vacation, and personal leave. Public AI-shift pages make broader scheduling claims.                                                                                                         | A flexible task calendar is not a substitute for a deterministic rotation engine. Shift Calendar should keep its specialist date-generation advantage and borrow only clear exception concepts.          | Calendar and HR documentation directly observed; broader AI staffing claims are marketing claims. |
| Smartsheet  | Public shift and work-schedule templates include start/end times, hours, breaks, rotation, absences, holidays, labor-cost calculations, and color-coded day/night/vacation cells.                                                                                                                                         | Spreadsheet flexibility is useful, but it places validation and consistency on the user. Shift Calendar should provide the useful inputs with domain validation and avoid cost/payroll scope.            | Directly observed public templates and descriptions.                                              |

### 3.3 Established personal shift-calendar patterns

| Product        | Public evidence                                                                                                                                                                                                                                                                            | Relevant lesson                                                                                                                                                                                | Evidence label                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| MyShiftPlanner | Public documentation describes custom shift names, display labels, colors, default times, per-date time changes, notes, multiple calendars, leave/training/sickness/overtime, actual start/end times, unpaid breaks, reporting, device-calendar synchronization, and account/cloud backup. | Users value fast reusable shifts, exceptions, notes, and reliable recovery. Shift Calendar can offer the planning subset locally without collecting actual attendance or requiring an account. | Directly observed public documentation; availability can vary by plan/platform. |
| ShiftMate      | Its app-store listing describes reusable color-coded shifts, start/end times, paid or unpaid breaks, notes, overnight/irregular/weekend work, and image/CSV/PDF export.                                                                                                                    | These are recognizable personal-planner expectations, but a store listing does not verify edge-case correctness.                                                                               | Marketing claim from the public store listing.                                  |

### 3.4 Positioning conclusion

The credible opportunity is not “more workforce management.” It is a **clearer, safer personal planner for repeating work**:

- deterministic rotation generation without an account;
- explainable definitions and exceptions;
- accessible month/year planning;
- exact nominal scheduled totals with honest completeness states;
- export that does not guess time zones;
- local backup and offline use without cloud collection.

This is functionally stronger than a basic pattern calendar while remaining much simpler and more private than team-rota products. It also avoids competing with spreadsheets on unlimited configurability or with manager platforms on staffing workflows.

## 4. Scope boundaries and existing-preset compatibility

### 4.1 Product boundary

The planner is for one worker managing their own calendar. It does not model employees, teams, coverage, assignments, approvals, swaps, pay, tax, legal compliance, monitoring, authentication, or server-side schedule storage. An IndexedDB store in a future phase is private browser storage, not a product database or cloud account.

### 4.2 Current baseline and compatibility contract

The current product has a small, valuable domain:

- `ShiftKind` is `day | night | off`.
- A `ScheduleOccurrence` has one ISO calendar date, one shift kind, and one cycle index.
- Schedule calculations use pure Gregorian date-only TypeScript rather than JavaScript `Date` or browser time zones.
- Six verified presets and a custom Day/Night/Off cycle feed the same schedule engine.
- Month and year projections count Day, Night, Off, and weekend working dates.
- Insights expose tomorrow's generated shift and the next generated working shift.
- iCalendar export is deterministic and all-day, including Off dates.
- the interface uses one deliberate client boundary around generator interaction and otherwise preserves semantic server-rendered structure.
- print output reuses the accessible schedule content rather than maintaining a separate hidden interpretation.

The following compatibility requirements are normative:

1. Existing presets and custom Day/Night/Off cycles MUST remain valid without times or advanced records.
2. The same V1 configuration MUST continue to generate the same `ScheduleOccurrence[]` for the same date range.
3. Existing V1 query parameters and canonical behavior MUST NOT acquire advanced meanings.
4. Existing all-day iCalendar export and its deterministic identifiers MUST remain available and unchanged for V1 schedules.
5. Adding a name, color, time, or exception MUST NOT mutate a preset sequence or its anchor math.
6. Advanced records MUST be removable so the unchanged generated schedule is immediately recoverable.
7. Preset cycle sequences MUST continue to have one source of truth; the advanced feature MUST NOT copy them into a second library.

## 5. Recommended domain architecture

### 5.1 Additive model

The advanced planner should be a separate aggregate whose projection consumes the existing engine output.

```ts
type AdvancedPlanner = {
  dataVersion: number;
  id: PlannerId;
  revision: number;
  name: string;
  base: PlannerBase;
  shiftDefinitions: ShiftDefinition[];
  exceptionsByDate: Record<IsoDate, DateException>;
  exportTimeZone?: IanaTimeZone;
};

type PlannerBase =
  | { kind: "legacy"; config: ScheduleConfig }
  | {
      kind: "definition-cycle";
      startDate: IsoDate;
      cycle: ShiftDefinitionId[];
    };
```

These names are illustrative, not a mandate for exact file names. The contract matters:

- `legacy` delegates to the existing schedule engine.
- a small adapter maps generated `day`, `night`, and `off` occurrences to reserved built-in definition IDs.
- `definition-cycle` supports a future custom cycle made from stable definition IDs.
- a pure effective-schedule projector applies date exceptions to the base projection.
- React receives already-computed view models and does not contain schedule math.

The current `ScheduleOccurrence` MUST remain unchanged in Phase 6A. Replacing `shift` with a polymorphic object, embedding notes or times in it, or allowing multiple occurrences directly in the old engine would break simple invariants and make existing URLs and tests harder to reason about.

### 5.2 Stable identity and revision

- Planner IDs and custom shift-definition IDs MUST be opaque, stable, locally generated identifiers.
- An ID MUST NOT be derived from a user-visible name; renaming must not break cycles, exceptions, or export identity.
- IDs SHOULD use an ASCII-safe bounded representation of 1–64 characters after generation/import validation.
- Each durable planner change increments an integer `revision`.
- Imported records retain IDs only when they do not conflict with the destination operation. “Import as new” MUST generate a new planner ID and remap internal references atomically.

### 5.3 Reserved built-ins

Every advanced planner exposes three reserved definitions:

- **Day** — working, semantic category `day`, no required time.
- **Night** — working, semantic category `night`, no required time.
- **Off** — non-working, no time and no break.

Their reserved IDs are application-owned and cannot be deleted or repurposed. User customization may change the display color and, for Day and Night, optional default working time and break. The semantic meaning remains stable. This preserves all presets even when a user never enters hours.

The initial release SHOULD allow at most **12 custom definitions in addition to the three built-ins**. The limit prevents unwieldy legends, unbounded imports, and inaccessible near-duplicate palettes while covering realistic personal schedules.

## 6. Proposed shift-definition model

### 6.1 Fields

```ts
type WorkingCategory = "day" | "evening" | "night" | "other";

type ShiftDefinition = {
  id: ShiftDefinitionId;
  name: string;
  shortLabel: string;
  category: WorkingCategory;
  colorToken: ShiftColorToken;
  time?: {
    start: LocalTime;
    end: LocalTime;
    endDayOffset: 0 | 1;
    unpaidBreakMinutes: number;
  };
  description?: string;
};
```

Off is a reserved non-working definition, not a `WorkingCategory`. The first implementation SHOULD NOT allow arbitrary custom non-working definitions. Leave and sickness have explicit exception semantics; treating them as decorative Off variants would corrupt absence counts.

### 6.2 Text validation

- `name`: required, Unicode-normalized to NFC, trimmed, 1–40 grapheme clusters.
- `shortLabel`: required, NFC and trimmed, 1–4 grapheme clusters.
- `description`: optional, trimmed, at most 160 grapheme clusters.
- control characters and bidi-control characters MUST be rejected.
- duplicate names or labels MUST be rejected after Unicode normalization, trimming, whitespace collapse, and locale-independent case folding.
- UI validation SHOULD show both the invalid field and an error summary; it must not rely only on a toast.

Grapheme-aware limits prevent an emoji or combined character from being cut into invalid display fragments. Imported text follows the same validation.

### 6.3 Color contract

The first release MUST use a curated `ShiftColorToken` palette rather than arbitrary hex input. Each token must be designed and tested for:

- light and dark foreground/background use where supported;
- print and grayscale differentiation;
- Windows forced-colors/high-contrast behavior;
- at least 4.5:1 contrast for normal text and 3:1 for meaningful non-text boundaries or indicators;
- distinguishability when common forms of color-vision deficiency are simulated.

Every occurrence also shows its text label or iconographic/status wording. Color MUST NOT be the only signal for shift type, absence, training, overtime, selection, or validation. Arbitrary colors are postponed until a safe contrast-correction contract exists.

## 7. Time representation and overnight calculation rules

### 7.1 Local-time representation

Times are local wall-clock values, stored independently from a date or time zone.

- Accepted syntax is strict 24-hour `HH:mm` using ASCII digits.
- Valid values range from `00:00` through `23:59`.
- Start and end MUST either both be absent or both be present.
- Domain calculations SHOULD convert them to integer minutes after local midnight.
- Locale-specific display may be added at the UI boundary; the stored value and validation remain unambiguous.

### 7.2 Same-day, overnight, and 24-hour rules

Given `startMinutes` and `endMinutes`:

- if end is later than start, `endDayOffset` is `0`;
- if end is earlier than start, `endDayOffset` is `1` and the shift is overnight;
- if end equals start, the input is ambiguous and MUST be rejected unless the user explicitly selects “24-hour shift,” which stores `endDayOffset: 1`.

The UI must never silently interpret equal times as either zero hours or 24 hours.

```text
grossMinutes = endMinutes + (1,440 × endDayOffset) − startMinutes
netMinutes   = grossMinutes − unpaidBreakMinutes
```

`grossMinutes` MUST be from 1 through 1,440. `unpaidBreakMinutes` MUST be an integer from 0 through the lesser of 720 and `grossMinutes - 1`. A shift therefore always has at least one scheduled net minute. Off has neither time nor break.

An overnight occurrence belongs to its **starting calendar date**. Its end date is the following Gregorian date. If that date cannot be represented at the supported upper boundary, timed resolution/export fails explicitly for that occurrence; the underlying all-day generated schedule remains usable.

### 7.3 DST and nominal hours

The repeating engine remains free of time zones and JavaScript `Date`. Its hour totals are **nominal local wall-clock totals**:

- 22:00–06:00 is eight nominal hours every time it appears.
- a spring-forward or fall-back transition does not change that planning total.
- the total is not an assertion of elapsed instant duration, pay, or legal working time.

Accurate elapsed duration across DST would require an IANA zone, conversion to instants, and explicit policies for nonexistent and repeated local times. That concern belongs to a later zoned export/resolution layer, not the rotation engine. The UI and exports MUST label totals as “scheduled” or “planned” hours and disclose the nominal calculation.

## 8. Manual-exception model and restoration

### 8.1 Effective-day structure

Each date may contain:

- zero or one **primary replacement**;
- zero or one **additional-work/overtime occurrence** in the first release;
- zero or one **personal note**.

The effective projection is applied in this order:

```text
generated base occurrence
→ primary replacement, if any
→ additional work, if any
→ annotation, if any
```

This yields deterministic behavior without making the base schedule mutable.

### 8.2 Required exception semantics

| User action                    | Domain meaning                                                                                 | Counts and hours                                                                                                                     | Calendar / print / ICS                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Replace generated shift        | Primary replacement with another working definition or Off                                     | Replacement is used instead of the generated occurrence for every effective statistic.                                               | Shows replacement plus an override marker; exported instead of the base item.              |
| Mark leave                     | Primary absence replacement, distinct from Off                                                 | Zero scheduled work hours; increments leave-date count. If base was Off, displaced hours are zero but the leave date still exists.   | Clear leave label in calendar/print; all-day leave event may be exported.                  |
| Mark sick                      | Primary absence replacement, distinct from Off and leave                                       | Zero scheduled work hours; increments sick-date count.                                                                               | Clear sick label in calendar/print; all-day sick event may be exported.                    |
| Mark training                  | Primary working replacement                                                                    | Increments training occurrences and working-date measures. Uses its configured time when present. It is not counted as Day or Night. | Training label and time; timed when complete, otherwise follows export completeness rules. |
| Add overtime / additional work | Additive working occurrence; base remains                                                      | Included in working occurrences, hours, weekend work, and next-working information. Overtime hours are reported separately.          | Visually secondary but explicit; exported as a separate event.                             |
| Add personal note              | Annotation only                                                                                | No effect on counts, hours, or next-working results.                                                                                 | Indicator and accessible detail in-app. Excluded from print and ICS by default.            |
| Restore generated schedule     | Command that deletes the date's replacement, addition, and/or note after a scoped confirmation | Recomputed entirely from the unchanged base.                                                                                         | Generated occurrence returns immediately.                                                  |

“Restore generated” MUST NOT be stored as a new exception. The user may remove one layer or clear all advanced data for a selected date. A separate “Clear all exceptions” action may exist only at planner scope with a destructive-action confirmation that states what will remain.

The term **additional work** SHOULD be primary in explanatory copy; “overtime” may be an optional familiar label. The product makes no claim that an entry qualifies for overtime compensation.

## 9. Statistics definitions and calendar attribution

### 9.1 Attribution rules

All occurrence counts and scheduled minutes are attributed to the occurrence's **start date**. An overnight shift is not divided at midnight, month end, or year end. An additional-work occurrence follows the same rule.

This choice is predictable, inexpensive, and consistent with a schedule cell. If a future payroll product needs minute allocation by civil day, it would be a separate projection and is outside this product.

### 9.2 Definitions

For a selected month or year:

- **Working dates:** unique start dates containing at least one effective working primary occurrence or additional-work occurrence.
- **Day shifts:** effective working occurrences whose definition category is `day`.
- **Evening shifts:** effective working occurrences whose definition category is `evening`.
- **Night shifts:** effective working occurrences whose definition category is `night`.
- **Other shifts:** effective working occurrences whose definition category is `other`, excluding the separately named training measure.
- **Training shifts:** effective primary training occurrences.
- **Overnight shifts:** included timed working occurrences with `endDayOffset: 1`.
- **Weekend working dates:** unique Saturday or Sunday start dates containing at least one effective working occurrence.
- **Leave dates:** primary leave replacements in range.
- **Sick dates:** primary sick replacements in range.
- **Gross scheduled minutes:** sum of gross minutes for all included timed working occurrences.
- **Unpaid break minutes:** sum of their configured unpaid breaks.
- **Net scheduled minutes:** gross scheduled minutes minus unpaid break minutes.
- **Additional-work minutes:** sum of net minutes for included timed additive occurrences.

Day, evening, night, other, and training are occurrence counts and may exceed working dates when a date has additional work. Off remains a date/primary-status concept and is not an absence.

### 9.3 Incomplete-time state

If even one included working occurrence has no time, a complete hour total is unavailable. The UI MUST NOT present the sum of known timed occurrences as the total. It may show:

> Known scheduled time: 96 h 30 min · 3 working shifts have no time

That result must be visibly labelled a subtotal. The complete result becomes available only when every included working occurrence has a valid time. The same completeness rule applies independently to additional-work hours.

Minutes are the source of truth. Display uses whole units such as `96 h 30 min`, with an accessible name such as “96 hours 30 minutes.” Decimal-hour rounding is not used in primary totals.

Every totals panel and exported summary must disclose:

> Scheduled-hour totals use nominal local clock times. They are planning estimates, not payroll, timecard, legal-rest, or DST-adjusted elapsed-hour calculations.

## 10. Next-shift information

The current simple insights remain available. An advanced planner adds an effective projection with:

- tomorrow's effective primary status, including absence or training;
- the next effective working occurrence, including training and additional work;
- its shift name, start and end times when known, and “ends next day” when overnight;
- a clear no-result state when the projection horizon contains no work.

When multiple effective working occurrences begin on the same date, order them by primary before additive, then by known start time, then stable definition/exception ID. Untimed occurrences sort after timed occurrences within the same role. A real-time countdown, notification, or alarm is outside the approved scope.

## 11. iCalendar strategy

### 11.1 Options considered

| Strategy                                          | Benefit                                                                                                      | Risk                                                                                                                                              | Decision                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Floating local times (`DATE-TIME` without `TZID`) | Simple; preserves displayed clock values when viewed in different zones.                                     | RFC 5545 defines them as floating, so they follow the viewer's current zone and are unsuitable when a shift is tied to a workplace zone.          | Not the default for timed shift export.           |
| UTC timestamps                                    | Fixed instant and broad client support.                                                                      | Converting correctly requires a source time zone; guessing the browser zone can change workplace intent, especially when traveling or across DST. | Do not generate without explicit zone resolution. |
| IANA `TZID` plus matching `VTIMEZONE`             | Best representation of a shift tied to a real local zone; preserves local intent across DST-capable clients. | More implementation and compatibility work; requires bounded transition generation and careful ambiguous/nonexistent-time handling.               | Recommended for Phase 6A4.                        |

### 11.2 Selected contract

Timed export MUST require an explicitly chosen planner-level IANA time-zone identifier. The application MUST NOT silently use the browser's current zone. The timed serializer emits local `DTSTART;TZID=…` and `DTEND;TZID=…` values and includes the corresponding `VTIMEZONE` data needed for the exported range.

The time-zone layer remains outside the repeating engine. Nominal in-app totals remain wall-clock totals even when a zone is selected. Export implementation must define and test policies for DST gaps and folds before Phase 6A4 is approved; it must surface an error rather than silently moving an invalid local time.

Other requirements:

1. The current all-day export remains available for every schedule.
2. In a timed export, a working event's `DTEND` represents its gross span. Its description may identify the unpaid break; the event is not split around the break.
3. Overnight `DTEND` uses the next calendar date.
4. Off, leave, and sick statuses may remain all-day entries in a timed calendar.
5. Working, training, and additional-work entries are timed only when their definitions are complete.
6. If any working occurrence in the requested range lacks a time, the application offers all-day export or identifies the incomplete definitions. It MUST NOT silently mix all-day and timed work entries as though they had equivalent precision.
7. Personal notes are excluded. A future opt-in note export requires a separate privacy decision.
8. Both month and year ranges remain supported.

### 11.3 Identity, updates, and duplicate imports

- Existing V1 event UIDs remain unchanged.
- Advanced UIDs derive from a stable planner identifier, occurrence start date, role (`primary` or `additional`), and stable logical exception/definition identity. They MUST NOT expose a raw planner name, note, or shift label.
- Renaming a definition should preserve an otherwise identical logical event UID.
- Planner revision may populate iCalendar `SEQUENCE` after compatibility testing.
- Replacing a shift must not leave both the generated and replacement event in one advanced export.
- The interface must warn that importing the same file repeatedly can create duplicates because calendar clients differ in UID update handling.

The timed serializer should be a separate module sharing only safe escaping and calendar primitives with the current all-day serializer. Phase 6A4 must include interoperability checks in at least Google Calendar, Apple Calendar, and Outlook before release.

## 12. Local-storage and backup strategy

### 12.1 Options considered

| Option             | Strengths                                                                          | Weaknesses                                                                                            | Decision                                       |
| ------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| URL only           | Transparent, linkable, no hidden local database.                                   | Length, privacy, history/referrer exposure, fragile encoding, poor fit for notes and many exceptions. | Retain for simple V1 base configurations only. |
| `localStorage`     | Widely available and easy for small strings.                                       | Synchronous main-thread API, string-only model, limited quota, awkward atomic migrations.             | Not the primary planner store.                 |
| IndexedDB          | Asynchronous, structured, transactional, suitable for multiple versioned planners. | Requires explicit migrations, error/recovery UI, and careful client hydration.                        | Recommended primary store for Phase 6B.        |
| JSON backup/import | Portable, inspectable, independent of browser eviction.                            | User-managed, unencrypted file; import is an untrusted-data boundary.                                 | Required companion to IndexedDB.               |

Browser storage is normally best-effort and may be evicted; private browsing storage may disappear when the session ends. Therefore “saved locally” must never be described as a guaranteed backup.

### 12.2 Local storage contract

- Use one versioned IndexedDB database for planners and app-owned planner metadata.
- Do not split authoritative planner state between IndexedDB and `localStorage`.
- A lightweight, non-sensitive presentation preference may use another browser mechanism only when it cannot create state disagreement.
- Initial product limits SHOULD be 20 saved planners, 12 custom definitions per planner, one primary/additional/note record per date, and a 500-grapheme note limit.
- All server-rendered pages must have an honest loading state until client-local data is available. Server HTML must not pretend to know a user's saved schedule.
- Explicit empty, unavailable-storage, corrupt-record, migration-failed, and recovery states are required.

### 12.3 JSON backup and restore

The backup envelope includes a format identifier, export timestamp, schema version, and an array of planner records. Import MUST:

- treat the file as untrusted data;
- enforce a 5 MiB initial file-size limit before parsing;
- accept JSON only, never executable content or HTML;
- reject unsupported newer versions with an actionable message;
- validate every key, string, number, date, ID, limit, and cross-reference;
- reject prototype-pollution keys and unknown structural variants;
- show a preview of planner names and counts before writing;
- commit all accepted changes atomically or write nothing;
- default to “Import as new,” generating planner IDs and resolving internal ID conflicts;
- offer replacement only as a separately confirmed operation.

Downloaded JSON and ICS files are not encrypted. The export UI must warn that anyone with the file may read schedule, absence, and time information. Notes are included in a full JSON backup because fidelity is its purpose; this must be explicit before download.

### 12.4 Clear local data

“Clear all local planner data” requires a typed or otherwise strong confirmation that names the number of planners and makes clear that the action cannot delete previously downloaded JSON/ICS files. It removes the IndexedDB database and app-owned local preferences. Service-worker caches contain only application assets and may be cleared separately; they MUST NOT contain planner records.

## 13. URL-versioning and sharing recommendation

### 13.1 Options considered

| Strategy                                 | Result                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extend V1 parameters                     | Rejected. It risks changing stable semantics and exposes sensitive detail.                                                                                                             |
| Introduce readable V2                    | Architecturally possible, but postponed until there is demonstrated demand for high-fidelity sharing and a privacy/security review.                                                    |
| Compressed opaque planner payload in URL | Rejected for the planned phases. It is hard to inspect, can exceed practical limits, leaks through browser history and referrers, and creates permanent decoder/migration obligations. |
| Advanced data local only; share base V1  | Recommended. It preserves current contracts and privacy while JSON backup provides full-fidelity transfer.                                                                             |

For an advanced planner based on a V1-compatible rotation, “Copy link” shares only the base rotation and must say before copying:

> This link includes the repeating schedule only. Shift times, exceptions, leave, sickness, overtime, and notes stay on this device.

A definition-based cycle that cannot be represented in V1 has no share-link action in the initial advanced release. It can be transferred through JSON backup. Advanced values must not enter canonical URLs, analytics parameters, metadata, or server logs.

## 14. Primary user journeys

### 14.1 Continue using a simple rotation

1. Select a preset or create a Day/Night/Off cycle exactly as today.
2. Generate the calendar.
3. View month/year, print, copy a V1 link, or download all-day ICS.
4. Never open advanced options; no extra setup is required.

### 14.2 Add default Day and Night times

1. Open the collapsed “Advanced planner options” region after a schedule exists.
2. Edit the built-in Day or Night definition.
3. Enter start/end time and optional unpaid break.
4. Review the calculated nominal duration and overnight wording before saving.
5. Calendar dates retain exactly the same Day/Night/Off pattern while time labels and complete totals become available.

### 14.3 Build a named custom cycle

1. Create reusable working definitions from the curated palette.
2. Give each a name, short label, category, and optional time.
3. Arrange stable definitions into a repeating cycle with Off.
4. Choose the anchor/start date and preview the result.
5. Save locally in Phase 6B or use it ephemerally before persistence exists.

### 14.4 Override one date

1. Activate an explicit “Edit date” action associated with a calendar date.
2. Hear/see the generated occurrence and any current advanced layers.
3. Replace it with another shift, Off, leave, sick, or training; optionally add additional work or a note.
4. Review the effective result and totals delta.
5. Save; the cell shows both the effective status and an override indicator.

### 14.5 Restore the generated result

1. Open the same date editor.
2. Choose which replacement, additional work, or note to remove, or restore all advanced data for that date.
3. Confirm the resulting generated shift in the preview.
4. Delete the selected advanced record; do not write a compensating record.

### 14.6 Export

1. All users may export the existing all-day month or year calendar.
2. Timed export becomes available only when an IANA zone is selected and all working definitions in range have times.
3. Incomplete definitions are listed with repair links/actions.
4. The download confirmation states range, time zone, nominal-time limitation, included absence types, excluded notes, and duplicate-import warning.

## 15. UI architecture and accessibility strategy

### 15.1 Progressive disclosure

The basic form remains the primary route. Advanced capability begins in a collapsed, clearly labelled region after the base schedule configuration and may open a dedicated definition manager or date editor. Dense configuration controls must not be inserted into every calendar cell.

The existing semantic calendar table should remain a table. Do not convert it into an application `grid` merely to enable edits. Each editable date may expose a real button with an accessible name such as “Edit Tuesday 15 September, Day shift, 07:00 to 19:00.” A nearby agenda/detail region is preferable on small screens.

### 15.2 Definition editor

- Use visible labels, field descriptions, examples, inline errors, and a linked error summary.
- When end time is earlier than start, state “Ends next day” before save.
- When times match, require the explicit 24-hour choice.
- Preview name, short label, category wording, and color together.
- The palette control must expose token names and selected state to assistive technology.
- Destructive delete is disabled while a definition is referenced, or offers an explicit reference-replacement flow; it must not orphan cycle entries.

### 15.3 Date editor

A dialog or drawer may be used if focus is trapped correctly, Escape behavior is safe, background content is inert, and focus returns to the exact triggering date. On constrained screens it may become a dedicated in-page region. The generated base must always be visible beside the effective change so restoration is understandable.

### 15.4 Calendar and totals

- Cells announce date, effective status, times, next-day end, replacement/additional-work status, and note presence in a concise order.
- The full private note should not be repeated in every cell's accessible name.
- Leave, sick, training, and additional work use text or icons with accessible names as well as color.
- Touch targets SHOULD be at least 44 by 44 CSS pixels where layout permits.
- Visible focus, logical keyboard order, zoom/reflow to 400%, reduced motion, forced colors, and high-contrast themes must be tested.
- Totals use headings and definition-list/table semantics, not color-only tiles.
- A known-hours subtotal and missing-time count must be adjacent and programmatically associated.
- Status changes that do not move focus may use a polite live region; routine calendar regeneration should not announce hundreds of cells.

### 15.5 Print

Print uses the same effective projection as screen rendering. It includes visible textual legends and exception labels and does not depend on background colors printing. Personal notes are excluded by default. A future “include notes” option would need an explicit privacy warning and print-layout testing.

## 16. Privacy and security

Advanced planner data can reveal work location patterns, likely sleep periods, absences, sickness, and free time. Notes may be even more sensitive. The feature must therefore meet these requirements:

- no account, server persistence, synchronization, or background transmission in the approved phases;
- no analytics, ads, remote fonts/scripts, session replay, or third-party widgets on planner surfaces;
- advanced data never appears in URLs, canonical metadata, server-rendered HTML, referrers, or error-report payloads;
- user text is rendered as text, never raw HTML;
- a restrictive Content Security Policy and dependency review are prerequisites to storing sensitive local notes, because same-origin script can access IndexedDB;
- import validation uses bounded structures and atomic writes and never trusts object prototypes;
- JSON/ICS exports use safe file names and escaping and disclose their unencrypted nature;
- shared-device guidance explains that anyone using the same browser profile may see local planners;
- clear-data controls are discoverable and verified;
- network tests confirm that creating, editing, saving, viewing, printing, and backing up a planner cause no data requests.

Offline support must not blur this boundary. Service workers cache versioned application assets and navigational fallbacks only. Planner records stay in IndexedDB and must not be placed in the Cache API.

## 17. Performance implications and rendering constraints

For one month or year, the projection is small and should remain linear:

1. expand the base schedule once for the visible range;
2. resolve definitions through an ID map in constant expected time;
3. apply date exceptions through an ISO-date map;
4. derive calendar, insight, totals, print, and export views from the same effective occurrences.

Target complexity is `O(number of dates + exceptions in range)`, with no per-cell search through all definitions or exceptions. A year remains bounded at 366 dates plus a small number of additive occurrences.

Additional requirements:

- keep domain functions pure and memoizable;
- avoid recomputing the entire year for unrelated editor keystrokes;
- access IndexedDB asynchronously after hydration and avoid blocking initial content;
- lazy-load backup/import and future time-zone tooling when feasible;
- do not add a large time-zone dependency until Phase 6A4 has documented its browser support, bundle cost, transition-generation method, and maintenance status;
- measure Core Web Vitals and interaction latency on representative low-end mobile hardware;
- keep saved-planner limits bounded and paginate or virtualize only if evidence shows a need.

## 18. Migration risks, versioning, and recovery

The persisted envelope requires an integer `plannerDataVersion`. Migrations MUST be pure, sequential, deterministic transformations such as `v1 → v2 → v3`; skipping directly from an arbitrary old shape to the latest ad hoc shape is not allowed.

Migration flow:

1. read and validate the stored envelope;
2. copy the source record in memory;
3. run every required migration and validate the result;
4. write the migrated record and version in one IndexedDB transaction;
5. roll back on any failure;
6. preserve a recoverable export/delete route for a record that cannot migrate.

The application MUST NOT silently reset or discard corrupt or future-version data. It should quarantine the unreadable record from normal rendering, explain the problem without exposing sensitive contents in telemetry, and offer download of the raw local record where safe plus explicit deletion.

Reserved built-in IDs, definition-ID references, planner IDs, and revision behavior become durable contracts once Phase 6B ships. Backup import must apply the same migration code as local records and reject a newer version it cannot understand.

## 19. PWA and offline strategy

PWA work follows, rather than precedes, durable local persistence.

Phase 6B may add:

- a web app manifest with accurate name, icons, theme colors, display mode, and start URL;
- an install prompt/help surface that never blocks ordinary use;
- a service worker that precaches only the minimal application shell and safely updates versioned assets;
- an offline fallback that can load the generator and already-saved local planners;
- explicit “offline,” “update available,” and recovery states.

Offline acceptance tests must cover first visit versus repeat visit, an interrupted update, stale assets with a newer database schema, private browsing, storage denial, cache eviction, and clearing site data. The service worker must not cache third-party responses or user exports and must never be required for the core website to work online.

## 20. Recommended implementation phases

### Phase 6A2 — definitions and nominal time math

Deliver:

- reserved and custom shift-definition domain types;
- safe palette and validation;
- pure local-time, overnight, 24-hour, break, gross, and net calculations;
- legacy occurrence-to-definition adapter;
- optional default Day/Night times;
- definition-based custom-cycle model and preview if approved;
- UI behind progressive disclosure;
- no persistence, exceptions, or timed ICS.

Exit criteria include unchanged V1 fixtures, boundary/property tests for time math, accessibility checks, and production build verification.

### Phase 6A3 — exceptions and effective projections

Deliver:

- date exception model and pure overlay algorithm;
- replacement, leave, sick, training, additional work, note, and restoration flows;
- exact month/year statistics and incomplete-time states;
- effective next-working information;
- accessible calendar, legend, totals, and print changes;
- no server state and no timed ICS.

Exit criteria include precedence tests, weekend/start-date attribution, overnight month/year boundaries, restoration invariants, print verification, and keyboard/screen-reader checks.

### Phase 6A4 — zoned timed iCalendar export

Deliver:

- explicit IANA zone selection;
- bounded zone-transition resolution and `VTIMEZONE` generation;
- timed event serializer separate from existing all-day export;
- completeness and DST error handling;
- privacy/duplicate-import confirmation;
- cross-client fixtures and manual interoperability verification.

This phase requires a separate dependency decision. It must not guess a zone or ship an incomplete handcrafted DST table.

### Phase 6B — local saved planners, backup, and offline use

Recommended internal order:

1. IndexedDB repository, versioned schema, migrations, multiple schedules, rename/duplicate/delete, recent schedule, loading/error/recovery states.
2. Validated JSON backup/import, conflict handling, clear-all controls, and storage/privacy explanations.
3. Manifest, service worker, install/offline/update UX, and offline test matrix.

Persistence should not be merged until migration rollback and corrupt-record recovery are testable. PWA behavior should not be merged until it works with both the current and next expected database versions.

### Separate content phase

Useful guides for 2D2N4O, DuPont, and the ambiguous “7 on / 7 off” family should be planned separately after the generator contracts are stable. Guides must explain assumptions, anchor-date setup, fatigue limitations, and how to reproduce the pattern in the actual tool. They must not create a second preset truth or publish mass-produced search pages. “7/7” requires variants rather than one universal sequence.

## 21. Test and acceptance matrix

Each implementation plan must map its tests to the repository testing strategy. At minimum:

### Domain

- existing preset snapshots and V1 URL fixtures remain unchanged;
- definition normalization, duplicate detection, limits, reserved IDs, and referential integrity;
- all 1,440 possible local times at relevant boundaries;
- same-day, overnight, explicit 24-hour, and invalid equal-time cases;
- maximum/minimum break and at-least-one-net-minute invariant;
- leap day, month/year crossing, Sunday/Saturday, supported date bounds;
- exception precedence, additive work, restore-as-delete, and base immutability;
- start-date attribution and occurrence-count versus unique-date distinctions;
- complete, incomplete, and zero-work totals;
- deterministic next-working ordering.

Property-based tests are particularly valuable for “apply then remove exception restores the exact base projection” and “net minutes equals gross minus break for every valid timed definition.”

### UI and accessibility

- basic flow contains no new required interaction;
- definition and date editors by keyboard only;
- focus return, error summary, accessible names, live-region restraint;
- zoom/reflow, target size, forced colors, contrast, reduced motion;
- mobile month/year and dense exception labels;
- print preview with background graphics disabled;
- SSR/hydration with loading, empty, storage-disabled, corrupt, and offline states.

### Persistence and security

- interrupted and failed IndexedDB transactions;
- migration from every supported version and rejection of future versions;
- JSON size, nesting, unknown keys, invalid IDs/dates/times, duplicate IDs, broken references, and prototype keys;
- import-as-new remapping and replace confirmation;
- storage eviction/private-mode messaging;
- no planner data in network requests, URLs, cache entries, metadata, or logs;
- CSP and dependency audit.

### Calendar export

- current all-day snapshots remain byte-for-byte stable where currently promised;
- escaping, line folding, deterministic UIDs, replacement behavior, and sequence policy;
- same-day/overnight/end-of-month/end-of-year events;
- DST gap and fold cases in multiple IANA zones;
- missing-zone and incomplete-time failures;
- Google Calendar, Apple Calendar, and Outlook import/update/re-import checks.

### Quality gates

Before each implementation phase completes: formatting, linting, type checking, relevant unit/component/end-to-end tests, accessibility checks, and the production build must actually run. Performance and bundle changes must be recorded rather than assumed.

## 22. Approved, postponed, and rejected features

### Approved for the proposed roadmap

- existing presets and custom Day/Night/Off schedules without time entry;
- reusable personal definitions with stable IDs, semantic category, short label, safe palette, optional time, and unpaid break;
- nominal gross/net scheduled totals and honest incomplete states;
- replacement, leave, sickness, training, additional work, note, and restoration semantics;
- accessible effective month/year, print, totals, and next-working projections;
- existing all-day ICS plus a later explicitly zoned timed export;
- IndexedDB saved planners, versioned JSON backup/import, clear-local-data controls;
- installable/offline PWA after persistence is reliable.

### Postponed pending evidence or a later specification

- arbitrary custom colors;
- multiple additional-work entries or split shifts on one date;
- real-time countdowns, alarms, reminders, or notifications;
- arbitrary user-created event-marker categories beyond the specified exception set;
- actual clock-in/out, attendance history, or timecards;
- direct provider synchronization, OAuth, subscribed calendar feeds, and two-way updates;
- cloud sync, accounts, cross-device automatic synchronization, or encrypted backups;
- wages, pay rates, premiums, tax, costs, or payroll files;
- locations and commute data;
- high-fidelity advanced URL sharing or a V2 URL format;
- localized stored time formats beyond strict canonical `HH:mm`;
- full note inclusion in print or ICS;
- large-scale content-guide implementation.

### Rejected for this product direction

- multiple employees, teams, departments, job assignments, coverage, or staffing optimization;
- manager/admin dashboards, approvals, availability collection, or shift swaps;
- payroll calculation, wage compliance, labor-law advice, fatigue certification, or legal-rest enforcement;
- employee monitoring, geolocation tracking, biometrics, or surveillance;
- advertising/analytics-funded collection of planner data;
- mandatory accounts or server storage for core planner use;
- opaque compressed advanced state in public URLs;
- AI-generated schedules presented without deterministic rules and user-verifiable assumptions.

## 23. Open decisions requiring approval

The following recommendations should be explicitly approved in the next implementation plan:

1. Keep `ScheduleOccurrence` and the V1 engine unchanged; add a separate advanced aggregate and effective projector.
2. Reserve Day, Night, and Off definitions and permit at most 12 custom working definitions.
3. Use name 1–40, label 1–4, description 0–160, and note 0–500 grapheme limits.
4. Use only an accessible curated color palette in the initial release.
5. Reject equal start/end unless the user explicitly chooses a 24-hour shift; cap unpaid break at the lesser of 720 minutes and gross minus one minute.
6. Treat scheduled totals as nominal wall-clock minutes and attribute overnight work entirely to its start date.
7. Support one primary replacement, one additional-work entry, and one note per date initially.
8. Keep personal notes out of print and ICS by default.
9. Require an explicit IANA time zone and `VTIMEZONE` for timed ICS; never guess the browser zone.
10. Keep advanced data out of URLs and make Copy link share the base V1 schedule only.
11. Use IndexedDB as the authoritative local store, with a 20-planner initial limit and validated 5 MiB JSON import ceiling.
12. Sequence work as 6A2 definitions/time, 6A3 exceptions/statistics, 6A4 timed ICS, then 6B persistence/backup/PWA.
13. Treat pattern guides as a separate reviewed content phase backed by the same generator truth.

## 24. Direct source list

### Internal sources of truth

- `docs/PRODUCT.md`
- `docs/DOMAIN.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- completed implementation plans under `docs/plans/`
- the current domain, calendar, insights, iCalendar, print, and test implementations
- `docs/research/verified-rotating-shift-preset-library-2026-09.md`
- `docs/research/competitive-product-ui-ux-positioning-audit-2026-09.md`

### External primary/public sources

- [RotaPlanner employee schedule management features](https://www.rotaplanner.app/features/employee-schedule-management-software)
- [RotaPlanner shift-pattern generator](https://www.rotaplanner.app/shift-patterns/generator)
- [WhosOffice work-pattern support](https://www.whosoffice.com/support/work)
- [WhosOffice knowledge base](https://www.whosoffice.com/support/knowledgebase/)
- [WhosOffice mobile applications](https://www.whosoffice.com/features/mobile-applications)
- [Taskade calendar documentation](https://help.taskade.com/en/articles/8958375-taskade-calendar)
- [Taskade HR documentation](https://help.taskade.com/en/articles/8958679-taskade-for-hr)
- [Smartsheet shift-schedule templates](https://www.smartsheet.com/content/shift-schedule-templates)
- [Smartsheet work-schedule templates](https://www.smartsheet.com/free-work-schedule-templates-word-and-excel)
- [MyShiftPlanner downloads and product availability](https://myshiftplanner.com/download)
- [MyShiftPlanner frequently asked questions](https://myshiftplanner.com/faqs)
- [ShiftMate public Google Play listing](https://play.google.com/store/apps/details?id=com.kstore.shiftmate)
- [RFC 5545: Internet Calendaring and Scheduling Core Object Specification](https://www.rfc-editor.org/rfc/rfc5545.html)
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [W3C: Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [web.dev: Service workers](https://web.dev/learn/pwa/service-workers)
- [web.dev: PWA installation](https://web.dev/learn/pwa/installation)
- [Google Search: Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

## 25. Final recommendation

Proceed with Phase 6A2 only after the decisions in Section 23 are approved in an implementation plan. The strongest implementation is deliberately conservative: retain the proven date-only engine, introduce a small definition layer with exact nominal-time rules, then build exceptions, export, and persistence as independent projections and adapters.

This approach makes Shift Calendar materially more useful for an individual shift worker while keeping its best qualities intact: no account, understandable calculations, fast generation, accessible output, privacy, and a schedule the user can verify.
