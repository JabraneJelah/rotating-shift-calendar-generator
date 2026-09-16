# Testing strategy

## Layers

- **Domain unit tests:** the primary safety net for pattern expansion and date boundaries. Cover approved sequences explicitly, malformed untrusted input, positive and negative offsets, inclusive limits, Gregorian leap rules, month/year changes, query round trips, and canonical serialization.
- **Component tests:** React Testing Library tests for accessible roles, labels, validation, view switching, state changes, print invocation, and rendered results. Test behavior rather than Tailwind class strings.
- **End-to-end tests:** a small Playwright suite for critical journeys in a real browser. It covers preset and custom generation, keyboard activation, reload and history restoration, invalid states, leap day, month/year navigation, active-view print behavior, print-media visibility, and phone-to-desktop overflow.
- **ICS unit tests:** explicit RFC 5545 envelope, CRLF, date-only boundaries, exclusive ends, summaries, ordering, deterministic identity, injected timestamps, escaping, UTF-8 folding, filename/MIME, and typed invalid-input behavior.
- **Build and static checks:** strict TypeScript, ESLint, Prettier, and the production build are required checks.

## Commands

| Check                  | Command                |
| ---------------------- | ---------------------- |
| Formatting             | `npm run format:check` |
| Lint                   | `npm run lint`         |
| Types                  | `npm run typecheck`    |
| Unit/components        | `npm test`             |
| Unit watch mode        | `npm run test:watch`   |
| Production build       | `npm run build`        |
| Browser smoke/journeys | `npm run test:e2e`     |

Run `npx playwright install chromium` once if the local browser binary is absent. A missing browser should be reported precisely; it does not invalidate passing unit, lint, type, or build checks.

## Test conventions

Place shared setup in `tests/setup.ts`, unit/component tests in `tests/unit`, and browser tests in `tests/e2e`. Keep fixtures small and name patterns explicitly. Freeze or inject time when behavior depends on today. Never rely on the machine's locale or time zone for date-only assertions.

Schedule tests must assert explicit values rather than snapshots. Boundary coverage includes supported years, invalid civil dates, cycle lengths 56/57, range lengths 366/367, and dates on both sides of a pattern start. Any schedule-logic change requires a regression test that would fail under the previous behavior.

Year-view tests assert one ordered set of twelve month models, 365/366 complete and unique dates, leap day, phase continuity when the anchor lies outside the displayed year, annual totals, supported-year navigation boundaries, semantic table names, transient URL behavior, and return to the preserved monthly view.

Date-only tests must not rely on the machine's local zone. The domain suite should run under at least `TZ=UTC` and `TZ=America/New_York` when the environment permits, with identical results. Daylight-saving-adjacent dates are calendar days and must not be skipped or duplicated.

Every bug fix should add the smallest regression test at the lowest useful layer. Do not claim a command passed unless it was run in the current change.

Generator component tests use roles, labels, table captions, and accessible cell names rather than implementation classes. They cover default state, editing, error connections and focus, visible shift labels, counts, canonical URLs, navigation, direct-link restoration, leap February, and exhaustive domain-error copy. Shared Testing Library cleanup lives in `tests/setup.ts`.

Browser tests exercise 320, 390, 768, and 1440 CSS-pixel widths and assert that generated results do not increase document width. Representative phone, tablet, and desktop screenshots are inspected outside the repository. URL lifecycle tests include reload plus browser Back/Forward so native-history regressions cannot hide behind unit mocks.

Print coverage stubs only `window.print` when verifying explicit activation, and uses Playwright print-media emulation to ensure chrome, configuration, and actions disappear while the active calendar, context, totals, and legend remain. CSS pagination is also inspected through representative Chromium PDF output; exact physical pagination is not treated as portable across browsers or printer settings.

Share/export component tests mock only clipboard and object-URL browser boundaries and restore those mocks after each test. They cover hidden/visible action state, canonical visible-month links, accessible success, rejection fallback, manual-copy values, Blob type, safe filename, and URL revocation. Playwright injects a deterministic clipboard implementation where direct system clipboard permissions would be unreliable, captures the real browser download, reads its contents, and asserts that every exported start date belongs to the visible month.

Calendar import compatibility is based on the RFC 5545 subset exercised here: all-day `VEVENT`s with date-only exclusive ends, unique stable UIDs, UTC `DTSTAMP`, escaped/folded text, and CRLF. Tests do not claim vendor-specific support for recurring rules, time zones, alarms, or timed shifts because those features are not emitted.
