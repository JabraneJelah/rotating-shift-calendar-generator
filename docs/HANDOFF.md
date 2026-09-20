# Handoff

Last updated: 2026-09-20.

This file is the continuity anchor between sessions. It records exact Git state,
what was last completed, what was verified, and what is explicitly deferred —
not started, not decided. Prefer this file over conversation memory.

## Current HEAD and push state

- Branch: `main`
- HEAD: `56791a0` — "docs: add Phase 7A UX/IA audit"
- `origin/main`: `c19080d` — "feat: add installable offline PWA"
- HEAD is **two commits ahead of `origin/main`**, not yet pushed:
  - `d0bae18` — feat: add visible unapplied-changes indicator and differentiated update action
  - `56791a0` — docs: add Phase 7A UX/IA audit
- Working tree was clean at the time this file was written (`git status --short` produced no output).
- No push has been authorized. Do not push without explicit user authorization.

## Most recently completed work

**Phase 7B Step 1 — visible unapplied-changes indicator and differentiated Update action** (`d0bae18`).

- `hasUnappliedEdits` (previously computed but never rendered) is now wired to a real, visible,
  non-color-only UI indicator when a generator setting is edited after a schedule has already
  been generated.
- The apply/update action is now visually distinct from its settled state (icon + primary-tinted
  styling, not text alone), and the PWA's "Update now" action and the schedule form's "Update
  schedule" action are visually disambiguated from each other. Both were moved off the amber
  treatment the codebase already uses for `LocalPlannerPanel` save-failure/conflict states, onto
  a primary-tinted treatment appropriate to a normal, reversible, non-urgent state.
- A live-region announcement fires on entry into the dirty state (verified via a pure-function
  call-count test, not a DOM-length check); all 7 independent state-mutating paths are tested
  individually; keyboard Tab-order is covered with `@testing-library/user-event` (dev-only,
  pinned); Playwright covers the two-buttons visual distinction and clearing on saved-planner load.

Preceded by a research-only commit, **`56791a0` — Phase 7A UX/IA audit**, which traced five
reported real-user problems to specific code-level causes and proposed options (not decisions)
for Phase 7B. No production code changed in that commit.

Source documents:
- `docs/plans/014-unapplied-changes-indicator.md`
- `docs/research/ux-ia-audit-phase-7a-2026-09.md`

## Verified test state at handoff

As of 2026-09-20, per the `d0bae18` commit message and confirmed executed on the Windows
development machine (not merely claimed):

- **371/371 unit tests** passing
- **49/49 e2e tests** passing
- Lint clean
- Typecheck clean

This is the last point at which these were actually run and confirmed. Re-run before trusting
this state on a later date or after further changes.

## Explicitly deferred — not started

- **Phase 7B Step 2** — reorder so the calendar result appears before the Local Planners/PWA
  panels in DOM order; correct heading ranks so the calendar result is not at the same semantic
  heading level as secondary panels.
- **Phase 7B Step 3** — homepage hero restyle: remove or reduce the gradient, the marketing-style
  pill badge, and the oversized headline identified in the Phase 7A audit, §6.
- **PWA "Update now" label wording change** — deferred by explicit user decision. The visual fix
  (a distinct icon) already shipped in Step 1 (`d0bae18`); the label text itself was intentionally
  left unchanged.
- **Phase 6B2C (PWA/offline build architecture)** — prior research left this at a "no-go,
  conditional approval pending" state: Workbox was rejected on security/maintenance grounds, and
  two approvals were requested (replacing Workbox with a native generator; a `.gitattributes`
  CRLF decision — `.gitattributes` does not currently exist in the repository).

  **Open question, not resolved here:** an installable offline PWA feature does appear to already
  be shipped, as of `c19080d` ("feat: add installable offline PWA", committed 2026-09-20T15:05:45Z,
  the current `origin/main` tip). This post-dates the Phase 6B2C research that `docs/research/`
  currently documents (`pwa-build-spike-2026-09.md`, `pwa-offline-specification-2026-09.md`, and
  related timezone/dependency spike docs). The relationship between the committed PWA feature in
  `c19080d` and the earlier Phase 6B2C no-go / conditional-approval research is **currently
  undocumented**. This is flagged here as a documentation gap for a future session to resolve
  (e.g., by checking whether `013-pwa-offline-implementation.md` or a later research addendum
  records the approvals being granted), not as a fact this file is asserting one way or the other.

## Known environment note

This repository's installed `node_modules` contains Windows-native bindings (e.g. `rolldown`).
Test and build commands must be run on a matching OS/architecture (the Windows development
machine) — do not assume they will run in an arbitrary Linux sandbox.

## Known housekeeping item

A stray `.git/index.lock` has recurred at least once in this repository's history during Cowork
sessions. If it appears again, it is safe to delete as long as no git command is actively running.
