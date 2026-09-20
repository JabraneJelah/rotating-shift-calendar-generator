# Plan 016 — Visual elevation pass (containment, spacing, typography, icon scale)

**Status:** Complete
**Phase:** 7B, Step 4
**Primary specification:** brief text "Phase 7B Step 4 — visual elevation implementation brief"; the referenced `phase-7b-step4-visual-elevation-spec.md` does not exist anywhere in this repository (searched, not found) — this plan works from the approved direction stated inline in that brief (shadows-to-borders as primary containment, systematic spacing rhythm, consolidated typography, consistent icon scale), not from a separate spec document.

## Context

Phase 7A's audit, and Phase 7B Steps 1 and 3, addressed the hero and the unapplied-edits signal. This step is a targeted execution-consistency audit across the generator and its panels: containment (shadow vs. border), spacing values, font-size steps, and icon sizing — plus a repo-wide search for the "three identical cards" pattern named in the research as a specific AI-generated-page signal.

## Non-goals (restated from the brief)

- No panel reordering, DOM order, or heading-rank changes (Step 2, separate).
- No new color token or change to the day/night/off semantic palette.
- No new dependency, icon library, or font.
- No copy/content changes.
- No change to `ScheduleGenerator`'s logic, state, or accessibility behavior beyond incidental class changes.
- No new token in `src/styles/globals.css` — confirmed not needed (see below).
- No commit, push, or deployment.

## 1. Containment/elevation — findings and decision

**All `shadow-` usages found in `src/features` and `src/app` (grep, exhaustive):**

| File:line | Current classes | Role |
|---|---|---|
| `schedule-generator.tsx:1251` | `border-border bg-card rounded-3xl border p-4 shadow-[0_24px_70px_-44px_oklch(0.32_0.07_220/0.38)] sm:p-7 lg:p-9` | Main generator card — static, always-present, the largest container in the app |
| `pwa-controller.tsx:397` | `border-border bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between` | PWA status/update banner — conditionally rendered, has a "Later" dismiss action |
| `timed-export-panel.tsx:230` | `border-border bg-background mt-4 rounded-xl border p-4 shadow-sm` | Timed-export panel — opens on demand, has a "Cancel" action |
| `src/app/offline/page.tsx:22` | `border-border bg-card w-full rounded-3xl border p-6 shadow-[0_24px_70px_-44px_...] sm:p-10` | Offline fallback page's own card |

**Already border-only, no shadow (the pattern being generalized):**
- `local-planner-panel.tsx:152` — `border-border bg-muted/30 mt-6 rounded-2xl border p-4`
- `shift-details-panel.tsx:451` — `border-border rounded-2xl border` (the `<details>` wrapper)
- `date-exception-editor.tsx:155` — `border-border bg-muted/35 rounded-xl border p-4 sm:p-5` (opens on demand, has a "Cancel" action, and already has **no** shadow)

**Decision — one of the four qualifies as genuinely transient/overlaid; the rest do not.** Checked each surface's actual semantics, not just its visual position: `TimedExportPanel` renders with an explicit `role="dialog"` (`timed-export-panel.tsx:231`) — the one accessibility-recognized signal in this codebase that a surface is intentionally a focused, modal-like transient panel, distinct from a plain conditionally-rendered section. `PwaController`'s status panel is a plain `<aside>` with no dialog semantics, and `DateExceptionEditor` — functionally identical to `TimedExportPanel` in behavior (opens on demand, has a dismiss/cancel action) but implemented as a plain `<section>`, no dialog role — already uses border-only with **zero** shadow, proving the border-only treatment already works for that non-dialog "opens and can be dismissed" category. None of the four surfaces are positioned as CSS overlays (no `fixed`/`absolute` stacking, no backdrop) — the dialog *role* is the deciding signal, not visual positioning. Per the approved direction ("reserve shadow for genuinely transient/overlaid surfaces only — confirm which, if any, currently qualify"): **`TimedExportPanel` qualifies and keeps its `shadow-sm`; `schedule-generator.tsx`'s main card and `PwaController`'s banner do not and lose theirs.** `offline/page.tsx` is a separate route not named in this brief's file list and is left untouched, flagged below as a related-but-out-of-scope leftover.

**Radius consolidation.** A two-tier radius pattern already exists in most of the codebase and this pass completes it rather than inventing a new one:
- **Tier 1 (primary/top-level containers):** `rounded-2xl` — already used by `LocalPlannerPanel`, `ShiftDetailsPanel`, `PwaController`. The main generator card (`rounded-3xl`) is brought into this tier.
- **Tier 2 (secondary/nested panels):** `rounded-xl` — already used by `DateExceptionEditor`, the monthly/yearly stat tiles, the yearly per-month tiles. `TimedExportPanel` already uses this tier; unchanged.

No new radius value is introduced; `rounded-3xl` (used only by the two shadow-heavy cards) is retired to `rounded-2xl`, already in use elsewhere.

**Out-of-scope leftover, flagged not fixed:** `src/app/offline/page.tsx:22` still carries the same heavy shadow + `rounded-3xl` this pass removes everywhere else. It is not in this brief's file list (Section 7) and the offline fallback page is a separate, rarely-seen route, not part of "the generator and its panels." Recommend a follow-up pass apply the same fix there for full consistency.

## 2. Spacing rhythm — findings and decision

Audited all `p-*`/`px-*`/`py-*`, `gap-*`, and `mt-*`/`space-y-*` values across `src/features/schedule/components/*.tsx` and `src/features/pwa/*.tsx` (counted, not sampled). The rhythm already in use is disciplined and mostly follows Tailwind's 4px base scale without contradiction:

- **Padding:** dominated by `p-3` (20 uses) and `p-4` (17 uses), with `px-3` (16) for horizontal-only contexts. The main generator card's own `p-4 sm:p-7 lg:p-9` progression is a deliberate, single-element escalation for the app's one largest container — not a stray value competing with anything else, and left as-is.
- **Gap:** `gap-2` (30), `gap-3` (16), `gap-4` (9), `gap-5` (3) — a clean, small, consistent set.
- **Margin-top:** `mt-1` through `mt-6` and `mt-8` all in active, repeated use — a coherent progression.

**One genuine stray found and fixed:** `schedule-generator.tsx:1315` — `<div className="schedule-form-region mt-7">` is the **only** use of `mt-7` anywhere in the audited files, sitting between the otherwise-continuous `mt-6`/`mt-8` steps with no distinguishing purpose. Snapped to `mt-6` (28px → 24px, a 4px, visually negligible adjustment) to remove the sole outlier from the established progression.

**Considered and deliberately left unchanged** (contextually justified, not stray): `gap-0.5`/`p-0.5` in the compact calendar grid (a genuinely space-constrained, single-purpose context), `gap-1.5` in the preset cycle preview's token row, `px-1`/`px-2` on fieldset legends and small badges (purpose-specific, not competing with the `p-3`/`p-4` container-padding rhythm). Changing these would touch many small, single-purpose values for no consolidation benefit and risks the exact kind of layout drift the brief says to avoid ("do not restructure layout... this is about which spacing value is used at each existing position").

## 3. Typography — findings and decision

Counted font-size class usage across the same file set: `text-sm` (101) and `text-xs` (51) dominate as body/label/help-text sizes — already disciplined. Heading-scale sizes are rare and mostly already justified:

| File:line | Current | Role | Verdict |
|---|---|---|---|
| `monthly-calendar.tsx:54`, `yearly-calendar.tsx:54` | `text-2xl font-bold tracking-tight` (flat, no responsive scaling) | `calendar-result-heading` — the reference size Step 3 already measured the hero against | Reference point, unchanged |
| `schedule-generator.tsx:1260` | `text-2xl font-bold tracking-tight sm:text-3xl` | The generator's own intro `<h2>` ("Build your monthly shift calendar") | **Inconsistent — fixed.** At `sm`+ this escalates to 30px, becoming *larger* than the actual result heading (flat 24px) it introduces. This repeats the exact problem Step 3 fixed for the hero (a heading that outranks the actual deliverable it precedes) inside the generator's own card. `sm:text-3xl` removed; both headings now read at the same flat `text-2xl`, differentiated by position and context rather than an unjustified size escalation — consistent with the approved direction that weight/tracking (already shared: both are `font-bold tracking-tight`) should carry differentiation, not raw size. |
| `monthly-calendar.tsx:124`, `yearly-calendar.tsx:132` | `text-xl font-bold` (stat-tile `<dd>` value) | Large number readout inside a `<dl>` stat tile | Genuinely distinct role (data emphasis, not a heading); already consistent between monthly and yearly. Unchanged. |
| `personal-statistics.tsx:52,59` | `text-lg font-bold` (stat-tile `<dd>` value) | The identical "big bold number in a stat tile" role as the row above, in a different component | **Inconsistent — fixed.** Same semantic role as the monthly/yearly stat number, one step smaller for no stated reason. Raised to `text-xl` to match. |

No other font-size step in the audited files lacked a clear, distinct purpose.

## 4. Icon scale — findings and decision

Isolated icon-element (`aria-hidden="true"` lucide icons) sizes specifically, separate from any decorative badge container size:

- **`size-4` (29 occurrences)** — the established inline-with-text icon size, paired with `text-sm` contexts throughout.
- **`size-5` (6 occurrences)** — the established standalone/button icon size: month/year navigation chevrons (`monthly-calendar.tsx`, `yearly-calendar.tsx`), the generator's own section-icon badge, and the site header logo icon. Consistent already; no change.
- **`size-3.5` (3 occurrences)** — `calendar-month-grid.tsx:141` (`size-3.5 sm:size-4`, a calendar cell's shift icon, deliberately smaller at the narrowest, most space-constrained width and scaling to the standard `size-4` at `sm`+ — contextually justified, unchanged) and `schedule-generator.tsx:1275` (the privacy line's `LockKeyhole`, paired with `text-xs` — proportionally correct for its smaller text context, unchanged).

**One genuine outlier found and fixed:** `shift-legend.tsx:70` pairs a `size-3.5` icon with a `text-sm font-medium` label — the same text-size context that pairs with `size-4` everywhere else (29 times). This is the one inline icon that's smaller than its text-size class would predict elsewhere. Raised to `size-4` to match the established `text-sm` ↔ `size-4` pairing. Its surrounding `size-7` decorative badge is a self-contained, single-occurrence shape unrelated to any other badge in the app and is left unchanged — resizing it would be a spacing/layout change, not an icon-scale one.

## 5. Three-equal-cards check

Searched every route under `src/app/` (`about`, `offline`, `page.tsx`, `shift-schedules` hub and both preset guides) for a grid of same-width/height cards each containing an icon, a title, and a paragraph.

**Found: none remaining.** The only instance that ever existed in this codebase was the homepage hero's three-item outcomes row, and Phase 7B Step 3 already removed its chip/card treatment (icon + text now renders inline, no container, no fixed card dimensions). The `shift-schedules` hub page's `sm:grid-cols-2` guide grid was inspected and does **not** match the pattern: it has no icons at all, uses semantic `<article>` elements with real per-item titles/descriptions/links, and its column count (2) is driven by actual data (`shiftScheduleList`), not a fixed decorative count of 3. No other grid-of-cards exists in `about`, `offline`, or either preset guide page. Nothing to restyle here.

## Contrast re-verification (computed, not assumed)

The border/background pairing being extended to a new element (`border-border` on `bg-card`) is not new to the codebase — it already exists unchanged in `LocalPlannerPanel` and `ShiftDetailsPanel`. Computed anyway, for completeness, using the same OKLCH → linear-sRGB → sRGB method as Plan 015:

| Pairing | Tokens | Contrast | Note |
|---|---|---|---|
| `--border` vs `--card` | `oklch(0.88 0.014 210)` vs `oklch(1 0 0)` | **1.43:1** | Below the 3:1 WCAG 1.4.11 non-text-contrast guideline for required UI-component boundaries — but this is a decorative content-grouping border, not the sole means of identifying an interactive control, and it is an **already-shipped, unchanged token pairing** (not introduced by this step); reported honestly rather than claimed as a pass it doesn't computationally reach. |
| `--border` vs `--background` | `oklch(0.88 0.014 210)` vs `oklch(0.985 0.004 180)` | **1.37:1** | Same caveat; used by the same already-existing bordered panels. |

No text color changes in this step, so no text-contrast pairing changes; the values above are the only border/background pairings this step touches (by applying an existing pattern to one more element), and neither is new to the app.

## Files changed

- `src/features/schedule/components/schedule-generator.tsx` — main card: drop shadow, `rounded-3xl` → `rounded-2xl`; intro heading: drop `sm:text-3xl`; `mt-7` → `mt-6`.
- `src/features/pwa/pwa-controller.tsx` — drop `shadow-sm` from the status panel (no dialog role; see decision above).
- `src/features/schedule/components/personal-statistics.tsx` — stat `<dd>` size `text-lg` → `text-xl`.
- `src/features/schedule/components/shift-legend.tsx` — icon `size-3.5` → `size-4`.
- `docs/plans/016-visual-elevation-pass.md` — this file.
- `docs/UI-UX.md` — new containment/spacing section.

No change to `src/styles/globals.css`, `local-planner-panel.tsx`, `shift-details-panel.tsx`, `date-exception-editor.tsx`, `timed-export-panel.tsx` (its `shadow-sm` is kept — it is the one surface with `role="dialog"`), `monthly-calendar.tsx`, `yearly-calendar.tsx`, `calendar-month-grid.tsx`, or any content route.

## Existing test impact

Searched `tests/e2e/homepage.spec.ts`, `tests/e2e/discovery.spec.ts`, and every unit test under `tests/unit/schedule/` for any assertion on the specific classes being changed (`shadow-`, `rounded-3xl`, `sm:text-3xl`, `mt-7`, `text-lg`/`text-xl` on stat values, `size-3.5`/`size-4` on the legend icon). Results reported in the Verification section below once run.

## Test matrix

- Existing `tests/e2e/homepage.spec.ts` overflow suite at 320/390/768/1024/1440px.
- `npm test` and `npm run test:e2e` in full — no test weakened to pass; any genuine assertion on a changed class is updated, not silently dropped.
- Contrast computed above.
- Manual spot-check at 320px and 1440px that spacing consolidation doesn't read as cramped or sparse.

## Acceptance criteria

1. Main generator card and `PwaController`'s banner use border-only containment; shadow is kept only on `TimedExportPanel`, the one surface marked `role="dialog"` (offline page flagged, out of scope).
2. The one genuine spacing outlier (`mt-7`) is consolidated into the existing rhythm; contextually justified small values are left alone and the rhythm is documented.
3. The generator's intro heading no longer outranks the result heading it introduces; the one stat-tile size inconsistency is unified.
4. The one icon-size outlier (`shift-legend.tsx`) is fixed to match the established `text-sm` ↔ `size-4` pairing.
5. Three-equal-cards search completed app-wide; none found remaining (already resolved in Step 3).
6. This plan and `docs/UI-UX.md` updated accurately.
7. Full test suite passes; nothing weakened.
8. Border/background contrast computed and reported honestly, including where it does not reach 3:1.
9. `git status --short` shows only the files listed above.
10. No commit, push, or deployment.

## Verification results (actually run, this environment, Node v22.17.1)

- Searched `tests/e2e/homepage.spec.ts`, `tests/e2e/discovery.spec.ts`, and every file under `tests/unit/schedule/` for assertions on `shadow-`, `rounded-3xl`, `sm:text-3xl`, `mt-7`, the stat-tile `text-lg`/`text-xl` classes, or `size-3.5`/`size-4` on the legend icon — **none found**. No test required updating; none was weakened.
- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — 0 errors.
- `npm test` — 371/371 tests passed (32 files), unchanged — this pass touched no unit-tested logic, only class names.
- `npm run test:e2e` — 49/49 Playwright tests passed, including all 5 no-overflow checks at 320/390/768/1024/1440px.
- Manual visual check via a real browser (dev server + browser pane, screenshots taken): the main generator card renders with a clean border and `rounded-2xl` corners, no visible shadow; the "Shift details" and "Local planners" panels show matching border/radius treatment; spacing reads as intentional, not cramped, at the checked width.
- `npm run build` — Next.js compiled, typechecked, and statically generated all 10 routes successfully; the subsequent `scripts/pwa/generate-pwa.mjs` step exited with "PWA generation requires Node 24; found v22.17.1" — the same pre-existing, environment-only gate documented in Plans 014 and 015, unrelated to this change.

## Verification commands

```powershell
git status --short
git log -3 --oneline --decorate
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```
