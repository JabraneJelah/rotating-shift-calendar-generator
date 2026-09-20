# Handoff

Last updated: 2026-09-20.

This file is the continuity anchor between sessions. It records exact Git state,
what was last completed, what was verified, and what is explicitly deferred —
not started, not decided. Prefer this file over conversation memory.

## Current HEAD and push state

- Branch: `main`
- HEAD: `14f0067` — "style: consolidate containment, spacing, typography, and icon scale"
- `origin/main`: `c19080d` — "feat: add installable offline PWA"
- HEAD is **six commits ahead of `origin/main`**, not yet pushed:
  - `d0bae18` — feat: add visible unapplied-changes indicator and differentiated update action
  - `56791a0` — docs: add Phase 7A UX/IA audit
  - `e61c17a` — docs: add HANDOFF.md continuity anchor
  - `44e9c5e` — style: restyle homepage hero to match restrained product identity
  - `99fccbd` — docs: update HANDOFF.md for Phase 7B Step 3 completion
  - `14f0067` — style: consolidate containment, spacing, typography, and icon scale
- Working tree was clean at the time this file was written (`git status --short` produced no output).
- No push has been authorized. Do not push without explicit user authorization.

## Most recently completed work

**Phase 7B Step 4 — containment, spacing, typography, and icon scale consolidation** (`14f0067`).

- Execution-consistency pass across the generator and its panels, informed by Linear/Cron/
  Fantastical/Notion Calendar as restraint reference points, following the same "feels
  AI-generated" thread Steps 1 and 3 addressed.
- Main generator card and the PWA status panel moved from a soft floating-card shadow to
  border-only containment, matching `LocalPlannerPanel`/`ShiftDetailsPanel`'s existing pattern.
  Shadow was kept only on `TimedExportPanel`, the one surface marked `role="dialog"` — the actual
  accessibility signal used to decide "transient/overlaid," not visual position. Generator card
  radius unified from `rounded-3xl` into the existing `rounded-2xl` tier.
- The generator's own intro heading no longer escalates to `sm:text-3xl`, which made it larger
  than the result heading (flat `text-2xl`) it introduces — the same bug class Step 3 fixed in
  the homepage hero, found recurring here and fixed the same way.
- One stat-tile size inconsistency and one icon-size outlier unified to already-established
  conventions; one spacing outlier (`mt-7`, the only use anywhere) folded into the existing
  rhythm.
- Repo-wide search for the "three-equal-cards" AI-generated-page signal: none found remaining
  (already resolved by Step 3's hero restyle).
- No new token, no new dependency, no logic/state/accessibility-behavior change. No existing
  test required updating.

Source document: `docs/plans/016-visual-elevation-pass.md`.

**New tracked follow-ups from this work (not resolved here):**

- `src/app/offline/page.tsx` still uses the pre-Step-4 shadow + `rounded-3xl` treatment. Apply
  the same containment fix for consistency whenever that route is next touched.
- The `border-border`/`bg-card` and `border-border`/`background` pairings compute to **1.43:1**
  and **1.37:1** respectively — below WCAG 1.4.11's 3:1 non-text-contrast guideline. This is
  pre-existing (not introduced by Step 4) but is now used by a third element (the generator
  card). Needs a dedicated accessibility review/fix; do not silently extend this pairing to
  further new elements until resolved.

Preceded by **Phase 7B Step 3 — homepage hero restyle** (`44e9c5e`).

- Real-user testing reported the site "feels AI-generated"; Phase 7A's audit traced this to a
  concentrated set of choices in the homepage hero specifically, not the design-token system.
- Removed the only gradient in the codebase (the radial gradient behind the hero copy) and its
  now-unnecessary containing wrapper; changed the eyebrow line from a rounded-pill badge to plain
  text, matching the convention the generator itself already uses; reduced the headline from
  `text-4xl/5xl/6xl` to `text-lg/xl` so it reads as clearly, visibly subordinate to the generator's
  own result heading (`text-2xl`) rather than merely "not larger"; removed the chip container
  around each outcomes-row icon, matching the plain icon+text convention already used elsewhere in
  the app; kept the CTA's trailing arrow as a legitimate in-page jump affordance.
- No new token, no new dependency, no client-boundary change. Contrast computed (not assumed) for
  every hero text/background pairing; all pass AA. No existing test required updating.

Source document: `docs/plans/015-homepage-hero-restyle.md`.

Preceded by **Phase 7B Step 1 — visible unapplied-changes indicator and differentiated Update action** (`d0bae18`).

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
- `docs/plans/015-homepage-hero-restyle.md`
- `docs/plans/016-visual-elevation-pass.md`
- `docs/research/ux-ia-audit-phase-7a-2026-09.md`

## Verified test state at handoff

As of 2026-09-20, confirmed executed on the Windows development machine (not merely claimed),
re-confirmed again at `44e9c5e` (Step 3 touched no unit-tested logic; the e2e suite was re-run
in full and passed with the restyled hero in place), and re-confirmed again at `14f0067` (Step 4
was also a styling-only pass; both suites were re-run in full — the e2e run was repeated a second
time after an unrelated dev-server restart during manual verification, with the same result):

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
