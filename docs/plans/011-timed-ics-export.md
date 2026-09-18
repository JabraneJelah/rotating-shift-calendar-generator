# Plan 011 — Explicitly zoned timed work-calendar export

- **Status:** Complete
- **Phase:** 6A4
- **Architecture:** `docs/research/timed-ics-timezone-specification-2026-09.md`
- **Dependency spike:** `docs/research/timezone-dependency-spike-2026-09.md`

## Objective

Add a separate, explicit timed work-calendar ICS export for the active month or year. The user confirms an IANA timezone, every included effective working occurrence is resolved through pinned IANA 2026d data, DST gaps fail closed, overlaps require an explicit earlier/later choice, and the serializer emits exact UTC `DTSTART`/`DTEND` values. Existing all-day exports remain behaviorally and byte-for-byte isolated from the timed implementation.

## Existing all-day export architecture

- `ScheduleActions` synchronously calls the base or effective all-day serializer and then the existing Blob download helper.
- `generateICS` owns base Day/Night/Off export; `generateEffectiveICS` owns exception-aware all-day projection including Leave, Sick, Training, additional work, and Off.
- Both serializers preserve CRLF, terminal CRLF, UTF-8-aware 75-octet folding, escaping, injected UTC `DTSTAMP`, exclusive date `DTEND`, deterministic ordering, and existing UID namespaces.
- Existing download filenames are `shift-calendar-YYYY-MM.ics` and `shift-calendar-YYYY.ics`.
- Phase 6A4 will not change those serializers, filenames, actions, ranges, or tests.

## Approved timezone dependency architecture

Add exact production dependencies `timezonecomplete@5.15.1` and direct `tzdata@1.0.51`. Only one dynamically imported module may import them. It will use TimezoneComplete's public low-level `TzDatabase` API, never high-level local `DateTime` construction. No host `Intl`, runtime API, nested package data, fixed-offset, UTC, or browser-zone fallback is allowed.

## Explicit direct-tzdata initialization

- A module-level promise makes initialization idempotent and race-safe.
- The lazy runtime imports the direct `tzdata` payload and calls `TzDatabase.init(tzdata)` before exposing resolver functions.
- Initialization verifies `tzdata.version === "2026d"`, confirms the database supports `Africa/Casablanca`, and checks the post-transition sentinel offset.
- The adapter exposes the active IANA version for diagnostics/tests.
- Initialization failure is typed and retryable only by re-invoking the lazy module after a rejected promise has been cleared.
- No resolver operation is available before successful initialization.

## Lazy-loading boundary

`ScheduleActions` renders a small timed-export panel only after the explicit action is selected. That panel uses `import("../export/timed-export-runtime")`; the runtime statically owns TimezoneComplete, tzdata, projection, and serialization so Turbopack places them in an on-demand chunk. No broad export barrel will re-export runtime values. Existing all-day handlers remain synchronous and cannot load the timezone chunk.

## Resolver-adapter contract

The adapter accepts a validated `ISODate`, validated `LocalTime`, canonical supported timezone identifier, and optional `earlier`/`later` disambiguation. It returns one UTC instant and offset or a typed failure. The low-level algorithm faithfully follows the Phase 6A4B spike: collect candidate offsets at the center and both edges of a bounded ±18-hour window, derive candidate instants, round-trip them through `TzDatabase.totalOffset`, sort by epoch, and classify zero/one/two candidates. The three-point sampling is the production optimization of the spike's dense scan; the supported 1970–2038 boundary range is covered by transition fixtures and cannot contain two offset changes inside one 36-hour candidate window.

## Supported timed-export year range

- Minimum occurrence start: `1970-01-01`.
- Maximum occurrence start: `2037-12-31`.
- Month/year timed scopes therefore support years 1970–2037 inclusive.
- An overnight or explicit civil 24-hour occurrence beginning on `2037-12-31` may resolve its required exclusive end boundary on `2038-01-01`.
- The restriction applies only to timed export. Date-only generation, views, print, sharing, V1 URLs, and all-day exports retain years 1–9999.
- Unsupported timed scopes fail atomically with `UNSUPPORTED_TIMED_EXPORT_YEAR`; dates are never clamped or skipped.

## Timezone-list source

Use names supported by the explicitly initialized `TzDatabase`, restricted to rule-bearing canonical entries from the direct tzdata payload plus `UTC`. Do not use `Intl.supportedValuesOf` as the source. Show exact IANA identifiers, including `Africa/Casablanca`; reject abbreviations and unknown values. The selection exists only in component memory.

## Local civil date-time representation

Local boundaries remain `{ date: ISODate, time: LocalTime }`. Dates are parsed by existing date-only validation, times by Phase 6A2 validation, and next-day calculation by `addCalendarDays`. Code must not parse a timezone-free ISO string into `Date`, use browser-local getters/setters, or advance dates through local-time `Date` methods.

## Gap behavior

Zero candidates produce `NONEXISTENT_LOCAL_TIME` with safe occurrence, boundary, date, time, and timezone details. The complete export is rejected. The UI explains that clocks skip the selected local time and directs the user to change shift details or use all-day export.

## Overlap behavior

Two candidates produce `AMBIGUOUS_LOCAL_TIME` unless the request contains an explicit boundary choice. Candidates include sorted UTC instants and offsets. The UI preselects neither, groups earlier/later radios per boundary, supports an explicit apply-to-all action, reports the unresolved count, and keeps download disabled until resolved. Choices are keyed by timed event identity plus `start`/`end` and remain in memory only.

## Overnight behavior

Resolve start on the occurrence date. Advance the local end date first with pure calendar arithmetic, then resolve end independently in the same timezone. Validate `endUtc > startUtc`; never add nominal minutes to the resolved start. A fall transition may therefore produce a longer exact interval.

## Explicit 24-hour behavior

Resolve the configured start on the occurrence date and the same configured time on the following civil date. The exact interval may be 23, 24, or 25 hours. The UI/documentation distinguishes the nominal civil-day meaning from exact elapsed UTC time.

## Untimed-work validation

Every included `EffectiveWorkingOccurrence` must have validated time details. If any is untimed, return one atomic `UNTIMED_WORK_OCCURRENCES` error containing the count and safe date/label details. Do not serialize a partial file or mix all-day work into timed export.

## Timed projection rules

Pure projection consumes the active effective dates, base configuration identity, selected timezone, and per-boundary ambiguity choices. It includes generated Day/Night, replacement, timed Training, and additional work. It omits Off, Leave, Sick, and private notes. Each projected event carries stable logical identity, occurrence date, definition/category/origin, local boundaries, exact UTC boundaries, overnight/24-hour flags, and safe description text. Additional work remains a second event. Break duration does not change boundaries and may appear only as approved non-private description text.

## UTC serialization

Serialize `DTSTART:YYYYMMDDTHHMMSSZ` and exclusive `DTEND:...Z`; never emit `TZID`, `VTIMEZONE`, or floating values. Reuse existing escaping and folding helpers. Preserve CRLF, terminal CRLF, injected UTC `DTSTAMP`, deterministic ordering, `text/calendar;charset=utf-8`, and valid `VCALENDAR`/`VEVENT` structure.

## Timed UID policy

Use namespace `timed-v1`, distinct from every all-day UID. Identity combines base configuration hash, local occurrence date, primary/additional role, semantic origin, and definition identifier. It excludes time values, break, timezone, disambiguation choice, notes, and export scope, so month/year copies match and schedule-detail changes preserve UID. No `SEQUENCE` is added; import is not synchronization and duplicate behavior remains client-specific.

## Timezone-selection UX

Use a visible **Time zone** text input with a native datalist populated from initialized supported identifiers. It supports typing and native keyboard selection without implementing an incomplete ARIA combobox. No timezone is selected automatically. The exact typed value is validated before preparation. Browser detection is omitted rather than risk implicit selection. Copy explains that timed files are created locally and that all-day export remains available.

## Ambiguity-resolution UX

Display each affected event and boundary with shift name, civil date/time, timezone, and earlier/later UTC offset choices. Use `fieldset`/`legend` and real radios. Provide an explicit “Use this choice for all unresolved times” control while keeping each group overrideable. Cancel clears the panel and returns focus to the timed action.

## Download behavior

The active month uses effective month dates and filename `shift-calendar-YYYY-MM-timed.ics`; active year uses effective year dates and `shift-calendar-YYYY-timed.ics`. Validation completes before Blob creation. The existing helper guarantees URL revocation in `finally`; runtime and UI map thrown download failures to `TIMED_ICS_DOWNLOAD_FAILED` copy.

## Privacy boundaries

Timezone selection, ambiguity choices, definitions, effective occurrences, and generated ICS stay in browser memory. No server/API request, analytics schedule payload, provider credential, storage, URL field, or private note is introduced. The panel states: “Timed calendar files are created in your browser. Your schedule is not uploaded.”

## Accessibility strategy

- Real buttons, visible labels, native input/datalist, fieldsets, legends, and radios.
- On open, focus the timezone input after lazy initialization; on close, restore action focus.
- Loading and success use polite status; blocking errors use an error summary and focused heading only when disruptive.
- Escape/cancel behavior, no color-only meaning, 44px targets where practical, reduced-motion-compatible styling, and no formal WCAG claim.
- The calendar remains a semantic read-only table.

## Responsive behavior

The panel stacks at 320/390px, long identifiers wrap safely, and ambiguity cards use one-column mobile/two-column wider layouts. Existing action wrapping remains. Dialog/panel content is print-hidden. Verify 320, 390, 768, 1024, and 1440px with no document overflow or calendar regression.

## Interoperability strategy

Automated tests validate raw ICS and parse core content lines without adding a new parser dependency. Manual clients are recorded only where available as Verified, Failed, Not available, or Not tested. No compatibility claim is made for Google Calendar, Outlook, Apple Calendar, Thunderbird, or Android until actually imported.

## Bundle-budget verification

After production build, inspect emitted chunks and compressed sizes. Confirm TimezoneComplete/tzdata do not occur in the initial route or all-day path. Compare the lazy chunk with the spike baseline: 325,453 raw, 55,277 gzip, 46,400 Brotli bytes. A material unexplained increase blocks completion.

## Test matrix

- Initialization: success, idempotence, concurrency, 2026d report/mismatch, nested/Intl/network fallback absence.
- Resolver: UTC; Casablanca transition; London/Paris/New York normal/gap/overlap; non-DST and non-hour zones; earlier/later; host-zone independence.
- Range: January/year 1970; December/year 2037; pre-1970 and post-2037 rejection; 2037-12-31 overnight and 24-hour end in 2038; all-day outside range unchanged.
- Projection: same-day, overnight, 23/25-hour civil days, replacement, Training, additional work, omission of Off/Leave/Sick/notes, untimed/gap atomic failure, ambiguity collection, independent boundary choice, scope and immutability.
- Serializer/download: UTC values, no timezone components, folding/escaping/CRLF/order/DTSTAMP, namespace and UID stability, filenames/MIME/revocation/failure.
- Components: action, lazy state, no automatic zone, search/input validation, errors, choices/apply-all, month/year success, privacy copy, unchanged all-day/copy/print.
- Playwright: core monthly/yearly paths, lazy chunk timing, Casablanca, transition cases, omissions, keyboard use, 320px, print, and no external timezone request.

## Files to create

- `src/features/schedule/export/timed-export-types.ts`
- `src/features/schedule/export/timezone-adapter.ts`
- `src/features/schedule/export/timed-event-projection.ts`
- `src/features/schedule/export/timed-ics-serializer.ts`
- `src/features/schedule/export/timed-export-runtime.ts`
- `src/features/schedule/components/timed-export-panel.tsx`
- `src/types/tzdata.d.ts`
- focused unit/component tests for the adapter, projection, serializer, and UI

## Files to modify

- exact dependencies and lockfile
- `ScheduleActions` integration and effective-scope props
- repository documentation: README, Product, Domain, Architecture, UI/UX, SEO, Security, Testing, Decisions, Roadmap
- existing component/E2E tests only to add coverage, never weaken assertions

## Non-goals

No `VTIMEZONE`, floating/TZID events, provider integration/OAuth, automatic zone selection, host fallback, runtime data downloads, server conversion, mixed timed/all-day work, Off/Leave/Sick/notes in timed files, persistence, JSON backup, PWA, notifications, accounts, URL V2, new SEO route, or commit/push/deployment.

## Acceptance criteria

- All-day output and actions remain unchanged and work outside 1970–2037.
- Timed export is explicit, lazy, client-only, and limited by occurrence start to 1970–2037.
- Direct IANA 2026d initialization is mandatory and observable; nested 2026b cannot be selected.
- Normal, gap, overlap, overnight, 24-hour, boundary-year, omission, UID, privacy, accessibility, and responsive rules pass.
- Timezone packages are absent from the initial chunk and no runtime timezone request occurs.
- Documentation records the conservative range, law-change risk, update policy, and untested clients.

## Verification result

- Formatting, linting, type checking, all 307 unit/component tests, and all 42 Playwright tests pass.
- The 293-test schedule suite passes under `TZ=UTC`, `TZ=America/New_York`, and `TZ=Africa/Casablanca`.
- The production build statically prerenders the same routes. Direct tzdata is isolated from the initial `/` chunks in one lazy chunk: 331,913 raw, 57,524 gzip, and 47,895 Brotli bytes (level 11). The modest difference from the spike baseline is accounted for by the production runtime/adapter wrapper and remains within budget.
- Production dependency audit reports zero vulnerabilities.
- Automated browser coverage confirms the timed flow performs no external timezone request. Manual Google Calendar, Outlook, Apple Calendar, Thunderbird, and Android imports remain Not tested and are not claimed.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
TZ=UTC npm test -- tests/unit/schedule
TZ=America/New_York npm test -- tests/unit/schedule
TZ=Africa/Casablanca npm test -- tests/unit/schedule
npm run test:e2e
npm run build
npm audit --omit=dev
git diff --check
```

Also inspect dependency pins, static routes/sitemap, built initial/lazy chunks and gzip/Brotli sizes, absence of external timezone requests, V1/private-data boundaries, and 320–1440px overflow.
