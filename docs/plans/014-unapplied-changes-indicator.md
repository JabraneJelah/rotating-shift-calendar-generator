# Plan 014 — Unapplied-changes indicator and Update/Generate button disambiguation

**Status:** Complete (remediation pass — see "Remediation history" below; the first pass's test-matrix claims were overstated and are corrected in this revision)
**Phase:** 7B, Step 1 of 3
**Primary specification:** `docs/research/ux-ia-audit-phase-7a-2026-09.md` (§3, §4, §8, §11 option B/C, §12 items 1/2/3/6)

## Context

Phase 7A's audit found that `hasUnappliedEdits` (`schedule-generator.tsx:284`) is already tracked correctly on every form edit and reset on every commit, but is read in exactly one place outside its own setters (`publishPlannerSafety`) and is never rendered anywhere. The only signal a user has that a change is unapplied is the submit button's text silently switching between "Generate schedule" and "Update schedule" — same icon (`CalendarPlus2`), color, size, and position in both states. Separately, the PWA `PwaController` renders an unrelated "Update now" button lower on the same page with no distinguishing icon, color, or grouping from "Update schedule."

This step wires the existing, already-correct state to real, visible, and accessible UI signals. It does not change when or how `hasUnappliedEdits` is computed, and it does not touch schedule-domain or persistence logic.

## Goals

1. A user who edits any generator field after a schedule has been generated can tell, by looking near the calendar itself (no scrolling to or re-reading the submit button), that the visible calendar no longer reflects their latest edit.
2. The Generate/Update button is visually distinguishable between "nothing pending" and "edits pending" beyond its text label, and its icon differs between the create ("Generate schedule") and apply ("Update schedule") meanings.
3. "Update schedule" and "Update now" (PWA) are visually distinguishable from each other (distinct icons) without renaming either label.
4. The transition into the unapplied-edits state is announced to assistive technology, once per transition, without interrupting or being interrupted by the existing commit-success announcement.

## Non-goals

- No panel reordering (Phase 7B Step 2).
- No heading-rank changes (Phase 7B Step 2).
- No homepage hero changes (Phase 7B Step 3).
- No renaming of "Update now" or any change to `PwaController`'s activation logic, gating, or copy — only its button's icon.
- No new *production* dependency (all icons used already ship in the installed `lucide-react` package). One dev/test-only dependency, `@testing-library/user-event`, was added in a later closeout pass — see "Dev dependency: `@testing-library/user-event`" under Risks below.
- No schedule-domain or persistence-domain logic changes; `hasUnappliedEdits`'s existing trigger and reset sites are unchanged.

## Affected boundaries

- `ScheduleGenerator` remains the single client boundary (D-020) — no new `"use client"` component is introduced.
- D-019's `EditableScheduleState`/`GeneratedScheduleState` separation is unchanged; this step only renders the existing derived boolean and does not let the stale calendar render draft data.
- `PwaController`'s only change is a decorative icon added to its existing "Update now" `<Button>` JSX — no state, gating, or copy change, so its logic boundary is untouched.

## Implementation steps

1. **`schedule-form.tsx`** — accept a new `hasUnappliedEdits: boolean` prop.
   - Icon: `CalendarPlus2` when `!hasGenerated` (unchanged meaning: create); `CalendarSync` when `hasGenerated` (apply-to-existing meaning), regardless of pending state.
   - Variant: `"default"` when `!hasGenerated`; `"default"` with an added `ring-primary/40` treatment when `hasGenerated && hasUnappliedEdits`; `"outline"` (subdued) when `hasGenerated && !hasUnappliedEdits`. The ring deliberately uses the primary/teal token, not amber: amber is this product's established "something needs attention to avoid a bad outcome" signal (`LocalPlannerPanel`'s save-failure/conflict state, which carries real data-loss risk), while an unapplied edit is a normal, expected, fully reversible part of using the form — it should read as "part of the ordinary apply action," which the primary color already means everywhere else in this UI, not as a warning. (This ring color was originally shipped as amber in this plan's first pass, reusing `LocalPlannerPanel`'s token without evaluating that meaning-collision; corrected here.)
   - When `hasUnappliedEdits` is true, append a visually hidden (`sr-only`) suffix inside the button so its accessible name communicates the pending state to keyboard/screen-reader users who tab to it directly, without changing the visible label text used by existing tests/regex matches (`/update schedule/i` still matches as a substring).
2. **`schedule-generator.tsx`**:
   - Pass `hasUnappliedEdits` through to `ScheduleForm`.
   - Add a standalone, visible indicator rendered inside the `generated` block, immediately before the `MonthlyCalendar`/`YearlyCalendar` render (after `ScheduleInsights`), so it sits directly beside the content it describes rather than near the form. Rendered only when `hasGenerated && hasUnappliedEdits`. Icon (`CalendarSync`) + text, non-modal, no focus movement, no `role="alert"`. Uses `border-primary/20 bg-primary/8` (the same restrained tinted-callout pattern already used by `generator-cta.tsx` and the `shift-schedules` guide aside), matching the button ring's primary/teal choice and its rationale, not amber — this box originally shipped with the same amber advisory tokens as `LocalPlannerPanel`'s save-failure/conflict alert; corrected here for the same meaning-collision reason as the button ring.
   - Add a second `aria-live="polite"` sr-only region, separate from the existing `statusMessage` region, carrying a message computed by `computeUnappliedEditsAnnouncement` (a pure, separately exported and unit-tested function — see Testing) so the false→true/true→false transition logic is directly testable rather than only inferable from rendered DOM.
3. **`pwa-controller.tsx`** — add the already-imported `RefreshCw` icon to the "Update now" `<Button>` JSX only. No other change to this file.
4. **`docs/UI-UX.md`** — update the "Optional personal shift details" draft/applied paragraph (and/or the Installation section, for the PWA icon note) to describe the now-visible indicator, the button's differentiated states, and the icon-based disambiguation, matching what is actually shipped.

## Testing

This section describes what is actually implemented and passing, as of the remediation pass, not what was originally intended. The first pass of this plan claimed coverage (seven trigger sites, a "fires once" live-region test, keyboard operability, a Playwright disambiguation test, and driven reset-path tests) that the actual first-pass test file did not deliver — only one of seven trigger paths was exercised, and the "fires once" assertion could not have detected a broken always-re-fires implementation. That gap was identified when directly challenged and is closed as follows.

### Unit/component (`tests/unit/schedule/schedule-generator.test.tsx`)

- **`computeUnappliedEditsAnnouncement` pure-function tests** (4 tests, new): the false→true, true→true, true→false, and false→false transition cases are asserted directly against the exported pure function's return value. This exists because React bails out of re-rendering a `setState` call that repeats an identical primitive value, so a DOM-snapshot test cannot distinguish "the announce-once guard works" from "the guard is broken and fires on every edit" — both produce byte-identical rendered output. Only a direct call/return assertion on the extracted decision function can catch that regression; the `true, true` → `null` case is specifically the one a broken re-firing guard would get wrong.
- **Baseline states** (3 tests): no indicator/no pending button before first generation; settled immediately after first generation; clears after a second edit is applied via the button.
- **Each independent trigger path** (7 tests, new, one per path, not a shared "generic edit" test): mode change (preset→custom), preset change, working-shift change, start-date change, custom-cycle edit, shift-detail edit, shift-detail reset. Each test generates first (resetting the flag to false), performs only that one trigger, and asserts the indicator/announcement/button-ring/accessible-name-suffix all appear. These are seven independently-wired `setHasUnappliedEdits(true)` call sites in the source (six inside `ScheduleForm`'s prop callbacks plus `handleModeChange` handled separately) — none share a handler function, so each test below is a genuinely separate code path, not a relabeled duplicate.
- **Keyboard reachability** (1 test, partial by necessity — see below).
- **Reset via browser-history restoration** (1 test, new): pushes a new V1 URL and dispatches a real `popstate` event (`fireEvent.popState(window)`), driving the actual `handlePopState` → `restoreFromLocation()` listener rather than citing it by line number, and asserts the indicator/button settle while the calendar reflects the newly restored month.
- **Reset via saved-planner load: not covered in this file.** `IndexedDBPlannerRepository` requires a global `indexedDB`, which jsdom (this suite's DOM implementation, version 29.1.1) does not provide — confirmed directly (`'indexedDB' in window` is `false` in a bare jsdom instance). Driving `openPlanner()`/`applySavedPlanner()` here would need either a real browser or a `fake-indexeddb` devDependency, and adding a new dependency is out of scope per this plan's non-goals. See the Playwright test below for the real-IndexedDB-backed version of this path instead.

### Accessibility / keyboard

- Button and indicator accessible-name/state assertions run via Testing Library's accessible-name matchers (`toHaveAccessibleName`), covering what a screen reader would announce.
- **Keyboard test now uses real Tab-order traversal** (`@testing-library/user-event`'s `tab()`, added as a devDependency — see Risks below), rather than jumping to an element with a bare `.focus()` call. It edits the start-date field, then calls `userEvent.tab()` repeatedly (bounded, not asserting an exact hop count so it isn't brittle to unrelated layout changes) until the real tabbable-element order reaches the submit button, confirms the button's accessible name correctly includes "pending" at that point in the traversal, and confirms a real `{Enter}` keypress (via `userEvent.keyboard`, which replicates the browser's default Enter-activates-focused-button action, unlike a bare `fireEvent.keyDown`) submits the form. Run against the actual implementation, this test passed on the first attempt — it did not surface a focus-order or reachability defect; nothing in production code changed because of it. It still does not exercise arrow-key radio-group navigation, which was never in scope.

### Responsive/E2E (Playwright, `tests/e2e/homepage.spec.ts`)

- Existing no-overflow assertions at 320/390/768/1024/1440px still pass with the indicator visible.
- Existing generate/update/commit flow e2e tests continue to pass unmodified in behavior (label-substring matches remain valid).
- **New:** "clears unapplied-edit state when a different saved planner is opened" — saves a planner, duplicates it, dirties the form, opens the *other* saved planner via the real `Open` button (real IndexedDB, real browser), and asserts the indicator/announcement/button settle. This is the saved-planner-load reset-path coverage the unit suite cannot provide.

### Playwright PWA disambiguation (`tests/e2e-pwa/pwa.spec.ts`) — written, **not verified passing**

- **New:** `distinguishes "Update schedule" from "Update now" by icon at 390px` / `at 1024px` — generates a schedule, forces a second service-worker release via the existing release-swap helper pattern (same mechanism the pre-existing "waits for safe multi-tab approval" test uses) so `PwaController`'s "Update now" banner appears, dirties the form so "Update schedule" is simultaneously in its pending state, and asserts each button's icon (`svg.lucide-calendar-sync` vs. `svg.lucide-refresh-cw`) is present on the correct button and absent from the other, at both viewports.
- **Actual result: both fail with the same `Test timeout of 30000ms exceeded` at the shared `waitForServiceWorkerControl` helper's `navigator.serviceWorker.ready` wait** — and this is not specific to the new test. The pre-existing, unmodified `serves the approved manifest...` test in the same file was run in isolation first and fails identically, at the identical line, for the identical reason: `public/sw.js` on disk (last modified today at 12:54, before this session's code changes) predates the `.next` production build this session generated (19:12), because `scripts/pwa/generate-pwa.mjs` — the only thing that regenerates `sw.js` — hard-requires Node 24 and this environment has Node 22.17.1, so it could not be regenerated to match. The stale precache manifest never lets the service worker install/activate under a mismatched build, so every test in this file that depends on `waitForServiceWorkerControl` times out, independent of anything this remediation pass changed. This is written as real, reviewable source and the disambiguation logic (icon-class assertions) has not been exercised at all — it is unverified, not passing.

### Regression

- `LocalPlannerPanel` and its own save-state badge/retry UI are untouched and unaffected.
- All existing schedule-domain, presentation, and export tests are unaffected (no domain logic changed).

## Documentation changes

- `docs/UI-UX.md`: describe the shipped indicator, button states, and icon disambiguation once implemented (not before).
- This plan file, updated to "Complete" with final exit criteria once done.

## Risks / open decisions

- **Environment:** this repository requires Node `>=24 <25` (`package.json` engines, D-009); the implementation environment has Node v22.17.1 installed with no version manager available, matching the exact mismatch Phase 7A hit. `npm test` and `npm run test:e2e` (the non-PWA suite) run successfully to completion in this environment and all tests pass. `npm run build`'s final PWA-generation step, and the entire separate `test:e2e:pwa` suite, cannot produce trustworthy results here: the PWA generation script hard-requires Node 24, so `public/sw.js` cannot be regenerated to match this session's build, and every PWA e2e test that waits for service-worker control times out as a result — demonstrated concretely against a pre-existing, unmodified test in that suite, not just asserted.
- **Resolved (was flagged, now fixed by explicit request):** the visible indicator box beside the calendar previously still used the amber advisory background/border/text tokens shared with `LocalPlannerPanel`'s save-failure/conflict alert, flagged in the prior pass as an open inconsistency rather than fixed unilaterally. It now uses `border-primary/20 bg-primary/8`, matching the button ring's color and rationale.
- The Playwright PWA-disambiguation test still has a concrete, stated environment-caused gap (see Testing above): written, not verified passing.
- **Dev dependency: `@testing-library/user-event@14.6.7`** (pinned exact, no range), added to `devDependencies` in this closeout pass. Why: jsdom (this project's unit-test DOM) implements no Tab-key focus traversal at all — that is a real-browser default action outside the DOM spec jsdom emulates — so the keyboard-operability test could previously only call `.focus()` directly on a chosen element, not prove a real Tab order actually reaches it. `user-event`'s `tab()` computes the real tabbable-element order and moves focus the way a browser's own default Tab handling would; its `keyboard()` also replicates default actions like Enter-activates-a-focused-button, which a bare `fireEvent.keyDown` does not. Scope: dev/test-only — it is listed under `devDependencies`, is never imported by any file under `src/`, and is not part of the Next.js build graph or client bundle. Compatibility checked before installing: `user-event@14.6.7`'s only peer requirement is `@testing-library/dom >=7.21.4`; this project already has `@testing-library/dom@10.4.2` (a transitive dependency of `@testing-library/react`), so no peer-dependency conflict existed and the install required no forcing.

## Status checklist

- [x] Plan written
- [x] `schedule-form.tsx` updated (ring color corrected to `ring-primary/40` in remediation pass)
- [x] `schedule-generator.tsx` updated (`computeUnappliedEditsAnnouncement` extracted as a pure, tested function in remediation pass; indicator box color corrected to primary in this closeout pass)
- [x] `pwa-controller.tsx` icon added
- [x] `docs/UI-UX.md` updated (color rationale corrected in remediation pass; indicator box color noted in this closeout pass)
- [x] Unit/component tests added — 7 trigger paths, 4 pure-function transition cases, 1 real-Tab-order keyboard test, 1 driven popstate-reset test (16 tests total in this area)
- [x] E2E test added for the saved-planner-load reset path (real IndexedDB) — passes
- [~] E2E test added for PWA icon disambiguation — written, **not verified passing** (environment-blocked; see Testing)
- [x] Verification commands run and results reported (see Verification results below)

## Remediation history

The plan and code shipped in the first pass overstated their own test coverage: the test-matrix section above claimed coverage for six/seven trigger paths, a "fires exactly once" live-region guarantee, keyboard operability, and a PWA-disambiguation Playwright test, none of which the actual first-pass test file delivered (it tested one trigger path via a shared "edit the date" case, and its "fires once" assertion could not have caught a broken always-re-fires implementation). The amber ring also reused a color already carrying a more severe, unrelated meaning elsewhere in the app, without evaluating that collision. Both were identified only when directly challenged on the specific claims, not caught by the process that produced them. The second (remediation) pass corrected the color, extracted and directly tested the announcement-guard logic, added one test per real trigger path, added a partial keyboard test (`.focus()` only, since Tab traversal itself wasn't tested), added a driven URL-restoration reset test and a real-IndexedDB saved-planner-load reset test, and wrote (but could not verify) a PWA-disambiguation Playwright test.

This third (closeout) pass fixes the two items explicitly approved after that report: the indicator box's amber background was replaced with the same primary tint used on the button ring, and `@testing-library/user-event@14.6.7` was added (pinned, dev-only) so the keyboard test could be rewritten to drive a real Tab traversal instead of a direct `.focus()` call. Run against the existing implementation, the real-Tab-order test passed on its first run — no focus-order or reachability defect was found, and no production code was changed to make it pass.

## Verification results (actually run, this environment, Node v22.17.1)

- `npm run format:check` — reports the same pre-existing repo-wide CRLF/LF warnings Phase 7A documented; touched files contain no genuine content-formatting diff beyond line endings.
- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — 0 errors.
- `npm test` — 371/371 tests passed (32 files) — same total as the remediation pass, since the keyboard test was rewritten in place (1 test replaced by 1 test), not added alongside.
- `npm run test:e2e` — 49/49 Playwright tests passed, including the saved-planner-load reset test and all 5 no-overflow checks at 320/390/768/1024/1440px.
- `npx playwright test --config=playwright.pwa.config.ts -g "distinguishes"` — still **2/2 failed** for the same pre-existing, environment-caused reason (not re-attempted to fix in this pass — out of scope for this closeout, which was limited to the two approved items).
- `npm run build` — not re-run in this closeout pass (out of scope; unchanged from the remediation pass's result: Next.js build succeeds, PWA-generation step fails on the Node 24 requirement).

## Verification commands

```bash
git status --short
git diff --stat
npm run lint
npm run typecheck
npm test
npm run test:e2e
npx playwright test --config=playwright.pwa.config.ts -g "distinguishes"
npm run build
```
