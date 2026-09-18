# Plan 012 — Local planner persistence and validated backup/import

- **Status:** Complete
- **Phase:** 6B1B
- **Architecture:** `docs/research/local-persistence-and-backup-specification-2026-09.md`

## Verified current state

- The clean handoff is `f253076`; Phase 6A4 is committed at `15e1b52`.
- `ScheduleGenerator` is already the smallest client boundary that owns schedule form drafts, the last valid generated result, personal shift details, exceptions, week start, URL/history behavior, view navigation, statistics, insights, and actions.
- Raw form state is separate from `generated`. Failed schedule or planner validation does not replace `generated`, which gives persistence a reliable committed-state boundary.
- A generated result stores validated `ScheduleConfig`, a monthly view, and either a validated personal `ShiftDefinitionRegistry` or `null` for the default registry.
- The current timezone and overlap choices are local to `TimedExportPanel`. Phase 6B1B will lift only the explicit timezone; overlap choices remain panel-local.
- V1 parsing and serialization contain base schedule, view month, and week start only. Advanced private state is not URL-compatible.
- No persistence API, wrapper library, storage dependency, or state-management dependency exists.
- Current Playwright uses real Chromium, which is the approved IndexedDB integration environment.

## Approved decisions implemented

Implement native IndexedDB database `shift-calendar-local`, version 1, with one atomic planner aggregate per record; explicit first save followed by 750 ms autosave of committed state; strict runtime validation on reads/imports; UUID planner identity; monotonic revisions and optimistic checks; advisory private-data-free `BroadcastChannel`; clean-root last-opened restoration; V1 URL precedence; readable backup version 1; single/all export; atomic import-as-new; local-only privacy copy; and graceful unsaved fallback. PWA/offline work remains deferred.

## Exact persisted aggregate

The portable planner value is:

```ts
type PersistedPlannerV1 = {
  schemaVersion: 1;
  domainVersion: 1;
  id: string;
  revision: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  schedule: ScheduleConfig;
  weekStart: WeekStart;
  shiftDefinitions: ShiftDefinitionRegistry;
  exceptions: readonly DateException[];
  timeZone?: string;
};
```

The IndexedDB-only record adds derived `nameKey` for the unique name index. Backups omit `nameKey`. Default shift definitions are stored explicitly and restored to the existing `planner: null` optimization when equal to the trusted defaults.

## State classification

- **Authoritative:** record identity/name/versions/revision/timestamps, schedule configuration, week start, registry, exceptions/notes, explicit timezone.
- **Derived:** calendar views/occurrences, effective schedules, statistics, insights, nominal durations, ICS output.
- **Ephemeral:** form drafts/errors, month/year navigation and view mode, focus, panels, statuses, import selection/review.
- **Export-only:** DST earlier/later choices and apply-to-all action.
- **Never persisted:** invalid drafts, DOM errors, generated files/object URLs, raw imported JSON, private data in URLs/logs.

## IndexedDB design

- Database `shift-calendar-local`, version `1`.
- `planners`, key path `id`, unique `byNameKey`, non-unique `byUpdatedAt`.
- `meta`, key path `key`; key `lastOpenedPlannerId` stores a planner ID.
- One short transaction per logical operation. Create/update/rename/duplicate/delete/import also update metadata in the same transaction when required.
- Report success only from transaction completion. Map requests/transactions/DOM failures to typed persistence errors.
- A singleton lazy browser connection closes on `versionchange`; blocked/open/close events surface capability state.

## Repository and client boundaries

Create pure persistence types, validation, migrations, backup codecs, limits, filename/name-conflict utilities, and exhaustive error presentation outside React. Create a client-only native IndexedDB repository that returns typed results and never exposes IDB objects. Keep orchestration in `ScheduleGenerator` and presentation/file selection in a compact child component. No server component imports browser APIs.

## Save and autosave lifecycle

- Before saving, valid generation behaves unchanged. “Save planner” validates a name and the current committed aggregate, then creates revision 1.
- After saving, an effect compares the active persisted aggregate with committed state. A difference schedules a 750 ms update with the captured planner ID/revision.
- Raw edits do not change the observed aggregate. Invalid submission leaves the observed aggregate unchanged.
- Successful update, week-start, exception, registry, or valid timezone change triggers autosave.
- Status is unsaved, saving, saved, failed, conflict, or unavailable. Only transaction completion becomes saved.
- Opening/new-session actions cancel queued saves. In-flight writes remain scoped to their captured planner ID and cannot update another active planner.
- Failed/conflicted state retains the valid in-memory planner and offers retry/export where possible.

## Lifecycle and management

Support list, create, open, rename, duplicate, confirmed delete, export one/all, import review/confirm, and return to a new unsaved planner. Sort by `updatedAt` descending, then name. Active deletion removes the local record but keeps its contents open as unsaved. Names are NFC-normalized, whitespace-collapsed, 1–60 code points, unique by normalized case-insensitive key. Duplicate/import suffixes are deterministic.

## Revisions and multi-tab behavior

Update reads the stored revision and compares it to `expectedRevision` inside the write transaction; mismatch returns `PLANNER_REVISION_CONFLICT`. Successful writes increment once. Broadcast only action, ID, and revision. A newer/deleted active record marks the local state conflicted/stale and never overwrites it. Without BroadcastChannel, the next revision check remains authoritative.

## Startup and URL precedence

- Hydration starts with the existing stable unsaved state.
- On clean `/`, initialize the repository, read the pointer, validate/migrate the record, and restore it atomically. Missing/corrupt pointers are cleared and leave the generator unsaved.
- Any non-empty valid V1 query restores a base-only unsaved planner and suppresses last-opened loading.
- Invalid query behavior remains visible and also suppresses saved fallback.
- Opening saved data updates the pointer only after validation and successful application. Private data never enters history or query strings.

## Backup and import

Use `shift-calendar-planner-backup`, backup version 1, product `shift-calendar`, RFC 3339 `exportedAt`, scope `single|all`, and portable planner records. Single filename is `shift-calendar-planner-<safe-name>-YYYY-MM-DD.json`; all is `shift-calendar-backup-YYYY-MM-DD.json`.

Import validates extension/MIME, nonzero size and 5 MiB limit before parsing; scans for depth 12, aggregate 1,000,000 code points, arrays/counts and forbidden keys; strictly validates exact envelope and every planner; migrates supported versions; plans new IDs and deterministic names; presents review; then writes the complete batch in one transaction. One failure aborts all. Imported planners use new planner UUIDs, revision 1, one operation timestamp, preserved internal IDs/references and source `createdAt`, and adjusted unique names. Existing records are never replaced.

## Validation, versions, and migrations

Central validators accept `unknown`, reject arrays/non-plain records/unknown keys/unsafe keys, and delegate schedule/registry/exception rules to existing validators. Validate RFC 3339 UTC timestamps, UUID v4, safe revisions, week start, timezone from the pinned runtime-supported list, names, limits, duplicate IDs/names and references.

Database version, planner schema, domain version, backup version, and V1 link version remain separate. The migration dispatcher accepts current version 1, rejects unsupported past/future versions, and provides a pure sequential boundary without inventing fake schemas. Future migrations must clone, migrate, revalidate, and copy-replace atomically; failure preserves the source.

## Failure, privacy, and security

Storage unavailable/blocked/open/transaction/quota/corrupt/missing/version/migration/conflict errors map exhaustively to calm English. The generator stays usable and never claims a failed write was saved. IndexedDB reads and JSON are untrusted. No evaluation, unsafe merge, HTML injection, logging of planner data, network upload, private URLs, analytics, SVG, server endpoint, or raw DOMException display.

UI copy states saved only in this browser, not synchronized, removable with site data, not encrypted secure storage, and JSON backups can contain private details. Copy link remains base-only.

## Accessibility and responsive behavior

Use labelled native inputs/file input, semantic details/list regions, keyboard buttons, associated errors and `aria-invalid`, polite meaningful status announcements, alert text for blocking failures/conflicts, native destructive confirmation, predictable focus after save/import/delete, and no routine autosave focus stealing. Keep management compact below the generator introduction. Names/errors wrap; controls stack at small widths; verify no root overflow at 320, 390, 768, 1024, and 1440 px.

## Test matrix

- **Pure:** record/backup validators, all limits, unsafe keys, versions/migration dispatcher, schedules/definitions/exceptions/timezones, filename, names/import planning, error mapping and revisions.
- **IndexedDB:** real Chromium creation/stores/indexes, CRUD, pointer, limits, atomic imports/rollback, revision conflict, missing/corrupt records and close/version handling where deterministic.
- **Component:** explicit save/name, status/autosave, raw/invalid draft isolation, failure/conflict, list/open/rename/duplicate/delete, export/import review/errors, unavailable storage, focus/announcements and V1 unsaved precedence.
- **E2E:** advanced planner reload, autosave, multiple planners, export/import, malformed/oversized/future/mixed backup rejection, cross-tab conflict, V1/private URL boundary, failure fallback, keyboard, print/ICS regression and responsive widths.
- Manual-only checks are documented for real quota exhaustion/eviction, incognito retention, browser UI clearing, crashes, persistent-storage grants and screen-reader output.

## Files to create

- `src/features/schedule/persistence/persistence-types.ts`
- `src/features/schedule/persistence/persistence-validation.ts`
- `src/features/schedule/persistence/persistence-migrations.ts`
- `src/features/schedule/persistence/backup.ts`
- `src/features/schedule/persistence/indexeddb-planner-repository.ts`
- `src/features/schedule/persistence/index.ts`
- `src/features/schedule/components/local-planner-panel.tsx`
- Focused unit/component tests under `tests/unit/schedule/`
- IndexedDB/complete browser flows in `tests/e2e/homepage.spec.ts`

## Files to modify

- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/schedule-actions.tsx`
- `src/features/schedule/components/timed-export-panel.tsx`
- Relevant durable documents listed by Phase 6B1A, plus this plan.

File boundaries may be split further when needed for testability, but production behavior and dependency policy must not expand.

## Dependency decision

Add no production, state-management, IndexedDB wrapper, or Node IndexedDB dependency. Use pure unit tests plus real Chromium IndexedDB in Playwright as approved. The lockfile should remain unchanged.

## Explicit non-goals

No accounts, authentication, server/cloud/cross-device storage, collaboration/team rota, permissions, integrations, notifications, PWA/service worker/offline cache, URL V2, advanced URL sharing, encryption/password backups, payroll/attendance/compliance, analytics, advertising, deployment, import replacement/merge, or persisted raw drafts/overlap choices.

## Acceptance criteria

The approved native stores and aggregate exist behind a typed adapter; all reads/imports are validated; save is explicit; only committed valid changes autosave; lifecycle and multiple planners work; revisions prevent stale writes; clean root restores while V1 remains unsaved/base-only; single/all backups and atomic import-as-new work within limits; failures preserve unsaved use; accessibility/responsive/privacy requirements are met; existing schedule/export/print/SEO behavior passes; documentation is current; no dependency or server route is added.

## Verification commands

Run `node --version`, `npm ci`, `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm audit --omit=dev`, `git diff --check`, and `git status --short`. Run schedule/timezone suites with `TZ=UTC`, `TZ=America/New_York`, and `TZ=Africa/Casablanca`. Inspect production route/chunk output and browser network behavior, plus responsive widths 320/390/768/1024/1440. Record but do not claim unperformed manual-only checks.

## Verification results

- Node.js `v24.12.0`; clean `npm ci` completed with 465 audited packages and no vulnerabilities.
- Formatting, ESLint, TypeScript, all 318 unit/component tests, all 48 Chromium end-to-end tests, and the production build passed.
- All 304 schedule tests passed independently under `UTC`, `America/New_York`, and `Africa/Casablanca`.
- The browser suite exercised real IndexedDB schema creation, committed-state autosave and reload, complete advanced-state restoration, planner lifecycle, JSON export/import, V1 precedence, cross-tab conflict handling, storage-unavailable fallback, and root overflow at 320, 390, 768, 1024, and 1440 px.
- Production inspection confirmed the 331,913-byte pinned timezone payload remains a separate lazy chunk and is loaded through the existing dynamic timed-export boundary. Local persistence remains within the generator's normal client chunk and does not make the timezone payload eager.
- `npm audit --omit=dev` and `git diff --check` passed; package manifests and the lockfile are unchanged.
- Manual-only destructive or environment-specific checks were not claimed: real quota exhaustion/eviction, private-window retention, clearing storage through each browser's settings UI, forced browser crash recovery, blocked database upgrades across different deployed schema versions, and assistive-technology announcements. Backup download and re-import are covered automatically in Chromium.
