# Local persistence and backup architecture specification

- **Status:** Proposed for Phase 6B1B approval
- **Date:** 2026-09-18
- **Scope:** Local saved planners and readable JSON backup/import only

## 1. Executive summary

Phase 6B1 should add an optional saved-planner layer without changing the
existing unsaved generator or V1 links. The recommended architecture is a
small native IndexedDB adapter. Each planner is one atomic record; a second
store holds only database-level metadata such as the last-opened planner ID.
React components must consume a repository/service interface and must not own
IndexedDB transactions.

The save model should be **explicit initial save followed by 750 ms debounced
autosave of committed changes**. A form edit is not committed until the
existing Generate/Update action succeeds. Invalid or unapplied form drafts are
never persisted. This preserves the current guarantee that invalid input does
not replace the last valid generated schedule.

A saved planner contains the validated base schedule, week start, personal
shift definitions, date exceptions and notes, and an explicitly selected IANA
timezone. It excludes occurrences, statistics, insights, ICS text, transient
view navigation, raw form drafts, open panels, and timed-export DST overlap
decisions. Overlap decisions are tied to a particular export and timezone-data
version and remain export-only state.

Phase 6B1 should support both single-planner and all-planners JSON exports.
Imports are parsed and validated completely before one atomic write. The safe
MVP always imports as new: it generates new planner IDs, preserves IDs internal
to each planner, resets revisions, and resolves name collisions with a
deterministic suffix. It never overwrites because an imported ID matches.

IndexedDB is best-effort browser storage, not a cloud backup or encrypted
vault. The unsaved generator remains available when storage is blocked, full,
corrupt, evicted, or unavailable. The interface must consistently say “Saved
locally on this browser” and recommend private JSON backups for important
planners.

## 2. Verified current-state observations

The following observations come from the current public types and runtime code,
not only from planning documents:

- `ScheduleConfig` is a version-1 discriminated union for fixed preset,
  rotating preset, and custom cycle schedules.
- The generator separates editable form drafts from the last successfully
  generated result. Validation failure leaves the last valid result intact.
- A generated result contains the validated schedule configuration, calendar
  view month, and a validated planner registry when personal definitions are
  available.
- Week start is `monday` or `sunday` and is represented in V1 URL state.
- The personal registry has stable shift-definition IDs, built-in Day and
  Night definitions, names, short labels, categories, curated color tokens,
  and optional time details.
- Time details support start/end civil times, explicit 24-hour work, and unpaid
  break minutes. Their validation is already domain-owned.
- Date exceptions are keyed to one civil date. They can replace the primary
  result with a shift, leave, sick, or training state, add extra work, and hold
  a private note.
- Effective schedules, statistics, next-position and next-working-day results
  are projections from the schedule, registry, and exceptions.
- The current timezone selector and ambiguity-choice map live inside the timed
  export panel. Closing that panel discards them. “Apply to all” fills the
  current export's choice map; it is not a domain-wide preference.
- V1 URLs deliberately serialize compatible base rotation state and week
  start, not advanced planner data.
- URL restoration resets advanced definitions/exceptions and restores a
  base-only unsaved session. Changing the base schedule clears incompatible
  exceptions.
- No current production code uses IndexedDB, `localStorage`,
  `BroadcastChannel`, or a storage abstraction.
- No IndexedDB helper or Node IndexedDB implementation is present in the
  dependency tree. Current Playwright configuration exercises Chromium.
- The current checkout does not match the prompt's statement that Phase 6A4
  was committed separately. `HEAD` is `77c1d0a` (“docs: validate timed ICS
  timezone dependencies”); the Phase 6A4 implementation is present as
  pre-existing modified and untracked work.

## 3. Existing state inventory

| Current state                      | Runtime owner            | Persistence classification             | Reason                                                                |
| ---------------------------------- | ------------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| Valid `ScheduleConfig`             | Generated result         | Authoritative                          | Reconstructs the base schedule                                        |
| Form field drafts/errors           | Generator form           | Never persist                          | May be invalid or unapplied                                           |
| Week start                         | URL/generator state      | Authoritative planner preference       | Affects calendar presentation and is stable                           |
| View month/year and view mode      | URL/component state      | Ephemeral navigation                   | Does not change planner meaning; V1 URLs already own share navigation |
| Shift definitions and stable IDs   | Planner registry         | Authoritative                          | Required to reconstruct personal shifts and references                |
| Date exceptions and notes          | Generator state          | Authoritative                          | Required to reconstruct effective personal schedule                   |
| Effective occurrences              | Pure projections         | Derived                                | Safely recomputed                                                     |
| Statistics and insights            | Pure projections         | Derived                                | Safely recomputed                                                     |
| Selected work timezone             | Timed-export panel today | Authoritative after explicit selection | Needed to reproduce the user's timed-export context                   |
| Per-boundary earlier/later choices | Timed-export panel       | Export-only                            | Applies only to specific occurrence boundaries and timezone rules     |
| “Apply to all overlaps” action     | Timed-export panel       | Ephemeral/export-only                  | It is an action, not a durable policy                                 |
| Generated ICS/download state       | Export helpers           | Never persist                          | Recomputable output; may become stale                                 |
| Save/import/dialog status          | Future UI                | Ephemeral                              | Interaction state only                                                |

The persistence feature must adapt the real domain types rather than creating a
parallel schedule model. A persisted record may have an envelope and explicit
versions, but its domain fields must be decoded through existing public
validators.

## 4. Product goals

The feature should let a person save, reopen, name, list, rename, duplicate,
delete, export, and import complete personal planners on one browser profile.
Reloading a saved planner must restore the same effective planner without
storing projections. Multiple planners must be distinguishable and safe to
switch between. Errors must preserve the last valid in-memory planner and leave
the base unsaved generator usable.

The privacy statement is:

> Planner data stays in the user's browser unless the user explicitly downloads
> or imports a backup file.

The UI must add that browser storage can be cleared or evicted and is not a
substitute for a backup.

## 5. Explicit non-goals

Phase 6B1 does not add accounts, authentication, cloud or server storage,
automatic cross-device synchronization, collaboration, organizations,
permissions, team rota planning, Slack or Teams, notifications, payroll,
analytics, advertising, browser-extension storage, filesystem synchronization,
third-party drive integration, URL V2, or advanced planner data in URLs.

It also does not add a service worker, installable PWA, or offline asset cache.
Those are separate later work because durable records and offline application
delivery have different failure and update models.

## 6. Browser-storage findings

### Specification guarantees

- IndexedDB databases are scoped by a storage key/origin and can be used by
  multiple clients. Transactions provide ordered, atomic access within a fixed
  store scope.
- An aborted transaction rolls back its changes. A successful transaction
  fires `complete`; individual request success does not by itself prove the
  whole transaction committed.
- Schema changes occur in an exclusive `versionchange` transaction. An upgrade
  waits for older connections to close and may emit `blocked`.
- Opening a database with a lower requested version than the stored database
  fails; a downgraded application cannot assume it can read newer storage.
- The transaction `durability` option is a hint. Even `strict` does not turn
  browser storage into an off-device backup.

### Browser-documented behavior

- IndexedDB is normally best-effort storage. Browsers may evict it under
  pressure, and users may delete it through site-data controls.
- Quotas and eviction policies vary. `navigator.storage.estimate()` is
  approximate and may be padded; it is not an exact planner-storage meter.
- `navigator.storage.persist()` can request protection from automatic eviction,
  but the user agent decides whether to grant it. Clearing site data still
  removes persistent storage.
- Private/incognito policies differ and cannot be reliably inferred by the
  application. Private data is generally short-lived.
- WebKit documents tracking-prevention cases in which script-writable storage,
  including IndexedDB, can be capped after periods without user interaction.
- `BroadcastChannel` sends structured-clone messages among same-origin contexts
  in the same storage partition. It is useful for invalidation hints, not as the
  source of truth.
- `localStorage` is synchronous and origin-scoped. It is unsuitable for the
  authoritative aggregate and offers no durability advantage over IndexedDB.

### Observed project behavior

The current application is a static/local client experience with no persistence
adapter. Browser state is reconstructed from defaults or V1 query parameters.
The existing test configuration has no cross-browser IndexedDB coverage.

### Shift Calendar policy

Treat every successful IndexedDB commit as a local saved copy, never as a
guaranteed backup. Offer a user-initiated “Improve local storage reliability”
action after the first save when `persisted()`/`persist()` are available. Denial
must not make saving fail. Recommend JSON export for important planners.

## 7. Recommended architecture

Use four layers:

1. Existing pure schedule/planner domain types and validators.
2. Pure persistence codecs, migrations, limits, backup parsing, error codes,
   and filename functions.
3. A native IndexedDB repository implementing atomic planner operations and a
   small `BroadcastChannel` coordinator.
4. A client-only orchestration controller/hook and accessible presentation
   components.

The authoritative database is named `shift-calendar-local` at database version
`1`. One planner is one record in `planners`; a `meta` store contains the
last-opened pointer. Do not normalize definitions or exceptions into separate
stores: they are small, bounded, always validated as a unit, and updated as one
logical planner.

## 8. Persisted aggregate

The initial record contract is:

```ts
interface PersistedPlannerV1 {
  schemaVersion: 1;
  domainVersion: 1;
  id: string; // UUID v4
  revision: number; // positive safe integer
  name: string;
  createdAt: string; // RFC 3339 UTC instant
  updatedAt: string; // RFC 3339 UTC instant
  schedule: ScheduleConfig; // existing version-1 union
  weekStart: "monday" | "sunday";
  shiftDefinitions: PersonalShiftRegistry;
  exceptions: DateException[];
  timeZone?: string; // canonical supported IANA identifier
}
```

`schedule` includes its existing `version`, preset/custom discriminator, preset
ID or custom cycle, pattern start date, and fixed working shift where relevant.
`shiftDefinitions` includes stable IDs, name, short label, category, curated
color, and optional start time, end time, explicit 24-hour flag, and unpaid
break minutes. Exceptions include their stable ID/date, primary replacement or
absence, optional additional work, and private note.

The stored IndexedDB record additionally has `nameKey`, a repository-owned,
derived NFC/case-folded name used only by the unique `byNameKey` index. It is
recomputed during validation and is excluded from backups. This prevents names
that differ only by case or surrounding whitespace from being confusingly
duplicated.

An explicitly chosen timezone is persisted. The default/no-selection state is
omitted. The value must resolve through the application's pinned timezone
adapter at validation time. A future timezone-data change must never silently
substitute another zone.

## 9. Authoritative versus derived state

### Authoritative

Planner identity/name/revision/timestamps, validated schedule configuration,
week start, personal shift definitions, exceptions/notes, and an explicitly
selected timezone are authoritative.

### Reconstructable derived state

Monthly/yearly day grids, expanded occurrences, effective schedule entries,
statistics, nominal minutes, next-position/next-work insights, and all-day or
timed ICS content are recomputed from authoritative data.

### Ephemeral UI state

Form focus, validation messages, open dialogs/panels, view mode, current
calendar month/year, import-preview selection, save announcements, and in-flight
requests are not durable. Week start is the exception because it is an explicit
planner presentation preference already represented in the product contract.

### Export-only state

DST-gap errors and per-boundary earlier/later overlap selections are derived for
the requested export range. “Apply to all overlaps” only populates those
current choices. Persisting them would bind a planner to old occurrence keys and
IANA rules, so Phase 6B1 must exclude them. Reopening preserves the timezone,
then asks again only if the new export contains an ambiguity.

### Never persisted

Invalid/unapplied form drafts, generated files, object URLs, raw DOMExceptions,
stack traces, analytics identifiers, and imported raw JSON are never stored.

## 10. Saved-planner lifecycle

- **First save:** “Save this planner” asks for a unique planner name, validates
  the last committed state, generates a UUID and timestamps, writes revision 1,
  and sets the last-opened pointer in one transaction.
- **New planner:** “New unsaved planner” returns to defaults and clears only the
  last-opened pointer. Existing saved planners remain.
- **Open:** validate/migrate before replacing in-memory state. On a clean `/`,
  reopen the valid last-opened planner after client hydration. A V1 URL always
  wins and opens a base-only unsaved session; it is never merged with a saved
  planner merely because configurations match.
- **Rename:** trim/NFC-normalize, enforce uniqueness, and increment revision in
  one transaction.
- **Duplicate:** deep-copy validated domain data; generate a new UUID, unique
  name, revision 1, and new timestamps. Internal definition/exception IDs are
  preserved because references are scoped to one planner.
- **Delete:** confirm using the planner name. If it is active, delete the local
  record but keep its current validated contents open as an unsaved session and
  announce “Local saved copy deleted; this planner remains open unsaved.” Clear
  the last-opened pointer atomically when applicable.
- **Restore defaults:** retain the existing scoped reset actions. A broad reset
  of a saved planner, if added, requires confirmation and becomes a normal
  committed autosaved update. “New unsaved planner” is the clearer blank start.
- **Switch/close:** flush a pending committed autosave and await it. If save
  failed, offer Retry, Duplicate as new, Discard and switch, or Cancel. If form
  drafts differ from the committed result, warn about “Unapplied edits” and
  offer Apply, Discard, or Cancel; drafts are not silently saved.
- **Import:** show a summary, then import all planners as new in one transaction.
- **Return to unsaved generator:** explicitly clears the active pointer, not the
  saved records.

Recommended nouns are “saved planner,” “saved locally,” “unsaved planner,”
“local copy,” and “JSON backup.” Avoid account, cloud, workspace, and sync.

## 11. Save policy

Use explicit initial save followed by debounced autosave:

1. No IndexedDB record exists until “Save this planner” succeeds.
2. After that, committed changes schedule a save after 750 ms of inactivity.
3. Generate/Update success, a saved/removed exception, a validated definition
   change, week-start change, explicit timezone change, and rename are committed
   changes. Keystrokes in raw schedule fields are not.
4. Collapse multiple changes into the latest immutable aggregate, but compare
   the last known revision inside the eventual transaction.
5. Display “Saving locally…” while queued/in-flight and “Saved locally” only
   after transaction `complete`.
6. On failure retain the last known saved revision, keep the current committed
   state in memory, show “Couldn’t save locally,” and offer “Retry save” and
   “Export JSON.” Do not pretend a failed write was saved.
7. “Save now” remains available while dirty or failed and cancels the debounce.
8. Closing a page can interrupt a pending write; do not attempt unload-time
   transactions. Begin saves promptly, show pending state, and explain that only
   “Saved locally” confirms completion.

Do not add a hidden recoverable-draft model in Phase 6B1. It would require a
second versioned lifecycle and make “saved” ambiguous. Only the last valid
committed planner is stored.

## 12. IndexedDB database design

### Database and stores

- Database: `shift-calendar-local`
- Initial `IDBDatabase.version`: `1`
- `planners`, key path `id`
  - unique index `byNameKey` on `nameKey`
  - non-unique index `byUpdatedAt` on `updatedAt`
- `meta`, key path `key`
  - `{ key: "lastOpenedPlannerId", value: string }`

### Transaction boundaries

- Create/update/rename/duplicate: validate before opening the transaction, then
  use one `readwrite` transaction across `planners` and `meta` when the active
  pointer changes.
- Update: read the current record and compare `expectedRevision`, then put
  revision + 1 within the same `readwrite` transaction.
- Delete: read/confirm revision where supplied, delete, and clear the active
  pointer if necessary in one transaction.
- Import: after complete in-memory validation and conflict planning, insert all
  generated records and update metadata in one transaction. Any request error
  aborts the whole transaction.
- Export/list/get: `readonly` transactions. Clone validated data before exposing
  it to UI code.

Timestamps come from an injected clock at the repository boundary. IDs come
from injected `crypto.randomUUID()` generation; HTTPS production is required,
and tests inject deterministic values. Never derive identity from a name, date,
schedule, or imported ID.

### Connection lifecycle

Maintain one lazily opened client-side connection promise. Register
`onversionchange` immediately: stop writes, close the connection, broadcast an
upgrade notice, and show a reload-required message. An opener's `blocked` event
shows “Close other Shift Calendar tabs to finish updating local storage.” A
connection close/error moves persistence to unavailable/needs-reopen state but
does not disable the generator.

Structural upgrade code must be synchronous within `onupgradeneeded`, create
only expected stores/indexes, and abort on error. Do not await unrelated work or
perform network calls inside transactions.

## 13. Repository/adapter boundary

The future code should expose domain-oriented results and typed errors, not
`IDBRequest` or `DOMException`:

```ts
interface PlannerRepository {
  initialize(): Promise<StorageCapability>;
  list(): Promise<PlannerSummary[]>;
  get(id: string): Promise<PersistedPlanner>;
  create(input: NewPlanner, now: Instant): Promise<PersistedPlanner>;
  update(
    input: PlannerUpdate,
    expectedRevision: number,
  ): Promise<PersistedPlanner>;
  rename(
    id: string,
    name: string,
    expectedRevision: number,
  ): Promise<PersistedPlanner>;
  duplicate(id: string, name: string): Promise<PersistedPlanner>;
  delete(id: string, expectedRevision?: number): Promise<void>;
  getLastOpened(): Promise<string | null>;
  setLastOpened(id: string | null): Promise<void>;
  importAsNew(batch: ValidatedImportBatch): Promise<ImportResult>;
  close(): void;
}
```

Pure modules own `decodePersistedPlanner`, `migratePersistedPlanner`,
`decodeBackup`, `serializeBackup`, name/filename normalization, import planning,
and exhaustive error presentation mapping. A client orchestration service owns
debouncing, dirty status, expected revision, and subscriptions. Presentational
components receive data and callbacks only.

Typed errors should include at least `STORAGE_UNAVAILABLE`, `STORAGE_BLOCKED`,
`QUOTA_EXCEEDED`, `TRANSACTION_ABORTED`, `PLANNER_NOT_FOUND`,
`PLANNER_REVISION_CONFLICT`, `PLANNER_NAME_CONFLICT`, `CORRUPT_RECORD`,
`UNSUPPORTED_PLANNER_VERSION`, `INVALID_BACKUP`, `UNSUPPORTED_BACKUP_VERSION`,
and `IMPORT_LIMIT_EXCEEDED`. An exhaustive mapping converts each code to safe,
non-technical text.

## 14. Version model

Four independent versions are required:

| Version                                 | Initial value | Meaning                                                        |
| --------------------------------------- | ------------- | -------------------------------------------------------------- |
| IndexedDB database version              | `1`           | Physical stores and indexes; supplied to `indexedDB.open`      |
| Planner `schemaVersion`                 | `1`           | Persisted aggregate/envelope shape and migration discriminator |
| Planner `domainVersion`                 | `1`           | Meaning of planner-domain fields/tokens                        |
| Backup `backupVersion`                  | `1`           | Top-level portable JSON envelope                               |
| Existing schedule link/config `version` | `1`           | Base schedule URL/domain contract; unchanged                   |

The database version changes only for structural changes. A record schema can
change without a new object store, and the backup envelope can evolve without
changing IndexedDB. The existing V1 URL and `ScheduleConfig.version` remain
independent and must not be inferred from any other version.

All union decoders discriminate versions before reading version-specific
fields. Current-version objects reject unknown fields. A record or backup with
a future version is preserved but not opened/imported and receives a clear
“created by a newer Shift Calendar version” message. A downgraded application
must never attempt a destructive rewrite.

## 15. Migration and rollback strategy

Database upgrades perform physical store/index changes only. Planner migrations
are pure, sequential functions (`V1 -> V2 -> V3`) over a deep-cloned value:

1. Read the original record.
2. Discriminate its schema version.
3. Apply every migration exactly once in memory.
4. Strictly validate the final current record.
5. In one `readwrite` transaction, re-read/compare the original revision and
   copy-and-replace only after successful validation.
6. Abort on any error, leaving the original record unchanged.

Each migration must be deterministic and idempotent when given its declared
input version; it must never mutate its input. Backup migration happens wholly
in memory before the import transaction. Unsupported/corrupt local records stay
untouched and can be exported as a raw recovery file only through an explicit,
clearly labelled diagnostic action; they cannot enter the planner domain.

Support the current planner schema plus the two immediately preceding schema
versions, for at least 24 months after each is superseded. Removal requires a
documented release decision, user-facing notice, and fixtures proving the
remaining boundary. Version 1 initially has no predecessor. Keep one immutable
fixture per supported version, migration-chain tests, failure/rollback tests,
and a future-version fixture.

## 16. Multi-tab concurrency

Use optimistic revision checking plus advisory `BroadcastChannel` messages:

- Every record starts at revision 1; every committed mutation increments by 1.
- A writer supplies its last observed revision. The repository reads and
  compares inside the same `readwrite` transaction. A mismatch aborts with
  `PLANNER_REVISION_CONFLICT`; there is no silent last-write-wins.
- After transaction completion, broadcast only `{ action, plannerId, revision }`
  on `shift-calendar-planners`. Never broadcast planner contents or notes.
- Receiving a newer revision marks the current tab stale and pauses autosave.
  Offer “Reload newer saved copy,” “Duplicate my current planner,” or “Keep
  viewing.” Do not merge records field-by-field.
- If another tab deletes the planner, show that the local copy was deleted and
  let the person duplicate the still-open in-memory planner as new.
- `versionchange` closes the connection. The upgrading tab handles `blocked`
  visibly; other tabs request reload.
- If `BroadcastChannel` is absent, revision comparison still prevents stale
  writes. Detect the conflict at the next save/open/list refresh.

Read-only secondary tabs are not required. This policy remains small and local;
it is not synchronization or collaborative editing.

## 17. Backup JSON format

The UTF-8, uncompressed, unencrypted JSON envelope is:

```ts
interface PlannerBackupV1 {
  format: "shift-calendar-planner-backup";
  backupVersion: 1;
  product: "shift-calendar";
  exportedAt: string;
  scope: "single" | "all";
  planners: PersistedPlannerV1[];
}
```

Support both one-planner and all-planners export. JSON is readable, portable,
and easy to inspect. Encryption/password protection is excluded because safe
key derivation, recovery, and UX are separate security work. A checksum is not
included: it would detect accidents but not malicious modification without an
external trusted key, while strict parsing already detects invalid structure.

Filenames:

- Single: `shift-calendar-planner-<safe-name>-YYYY-MM-DD.json`
- All: `shift-calendar-backup-YYYY-MM-DD.json`

Normalize the safe name to NFC, lowercase for the filename, replace runs not in
ASCII `a-z0-9` with `-`, collapse/trim hyphens, limit to 48 characters, and use
`planner` if empty. Browser duplicate-download suffixes are acceptable; do not
probe the user's filesystem. Export via a Blob/object URL and revoke it after
the click.

Backups include planner IDs and revisions for provenance, but Phase 6B1 imports
them as new identities. They contain private notes, absences, time details, and
timezone, so the download UI must call them private documents.

## 18. Example valid backup

```json
{
  "format": "shift-calendar-planner-backup",
  "backupVersion": 1,
  "product": "shift-calendar",
  "exportedAt": "2026-09-18T12:00:00.000Z",
  "scope": "single",
  "planners": [
    {
      "schemaVersion": 1,
      "domainVersion": 1,
      "id": "6ac1a6a8-1bf2-4a57-9a85-7e29c43e64c1",
      "revision": 7,
      "name": "Fictional Night Rotation",
      "createdAt": "2026-09-01T09:00:00.000Z",
      "updatedAt": "2026-09-18T11:45:00.000Z",
      "schedule": {
        "kind": "preset",
        "version": 1,
        "presetId": "2-day-2-night-4-off",
        "startDate": "2026-09-01"
      },
      "weekStart": "monday",
      "shiftDefinitions": {
        "definitions": [
          {
            "id": "builtin-day",
            "name": "Day",
            "shortLabel": "D",
            "category": "day",
            "color": "amber",
            "time": {
              "startTime": "07:00",
              "endTime": "19:00",
              "is24Hours": false,
              "breakMinutes": 30
            }
          },
          {
            "id": "builtin-night",
            "name": "Night",
            "shortLabel": "N",
            "category": "night",
            "color": "indigo",
            "time": {
              "startTime": "19:00",
              "endTime": "07:00",
              "is24Hours": false,
              "breakMinutes": 30
            }
          }
        ],
        "dayDefinitionId": "builtin-day",
        "nightDefinitionId": "builtin-night"
      },
      "exceptions": [
        {
          "id": "exception-2026-09-12",
          "date": "2026-09-12",
          "primary": {
            "type": "leave"
          },
          "note": "Fictional private note for backup testing."
        }
      ],
      "timeZone": "Africa/Casablanca"
    }
  ]
}
```

The example uses the current public schedule, registry, time-detail, and
exception field shapes. Phase 6B1B must turn it into a strict fixture so a
future field change requires an explicit schema migration rather than a
compatibility alias.

## 19. Import parsing and validation pipeline

Treat import as hostile input and follow this ordered pipeline:

1. Native labelled file input with `accept=".json,application/json"`.
2. Require a case-insensitive `.json` filename. Accept MIME
   `application/json`, `text/json`, or empty (browsers may omit it); reject any
   other non-empty MIME.
3. Reject zero bytes and more than 5 MiB before reading.
4. Read as text with caught errors; reject NUL and invalid Unicode replacement
   patterns where detectable.
5. `JSON.parse` once. Never evaluate, revive classes, or unsafe-merge objects.
6. Iteratively scan the parsed value: maximum depth 12, maximum aggregate string
   length 1,000,000 Unicode code points, and forbidden keys `__proto__`,
   `prototype`, and `constructor` at every object level.
7. Require a plain root object and exact current/recognized older envelope
   fields. Validate format/product/version/scope/timestamp and planner count.
8. Discriminate and migrate supported older backups/planners in memory.
9. Strictly decode each planner with unknown fields rejected for its version.
10. Reuse existing validators for schedules, presets, cycles, dates, times,
    definitions, colors/categories, breaks, 24-hour rules, exceptions, and
    notes. The import layer must not reimplement those rules.
11. Validate canonical RFC 3339 UTC timestamps, UUIDs, safe integer revisions,
    unique planner IDs/names inside the file, unique definition/exception IDs,
    valid references, and timezone membership in the pinned adapter.
12. Build the full import-as-new conflict plan and review summary.
13. Only after confirmation, open one write transaction for every record.

All failures reject the entire file. Preserve the currently open planner and
all existing records. Internal typed errors carry a JSON-pointer-like field
path but user text avoids echoing private imported values. Error mapping must be
an exhaustive discriminated union so a new validation failure cannot silently
fall back to an unclear message.

## 20. Import conflict policy

Safe MVP policy: **review, then import every planner as new**.

- A planner without a local match receives a new local UUID anyway.
- An existing imported ID never authorizes replacement.
- All records receive revision 1. Preserve the source `createdAt`; set
  `updatedAt` to the import transaction time.
- Preserve internal definition and exception IDs because they are scoped inside
  the new aggregate.
- Resolve a name collision using `Name (imported)`, then `Name (imported 2)`,
  etc.; truncate the base as necessary to remain within 60 code points. Show
  planned names before confirmation.
- A supported older version is migrated in memory and identified in review.
- A future version rejects the whole file without modification.
- Zero planners is invalid.
- One invalid planner among many rejects all planners.
- Imports that would exceed the local 20-planner limit reject before review or
  allow the user to select a smaller valid subset; the selected subset is still
  atomic. Selection must never turn validation into partial acceptance.

Replacement/merge is deferred. If later added, it must be a separate explicit
choice per planner, show local and imported metadata, require destructive
confirmation, use expected revisions, and remain atomic. ID equality alone is
never sufficient.

## 21. Limits

| Item                           |                                                          Limit | Rationale                                                         |
| ------------------------------ | -------------------------------------------------------------: | ----------------------------------------------------------------- |
| Saved planners                 |                                                             20 | Enough for personal scenarios; keeps lists/imports understandable |
| Planner name                   |         1–60 Unicode code points after trim/NFC/space collapse | Readable UI, filenames and announcements                          |
| Shift definitions              |                    Existing domain maximum, currently 12 total | Preserve validated product contract                               |
| Custom cycle                   |                     Existing domain maximum, currently 56 days | Preserve generation bound                                         |
| Exceptions                     |                    Existing maximum, currently 366 per planner | Roughly one per day for a leap year                               |
| Private notes                  |                       At most one per exception; therefore 366 | Matches the domain rather than adding an unbounded collection     |
| Note                           |            Existing maximum, currently 500 Unicode code points | Preserves UI and memory bounds                                    |
| Definition/exception ID        | Existing maximum, currently 64 characters and existing grammar | Keeps references/indexing bounded                                 |
| Backup planners/import records |                                                             20 | Same as local product limit                                       |
| Backup file                    |                                                          5 MiB | Far above expected bounded data but limits allocation/DoS         |
| Aggregate strings after parse  |                                  1,000,000 Unicode code points | Defense in depth against pathological JSON                        |
| Structure depth                |                                                             12 | Valid v1 is shallower; blocks deeply nested abuse                 |

Name validation also rejects control and bidirectional-control characters.
Current curated categories, colors, preset IDs, date/time grammar, break limits,
and explicit 24-hour invariants remain domain-owned.

Do not show a quota percentage: estimates are origin-wide, approximate, and
potentially padded. With these limits, a proactive quota warning would imply
false precision. Handle actual `QuotaExceededError` and optionally warn before
an import only when `estimate()` reports less than 10 MiB free, describing that
number as an estimate and allowing JSON export—not bypassing hard limits.

## 22. Failure recovery

| Condition                             | Required behavior                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| IndexedDB absent/blocked/open failure | Mark local saving unavailable; keep generator fully usable; offer JSON export of current validated session where possible |
| Private mode                          | Do not claim detection. Show the universal local-storage warning; if writes fail, use unavailable behavior                |
| Temporary failure/transaction abort   | Keep in-memory state and last committed revision; Retry save; never mark saved                                            |
| Quota exceeded                        | “Browser storage is full. Export a backup or delete a saved planner, then retry.”                                         |
| Corrupt record                        | Isolate it from normal opening/list data, preserve bytes, offer delete/raw recovery; do not auto-repair                   |
| Upgrade blocked                       | Ask the user to close other Shift Calendar tabs; keep unsaved use available where safe                                    |
| Upgrade failure                       | Abort/retain old database, enter unavailable mode, and avoid repeated destructive retries                                 |
| Eviction/site-data clearing           | Saved list becomes empty; explain that browser data may have been cleared and offer Import JSON                           |
| Origin/domain/protocol change         | Treat as a different local store; explain that local planners do not move automatically                                   |
| Other device/profile                  | No local records; use JSON import for manual transfer                                                                     |

Suggested persistent copy:

> Saved locally on this browser. It is not synchronized and may be removed if
> browser data is cleared. Export a private JSON backup for important planners.

Log only typed error code, operation, database/schema version, and non-sensitive
technical cause in development. Never log planner names, dates, schedules,
notes, imported JSON, or record bodies; add no analytics or network reporting.

## 23. Privacy and threat model

| Threat                               | Boundary and mitigation                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Same-origin script/XSS               | Same-origin malicious code can read IndexedDB. Maintain strict CSP/dependency hygiene and avoid unsafe HTML; storage is not an XSS boundary |
| Malicious/oversized import           | Pre-read size bound, strict schema/depth/count/string limits, forbidden keys, no unsafe merges, atomic rejection                            |
| Corrupt data                         | Validate on every read, isolate, preserve original, never feed it to domain/rendering code                                                  |
| Shared computer/profile              | Anyone with the same unlocked browser profile may access local planners/downloads; provide delete and clear explanations                    |
| Browser extensions/device compromise | Sufficient privileges can access data; do not claim encryption or secure-vault properties                                                   |
| Insecure backup location             | Warn that JSON includes private notes, absences, times, and timezone and should be handled as a private document                            |
| Accidental deletion/eviction         | Named confirmation, retain deleted active planner as unsaved, recommend regular JSON backup                                                 |
| Cross-tab race                       | Expected revision in one atomic transaction plus visible conflict handling                                                                  |
| Future incompatibility               | Explicit versions, bounded migration support, immutable fixtures, no downgrade writes                                                       |

IndexedDB stores local structured data; it is not encrypted secure storage.
Transport security and same-origin policy do not protect against malicious code
already executing on this origin or a compromised device.

## 24. Sharing and URL compatibility

V1 URL behavior remains unchanged. Opening a V1 link creates a base-only
unsaved session and never looks up or merges a saved planner. “Copy link” shares
only compatible base rotation state and week-start/view information already in
V1. It excludes definitions, times, exceptions, notes, timezone, saved-planner
ID/name, and all backup metadata.

Saved data must never enter canonical URLs, metadata, structured data, search
indexing, referrers, analytics, or server logs. The share UI should say:

> This link shares the base rotation only. Personal shift details, exceptions,
> notes, and timezone stay out of the link.

The backup UI should separately say:

> JSON backups can include private notes, absences, shift times, and timezone.
> Treat the downloaded file as a private document.

No URL V2 is created in Phase 6B1.

## 25. Server/Client Component boundaries

Keep the page/layout, metadata, structured data, explanatory copy, and other SEO
content server-rendered. The existing interactive generator remains the client
island. Add IndexedDB access only below a client-only repository provider or
controller initialized in an effect; render a stable unavailable/loading shell
during SSR to avoid hydration mismatch.

Proposed modules:

- Pure domain/persistence schema, codecs, migrations, limits, and error mapping.
- Client-only native IndexedDB adapter and broadcast coordinator.
- `useSavedPlannerController` (or equivalent service) for hydration, autosave,
  switching, conflict and status orchestration.
- Presentational `SavePlannerControl`, `SavedPlannerList`, `PlannerStatus`,
  `ImportBackupDialog`, and `StorageNotice` components.

Lazy-load the saved-planner management/import dialog because parsing, file UI,
and the full list are secondary. The compact save/current-planner status can be
part of the existing client bundle. Do not convert the homepage or layout into
a Client Component and do not read browser APIs during render.

## 26. UI and accessibility behavior

Place a compact “Local planners” control beside the existing generator actions,
not above the primary form. It opens a mobile-first sheet/dialog or inline
management region; the generator remains prominent and the homepage does not
become a dashboard.

- “Save this planner” opens a labelled name dialog, focuses the name input, and
  returns focus to the invoking control on cancel/complete.
- The saved list uses semantic headings/list/buttons. Each row exposes Open,
  Rename, Duplicate, Export JSON, and Delete with the planner name in accessible
  labels.
- Delete and any future replace use an accessible confirmation dialog with the
  least destructive default focus.
- Use a native visible or visually-hidden-but-label-associated file input; its
  trigger must remain keyboard accessible. Do not make a `div` act as a file
  input.
- Import review lists count, source version, migrations, planned names, and
  private-data warning before one confirm action.
- A polite live region announces “Saving locally,” “Saved locally,” and import
  success without repeating rapidly. Blocking failures/conflicts use an
  assertive alert plus visible text; no status relies on color alone.
- Error summaries focus on submission failure and link to the relevant name or
  file control. Technical codes and DOMException names are not shown.
- Opening normally moves focus to the calendar heading/status; deleting the
  focused row moves focus to the next row, previous row, or empty-state heading.
- No normal save/open operation reloads the document.

Empty state: “No planners saved on this browser yet.” Storage unavailable:
“Local saving isn’t available here. You can keep using the generator and export
a JSON backup of valid planner data.”

## 27. Responsive behavior

At 320 and 390 px, expose one full-width primary current-planner action and a
stacked saved list; put secondary row actions in a labelled native menu only if
its keyboard/focus behavior is fully tested. Dialogs/sheets use viewport-safe
padding, wrapping names and error text without horizontal scroll. File names and
UUID-like diagnostics must use `overflow-wrap: anywhere`.

At 768 px and above, the management surface may use a two-column header/action
layout, but list semantics and action order remain the same. At 1024/1440 px it
must not grow into a separate dashboard or displace the generator. Test the
document root and management surface for horizontal overflow at every required
width.

## 28. Testing matrix

### Pure unit tests

- Exact V1 record and backup serialization/deserialization; round trips.
- Every discriminator/version, required/unknown field, primitive, string,
  array, count, depth, date/time/timezone, ID, name, color/category, break,
  24-hour, reference, duplicate, note, and aggregate-length rule.
- Reuse/integration with every existing schedule/planner validator.
- Backup scope/count/product/format/timestamp and valid example fixture.
- Filename normalization, empty fallback, truncation, and Unicode cases.
- Every supported migration, full chain, idempotency expectation, source
  immutability, rollback planning, and future version.
- Name/ID import conflicts, suffix/truncation, revision reset, limit planning,
  all-or-nothing behavior, corrupt records, typed error mapping exhaustiveness,
  and revision conflict logic.

### IndexedDB browser integration tests

Use real browser IndexedDB in Playwright as the primary integration environment:
database/store/index creation, CRUD, unique names, atomic update/import/delete,
request/transaction failures, expected revisions, corruption isolation,
connection close, version upgrades, blocked upgrades across pages, migration
failure rollback, delete of active pointer, and injected quota-style failures.
Actual browser quota exhaustion is not deterministic; simulate adapter errors
and manually inspect representative browsers.

Pure codecs/migrations run in Node without IndexedDB. Do not add
`fake-indexeddb` initially: it would not verify browser connection, blocking,
durability, or multi-tab behavior and is unnecessary when operations are
isolated behind the repository. Re-evaluate only if native-browser setup makes
fast transaction-path coverage materially inadequate; any later proposal must
pin and audit an exact version before installation.

### Component tests

Save/name validation, committed-vs-draft behavior, autosave status/failure/retry,
Save now, open, rename, duplicate, delete confirmation/focus, unsaved draft
warning, switch with pending write, export, valid/invalid/future import, review,
conflicts, storage unavailable, upgrade error, empty state, keyboard operation,
live regions, error summary, and exhaustive visible error copy.

### Playwright end-to-end tests

- Save a complete advanced planner, reload, and restore schedule, definitions,
  times, colors, exceptions, notes, week start, and timezone.
- Verify overlap choices are intentionally not restored and are requested again
  when applicable; this updates the prompt's requested test expectation to the
  recommended export-only policy.
- Maintain multiple planners; rename, duplicate, delete; last-opened behavior;
  clean URL versus V1 URL precedence; return to unsaved mode.
- Export then import single/all backup; reject malformed, oversized, unsupported
  and mixed-validity files without changing the prior planner.
- Preserve base-only V1 links and prevent private data from URLs/metadata.
- Disable/fail IndexedDB and continue unsaved use.
- Two-page stale revision, delete, broadcast fallback, and blocked upgrade.
- 320, 390, 768, 1024 and 1440 px layouts, root overflow, touch targets,
  keyboard-only workflow, focus restoration, announcements, and production
  build behavior.

Private/incognito retention, real quota pressure/eviction, browser UI for
clearing site data, `persist()` grant policy, OS/browser crashes, and extension
access are manual checks because automation cannot make stable cross-browser
claims. Before release, add Firefox and WebKit Playwright projects or document
manual coverage; current project automation is Chromium-only.

## 29. Documentation impact

No durable document changes are authorized in Phase 6B1A. Phase 6B1B should
update:

| Document               | Future change                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `README.md`            | Add local save/backup capability, privacy limitation, and use instructions                 |
| `docs/PRODUCT.md`      | Mark Phase 6B1 scope/status and local-first outcomes/non-goals                             |
| `docs/DOMAIN.md`       | Define persisted planner identity/version/revision and durable-vs-derived fields           |
| `docs/ARCHITECTURE.md` | Record IndexedDB adapter, stores, client boundary, migration and concurrency architecture  |
| `docs/UI-UX.md`        | Specify planner management, save states, dialogs, copy, focus and responsive behavior      |
| `docs/SEO.md`          | Confirm saved/private data never enters URLs, metadata, indexing or server-rendered output |
| `docs/TESTING.md`      | Add unit/browser/component/E2E persistence matrix and manual browser checks                |
| `docs/SECURITY.md`     | Add import threat model, limits, local-storage limitations, logging and backup privacy     |
| `docs/DECISIONS.md`    | Record native IndexedDB, aggregate, save, version, import and cross-tab decisions          |
| `docs/ROADMAP.md`      | Complete 6B1 and keep PWA/offline and team planning separate                               |

An implementation plan under `docs/plans/` is required only after this
specification and approvals are reviewed.

## 30. Dependency assessment

Recommendation: native IndexedDB, no production or test dependency in the
initial implementation.

The data model has two stores, two indexes, bounded aggregates, and a small
operation set. A focused Promise adapter can correctly centralize request and
transaction completion, error normalization, version changes, and blocked
events. Adding a wrapper would increase supply-chain, audit, bundle, and upgrade
surface without removing the need for application codecs, migrations,
revisions, import policy, or user-facing failures.

Likewise, no Node IndexedDB dependency is recommended initially. Pure behavior
does not require IndexedDB and browser-specific behavior should run against the
native API in Playwright. This decision can be revisited with measured test
runtime/coverage evidence. Because no dependency is recommended, package
version, license, bundle impact, and maintenance assessment are not applicable;
Phase 6B1B must not install one opportunistically.

## 31. Recommended Phase 6B1B scope

Implement only:

- Pure V1 persisted/backup schemas, strict codecs, limits, error mapping,
  filename functions, and migration framework/fixtures.
- Native two-store IndexedDB repository with optimistic revisions, lifecycle,
  atomic operations, and safe failure mapping.
- BroadcastChannel invalidation hints with no-channel fallback.
- Explicit first save + committed-state autosave, saved list/lifecycle, and
  last-opened clean-URL restoration.
- Single/all JSON export and atomic import-as-new review flow.
- Storage/privacy notices, optional user-initiated persistence request, and
  accessible responsive UI.
- Required tests and durable-document updates.

Do not include replace/merge import, draft recovery, encryption, URL V2, cloud,
service workers, or offline assets.

## 32. Deferred Phase 6B/PWA work

Defer installability, web app manifest/service worker, offline asset/navigation
caching, offline update UX, background behavior, cloud/drive backup, encrypted
backup, automated backup scheduling, import replacement/merge, durable draft
recovery, and data portability APIs. Team rota planning and multi-user
collaboration remain a separate product/research track.

## 33. Open decisions requiring approval

Approve or change these three product-visible choices before Phase 6B1B:

1. **Export-only ambiguity choices:** persist the timezone but deliberately do
   not persist earlier/later DST overlap choices or “apply to all.” Approval
   means reopening may ask for an overlap choice again.
2. **Import as new only:** support no destructive replacement in the MVP.
   Imported IDs are provenance only; local IDs are regenerated and colliding
   names receive reviewed suffixes.
3. **Clean-root restoration:** a clean `/` automatically reopens the valid
   last-opened saved planner after hydration, while any V1 URL always opens an
   unsaved base-only session.

All other required decisions have a direct recommendation below and need no
additional research:

1. Native IndexedDB; no dependency.
2. `shift-calendar-local`, database version 1.
3. One atomic aggregate per planner plus a small metadata store.
4. Persisted planner schema version 1.
5. Readable JSON `shift-calendar-planner-backup`, version 1.
6. Both single-planner and all-planners exports.
7. Explicit initial save, then 750 ms committed-state autosave.
8. Invalid/unapplied drafts are not stored.
9. UUID v4 identity and monotonic positive revision.
10. Optimistic transaction check plus advisory BroadcastChannel and visible
    conflicts.
11. Entire selected import batch is atomic.
12. Import as new; deterministic name suffix; no ID-based overwrite.
13. Pure sequential copy-and-replace migrations; rollback by transaction abort;
    current plus two prior versions for at least 24 months.
14. Maximum 20 saved planners.
15. Maximum 5 MiB backup/import file.
16. Maximum 366 exceptions per planner (existing limit).
17. Unsaved generator remains available when persistence fails.
18. Last-opened pointer in IndexedDB; clean-root policy above.
19. Do not use `localStorage`, even for the pointer; avoid split state.
20. PWA/offline remains a separate later phase.

## 34. Acceptance criteria for the specification

This specification is ready for implementation planning when reviewers confirm:

- The persisted fields match the current public runtime types; any exact field
  spelling adjustment is made here before schema freeze.
- Every durable field has a purpose and derived/ephemeral/export-only state is
  excluded.
- The native IndexedDB stores, indexes, transaction and adapter boundaries are
  accepted.
- Committed-state save semantics cannot replace a valid record with invalid
  drafts.
- Four version domains and bounded migration support are understood.
- Import is strictly validated, size/depth/count bounded, reviewable, atomic,
  and non-destructive.
- Revisions prevent silent cross-tab overwrites.
- Failure copy preserves unsaved use and accurately describes local storage.
- V1 URLs and SEO surfaces remain base-only and private-data-free.
- Accessibility, responsive behavior, full test matrix, and manual limitations
  are actionable.
- The three open product choices are explicitly approved or replaced.
- Phase 6B1B begins only after an implementation plan is created and reviewed.

## 35. Sources

Primary sources accessed 2026-09-18:

- W3C, **Indexed Database API 3.0** — transaction atomicity/scheduling,
  connections, versions, upgrades, blocked/versionchange events, durability:
  <https://www.w3.org/TR/IndexedDB/>
- WHATWG, **Storage Standard** — storage keys, quotas, persistence and buckets:
  <https://storage.spec.whatwg.org/>
- MDN, **Using IndexedDB** — connection/upgrade patterns, transaction lifetime,
  shutdown limitations:
  <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB>
- MDN, **IndexedDB API: Basic terminology** — browser storage and durability
  cautions:
  <https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology>
- MDN, **IDBTransaction** — completion, abort/rollback, active lifetime:
  <https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction>
- MDN, **IDBTransaction durability** — strict/relaxed/default hints:
  <https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/durability>
- MDN, **Storage quotas and eviction criteria** — best-effort/persistent
  storage, quotas, eviction and private browsing:
  <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- MDN, **StorageManager.persist()** and **persisted()** — persistence request and
  status:
  <https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist>
  and
  <https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persisted>
- MDN, **StorageManager.estimate()** — approximate origin usage/quota:
  <https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate>
- MDN, **Broadcast Channel API** — same-origin/storage-partition messaging:
  <https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API>
- MDN, **Web Storage API** and **Window.localStorage** — synchronous behavior,
  origin scope and private-session limitations:
  <https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API> and
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage>
- MDN, **File API** — browser-selected file metadata and reading:
  <https://developer.mozilla.org/en-US/docs/Web/API/File_API>
- MDN, **Crypto.randomUUID()** — secure random UUID v4 generation and secure
  context requirement:
  <https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID>
- WebKit, **Tracking Prevention** — documented script-writable-storage policy:
  <https://webkit.org/tracking-prevention/>

Source interpretation in this document distinguishes specification guarantees
from browser documentation. No new dependency was evaluated because native
IndexedDB is sufficient for the bounded design. Browser-specific quota,
eviction, persistence grants, private mode and crash durability require manual
verification and must not be promoted to universal guarantees.

## 36. Git status and scope confirmation

At research start, `HEAD` was `77c1d0a` (`docs: validate timed ICS timezone
dependencies`), preceded by `ad078f6` (`docs: specify timed ICS timezone
architecture`). The current checkout already contained uncommitted Phase 6A4
implementation work: modifications to existing durable documents,
`package.json`, `package-lock.json`, schedule actions and an end-to-end test,
plus untracked timed-export implementation/tests, types, and implementation plan 011. Therefore the prompt's assertion that Phase 6A4 had been committed
separately was not true for this working tree.

Those pre-existing changes were preserved and not edited by Phase 6B1A. This
task creates exactly:

`docs/research/local-persistence-and-backup-specification-2026-09.md`

It creates no implementation plan, application code, tests, dependency change,
or durable-document update. It performs no commit, push, deployment, Phase 6B1B
implementation, PWA work, or URL V2 work.
