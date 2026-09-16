# Testing strategy

## Layers

- **Domain unit tests:** the primary safety net for pattern expansion and date boundaries. Cover approved sequences explicitly, malformed untrusted input, positive and negative offsets, inclusive limits, Gregorian leap rules, month/year changes, query round trips, and canonical serialization.
- **Component tests:** React Testing Library tests for accessible roles, labels, validation, state changes, and rendered results. Test behavior rather than Tailwind class strings.
- **End-to-end tests:** a small Playwright suite for critical journeys in a real browser. Phase 1 contains a homepage smoke test; Phase 2 should cover completing a schedule on mobile and desktop viewports.
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

Date-only tests must not rely on the machine's local zone. The domain suite should run under at least `TZ=UTC` and `TZ=America/New_York` when the environment permits, with identical results. Daylight-saving-adjacent dates are calendar days and must not be skipped or duplicated.

Every bug fix should add the smallest regression test at the lowest useful layer. Do not claim a command passed unless it was run in the current change.
