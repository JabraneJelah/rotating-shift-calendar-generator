# UX & Information-Architecture Audit — Phase 7A

**Date:** 2026-09-20
**Author:** Continuing product/engineering assistant (Claude), per Phase 7A task brief
**Status:** Audit and specification only. No production code, tests, or configuration were modified.

## 0. Repository/version state confirmation

- **Repository:** `JabraneJelah/rotating-shift-calendar-generator`, branch `main`.
- **HEAD at audit time:** `c19080d` — "feat: add installable offline PWA" (`git log -5 --oneline --decorate` confirms this is also `origin/main`).
- **Working-tree state:** At the start of this session the tree was **not** clean — 86 files showed as modified. Independent inspection (`git diff --numstat`, `git diff --ignore-cr-at-eol --stat`) confirmed every one of those diffs had identical insertion/deletion counts and vanished entirely under `--ignore-cr-at-eol`: pure CRLF/LF line-ending churn from the local Windows checkout, not content changes. With the user's explicit authorization, the tree was restored with `git restore .`, confirmed clean (`git status --short` empty, `git log -1` still `c19080d`), and `core.autocrlf` was set to `true` locally per the user's instruction. **No `.gitattributes` was added and no `git add --renormalize` was run** — line-ending normalization remains an open item for a separate, dedicated change, not this phase.
- All findings below are read against HEAD `c19080d` with a clean tree, as instructed.
- **A stale `.git/index.lock` (0 bytes)** exists in the working copy and could not be deleted (delete permission on the connected folder was not requested, since it wasn't necessary for this read-only phase). It did not block any read command (`status`, `diff`, `log`, `config` all worked normally) but would likely block a future `git commit` until removed.

### Documents that exist vs. don't

| Document | Status |
|---|---|
| `AGENTS.md` | Exists (27 lines) |
| `docs/PRODUCT.md` | Exists (78 lines) |
| `docs/DOMAIN.md` | Exists (195 lines) |
| `docs/ARCHITECTURE.md` | Exists (124 lines) |
| `docs/UI-UX.md` | Exists (109 lines) |
| `docs/DECISIONS.md` | Exists (350 lines) |
| `docs/ROADMAP.md` | Exists (143 lines) |
| `docs/TESTING.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/SEO.md` | Exist |
| `docs/HANDOFF.md` | **Does not exist** |
| `docs/PROJECT-CONTEXT.md` | **Does not exist** |

`docs/research/` contains 8 specification/spike documents (advanced-personal-planner, competitive-product-audit, local-persistence-and-backup, preset-library, pwa-build-spike, pwa-offline, timed-ics-timezone, timezone-dependency-spike — all dated 2026-09). `docs/plans/` contains 13 numbered implementation plans (001 through 013) plus a README. None were read in full for this audit beyond what's cited below; they were listed so a later phase can cite the right one rather than guessing.

### Environment note (not a Phase 7A finding, but relevant to trusting the verification commands below)

The installed Node.js in this environment is **v22.23.2**, while `package.json` (`engines`) and D-009 require **Node 24.x**. This is almost certainly why `npm test` failed (see §8 below) — not a defect in the application code. This is flagged for awareness, not as a UX finding.

## 1. Method

This audit is **static-inspection-based, not a live-app walkthrough**. I attempted to start `next dev` in the background on the linked device to validate runtime behavior directly, but the shell tool available in this session runs each command in a fresh process context that does not keep a backgrounded dev server alive between calls — the process was gone by the next check, with no compile output logged. Per the brief's stop condition, I am reporting this rather than guessing at runtime behavior. Every claim below is therefore sourced from one of:

- Direct source reading with file path and line citation (marked **[code]**).
- The project's own committed documentation (marked **[doc]**).
- An existing, already-written Playwright end-to-end test, read as a specification of intended behavior rather than executed (marked **[test-source]** — I did not run it; see §8).

No claim in this document is based on memory of older summaries or on assumption.

## 2. Full current-workflow walkthrough (as reconstructed from code)

The generator lives entirely inside one component tree rooted at `ScheduleGenerator` (`src/features/schedule/components/schedule-generator.tsx`, 1,441 lines), the application's single Client Component boundary per D-020. The homepage (`src/app/page.tsx`) renders a marketing hero, then `<ScheduleGenerator />` inside a `#generator` anchor, then supplementary content sections.

**Render order inside `ScheduleGenerator`** (confirmed at `schedule-generator.tsx:1207-1441`), top to bottom, every time the page is in a "something has been generated" state:

1. Link-restoration error alert (conditional)
2. Submission error alert (conditional)
3. **`ScheduleForm`** — schedule-type radios, preset select, working-shift radios, preset cycle preview, pattern start date, the collapsed "Shift details (optional)" `<details>` disclosure, and the Generate/Update submit button (`schedule-generator.tsx:1268-1310`)
4. **`LocalPlannerPanel`** — the full named-planner persistence UI: save-state badge, save form or open/rename/duplicate/delete/import/export controls (`schedule-generator.tsx:1315-1332`)
5. **`PwaController`** — install prompt and app-update banner (`schedule-generator.tsx:1334`)
6. A screen-reader-only live region
7. *Only if a schedule has been generated:* `ScheduleViewControls` (Month/Year + week-start toggle), `DateExceptionEditor` ("Add or edit date"), `ScheduleActions` (copy link, ICS export, print, timed export), `ScheduleInsights` ("Up next"), and **only then** `MonthlyCalendar` or `YearlyCalendar` — the actual calendar grid that answers "what shift do I have."

So the literal DOM order a first-time user scrolls through, after generating a schedule, is: **settings form → planner-management panel → PWA update banner → view toggle → date-exception editor → export/print actions → insights box → the calendar itself.** The calendar — the one artifact the entire product exists to produce — is the *eighth* thing on the page, behind two full secondary features (local planner persistence, PWA installation/updates) that have nothing to do with reading today's schedule.

The whole tree — form, planner panel, PWA controller, and the eventual result — sits inside a single visually undifferentiated container: `<section aria-labelledby="generator-title" className="border-border bg-card rounded-3xl border p-4 shadow-[0_24px_70px_-44px_...] sm:p-7 lg:p-9">` (`schedule-generator.tsx:1204-1206`). There is no visual boundary inside that card separating "your settings" from "your result" — everything is one continuous card.

## 3. Explicit state model (as it exists in code)

The codebase does implement the draft/applied separation the product principles call for (D-019), and it is reasonably well-named:

- **`EditableScheduleState`** (`schedule-generator.tsx:100-106`) — the live, possibly-invalid form draft: mode, preset, working shift, start date (string, can be empty), custom cycle.
- **`GeneratedScheduleState`** (`schedule-generator.tsx:108-112`) — the last successfully validated and committed result: a validated `ScheduleConfig`, the derived `MonthlyCalendarView`, and the applied planner registry (or `null`).
- **`hasUnappliedEdits`** (`schedule-generator.tsx:284`) — a boolean that is explicitly set to `true` on *every* form field change (mode, preset, working shift, start date, custom cycle, shift-detail edits and resets — six call sites, `schedule-generator.tsx:1280-1309`) and reset to `false` only when a commit succeeds (`schedule-generator.tsx:758` and three other commit paths).

So the application **already knows, at all times, whether the form contains unapplied changes relative to what's on screen.** This is exactly the signal a "your calendar may be out of date" indicator would need.

**Root cause of problem #1 and #2, found and cited:** `hasUnappliedEdits` is read in exactly one place outside its own setters — a `useEffect` (`schedule-generator.tsx:291-316`) that feeds it into `publishPlannerSafety(...)`, which only controls whether it's safe to autosave, refresh, or activate a PWA update. **`hasUnappliedEdits` is never read anywhere in the rendered JSX.** A grep across every component in `src/features/schedule/components/` for "unapplied," "unsaved changes," "pending changes," or "draft" (excluding planner/backup/import terminology, which is a separate concept) returns *no visible UI surface at all* for this flag. There is no banner, no badge next to the calendar, no dimming or overlay on the stale calendar, and no text anywhere telling the user "you've changed something; press Update to see it."

This is precisely why a user can change a setting and see nothing happen: nothing *is* visually happening, even though the app has already correctly detected the edit. The only feedback that exists is the text label on the submit button itself flipping from "Generate schedule" to "Update schedule" (see §4) — which requires the user to already be looking at, and to correctly interpret, a button they have scrolled past.

**Other states present in code**, named informally rather than as a documented enum:
- Unconfigured/empty draft (`startDate: ""`, no `generated` yet)
- Invalid draft (`fieldErrors` populated, `generalErrors` populated) — visibly handled with an error summary and `aria-describedby` (`schedule-generator.tsx:1234-1250`, matches D-016/UI-UX validation section)
- Valid, generated/committed (`generated !== null`)
- Generated with unapplied edits (`generated !== null && hasUnappliedEdits`) — **the state with no visible representation**
- Saved planner (`activePlanner !== null`, `saveState === "saved"`)
- Saved planner with unapplied edits (`activePlanner !== null && hasUnappliedEdits`) — also has no visible representation beyond the button label, even though this is arguably the highest-stakes ambiguity (did my edit get saved to the named planner, or not?)
- Save-state variants that *are* visibly handled inside `LocalPlannerPanel`: `unsaved`, `saving`, `saved`, `failed`, `conflict`, `unavailable` (`local-planner-panel.tsx:46-64`, rendered as a pill badge at `local-planner-panel.tsx:168`, with visible retry/reload actions for `failed`/`conflict` at `local-planner-panel.tsx:182-202`)

## 4. Where "Update" appears, and why it's easy to miss

**[code]** The only place the word "Update" appears as the primary generate/apply action is `schedule-form.tsx:269`:

```
{hasGenerated ? "Update schedule" : "Generate schedule"}
```

This is a single `<Button>` at the very bottom of `ScheduleForm`, after: the schedule-type radio fieldset, the preset select and its preview, the working-shift radios, the pattern-start-date field, and the entire `ShiftDetailsPanel` — a native `<details>` disclosure titled "Shift details (optional)" (`shift-details-panel.tsx:451-453`) that, when expanded, contains labelled name/short-label/color/time/24-hour/break controls for both Day and Night definitions. Collapsing that panel doesn't change where the button sits relative to page content above it, but it does mean the button is the very last control in a form with roughly a dozen interactive fields above it once shift details are open.

Concretely, a first-time user who has already generated a schedule and wants to see the effect of a change has to:
1. Notice nothing happened automatically (because nothing did — see §3).
2. Recall or realize the fix is to scroll back up to the form.
3. Scroll past every control in the form again.
4. Notice that a button whose label they may not have re-read now says "Update schedule" instead of "Generate schedule" — same size, same color, same position class, same icon (`CalendarPlus2`, a "+calendar" icon that visually implies *creation*, not *update*, in both states).

There is no independent visual treatment (color change, badge, sticky positioning, icon swap) tied to `hasGenerated`/`hasUnappliedEdits` — only the text string changes. Compounding this, the icon used for the button in both states is `CalendarPlus2` (`schedule-form.tsx:3,268`) — a "create/add to calendar" glyph — which is a mismatched icon for the "Update" state and offers no independent visual signal that the action's meaning has changed.

## 5. Root-cause mapping — the five reported problems

| # | Reported problem | Root cause, with citation |
|---|---|---|
| 1 | User changed settings and expected the calendar to update; it didn't (or wasn't visible) | The app deliberately does **not** auto-apply draft changes (by design, per D-019 — this protects against accidental overwrites of an applied/saved schedule). But the fact that a change is pending is tracked (`hasUnappliedEdits`, `schedule-generator.tsx:284`) and never rendered anywhere (§3). The user has no way to see "this is stale" short of noticing an unstyled button-label change 500+ pixels above the calendar. |
| 2 | User didn't understand draft vs. applied as two different things | Same root cause as #1. The concepts exist cleanly in code (`EditableScheduleState` vs. `GeneratedScheduleState`) but there is no corresponding *visual* vocabulary — no "Draft" chip, no dimmed/greyed calendar, no inline "last generated for these settings" note near the result. The distinction is real internally and invisible externally. |
| 3 | The Update action was hard to discover | It's a single text-only-differentiated button at the bottom of a long form (§4), competing for attention with nothing (no other button is styled more prominently), but positioned far from the thing it affects (the calendar, which is several sections below it in DOM order — §2). |
| 4 | Advanced features visually compete with the primary workflow | Confirmed by literal render order (§2): `LocalPlannerPanel` (a full named-planner CRUD + import/export UI, `local-planner-panel.tsx`, 521 lines) and `PwaController` (install/update banner, `pwa-controller.tsx`, 482 lines) are rendered *between* the settings form and the calendar result, not below it or otherwise visually subordinated. Heading-level evidence reinforces this: the calendar's own result heading is `<h3 id="calendar-result-heading">` (`monthly-calendar.tsx:53`) and the Local Planners section heading is *also* `<h3 id="local-planners-title">` (`local-planner-panel.tsx:156`) — the same semantic rank as the primary output. There is nothing in the heading structure, DOM order, or visual styling that marks planner persistence and PWA install/update as secondary to viewing your schedule. |
| 5 | Site perceived as AI-generated / generic-SaaS | See §6 below for cited specifics. |

## 6. Visual-identity audit against the project's own "avoid generic AI/SaaS" checklist

**Design tokens (`src/styles/globals.css`, 235 lines):** the token layer itself is restrained and matches the documented intent — one primary teal (`--primary: oklch(0.47 0.09 183)`), a small semantic palette for day/night/off, no gradient or glow definitions at the token level, `prefers-reduced-motion` is honored (`globals.css:222-234`). **The token system is not the source of the "AI-generated" perception.**

The perception traces to component-level styling choices, concentrated on the **homepage hero**, which is the very first thing every visitor sees, before they ever reach the tool:

- **Gradient** — `src/app/page.tsx:22`: `bg-[radial-gradient(circle_at_80%_0%,oklch(0.91_0.06_183),transparent_48%)]` — a decorative radial gradient blob behind the hero copy. This is the *only* gradient in the codebase (confirmed via repo-wide grep for "gradient" across `.ts`/`.tsx`/`.css`), but it's placed exactly where it has maximum impact on first impression.
- **Pill "eyebrow" badge** — `src/app/page.tsx:27`: `rounded-full border ... "A practical planner for rotating work"` — a rounded-pill label above the H1, a stock SaaS-landing-page convention.
- **Oversized marketing headline** — `src/app/page.tsx:30`: `text-4xl ... sm:text-5xl lg:text-6xl` reading "Generate your rotating work calendar in seconds." — bold, large, benefit-driven copy in the promotional register the project's own UI-UX principles warn against ("oversized generic marketing headings").
- **Icon-badge outcomes row** — `src/app/page.tsx:35-48`: three items, each a `rounded-lg` icon chip plus short benefit text ("Choose a proven pattern," "See a clear monthly calendar," "No account required") — another common landing-page pattern (feature pills under a hero).
- **Arrow-CTA link** — `src/app/page.tsx:52-58`: "Start building your calendar" with a trailing `ArrowRight` icon.

Individually mild; together (gradient blob + pill eyebrow + oversized bold headline + icon-chip row + arrow CTA) this is a nearly complete generic-SaaS-hero template, and it is what establishes the user's first impression before the actual tool (which is comparatively restrained) ever appears.

**Elsewhere in the app:**
- `rounded-full` appears in exactly 3 places total: the homepage eyebrow pill (above), a save-state status pill in `LocalPlannerPanel` (`local-planner-panel.tsx:168` — functional, not decorative), and a color-swatch radio dot in `ShiftDetailsPanel` (`shift-details-panel.tsx:242` — functional). **Not** "excessive pills" as a pattern — the homepage instance is the one that reads as decorative/marketing rather than functional.
- `shadow-` utility classes appear in exactly 4 files: the main generator card gets a large soft shadow (`schedule-generator.tsx:1206`, `shadow-[0_24px_70px_-44px_oklch(0.32_0.07_220/0.38)]`), the offline page card gets the identical shadow (`app/offline/page.tsx:22`), and the PWA banner and timed-export panel each get a plain `shadow-sm`. This is a "floating card" treatment on the two most prominent containers, paired with a very rounded `rounded-3xl` corner radius on the same generator card — not egregious ("shadow on every container" is not true here), but the single largest, most visually weighted container in the entire app (the whole generator) does carry both the roundest corners and the softest/largest shadow in the codebase.
- No `backdrop-blur`/`blur-` usage anywhere (checked, zero matches) — no glassmorphism.
- No gradient text anywhere (only the one background gradient noted above).
- Color count: outside the semantic day/amber, night/indigo, off/green tokens — which are explicitly justified by domain requirements (UI-UX.md: "never communicate day, night, or off status by color alone") — the palette is one primary teal plus neutral surfaces. Not a "too many competing accents" problem.

**Summary:** the generic-AI-SaaS perception is concentrated, specific, and fixable — it lives almost entirely in the homepage hero section and, to a lesser extent, in the oversized rounded/shadowed treatment of the main generator card — not spread evenly across the design system.

## 7. Responsive behavior — could not be independently re-validated live

**[test-source, not executed]** `tests/e2e/homepage.spec.ts:974-1038` contains a parameterized Playwright test, `has no page overflow after generation at ${width}px`, run for exactly `[320, 390, 768, 1024, 1440]`. For each width it sets the viewport, loads `/`, expands "Shift details (optional)," fills a start date, generates a schedule, switches to Year view, and (at select widths) exercises the date-exception editor and copy-link fallback — then asserts `document.documentElement.scrollWidth <= window.innerWidth`. This test exists in the current tree and, on its face, covers the current generator *and* the newer planner-persistence/date-exception surfaces that the prior competitive-audit document predates.

**I was not able to execute this test or start the dev server** in this environment: the remote shell tool used for this session runs each command in an isolated, short-lived process, and a `next dev` server started with `nohup ... &` in one call was not still running by the next call (no compile output was logged, and no `node`/`next` process was found afterward). This is an environment/tooling limitation of this audit session, not a statement about the app. Per the brief's stop condition, I'm reporting this rather than asserting the responsive claim is currently true — the test's *existence and scope* is confirmed; its *current pass/fail result* is not.

**Recommendation for Phase 7B kickoff (or before it):** run `npm run test:e2e` locally to get an actual current pass/fail before relying on the "no overflow 320–1440px" claim for redesign planning.

## 8. State and failure behavior

**Persistence failure handling — visibly implemented, well cited:**
`LocalPlannerPanel` explicitly renders failure/conflict states rather than failing silently:
- A storage-message alert (amber, `role="alert"`) at `local-planner-panel.tsx:173-179` for advisory/storage messages.
- Dedicated `saveState === "failed"` → "Retry save" button, and `saveState === "conflict"` → "Reload newer saved copy" button (`local-planner-panel.tsx:182-201`).
- A `saveState === "unavailable"` state exists and disables save-dependent controls (`local-planner-panel.tsx:60-61, 235, 244, 438`) rather than hiding them without explanation.
- The generator's `handleSubmit`/`commitSchedule` path does not depend on `activePlanner`/`saveState` to succeed — generation and the unsaved planner remain usable independent of persistence outcome, consistent with the architecture requirement ("Preserve the unsaved generator when optional persistence fails," `docs/ARCHITECTURE.md`).

This is a genuine strength: unlike the draft/applied ambiguity in §3, failure states here **are** visibly and specifically communicated, with recovery actions. It's worth Phase 7B studying why this part of the UI already does what §3/§4 don't — visible state badge + inline recovery action — as a template for the draft/applied fix.

**Multi-tab conflict and PWA-update UI directly adjacent to, and reusing the word "Update" from, the schedule form:**
`PwaController` (`pwa-controller.tsx`) implements: an "Update available" banner (`pwa-controller.tsx:413`), an "Update now" button gated on every known tab reporting a safe (non-editing, non-saving, non-conflicted) state (`pwa-controller.tsx:307-368`, `activateUpdate`), and a "Later"/"Update postponed" dismissal (`pwa-controller.tsx:439`). This banner renders immediately after `LocalPlannerPanel` and before the calendar result (`schedule-generator.tsx:1334`).

**This is a second, precise citation for problem #3/#4's terminology confusion**, beyond what the brief anticipated: the page can simultaneously show a button labelled **"Update schedule"** (apply form changes) and a button labelled **"Update now"** (install a new app release) in close visual proximity, with no distinguishing icon, color, or grouping — both are plain primary-style buttons. A user who has just learned that "Update" means "apply my edited settings" has no particular reason to expect that the *next* "Update" button they see means something entirely different (reloading the whole application). This is very likely part of why "Update" is remembered as "difficult to discover/understand" — the word is overloaded within one screen.

## 9. Accessibility notes on state transitions and the Update action

- The Update/Generate button itself is a real, labelled, native `<button type="submit">` with an icon marked `aria-hidden` (`schedule-form.tsx:266-270`) — no accessible-name problems.
- Focus management on successful commit moves to the result heading (`resultHeadingRef`, `schedule-generator.tsx:797, 811`), and a screen-reader-only `aria-live="polite"` region announces status messages (`schedule-generator.tsx:1341-1343`). This means a screen-reader user who submits the form *does* get an announcement that something changed — the discoverability/hierarchy problem here is predominantly a **sighted-user, visual-scanning problem**, not a screen-reader problem. That's worth stating precisely: a screen reader user arguably has *better* signal today (an explicit "Schedule generated/updated" announcement) than a sighted user does (a button label that silently changed above the fold they've scrolled past).
- However, `hasUnappliedEdits` going true (i.e., the moment a draft diverges from the applied schedule) has **no live-region announcement at all** — only the eventual commit is announced. A screen-reader user editing a field after generation gets no equivalent of "you have unapplied changes" either.
- Heading order across the page is logically nested (h1 hero → h2 "Build your monthly shift calendar" → h3 for sub-panels including both "Local planners" and the calendar result) — technically valid, but as noted in §5, it doesn't encode *importance*, only nesting.

## 10. Information-hierarchy assessment

**What currently has the most visual/positional priority:**
1. The homepage marketing hero (gradient, pill, oversized headline) — first thing seen, unrelated to the task.
2. The settings form — appropriately prominent, but with no visual distinction between "core" fields (pattern, start date) and the "optional" shift-details disclosure, other than the disclosure being collapsed.
3. The Local Planners panel and PWA update banner — full secondary features, positioned with equal or greater visual weight (own heading, own card styling) than the calendar result, and positioned *before* it.

**What the primary task actually is** (per `docs/PRODUCT.md`'s own initial user journey): choose a pattern → set a date → generate → **read the calendar**. The calendar is the deliverable. It currently has the *least* privileged position of any major panel on the page: last in DOM order, no larger or more emphasized than the panels above it, and same heading rank as a persistence-management feature.

## 11. Options for a corrected hierarchy and state-communication model (not decisions)

These are presented as options with tradeoffs for Phase 7B to evaluate, not a prescribed design:

**A. Reorder panels so the calendar sits directly below the form/actions, before Local Planners and PWA UI.**
- *Pro:* Directly fixes the DOM-order evidence in §2/§5 with no new component.
- *Con:* Local Planners currently needs `canSave={generated !== null}` and other generated-state dependencies; reordering is layout-only and shouldn't require touching that logic, but should be verified against any assumptions about mount order (e.g., autosave `useEffect` dependencies) before treating it as risk-free.

**B. Add an explicit, visible "unapplied changes" indicator wired to the existing `hasUnappliedEdits` flag.**
- Could be a small inline banner near the calendar heading ("Showing schedule for your last applied settings — press Update to see this change"), a badge on the Update button itself, or a dimmed/reduced-opacity treatment on the stale calendar.
- *Pro:* Uses state that already exists; no new domain logic, no risk to D-019's editable/generated separation (D-019 says draft and generated must stay separate — it says nothing about *communicating* that separation, so this is additive, not architecturally conflicting).
- *Con:* Needs a genuinely restrained visual treatment to avoid adding another "AI dashboard" alert-banner pattern; needs a live-region announcement addition too (§9) for parity with the existing commit announcement.

**C. Differentiate "Update schedule" from "Generate schedule" visually, not just textually**, and/or rename the PWA action away from "Update" to reduce the terminology collision found in §8 (e.g. "Install update" / "Refresh app").
- *Pro:* Directly addresses the two-different-"Update"-buttons finding.
- *Con:* Renaming PWA copy touches `docs/UI-UX.md`'s "Installation, connectivity, and updates" section language and would need that doc updated in lockstep, per this project's own documentation-consistency rule.

**D. Move the "Shift details (optional)" disclosure and/or Local Planners further down, or behind a secondary "Advanced" grouping, rather than reordering the whole tree.**
- *Pro:* Smaller change than (A); preserves current component boundaries.
- *Con:* Doesn't fully resolve the same-heading-rank problem (§5) unless heading levels are also revisited.

**E. Restyle the homepage hero to remove the gradient/pill/oversized-headline combination identified in §6**, independent of any generator-internal change.
- *Pro:* Directly addresses the "perceived as AI-generated" first-impression problem, is homepage-scoped, and doesn't touch the generator's client-boundary code at all (`page.tsx` is a Server Component).
- *Con:* Is a visual-identity decision (copy, layout, iconography) that Phase 7A is explicitly not authorized to make.

None of A–E is mutually exclusive; B and C most directly address the reported usability failures, while E most directly addresses the reported trust/visual-identity failure, and A/D address the reported hierarchy failure.

## 12. Draft testable acceptance criteria for Phase 7B

These are proposed, not finalized — Phase 7B should confirm or revise them before implementation:

1. A user who edits any generator field after a schedule has been generated can determine — without reading instructions and without submitting the form — that the currently visible calendar does not reflect their latest edit.
2. The action that applies pending form edits is visually distinguishable (not text-only) from its own "nothing pending" state, and is reachable without scrolling past unrelated secondary features.
3. On any single screen, no two distinct actions are both labelled "Update" (or another shared verb) without qualifying context that disambiguates them at a glance, not only on hover/focus.
4. In the generated-schedule state, the calendar result appears before (or is otherwise clearly visually prioritized over) the Local Planners and PWA-update panels in both DOM order and any tab order dependent on it.
5. The homepage's first visual impression (above the fold) contains no decorative gradient, no marketing-style pill badge, and no headline styled larger than what the generator's own result heading uses — i.e., the tool itself is never visually less prominent than its own marketing framing.
6. Every transition into an "unapplied changes" state is announced to assistive technology with the same reliability as the existing "schedule generated" announcement.
7. The existing 320/390/768/1024/1440px no-overflow guarantee (tests/e2e/homepage.spec.ts) continues to pass after any redesign change, re-verified by actually running `npm run test:e2e`, not by inspection alone.

## 13. Open questions / approvals needed before Phase 7B can begin

1. **Node version mismatch** (installed v22, required v24) should be resolved or explicitly accepted as a known limitation before Phase 7B relies on any live test run in this same environment — otherwise `npm test`/`npm run test:e2e` results in this environment cannot be trusted.
2. **Which of options A–E in §11** (or a combination) should Phase 7B specify in detail? This audit deliberately does not choose.
3. Should the PWA "Update now" terminology change be in scope for Phase 7B, or held for a separate, PWA-specific change, given it would require a `docs/UI-UX.md` edit under this project's own documentation-consistency rule?
4. The stale `.git/index.lock` file noted in §0 should be cleaned up (likely requires delete permission on the connected folder) before any future commit is attempted in this checkout — flagging so it isn't a surprise mid-Phase-7B.
5. Live confirmation of the responsive no-overflow claim (§7) by actually running `npm run test:e2e` in an environment matching the required Node version.

## 14. Full source list

**Documentation read in full:** `AGENTS.md`, `docs/PRODUCT.md`, `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `docs/UI-UX.md`, `docs/DECISIONS.md`.
**Documentation confirmed absent:** `docs/HANDOFF.md`, `docs/PROJECT-CONTEXT.md`.
**Documentation listed but not read in full:** everything under `docs/research/` (8 files) and `docs/plans/` (13 files + README).

**Source files read (in full or in cited excerpts) via `device_bash` on the linked machine:**
- `src/features/schedule/components/schedule-generator.tsx`
- `src/features/schedule/components/schedule-form.tsx`
- `src/features/schedule/components/shift-details-panel.tsx`
- `src/features/schedule/components/local-planner-panel.tsx`
- `src/features/schedule/components/monthly-calendar.tsx`
- `src/features/pwa/pwa-controller.tsx`
- `src/app/page.tsx`
- `src/app/offline/page.tsx` (cited for the shared shadow style)
- `src/styles/globals.css`
- `tests/e2e/homepage.spec.ts` (responsive test section only)
- `package.json`, `playwright.config.ts`

**Commands run** (all on the linked device, in the connected repository folder, none of which modified tracked files):
```
git status --short
git diff --stat / --numstat / --ignore-cr-at-eol --stat
git log -5/-1 --oneline --decorate
git restore .                          (authorized by user, after independent verification)
git config core.autocrlf true          (authorized by user)
npm run lint        → passed, no errors
npm run typecheck   → passed, no errors
npm test            → FAILED to start (native-binding load error in `rolldown`/vitest,
                       almost certainly caused by the Node v22-vs-required-v24 mismatch,
                       not by application code — see §0)
```
`npm run dev` was attempted in the background to enable a live walkthrough for §2/§6/§7/§8, but the process did not survive between tool calls in this session's shell environment and produced no compile output; the dev server could not be reached. All runtime-behavior claims in this document are therefore explicitly sourced from static code reading, as flagged inline, per the brief's stop condition rather than by guessing.

**Not run:** `npm run test:e2e` (Playwright), for the same reason the dev server couldn't be kept alive — Playwright's own `webServer` config would need the same persistent process.

---

*End of Phase 7A audit. Per the task brief, this phase makes no implementation decisions and modifies no production code. `git status` after this document was written shows exactly one new untracked file at `docs/research/ux-ia-audit-phase-7a-2026-09.md`, per acceptance criterion 5.*
