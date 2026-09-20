# Plan 015 — Homepage hero restyle

**Status:** Complete
**Phase:** 7B, Step 3 of 3
**Primary specification:** `docs/research/ux-ia-audit-phase-7a-2026-09.md` (§6, §12 item 5)

## Context

Phase 7A's audit traced the "feels AI-generated" real-user report to a concentrated set of choices in the homepage hero (`src/app/page.tsx`), not the token system generally. This step restyles only that hero section to match the calm, restrained identity `docs/UI-UX.md` already states as the product's principle and that the rest of the app (including the generator itself) already follows.

Citations re-verified against the live file at current `HEAD` (`56791a0`) before editing — Phase 7A's line numbers still match:
- Radial gradient: `src/app/page.tsx:22` — `bg-[radial-gradient(circle_at_80%_0%,oklch(0.91_0.06_183),transparent_48%)]`, the only gradient in the codebase (confirmed still true).
- Pill eyebrow: `src/app/page.tsx:27-29` — `rounded-full border ...` reading "A practical planner for rotating work".
- Oversized headline: `src/app/page.tsx:30` — `text-4xl font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl`.
- Chip outcomes row: `src/app/page.tsx:38-50` — each `<li>` wraps its icon in `bg-secondary ... rounded-lg`.
- Arrow CTA: `src/app/page.tsx:52-58` — `<ArrowRight>` trailing an in-page `#generator` anchor link.

The generator's own result heading, `calendar-result-heading` (`monthly-calendar.tsx:53-55`), is confirmed still `text-2xl font-bold tracking-tight` — the size the hero headline must read as clearly subordinate to, not merely equal to or "not exceeding."

## Goals

1. Remove the gradient, the pill container, and the oversized headline so the hero matches the rest of the app's restrained visual language.
2. Make the hero headline visibly, not just technically, smaller than the generator's own result heading.
3. Restyle the outcomes row using an icon+text convention already established elsewhere in the app, not an invented one.
4. Preserve all existing behavior: heading semantics, copy, links, AA contrast, no new tokens, no new dependency, Server Component boundary unchanged.

## Non-goals

- No change to `ScheduleGenerator` or any client-boundary code.
- No change to any content route, page, or SEO metadata.
- No new design token or color in `src/styles/globals.css`.
- No new dependency.
- No commit, push, or deployment.

## Before / after for each of the five elements

| Element | Before | After |
|---|---|---|
| Gradient | `<div>` with `bg-[radial-gradient(...)]`, `absolute inset-x-0 top-0 -z-10 h-[32rem]` | Removed entirely. No replacement gradient, glow, or blur. |
| Eyebrow | `<p>` styled as a `rounded-full` pill: `border-primary/20 bg-primary/8 text-primary ... rounded-full border px-3 py-1.5` | Plain text line, no container: `text-primary text-sm font-semibold` — the exact convention already used for `ScheduleGenerator`'s own "Free schedule generator" eyebrow (`schedule-generator.tsx:1255`). Same copy, same position (above the H1). |
| Headline | `text-4xl font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl` (36px → 48px → 60px) | `text-lg font-bold tracking-tight sm:text-xl` (18px → 20px) — below the result heading's flat 24px (`text-2xl`) at every breakpoint, and echoing its exact weight/tracking vocabulary (`font-bold tracking-tight`) so the size difference reads as a deliberate hierarchy, not an unrelated restyle. `text-balance` removed (only meaningful at the larger sizes it replaced). |
| Outcomes row | Each `<li>` icon wrapped in `bg-secondary text-secondary-foreground ... rounded-lg` chip container | Chip removed; icon rendered directly inline before the text, matching the established plain icon+text convention already used for `ScheduleGenerator`'s privacy line (`schedule-generator.tsx:1274-1275`, `<LockKeyhole>` directly inside an `inline-flex items-center gap-2` text row, no wrapper). |
| CTA arrow | `<ArrowRight>` trailing an in-page anchor link to `#generator` | Kept as-is. This is a real in-page navigational affordance (jump to the generator below), not a decorative SaaS flourish — the brief's own guidance treats this as the acceptable case. No styling change; it was never called out by Phase 7A as oversized or chip-like, only listed as part of the combined pattern. |

## Contrast verification (computed, not assumed)

All hero text keeps its existing tokens; none are new. Computed WCAG relative-luminance contrast ratios against `--background` (`oklch(0.985 0.004 180)`), converted OKLCH → linear sRGB → sRGB using the standard OKLab matrices:

| Token | Used for | sRGB (approx.) | Contrast vs. background | AA requirement | Result |
|---|---|---|---|---|---|
| `--primary` (`oklch(0.47 0.09 183)`) | Eyebrow text | `rgb(0, 107, 96)` | **6.18:1** | 4.5:1 (normal text) | Pass |
| `--foreground` (`oklch(0.24 0.025 225)`) | H1 headline (default text color) | `rgb(18, 34, 40)` | **15.70:1** | 3:1 (large text) | Pass |
| `--muted-foreground` (`oklch(0.47 0.025 220)`) | Subhead paragraph | `rgb(76, 94, 101)` | **6.49:1** | 4.5:1 (normal text) | Pass |
| `--foreground` | Outcomes row text | `rgb(18, 34, 40)` | **15.70:1** | 4.5:1 (normal text) | Pass |

None of these are new combinations — all four are already used elsewhere in the app today (the eyebrow/privacy-line pattern in `ScheduleGenerator`, body copy throughout). This step does not introduce any new text/background pairing.

## Existing test impact

Searched `tests/e2e/homepage.spec.ts` and `tests/e2e/discovery.spec.ts` for any assertion on the gradient class, the pill class, the exact headline size classes, the chip container class, or the eyebrow/outcomes copy as a styled unit. **Found: none.** The only existing hero-related assertion is the H1's accessible name (`tests/e2e/homepage.spec.ts:15`, matching `/generate your rotating work calendar in seconds/i`), which is unchanged — headline copy is not part of this restyle, only its size/weight classes. No test requires updating.

## Files changed

- `src/app/page.tsx` — the five elements above.
- `docs/UI-UX.md` — describe the restyled hero accurately.
- This plan file.

No change to `src/styles/globals.css`, `monthly-calendar.tsx`, `ScheduleGenerator`, or any content route.

## Test matrix

- Existing `tests/e2e/homepage.spec.ts` no-overflow assertions at 320/390/768/1024/1440px must still pass with the restyled hero.
- Manual verification at 320px that the simplified hero isn't sparse/broken (spacing, not just absence of overflow).
- Contrast verified by computation above, not assumed.

## Acceptance criteria

1. No gradient/glow/blur remains in the hero.
2. No pill-shaped eyebrow container remains.
3. Hero headline is visibly smaller than `calendar-result-heading` (18–20px vs. a flat 24px), not merely equal or "not larger."
4. Outcomes row uses the same plain icon+text convention already established in `ScheduleGenerator`, not an invented pattern.
5. This plan file exists, accurate, marked Complete once verified.
6. `docs/UI-UX.md` updated to match what was actually shipped.
7. Overflow test passes at all 5 widths; no test needed updating (confirmed above) so none was weakened.
8. AA contrast confirmed by computation for every hero text/background pairing.
9. `git status --short` at the end shows only the intended files.
10. No commit, push, or deployment.

## Verification results (actually run, this environment, Node v22.17.1)

- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — 0 errors.
- `npm test` — 371/371 tests passed (32 files), unchanged — this step touched no unit-tested logic.
- `npm run test:e2e` — 49/49 Playwright tests passed, including the H1 accessible-name assertion (`tests/e2e/homepage.spec.ts:15`, unchanged copy) and all 5 no-overflow checks at 320/390/768/1024/1440px.
- Manual visual check at 320px and 1440px (dev server + browser pane, screenshots taken): hero reads as calm and intentional at 320px, not sparse — eyebrow, headline, subhead, three-item outcomes row, and CTA all have clear spacing; no horizontal scroll. At 1440px the bounded `max-w-4xl` hero column keeps the restrained look rather than stretching text across the full viewport.
- Computed-style spot check in the live page confirmed the shipped H1 renders at 20px/700-weight at desktop width (`sm:text-xl`), consistent with the intended below-24px target.
- `npm run build` — Next.js compiled, typechecked, and statically generated all 10 routes successfully; the subsequent `scripts/pwa/generate-pwa.mjs` step exited with "PWA generation requires Node 24; found v22.17.1" — the same pre-existing, environment-only gate documented in Plan 014, unrelated to this change (this step never touches PWA code).

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
