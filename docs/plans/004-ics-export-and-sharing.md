# Plan 004 — ICS export and sharing

**Status:** Complete
**Scope:** Phase 3A only

## Objective

Add explicit controls that copy the canonical V1 schedule URL and download the currently visible month as a standards-compliant, all-day iCalendar file. Keep schedule calculation in the existing domain, ICS serialization pure and deterministic, and browser clipboard/download effects inside the existing client graph.

## Existing architecture observations

- `ScheduleGenerator` is the single client boundary and already owns validated generated state, canonical URL history, focus, and live-region feedback.
- `MonthlyCalendarView` contains the exact ordered occurrences for the visible month, so export can consume it without recalculating a cycle.
- The public domain API provides canonical V1 serialization plus timezone-independent `addCalendarDays`, including leap, month, and year boundaries.
- `MonthlyCalendar` already places the heading, summary, navigation, and calendar in one accessible result region; result actions belong between the summary and grid.
- Runtime dependencies are intentionally small. Native TypeScript, `Blob`, object URLs, and the Clipboard API cover this phase, so no production dependency is planned.
- Vitest/jsdom and Playwright already cover URL restoration, month navigation, accessibility, and responsive overflow.
- The supplied workspace is not recognized as a Git worktree, so status/diff commands cannot currently provide preservation evidence. Files will be scoped manually.
- The installed Next.js package does not contain the `node_modules/next/dist/docs/` directory referenced by `AGENTS.md`. No route or framework API change is required for this feature.

## Export use cases

- Export exactly the generated month currently shown, including Day, Night, and Off occurrences.
- Import one all-day event per occurrence into common RFC 5545 calendar clients.
- Keep output local: no endpoint, upload, persistence, external service, or automatic download.
- Produce deterministic content when occurrences, configuration, month, and injected timestamp are identical.

## ICS representation decisions

- Emit `VCALENDAR` version 2.0 with stable `PRODID`, Gregorian scale, publish method, and a calendar name.
- Emit one `VEVENT` per supplied occurrence in the supplied ascending order.
- Use date-only `DTSTART` and exclusive next-calendar-date `DTEND`; call the domain's `addCalendarDays` rather than JavaScript `Date` arithmetic.
- Summaries are exactly `Day Shift`, `Night Shift`, and `Off Day`.
- Descriptions contain concise application-controlled visible-month context.
- Require an injected basic UTC timestamp (`YYYYMMDDTHHMMSSZ`) for `DTSTAMP`.
- Escape backslash, comma, semicolon, CR, LF, and CRLF in every ICS text value. Fold content lines by UTF-8 octets at 75 bytes with RFC continuation whitespace.
- Emit CRLF between every line and after the closing calendar line.
- Return typed controlled failures for an invalid timestamp, empty input, duplicate or unordered dates, dates outside the requested month, and a next-date overflow.

## Domain versus presentation boundaries

- `src/features/schedule/domain` remains unchanged and owns schedule/date calculation only.
- A new framework-independent `export` layer imports the public domain API, validates export invariants, escapes/folds ICS content, and returns content metadata.
- The exporter consumes the already generated occurrences; it never resolves a pattern or expands a range.
- A browser-only download helper owns `Blob`, `document`, temporary anchors, and object URL creation/revocation.
- A nested action component inside the existing client graph owns clipboard interaction, temporary status, manual-copy fallback, and download activation.

## Filename strategy

Use `shift-calendar-YYYY-MM.ics`, derived only from validated `ISOYearMonth`. It is lowercase, space-free, predictable, and contains no user-controlled path characters. MIME type is exactly `text/calendar;charset=utf-8`.

## Event identity strategy

Canonical V1 configuration state without `m` is the configuration identity. Each UID is `sc-<configuration-hash>-<YYYYMMDD>-<shift>@shift-calendar.invalid`, where the stable application-local hash avoids embedding the raw query and the explicit date/shift prevents occurrence reuse. The reserved `.invalid` domain is intentional until a production domain is configured. Identical configuration/occurrence input yields the same UID; dates yield different UIDs. No random value, secret, hostname, or full URL is included.

## Share-link behavior

- Show `Copy schedule link` only with a validated generated result.
- Re-run the existing V1 serializer with the current visible `m`, then combine that canonical query with `window.location.origin` and `window.location.pathname`.
- Exclude unrelated parameters and fragments; do not create a second schema.
- On success, announce a short-lived confirmation. On failure, announce that manual copying is available.

## Clipboard fallback

If `navigator.clipboard.writeText` is absent or rejects, display a visibly labelled read-only input containing the canonical URL and instructions to copy it manually. Select its contents when practical. Do not use `document.execCommand`.

## Accessibility behavior

- Use real text-labelled buttons with existing focus and touch-target styles.
- Place actions near the generated result summary without displacing the primary Generate action.
- Reserve a compact status region and use a polite live region for copy/download success or failure.
- Keep error meaning in text, not color, and do not move focus after success.
- Give the fallback field a visible label and make its full value selectable.
- Keep controls wrapping and full-width where useful on narrow screens; preserve the existing no-overflow contract.

## Security considerations

- Accept only validated configuration/month/occurrences from existing APIs.
- Escape all ICS text and fold only after escaping; raw CR/LF cannot create injected properties.
- Generate links only from canonical validated state and the current clean origin/path.
- Transmit no schedule data externally and add no analytics, cookies, remote storage, or secrets.
- Create one object URL per user download and always revoke it in `finally`.
- Do not expose raw exceptions or local filesystem paths in UI or exported metadata.

## Files to create

- `src/features/schedule/export/ics-types.ts`
- `src/features/schedule/export/ics-escape.ts`
- `src/features/schedule/export/ics-serializer.ts`
- `src/features/schedule/export/ics-download.ts`
- `src/features/schedule/export/index.ts`
- `src/features/schedule/components/schedule-actions.tsx`
- `tests/unit/schedule/ics-serializer.test.ts`
- `tests/unit/schedule/ics-download.test.ts`

## Files to modify

- `src/features/schedule/components/monthly-calendar.tsx`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- This plan at completion

## Test matrix

### Unit — pure ICS

- Calendar envelope, required properties, CRLF-only output, and terminal CRLF
- One event per occurrence and preserved ascending order
- Empty, duplicate, unordered, out-of-month, invalid timestamp, and date-overflow failures
- `YYYYMMDD` conversion and exclusive next date at ordinary, month, year, leap-day, and DST-adjacent boundaries
- Exact Day/Night/Off summaries and injected `DTSTAMP`
- Deterministic content/UIDs, stable same-event UID, and different-date UID
- Backslash, comma, semicolon, CR/LF escaping and UTF-8-aware line folding
- Safe visible-month filename, `.ics` extension, and exact MIME type

### Unit/component — browser actions

- Actions absent before generation and present afterward
- Copy uses the canonical URL and current visible month
- Success announcement expires; clipboard rejection/absence shows a usable manual field
- Download creates the expected typed Blob, filename, and one temporary object URL, then revokes it
- Download content represents the navigated visible month
- Invalid shared state renders no actions

### End to end

- Generate, navigate, copy, observe accessible feedback, restore the copied canonical URL, and confirm month/configuration
- Force clipboard rejection and verify canonical manual fallback
- Capture a download and assert filename, calendar/event envelopes, representative summaries, visible-month dates, and no out-of-range event
- At a phone viewport, verify wrapped actions/fallback, keyboard/touch availability, and no horizontal overflow

## Explicit non-goals

No yearly view/export, arbitrary range, print/PDF/image output, recurring events, exact times, timezone conversion, Google/Apple APIs, OAuth, native share action, accounts, saved schedules, database, authentication, analytics, ads, localization, new presets, notifications, email/social sharing, or Phase 3B work.

## Acceptance criteria

- Actions exist only for validated generated/restored state.
- Copy emits only the canonical V1 link with the current visible month and reports success/failure accessibly.
- Clipboard failure exposes a labelled, usable manual-copy URL.
- Download emits the visible month as one all-day event per occurrence with exclusive next-date ends, stable UIDs, injected valid timestamps, escaped/folded text, CRLF, safe filename, and correct MIME type.
- Object URLs are always revoked and no schedule data leaves the device.
- Keyboard, focus, reduced-motion, and phone-width behavior remain usable.
- Existing and new unit/component/E2E suites, static checks, and production build pass.
- Documentation matches the implementation and no dependency or Phase 3B scope is added.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
rg 'from ["''](react|next)|window|document|navigator|Blob|URL\.createObjectURL' src/features/schedule/export/ics-{escape,serializer,types}.ts
npm ls --depth=0
git status --short
```

## Completion record

Completed on 2026-09-16.

### Actual files created

- `src/features/schedule/export/ics-types.ts`
- `src/features/schedule/export/ics-escape.ts`
- `src/features/schedule/export/ics-serializer.ts`
- `src/features/schedule/export/ics-download.ts`
- `src/features/schedule/export/index.ts`
- `src/features/schedule/components/schedule-actions.tsx`
- `tests/unit/schedule/ics-serializer.test.ts`
- `tests/unit/schedule/ics-download.test.ts`
- `docs/plans/004-ics-export-and-sharing.md`

### Actual files modified

- `src/features/schedule/components/monthly-calendar.tsx`
- `tests/unit/schedule/schedule-generator.test.tsx`
- `tests/e2e/homepage.spec.ts`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN.md`
- `docs/UI-UX.md`
- `docs/SEO.md`
- `docs/TESTING.md`
- `docs/SECURITY.md`
- `docs/DECISIONS.md`
- `docs/ROADMAP.md`
- This plan

No package manifest or lockfile was changed.

### Deviations and environment notes

- The implementation followed the planned architecture. No export dependency, native-share action, off-day exclusion option, or Phase 3B feature was added.
- The fallback field selects its full contents after rendering and again on focus. It does not forcibly move focus, avoiding unnecessary focus changes while keeping manual copying practical.
- `AGENTS.md` requested installed Next.js guidance from `node_modules/next/dist/docs/`, but that directory was absent before and after dependency restoration. No route, navigation, or new framework API was needed.
- The workspace path was not a Git worktree, so `git status`, `git diff`, and whitespace diff checks could not run. Scope was reviewed by explicit file inventory and the implementation touched only the files recorded above.
- The host exposed Node 22.17.1 while the repository declares Node 24. Dependency installation warned about that engine mismatch. All requested application checks nevertheless ran successfully on the available runtime; deployment should still use the documented Node 24 baseline.
- Playwright Chromium was initially missing. The locked Chromium 1243 and headless-shell 1243 binaries were installed, after which the full browser suite passed.

### Final ICS policy

- Export only the currently visible validated month.
- Include Day, Night, and Off occurrences by default with summaries `Day Shift`, `Night Shift`, and `Off Day`.
- Represent every occurrence as an all-day event with date-only start and exclusive next-calendar-date end.
- Generate the end date through the Phase 2A domain utility; never use local `Date` arithmetic for schedule dates.
- Serialize required RFC 5545 calendar/event envelopes with CRLF and a terminal CRLF.
- Escape backslash, comma, semicolon, CR, LF, and CRLF, then fold content lines without splitting UTF-8 code points.
- Reject empty, duplicate, descending, out-of-month, invalid-timestamp, invalid-configuration, and unrepresentable next-date inputs with typed failures.

### UID and timestamp policy

UID format is `sc-<16-hex configuration hash>-<YYYYMMDD>-<shift>@shift-calendar.invalid`. The hash is derived from canonical V1 configuration serialization without `m`; the explicit date and shift distinguish occurrences. It contains no random data, secret, raw full URL, configured host, or filesystem path. `DTSTAMP` is an injected basic UTC value; the UI supplies the activation time and tests supply a fixed value.

### Clipboard and download behavior

`Copy schedule link` serializes validated configuration with the current visible month, then combines it with the current origin/path only. Successful and failed actions are announced in a temporary polite status region. Missing or rejected clipboard access reveals a visibly labelled read-only canonical URL and manual-copy instructions; deprecated `execCommand` is not used.

`Download calendar file` passes the existing visible-month occurrences to the pure serializer, creates a `text/calendar;charset=utf-8` Blob, triggers `shift-calendar-YYYY-MM.ics` from one temporary anchor, removes the anchor, and revokes the object URL in `finally`. No schedule data is transmitted or stored remotely.

### Test results

- `npm run format` — passed.
- `npm run format:check` — passed; all matched files conform.
- `npm run lint` — passed with no errors or warnings after the final test correction.
- `npm run typecheck` — passed.
- `npm test` — 9 files and 130 tests passed. The original 110 tests remain green; 20 new pure-export/browser-action tests passed.
- `npm run test:e2e` — 11 Chromium tests passed in 16.0 seconds, including the three new copy/fallback/download journeys and expanded 390px fallback coverage.
- `npm run build` — passed; `/`, metadata routes, and the sitemap remained statically prerendered.
- Pure export boundary scan — no React/Next imports or browser globals in `ics-types.ts`, `ics-escape.ts`, or `ics-serializer.ts`.
- Schedule domain boundary scan — no React/Next imports or browser globals.
- Dependency review — no `package.json` or `package-lock.json` change and no calendar/export package added. `npm ls --depth=0` listed the locked direct dependencies plus several extraneous optional WASM transitive packages produced by installation on this host; none is declared by the project.
- Git review commands — unavailable because the supplied folder has no Git metadata.

### Remaining Phase 3B scope

Year view, yearly output decisions, and print layout/coverage remain Phase 3B. Arbitrary ranges, timed/time-zone events, recurrence, PDF/image export, direct provider integrations, accounts, persistence, analytics, ads, and all other stated non-goals remain unimplemented.
