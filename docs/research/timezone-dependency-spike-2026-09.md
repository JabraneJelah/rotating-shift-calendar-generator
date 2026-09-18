# Phase 6A4B timezone dependency spike

Status: completed experimental spike; awaiting architecture review

Date: 2026-09-18

Scope: isolated dependency evaluation only. No application implementation or repository dependency change is authorized by this document.

## Executive result

`timezonecomplete@5.15.1` and `tzdata@1.0.51` can implement the UTC-conversion architecture selected in Phase 6A4A, including current `Africa/Casablanca` rules, gap detection, overlap candidate enumeration, overnight boundaries, and civil 24-hour events. They should be **approved conditionally as a pair**, not as independently safe defaults.

Approval conditions are strict:

1. Import both exact direct dependencies through one lazy-loaded application adapter.
2. Call `TzDatabase.init(tzdata)` explicitly before any timezone lookup.
3. Assert `tzdata.version` at build/test time and keep Morocco sentinel tests.
4. Never construct a local `DateTime` and accept the library's default normalization.
5. Resolve local boundaries into zero, one, or two exact candidates and apply the Phase 6A4A reject/explicit-choice policy.
6. Use only the documented public package entry point; do not use the smaller unsupported deep import measured in this spike.
7. Keep the resolver in a separate lazy chunk. The measured supported-import bundle is 325,453 raw bytes, 55,277 bytes with gzip level 9, and 46,400 bytes with Brotli quality 11.
8. Re-run data-version, Morocco, transition, bundle, and browser tests on every dependency update.

The pair is not approved for direct use from UI or serializer code. If the implementation cannot enforce the adapter boundary and explicit initialization, reject these dependencies and run a new candidate spike.

## Relationship to Phase 6A4A

The committed architecture specification selected this sequence:

```text
explicit IANA zone + local boundaries
  -> resolve with versioned IANA data
  -> handle gap/overlap explicitly
  -> exact instants
  -> UTC DTSTART/DTEND
```

This spike tests only the proposed resolution dependency. It does not implement timed ICS, `VTIMEZONE`, UI, persistence, or application integration. The Phase 6A4A decision to serialize UTC and omit `VTIMEZONE` is unchanged.

## Isolation and reproducibility

The experiment ran in a generated directory under the operating-system temporary directory, outside the repository. The repository's `package.json`, lockfile, source, and installed dependencies were not changed.

Environment:

| Item                    | Observed value                                        |
| ----------------------- | ----------------------------------------------------- |
| Operating system        | Windows                                               |
| Node.js                 | 24.12.0                                               |
| ICU                     | 77.1                                                  |
| Host Node timezone data | 2025b                                                 |
| `timezonecomplete`      | 5.15.1                                                |
| Direct `tzdata`         | 1.0.51                                                |
| Measurement bundler     | esbuild 0.25.12                                       |
| Bundle target           | browser, ESM, ES2020, minified                        |
| gzip parameters         | Node `zlib.gzipSync`, level 9                         |
| Brotli parameters       | Node `zlib.brotliCompressSync`, quality 11, text mode |

Installation was isolated with the equivalent of:

```text
npm install --prefix <temporary-directory> --no-save \
  timezonecomplete@5.15.1 tzdata@1.0.51
```

`esbuild@0.25.12` was installed only in the same temporary directory for repeatable bundle measurement. No temporary artifact was copied into the repository.

## Package and embedded-data inspection

The installed graph was:

```text
timezonecomplete@5.15.1
└── tzdata@1.0.49

tzdata@1.0.51 (direct)
```

The package metadata contains an exact `"tzdata": "1.0.49"` dependency rather than a compatible range. Consequently, installing the proposed direct pair creates two data packages:

| Data source                       | Package version | Embedded IANA version |
| --------------------------------- | --------------- | --------------------- |
| `timezonecomplete` nested default | 1.0.49          | 2026b                 |
| Explicit direct `tzdata`          | 1.0.51          | 2026d                 |

This distinction is material. If `timezonecomplete` initializes itself by resolving its own `tzdata` dependency, it uses 2026b. If the adapter imports the direct payload and calls `TzDatabase.init(tzdata)`, it uses 2026d.

The browser bundle built from the supported public import plus explicit direct initialization contained the string `2026d`, contained `Africa/Casablanca`, and did not contain `2026b`. A smoke import of that bundle returned offset 0 for Casablanca after the September 2026 transition.

The IANA data version is available as `tzdata.version`; it is not exposed as a documented `TzDatabase` version property. The adapter must retain and report the imported payload's version rather than infer it from the host or database singleton.

## Resolver prototype

The prototype did not use JavaScript's machine-local timezone. It:

1. represented the requested local date and minute as neutral numeric fields;
2. queried `TzDatabase.totalOffset(zone, instant)` across a bounded ±18-hour instant window;
3. collected possible offsets;
4. derived an instant candidate for each offset;
5. round-tripped each candidate through the database;
6. returned zero, one, or two sorted exact candidates.

Result classification:

- zero candidates: nonexistent local time / gap;
- one candidate: unique local time;
- two candidates: ambiguous local time / overlap;
- candidates sorted by epoch: first is `earlier`, second is `later`.

The prototype proves capability, not the final algorithm. Production code should minimize offset queries, use a well-tested bounded candidate strategy, and return the typed Phase 6A4A result. The resolver must not read private schedule data beyond the boundary being converted.

## Default library behavior is unsafe for this product

The high-level `DateTime` constructor was tested after explicit 2026d initialization:

| Input                                        | Observed default                                   |
| -------------------------------------------- | -------------------------------------------------- |
| `2026-03-08 02:30 America/New_York` gap      | silently normalized to `03:30`, producing `07:30Z` |
| `2026-11-01 01:30 America/New_York` overlap  | silently chose the earlier `05:30Z` candidate      |
| `2026-09-20 02:30 Africa/Casablanca` overlap | silently chose the earlier `01:30Z` candidate      |

`DateTime.exists(...)` returned `false` for the New York gap but `true` for the overlap; it does not itself express both overlap candidates. `NormalizeOption.Up` and `Down` govern gap normalization, not a product-level explicit earlier/later overlap choice.

Therefore the implementation must not use `new DateTime(local, zone)` as its resolution policy. The lower-level database can support the required adapter, but the application owns rejection and choice semantics.

## `Africa/Casablanca` verification

The two installed data versions produced different and observable results.

### Nested 2026b default

| Local boundary   | Classification / UTC result  |
| ---------------- | ---------------------------- |
| 2026-09-19 12:00 | unique, `11:00Z`, offset +60 |
| 2026-09-20 02:30 | unique, `01:30Z`, offset +60 |
| 2026-09-21 12:00 | unique, `11:00Z`, offset +60 |

The nested data does not contain Morocco's later 2026 permanent-UTC change and is incorrect for the post-transition fixture.

### Explicit direct 2026d data

| Local boundary   | Classification / UTC result                             |
| ---------------- | ------------------------------------------------------- |
| 2026-09-19 12:00 | unique, `11:00Z`, offset +60                            |
| 2026-09-20 01:30 | unique, `00:30Z`, offset +60                            |
| 2026-09-20 02:30 | overlap: earlier `01:30Z` at +60; later `02:30Z` at +00 |
| 2026-09-20 03:30 | unique, `03:30Z`, offset +00                            |
| 2026-09-21 12:00 | unique, `12:00Z`, offset +00                            |
| 2026-03-22 02:30 | gap, zero candidates                                    |

This matches the current rule required by the Phase 6A4A Morocco sentinel: the direct 2026d payload resolves the transition and permanent-UTC date, while host Node 2025b and the library's nested 2026b do not.

Morocco must remain a named-zone fixture. Neither result may be replaced with a fixed-offset shortcut.

## DST gaps and overlaps

With explicit direct 2026d data, representative results were:

| Zone and local value                | Result                                         |
| ----------------------------------- | ---------------------------------------------- |
| America/New_York, 2026-03-08 02:30  | gap, zero candidates                           |
| America/New_York, 2026-11-01 01:30  | overlap, `05:30Z` at −240 and `06:30Z` at −300 |
| Europe/Paris, 2026-03-29 02:30      | gap, zero candidates                           |
| Europe/Paris, 2026-10-25 02:30      | overlap, `00:30Z` at +120 and `01:30Z` at +60  |
| Africa/Casablanca, 2026-03-22 02:30 | gap, zero candidates                           |
| Africa/Casablanca, 2026-09-20 02:30 | overlap, `01:30Z` at +60 and `02:30Z` at +00   |
| Asia/Kolkata, 2026-06-01 12:00      | unique, `06:30Z`, offset +330                  |
| Pacific/Chatham, 2026-06-01 12:00   | unique, `2026-05-31 23:15Z`, offset +765       |

The non-hour-offset cases confirm that the adapter cannot assume whole-hour offsets. All calculations stayed in integer milliseconds/minutes and used the selected IANA zone.

## Explicit earlier/later resolution

Sorting validated candidates by instant supplies unambiguous choice semantics:

- `earlier` is the candidate with the smaller epoch value;
- `later` is the candidate with the larger epoch value;
- a gap has neither choice and must remain `NONEXISTENT_LOCAL_TIME`;
- a unique boundary ignores any stale disambiguation input;
- an overlap without an explicit stored-in-memory choice remains `AMBIGUOUS_LOCAL_TIME`.

For New York 2026-11-01 01:30:

```text
earlier -> 2026-11-01T05:30Z (UTC-04:00)
later   -> 2026-11-01T06:30Z (UTC-05:00)
```

For Casablanca 2026-09-20 02:30:

```text
earlier -> 2026-09-20T01:30Z (UTC+01:00)
later   -> 2026-09-20T02:30Z (UTC+00:00)
```

This satisfies the architecture policy without relying on “DST” labels, which are not reliable descriptions of every political offset change.

## Overnight-event verification

The prototype advanced the local end date before resolving either boundary. A New York shift spanning the 2026 fall transition was evaluated as:

```text
local start: 2026-10-31 22:00
local end:   2026-11-01 06:00

UTC start:   2026-11-01T02:00Z (offset -240)
UTC end:     2026-11-01T11:00Z (offset -300)
exact span:  9 hours
```

This proves why production code must not resolve the start and then add the nominal eight hours. Both local boundaries must be resolved independently.

## Explicit 24-hour verification

An explicit 24-hour definition ends at the same wall time on the following local date. Independent resolution produced:

| Zone and local interval                       | UTC boundaries      | Exact duration |
| --------------------------------------------- | ------------------- | -------------- |
| New York, 2026-03-07 08:00 → 2026-03-08 08:00 | `13:00Z` → `12:00Z` | 23 hours       |
| New York, 2026-10-31 08:00 → 2026-11-01 08:00 | `12:00Z` → `13:00Z` | 25 hours       |

These are the required semantics: the planner still describes a 1,440-minute nominal civil span, while the ICS event contains the exact instants created by the selected zone's transition.

## Exact bundle measurements

Two browser bundles were built with identical settings. Both explicitly imported `tzdata@1.0.51`, initialized the database, and exported one offset lookup. The generated bundles contained IANA 2026d.

| Import strategy                                                  | Raw bytes | gzip level 9 | Brotli quality 11 |
| ---------------------------------------------------------------- | --------: | -----------: | ----------------: |
| Supported public `timezonecomplete` entry + direct `tzdata`      |   325,453 |       55,277 |            46,400 |
| Unsupported deep `dist/lib/tz-database` import + direct `tzdata` |   260,562 |       41,692 |            34,867 |

Component files, measured separately rather than as a combined bundle:

| File                                         | Raw bytes | gzip level 9 | Brotli quality 11 |
| -------------------------------------------- | --------: | -----------: | ----------------: |
| `tzdata/timezone-data.json` (2026d)          |   207,022 |       28,091 |            22,727 |
| published `timezonecomplete.min.js` UMD file |   157,386 |       29,919 |            26,009 |

The supported public bundle is the approval baseline. The deep import saves 13,585 gzip bytes and 11,533 Brotli bytes, but it depends on undocumented package internals, bypasses the stable public entry, and could break on a patch release. It is rejected.

These are exact outputs for the documented esbuild experiment, not a promise of byte-identical Next.js chunks. Phase 6A4 implementation must record the actual Next.js lazy-chunk delta using the repository build. The timezone code must remain dynamically imported so none of the measured payload is required for initial generator interaction.

## Browser and Node suitability

The package is CommonJS-first:

- `main` points to `dist/lib/index.js`;
- no ESM `module` field or package `exports` map is published;
- TypeScript declarations are included;
- a UMD browser build is published;
- the public CommonJS barrel limits tree-shaking, as the bundle comparison demonstrates.

The installed code ran successfully under the repository's Node 24.12.0 runtime. The esbuild browser target completed and its ESM result could be imported and queried in a smoke test. This does not replace the required Playwright coverage in the supported browsers.

`TzDatabase` is a module singleton and `TzDatabase.init(...)` replaces its process/module state. The production adapter must initialize once with the pinned payload, expose no reinitialization API, and be the only application module allowed to import `timezonecomplete`.

## Supply-chain and maintenance observations

Positive findings:

- both candidate packages use the MIT license;
- `tzdata` contains data and has no runtime dependencies;
- versioned data makes builds deterministic and independent of host ICU;
- data-only releases can track IANA changes independently of library API releases.

Risks:

- the library's exact nested dependency can lag the separately installed direct data;
- two `tzdata` versions are present on disk unless package-manager overrides or future package releases deduplicate them;
- the CommonJS public barrel increases the client chunk;
- safe gap/overlap behavior is not the high-level default;
- explicit initialization mutates a module singleton;
- future political changes still require prompt data updates and redeployment;
- this spike did not perform a long-term maintainer or registry-account security audit.

Do not use an npm override merely to hide the version mismatch unless it is independently tested. Explicit direct initialization and a version assertion are clearer and keep the actual runtime data visible.

## Approval decision

### `tzdata@1.0.51`: approve with maintenance controls

The direct package embeds IANA 2026d, fixes the tested Casablanca transition, supports the tested non-hour zones, and avoids host-data drift. Pin it exactly and expose its version to tests/diagnostics. Monitor IANA releases and update deliberately.

### `timezonecomplete@5.15.1`: approve only behind the resolver adapter

The lower-level public database API supplied correct offsets from the explicit data and enabled zero/one/two-candidate resolution. Its direct `DateTime` behavior does not match product safety policy, its nested data is stale for the Morocco fixture, and its browser bundle is substantial. Approval therefore depends on the adapter, explicit initialization, lazy loading, and regression tests.

### Pair decision

Approve the exact pair for a reviewed Phase 6A4 implementation only if every condition below is accepted:

- exact versions are pinned;
- `TzDatabase.init(directTzdata)` is mandatory and test-observable;
- `directTzdata.version === "2026d"` is asserted for the initial implementation baseline;
- no other module imports the library;
- high-level local `DateTime` construction is forbidden for export resolution;
- gap and overlap candidates are derived and round-tripped explicitly;
- earlier/later choices are user-explicit and export-scoped;
- UTC serialization receives only resolved instants;
- the supported public import is used;
- the pair is lazy-loaded;
- actual Next.js chunk sizes and browser behavior pass the implementation gate;
- Morocco and representative global fixtures remain mandatory tests.

If any condition is rejected, the pair should not be added and a new spike should evaluate a modern ESM library with bundled/versioned IANA data.

## Proposed implementation gate after review

Approval of this document would permit dependency addition and implementation planning, not an immediate unreviewed timed-export release. Phase 6A4 implementation should first land:

1. a pure resolver contract and test fixtures;
2. the isolated lazy adapter with exact initialization;
3. data-version and Casablanca sentinel failures;
4. gap/overlap typed results and explicit selection behavior;
5. overnight and 24-hour boundary tests;
6. actual Next.js chunk measurements;
7. browser tests before serializer/UI integration.

Timed ICS must not be implemented until this spike and dependency decision are explicitly reviewed.

## Exact experiment artifacts and cleanup

Temporary artifacts included package installations, Node scripts, two entry files, two minified bundles, and size measurements. They were created outside the repository solely for this spike. The temporary directory must be removed after the results are recorded and the repository scope verified.

No experiment artifact, generated bundle, package manifest, lockfile, or installed dependency belongs in the repository. This research document is the only intended repository modification.

## Primary package and standards references

Accessed 2026-09-18:

- TimezoneComplete repository: <https://github.com/rogierschouten/timezonecomplete>
- TimezoneComplete npm package: <https://www.npmjs.com/package/timezonecomplete>
- `tzdata` generator repository: <https://github.com/rogierschouten/tzdata-generate>
- `tzdata` npm package: <https://www.npmjs.com/package/tzdata>
- IANA Time Zone Database: <https://www.iana.org/time-zones>
- IANA tzdb 2026c announcement: <https://lists.iana.org/hyperkitty/list/tz@iana.org/thread/NVHSX2PAQIT44U5FCCEVNJJYXQMMTJSA/>
- RFC 5545 iCalendar: <https://www.rfc-editor.org/rfc/rfc5545.html>

## Completion boundary

This spike experimentally verified the embedded IANA versions, current Casablanca behavior, gaps, overlaps, explicit earlier/later candidates, overnight and civil 24-hour semantics, and exact compressed bundle measurements. It recommends a conditional dependency approval with enforceable safeguards. It does not implement timed ICS or modify production dependencies.
