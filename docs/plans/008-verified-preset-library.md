# Plan 008 — verified preset library

**Status:** Complete  
**Scope:** Phase 5B2 only

## Objective

Add the four Phase 5B1-approved presets and replace the fixed-only preset control with an accessible grouped selector and domain-derived cycle preview. Preserve existing fixed-preset behavior, custom cycles, V1 URLs, calendar calculations, exports, printing, history, static content routes, and the private browser-only product boundary.

## Current preset architecture

- `PresetId` is a closed two-value union.
- `presets.ts` stores boolean work/off arrays and resolves every preset with a required `workingShift`.
- `PresetScheduleConfig` consequently always contains `workingShift`.
- `schedule-engine.ts` obtains a preset pattern through `trustedPresetPattern` and contains no preset-specific calculation branches.
- The V1 codec requires `shift` for all preset queries and serializes it after `s`.
- `ScheduleGenerator` keeps editable preset ID and working shift together, constructs raw configuration at submit time, and keeps generated state separate from unsubmitted form edits.
- `ScheduleForm` renders one native select with two options and an always-visible Day/Night radio group.
- Calendar views, insights, sharing, ICS export, and print consume validated configurations and expanded occurrences rather than redefining cycles.

## Problem with the fixed-only assumption

Three approved additions contain concrete Day/Night/Off positions. Making `workingShift` optional would permit invalid combinations and force UI interpretation. The domain must discriminate fixed presets, which require a Day/Night choice, from rotating presets, whose complete cycle is already final and must reject that choice.

## Proposed discriminated preset model

- Add `FixedPresetId` and `RotatingPresetId` unions, with `PresetId` as their union.
- Define immutable fixed definitions containing `work | off` positions and immutable rotating definitions containing `ShiftKind` positions.
- Expose an immutable, exhaustive metadata collection through the public domain barrel: ID, type, name, group, description, anchor explanation, cycle length/counts, preview data, and working-shift requirement.
- Use type guards and definition lookup rather than inferring behavior from identifiers.
- Keep `resolvePresetPattern` as the validating public boundary and `trustedPresetPattern` as the validated internal resolver, with a discriminated argument shape.
- Keep React free of sequence definitions; the preview resolves or reads the domain-owned cycle.

## Exact approved sequences and anchors

- Existing fixed `4-on-4-off`: `WWWWOOOO`; anchor is first working position.
- Existing fixed `2-2-3`: `WWOOWWWOOWWOOO`; anchor is first working position.
- New fixed `7-on-7-off-fixed`: `WWWWWWWOOOOOOO`; anchor is first working position.
- New rotating `2-day-2-night-4-off`: `DDNNOOOO`; anchor is first Day.
- New rotating `dupont-28-day`: `NNNNOOODDDONNNOOODDDDOOOOOOO`; anchor is first Night in the four-Night block.
- New rotating `7-day-7-off-7-night-7-off`: `DDDDDDDOOOOOOONNNNNNNOOOOOOO`; anchor is first Day.

No sequence will be reversed, shortened, rotated, or duplicated outside the domain.

## Configuration model and validation

- `FixedPresetScheduleConfig` contains a `FixedPresetId` and required `workingShift`.
- `RotatingPresetScheduleConfig` contains a `RotatingPresetId` and no `workingShift`.
- `PresetScheduleConfig` is their union; custom configuration remains unchanged.
- Runtime validation requires `workingShift` for fixed definitions and returns a typed inapplicable-field failure when a rotating definition receives one.
- Rotating configuration validation must not broadly accept optional `workingShift`.
- Existing date, cycle, range, freezing, and custom validation behavior remains unchanged.

## V1 URL codec extension and compatibility

- Existing fixed links remain byte-for-byte canonical: `v`, `kind`, `p`, `s`, `shift`, optional `m`, optional `ws`.
- The new fixed preset uses the same format.
- Rotating links use `v`, `kind`, `p`, `s`, optional `m`, optional `ws`, and reject `shift` as variant-inapplicable.
- Missing `shift` for fixed presets remains invalid; `off`, empty, duplicate, and unknown values remain invalid.
- Existing custom links remain unchanged.
- Parser order remains flexible; serialization remains deterministic.
- V1 is safely extensible because the preset ID determines whether the already-known `shift` parameter is required or forbidden. No V2 is needed.

## Selector and persistent preview UX

- Retain the preset/custom schedule-type radio group.
- Replace the preset options with one visibly labelled native select containing `Fixed Day or Night` and `Rotating Day and Night` optgroups.
- Show the Day/Night radio group only for fixed presets.
- Preserve the last fixed Day/Night selection while moving among fixed and rotating options.
- Render a persistent selected-preset preview from public domain metadata and resolved pattern values.
- Preview includes name, category, description, cycle length, ordered D/N/O tokens, full text alternative, counts, anchor explanation, and the employer-variation note.
- The 28 positions use compact ordered tokens that wrap; no horizontal carousel or search is added.
- Changing the form does not change URL or generated output until submission.

## Form-state and history behavior

- Editable state retains one `workingShift` as the last valid fixed choice, but raw rotating submissions omit it entirely.
- Restoring a rotating URL sets the rotating preset and a harmless remembered default Day value that is neither submitted nor serialized.
- Rotating-to-fixed restores the remembered fixed selection.
- Start date and custom cycle remain stable during preset changes and mode switches.
- Successful generation keeps the current push/replace policy; reload and Back/Forward restore both preset categories.

## Error mapping

- Add a stable typed error for an inapplicable working shift on a rotating preset.
- Continue using missing-field/parameter behavior for fixed presets without a shift.
- Map the new error exhaustively to concise user-facing language without exposing codes.
- Unknown preset and malformed URL behavior remains unchanged.

## Sharing, exports, and output integration

- No preset-specific branch is added to calendars, insights, print, sharing, or ICS.
- These surfaces continue consuming validated configurations and domain-expanded occurrences.
- Copy Schedule inherits fixed-versus-rotating canonical serialization.
- Monthly and yearly ICS retain all-day Day/Night/Off events and deterministic configuration identity.

## Accessibility behavior

- Native select, visible label, native optgroups, keyboard behavior, visible focus, and `aria-describedby` association.
- Conditional Day/Night controls are removed from the DOM for rotating presets and cannot remain focusable.
- Preview receives an accessible name and one complete ordered text alternative; visible tokens include D/N/O plus a visible legend.
- No aggressive live region is used for preview edits.
- Existing result-heading focus, validation summary, calendar semantics, and print control hiding remain intact.

## Responsive behavior

- Select fills available width and long labels remain readable.
- Token preview uses a wrapping grid/flex layout without document-level horizontal overflow at 320, 390, 768, 1024, and 1440 px.
- Preview copy stays compact and is rendered only once in the editor, not in each year month or print calendar.
- Existing calendar sizing and year-view layout are not changed.

## Test matrix

### Domain

- Every definition: exact ID/type/order, length, Day/Night/Off/working counts, immutable cycle, anchor index zero.
- Every preset: forward wrap, backward/negative wrap, month/year/leap boundary.
- Existing fixed sequences remain identical; `2-2-3` remains fixed.
- No Panama ID and no Evening/Swing token.

### Codec and validation

- Every fixed preset with Day and Night round-trips.
- Every rotating preset without `shift` round-trips.
- Fixed missing/invalid/duplicate shift fails.
- Rotating `shift` fails, including otherwise valid values.
- Unknown preset, canonical ordering, optional month/Sunday, reordered input normalization, and existing saved V1 fixtures.

### Components

- Grouped selector contents and labels.
- Persistent exact previews and complete DuPont cycle.
- Fixed Day/Night visibility; rotating absence; switching state retention.
- Generation, URL restoration, copy link, history restoration, custom regression, insights, summaries, and export for new presets.

### Playwright

- Legacy fixed links.
- New fixed Day and Night generation.
- All rotating generations and shift-free URLs.
- Reload, Back/Forward, copy, monthly/year ICS, custom workflow, keyboard use, print, and 320px preview overflow.

## Documentation changes

Update README, Product, Domain, Architecture, UI/UX, SEO, Security, Testing, Decisions, and Roadmap with the six presets, discriminated model, anchors, V1 behavior, selector decision, employer warning, Evening postponement, alias/duplicate decisions, and lack of new SEO routes.

## Files to create

- `docs/plans/008-verified-preset-library.md`
- A dedicated preset-preview component and its direct tests only if this keeps `ScheduleForm` focused.

## Files to modify

- Preset/configuration domain types, definitions, resolver, codec, engine, and public barrel.
- Schedule form/generator and exhaustive error presentation.
- Relevant domain, codec, component, content-integrity, and Playwright tests.
- The documentation listed above.

## Explicit non-goals

No Evening/Swing, working hours, pay, overtime, payroll, multiple workers, staffing, swaps, leave, accounts, persistence, database, AI, analytics, advertisements, selector search, dependency, new content route, sitemap entry, programmatic SEO, or new guide page.

## Acceptance criteria

1. Exactly six domain presets exist: three fixed and three concrete rotating.
2. All exact sequences, counts, anchors, wrapping behavior, and legacy results are verified.
3. TypeScript and runtime validation prevent fixed/rotating working-shift misuse.
4. Existing V1 links retain meaning; rotating V1 links omit and reject `shift`.
5. The grouped native selector and complete wrapping preview are accessible and mobile-safe.
6. All calendar, insight, history, copy, export, and print paths work without preset-specific calculation logic.
7. Custom cycles and static content routes remain unchanged in behavior.
8. No rejected preset, Evening token, dependency, or SEO route is added.
9. All required formatting, lint, type, unit/component, timezone, Playwright, build, static-route, sitemap, dependency, responsive, print, and diff checks pass.

## Verification commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
$env:TZ='UTC'; npx vitest run tests/unit/schedule
$env:TZ='America/New_York'; npx vitest run tests/unit/schedule
npm run test:e2e
npm run build
git diff --check
git status --short
```

Additional checks inspect package manifests, domain imports/tokens, build route output, sitemap output, canonical URLs, generated ICS files, print media, and widths 320/390/768/1024/1440.

## Completion record

Completed on 2026-09-17. Formatting, lint, type checking, 199 unit/component tests, 39 Chromium end-to-end tests, and the production build passed. The build retained the existing eleven static routes, including only the two reviewed preset guide pages. The final audit found no dependency additions, Evening/Swing value, new guide route, or sitemap expansion.
