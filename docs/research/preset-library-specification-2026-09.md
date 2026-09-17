# Preset Library Research and Specification

**Date:** 2026-09-17

**Phase:** 5B1 — research and product definition only

**Status:** Proposed for review; no implementation is authorized by this document

## 1. Executive summary

The first preset-library expansion should add four deliberately qualified presets:

1. **2 Days / 2 Nights / 4 Off** — `day, day, night, night, off, off, off, off`
2. **DuPont (28-day rotation)** — `night, night, night, night, off, off, off, day, day, day, off, night, night, night, off, off, off, day, day, day, day, off, off, off, off, off, off, off`
3. **7 On / 7 Off — Fixed shift** — seven selected Day or Night positions followed by seven Off positions
4. **7 Days / 7 Off / 7 Nights / 7 Off** — seven Day, seven Off, seven Night, seven Off

This set adds one simple fixed-shift schedule and three verified Day/Night rotations without inventing an Evening value. It keeps similar-looking schedules distinct: the fixed 7-on/7-off cycle is 14 days, while the alternating form is a complete 28-day cycle.

Pitman is rejected as a duplicate of the existing fixed `2-2-3` work/off skeleton. “Panama” remains a qualified family alias rather than a new preset. Continental and Southern Swing require a real Evening/Swing domain value and must not be coerced to Day or Night. The unqualified 6-on/4-off name is too variable to ship safely. Fourteen-on/fourteen-off is valid but postponed because available evidence places it mainly in remote, offshore, mining, and other sector-specific work.

The preset selector should become a native **grouped select plus persistent cycle preview**, with separate Fixed shift and Day/Night rotation groups. Search is not justified for six total presets.

## 2. Current preset baseline

The current production definitions must remain unchanged:

| ID           | Type                     | Complete sequence                                       | Cycle   |
| ------------ | ------------------------ | ------------------------------------------------------- | ------- |
| `4-on-4-off` | Fixed Day or fixed Night | selected working shift × 4, Off × 4                     | 8 days  |
| `2-2-3`      | Fixed Day or fixed Night | Work × 2, Off × 2, Work × 3, Off × 2, Work × 2, Off × 3 | 14 days |

Here, “Work” is replaced by the user-selected Day or Night value. The current `2-2-3` does not rotate automatically between Day and Night. “Panama” is only a qualified family alias.

Current implementation constraints found during repository inspection:

- The core `ShiftKind` union already represents `day | night | off`.
- Existing preset definitions store work/off positions and require a separate `workingShift` choice.
- Existing preset IDs are a closed union containing only `4-on-4-off` and `2-2-3`.
- V1 preset URLs encode `p`, `s`, and `shift`; the last value assumes every preset is fixed Day or fixed Night.
- The generator, calendar, print, and export layers can consume concrete Day/Night/Off cycles, but the preset configuration and URL codec cannot yet distinguish a fixed-shift preset from a concrete rotating preset.
- Guide content is explicit and tested; adding a preset must not automatically create an indexable route.

## 3. Research method

Research used live web sources accessed on **2026-09-17**. The review:

1. inspected the product, domain, architecture, SEO, decision, roadmap, audit, and completed-plan documentation;
2. traced current preset types, resolution, validation, URL encoding, content definitions, guides, and integrity tests;
3. searched each candidate name without presuming that the name had one definition;
4. opened underlying employer, union, government, occupational, and research pages or PDFs;
5. transcribed worker-perspective cycles and checked length and token counts;
6. separated sourced facts from product interpretation; and
7. treated name conflicts, direction changes, and omitted shift types as blocking correctness issues.

No search-result snippet is used as the sole final evidence for an approved preset.

## 4. Evidence-quality rules

- **Highest weight:** collective agreements, employer/agency schedules, government guidance, and occupational research showing an ordered cycle.
- **Supporting weight:** established industry training and peer-reviewed or government-hosted research.
- **Context only:** scheduling-product and competitor explanations; these can reveal search language or disagreement but cannot independently establish an approved sequence.
- An approved sequence needs at least two independent credible sources.
- A source naming a schedule without showing its order supports prevalence, not its exact definition.
- Employer-specific start times, pay rules, crew offsets, and overtime are excluded from the preset definition.
- A cycle is normalized from one worker’s perspective. Team-coverage diagrams are converted only when one worker’s full repeating row is unambiguous.
- Cyclic rotations of the same token ring are equivalent starting phases. Reversing a ring is not assumed equivalent.

## 5. Candidate comparison matrix

| Candidate           | Definition finding                                                                                                            | Dominant worker sequence                                           | Model fit                                                | Classification                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------- |
| DuPont              | Strong agreement on one 28-day form                                                                                           | `NNNNOOO DDDO NNN OOO DDDD OOOOOOO`                                | Tokens fit; preset schema does not                       | **Approve for Phase 5B2**                 |
| Pitman              | Fixed 2-2-3 skeleton; sources disagree on whether/when crews swap Day/Night                                                   | Existing `WWOOWWWOOWWOOO`, with employer-specific shift assignment | Existing preset already covers fixed form                | **Reject as duplicate**                   |
| 2-day/2-night/4-off | Strong, literal definition                                                                                                    | `DDNNOOOO`                                                         | Tokens fit; preset schema does not                       | **Approve for Phase 5B2**                 |
| Continental         | Credible 28-day form uses Day, Swing, Night, Off                                                                              | `DDSSNNNOO DDSSSNNOO DDDSSNNOOO`                                   | Requires Evening/Swing                                   | **Needs domain expansion**                |
| Southern Swing      | Backward weekly three-shift rotation is historically documented; modern web definitions often reverse direction               | Three-shift, 28-day family; direction is material                  | Requires Evening/Swing                                   | **Needs domain expansion**                |
| 6-on/4-off          | Common named form is `2 mornings, 2 afternoons, 2 nights, 4 off`, but other employers use the label for other six-work blocks | Underqualified                                                     | Often requires Evening; name alone is unsafe             | **Needs further evidence**                |
| 7-on/7-off          | Two common, distinguishable meanings: fixed 14-day and alternating 28-day                                                     | `WWWWWWWOOOOOOO` or `DDDDDDDOOOOOOONNNNNNNOOOOOOO`                 | Both token-compatible; rotating form needs schema change | **Approve only as two qualified presets** |
| 14-on/14-off        | Literal work/off ratio is clear; actual shift type and travel arrangements vary by sector                                     | selected Work × 14, Off × 14                                       | Fixed form fits                                          | **Postpone as too specialized**           |

`D` = Day, `S` = Swing/Evening, `N` = Night, `O` = Off, `W` = a fixed user-selected Day or Night.

## 6. Detailed findings and normalized sequences

### 6.1 DuPont

**Verified facts.** A 2025 collective agreement defines a repeating four-week, 12-hour cycle as four Nights/three Off; three Days/one Off/three Nights; three Off/four Days; seven Off. A PHMSA-hosted shiftwork paper prints the same 28-position order. NAPTA training also describes DuPont as a petrochemical-industry Day/Night schedule with a 28-day long break cycle.

**Interpretation.** “DuPont” is sufficiently standardized when qualified as the 28-day rotation. It is a worker-perspective cycle; four crews are useful for coverage but not needed to generate one person’s calendar.

- **Proposed ID:** `dupont-28-day`
- **UI name:** DuPont
- **Subtitle:** 28-day Day/Night rotation
- **Safe aliases:** DuPont rotation; DuPont 28-day schedule
- **Prohibited aliases:** Panama; Pitman; 2-2-3; generic “four-week rotation”
- **Anchor:** first Night in the opening four-Night block
- **Sequence:** `night, night, night, night, off, off, off, day, day, day, off, night, night, night, off, off, off, day, day, day, day, off, off, off, off, off, off, off`
- **Length/counts:** 28 positions; 14 working, 14 Off; 7 Day, 7 Night, 0 Evening
- **Wrap:** clean; day 28 Off wraps to the anchored Night
- **Alternate starts:** cyclic shifts are the same schedule at another phase
- **Reversal:** changes block order and rotation meaning; do not reverse
- **Preview:** `4 Nights · 3 Off · 3 Days · 1 Off · 3 Nights · 3 Off · 4 Days · 7 Off`
- **Generator explanation:** A complete four-week rotation with equal Day and Night totals and one seven-day break.
- **Variation warning:** Employers may choose another phase, shift start time, or crew offset; match the anchor to the first Night of the worker’s four-Night block.

### 6.2 Pitman and Panama

**Verified facts.** The PARAS airport-law-enforcement report describes Pitman as a four-squad, two-12-hour-shift arrangement using the familiar 2-2-3 work/off cadence. The same report calls Panama a rotating variant in which squads switch Day/Night after two weeks. The 2025 Perma-Fix agreement instead defines Panama’s 14-day work/off skeleton and a Day/Night change at the end of a calendar month. These are incompatible rotation rules attached to closely related names.

**Interpretation.** The fixed worker sequence is exactly the current `2-2-3` preset. A second ID would create identical output under another marketing name. Automatic Day/Night rotation is employer-specific and should not be smuggled into the existing preset.

- **Classification:** Reject as duplicate
- **Existing normalized sequence:** selected Work × 2, Off × 2, Work × 3, Off × 2, Work × 2, Off × 3
- **Length/counts:** 14; 7 working and 7 Off; all 7 working positions use the selected Day or Night
- **Safe language:** “2-2-3 (sometimes called Pitman or Panama, depending on workplace)”
- **Prohibited claim:** “Pitman and Panama always rotate Day/Night every two weeks”
- **Duplicate decision:** no new `pitman` or `panama` preset ID

### 6.3 2 Days / 2 Nights / 4 Off

**Verified facts.** Winnipeg Fire Paramedic Service specifies two 07:00–19:00 Day shifts, two 19:00–07:00 Night shifts, then four days Off. Merseyside Fire & Rescue states the same “2-2-4” order, and Warwickshire County Council independently reports the same sequence.

**Interpretation.** This is materially different from fixed 4-on/4-off: the four working positions change from Day to Night inside every eight-day cycle.

- **Proposed ID:** `2-day-2-night-4-off`
- **UI name:** 2 Days / 2 Nights / 4 Off
- **Subtitle:** 8-day Day/Night rotation
- **Safe aliases:** 2-2-4; 2D/2N/4O
- **Prohibited aliases:** plain 4-on/4-off; fixed 4-on/4-off; Continental
- **Anchor:** first Day in the two-Day block
- **Sequence:** `day, day, night, night, off, off, off, off`
- **Length/counts:** 8; 4 working and 4 Off; 2 Day, 2 Night, 0 Evening
- **Wrap:** clean; the last Off wraps to the anchored Day
- **Alternate starts:** cyclic shifts are equivalent phases
- **Reversal:** changes Day/Night order; do not reverse
- **Preview:** `2 Days · 2 Nights · 4 Off`
- **Generator explanation:** Two Day shifts followed immediately by two Night shifts, then four full days Off.
- **Variation warning:** Start/end times differ by employer; the preset defines shift kind and order, not clock hours.

### 6.4 Continental

**Verified facts.** Two independent PHMSA/ASU-hosted shiftwork references describe Continental as a four-crew, 8-hour, 28-day plan with Day, Swing, Night, and Off positions: `DDSSNNNOO DDSSSNNOO DDDSSNNOOO`. A UK exposure presentation likewise defines Continental as rapid rotation through morning, afternoon, and night.

**Interpretation.** The name is reasonably meaningful, but the exact credible form cannot be represented by `day | night | off`. Mapping Swing to Day or Night would be false.

- **Future candidate ID:** `continental-28-day-8-hour`
- **Future UI name:** Continental
- **Subtitle:** 28-day Day/Swing/Night rotation
- **Anchor:** first Day in the opening two-Day block
- **Sequence:** `day, day, evening, evening, night, night, night, off, off, day, day, evening, evening, evening, night, night, off, off, day, day, day, evening, evening, night, night, off, off, off`
- **Length/counts:** 28; 21 working and 7 Off; 7 Day, 7 Evening, 7 Night
- **Wrap:** clean; alternate cyclic starts are phases; reversal changes direction
- **Preview:** `2 Days · 2 Swings · 3 Nights · 2 Off · 2 Days · 3 Swings · 2 Nights · 2 Off · 3 Days · 2 Swings · 2 Nights · 3 Off`
- **Classification:** Needs domain expansion

### 6.5 Southern Swing

**Verified facts.** A CDC-hosted Bureau of Mines publication labels a four-crew, 8-hour, seven-day **backward** rotating table “Southern Swing,” using Morning, Evening, Night, and Off. A peer-reviewed law-enforcement sleep study describes the traditional order as morning → night → afternoon. Modern commercial descriptions commonly use a forward Day → Swing → Night order and a `7-on/2-off/7-on/2-off/7-on/3-off` cadence.

**Interpretation.** All credible forms require Evening/Swing. More importantly, direction and exact Off placement are not stable enough to select a normalized sequence silently. The CDC table can be normalized, but doing so would not make the modern forward variant equivalent.

- **Reserved descriptive ID only:** `southern-swing-28-day-backward` (not approved)
- **Prohibited ID:** unqualified `southern-swing`
- **Classification:** Needs domain expansion; after expansion it still needs a separately approved variant decision
- **Warning:** clockwise and counterclockwise rotations are not interchangeable; reversal changes circadian direction and calendar output

### 6.6 6 On / 4 Off

**Verified facts.** A UK Civil Aviation Authority report says the typical NERL block is two Mornings, two Afternoons, two Nights, then four Off, while also listing operational variations. Collective agreements and employer material also use “6 on/4 off” without consistently identifying shift kinds.

**Interpretation.** The ratio alone is not an exact preset. The best-documented 24/7 form needs an Afternoon/Evening value, and a fixed six-Work/four-Off form would need a qualified name plus stronger independent evidence of meaningful demand.

- **Potential qualified future ID:** `2-morning-2-afternoon-2-night-4-off`
- **Do not use:** `6-on-4-off` as a sequence-defining ID
- **Typical documented sequence:** `day, day, evening, evening, night, night, off, off, off, off`
- **Length/counts:** 10; 6 working and 4 Off; 2 Day, 2 Evening, 2 Night
- **Classification:** Needs further evidence

### 6.7 7 On / 7 Off family

The label has two common, materially different worker meanings. Both can be supported only with visible qualification.

#### A. Fixed shift

**Verified facts.** An IUOE collective-agreement letter defines a 7-on/7-off **Day Shift** as one week on and one week off. Current institutional job materials also use 7-on/7-off for a permanent Night or Day block. PHMSA’s FAQ refers more broadly to seven consecutive Day **or** Night shifts followed by seven Off.

- **Proposed ID:** `7-on-7-off-fixed`
- **UI name:** 7 On / 7 Off
- **Subtitle:** Fixed Day or Night · 14-day cycle
- **Safe aliases:** one week on / one week off; 7/7 fixed
- **Prohibited aliases:** alternating 7 Days / 7 Nights; 14-on/14-off
- **Anchor:** first working day of the seven-shift block
- **Sequence:** selected Day or Night × 7, then Off × 7
- **Length/counts:** 14; 7 working and 7 Off; either 7 Day/0 Night or 0 Day/7 Night
- **Wrap:** clean; cyclic shifts are phases; reversal changes where the Off-to-Work boundary falls relative to the anchor
- **Preview:** `7 Days · 7 Off` or `7 Nights · 7 Off`
- **Generator explanation:** One fixed shift for seven consecutive days, followed by seven days Off.
- **Variation warning:** Some workplaces use “7-on/7-off” for an alternating 28-day Day/Night cycle; choose that separate option if shifts change each block.

#### B. Alternating Day/Night

**Verified facts.** A PHMSA-hosted white paper defines the full cycle as seven 12-hour Days, seven Off, seven 12-hour Nights, seven Off. A separate forestry collective agreement prints the same order.

- **Proposed ID:** `7-day-7-off-7-night-7-off`
- **UI name:** 7 Days / 7 Off / 7 Nights / 7 Off
- **Subtitle:** 28-day Day/Night rotation
- **Safe aliases:** alternating 7-on/7-off; rotating 7/7
- **Prohibited aliases:** fixed 7-on/7-off; 14-on/14-off
- **Anchor:** first Day in the seven-Day block
- **Sequence:** `day, day, day, day, day, day, day, off, off, off, off, off, off, off, night, night, night, night, night, night, night, off, off, off, off, off, off, off`
- **Length/counts:** 28; 14 working and 14 Off; 7 Day, 7 Night, 0 Evening
- **Wrap:** clean; cyclic shifts are phases; reversal changes the Day/Night order
- **Preview:** `7 Days · 7 Off · 7 Nights · 7 Off`
- **Generator explanation:** Alternates week-long Day and Night blocks, with a full week Off after each.
- **Variation warning:** Long consecutive Night blocks carry fatigue concerns; this utility reproduces a user’s stated cycle and does not endorse workplace safety or compliance.

### 6.8 14 On / 14 Off

**Verified facts.** Alaska’s labor-relations form expressly assigns workers to a 14-days-on/14-days-off alternate workweek. A Canadian compressed-workweek agreement lists 14-on/14-off, and offshore research describes at-least-14/14 rotations. These sources do not establish a universal Day/Night rule.

**Interpretation.** A qualified fixed version is representable as selected Work × 14, Off × 14, but current evidence associates it with travel-heavy, remote, mining, maintenance, and offshore contexts. Travel days and employer-specific mixed shifts can materially change a worker’s lived calendar.

- **Potential ID:** `14-on-14-off-fixed`
- **Anchor:** first working day of the 14-day hitch
- **Sequence:** selected Day or Night × 14, then Off × 14
- **Length/counts:** 28; 14 working and 14 Off; all working positions share one selected kind
- **Wrap:** clean; cyclic shifts are phases; reversal changes the anchor boundary
- **Classification:** Postpone as too specialized

## 7. Conflicting definitions, aliases, and duplicate analysis

- **Pitman / Panama / 2-2-3:** the work/off skeleton overlaps, but Day/Night change rules vary. Keep one existing `2-2-3` preset and explain aliases with qualifications.
- **2-2-4 / 2D2N4O / 4-on-4-off:** `DDNNOOOO` is not the existing fixed `WWWWOOOO`. Never label it simply “4-on-4-off.”
- **7-on/7-off:** fixed `W×7 O×7` and alternating `D×7 O×7 N×7 O×7` require separate qualified options.
- **Continental:** the researched form is an 8-hour three-shift pattern, not the existing 12-hour 2-2-3 preset despite some literature calling it a “2-2-3 plan.”
- **Southern Swing:** historical backward and modern forward descriptions conflict. A direction-qualified label is mandatory if revisited.
- **6-on/4-off:** the ratio does not reveal whether all six shifts are fixed or divided among morning/afternoon/night.
- No approved ID produces the same sequence as an existing ID or another approved ID.

## 8. Current-domain compatibility and Evening impact

The four approved sequences use only existing Day, Night, and Off tokens. However, three are concrete rotations and require a future discriminated preset configuration, for example conceptually “fixed preset + workingShift” versus “rotating preset + concrete cycle.” This is a preset-schema change, not a `ShiftKind` expansion.

An Evening/Swing extension is **not recommended for Phase 5B2**. If later approved, it must update all of the following together:

- domain types, validators, sequence utilities, and invariants;
- custom-cycle editor controls, labels, summaries, and limits;
- calendar cell semantics and accessible names;
- legend order, color token, contrast, non-color cues, and print styles;
- URL token vocabulary and decoder error handling;
- preservation of all existing Day/Night/Off links;
- ICS event titles/descriptions and cross-midnight semantics;
- content definitions, comparison copy, and guide accuracy;
- unit, property, integration, accessibility, print, and export tests; and
- backward compatibility for stored/shared V1 configurations.

## 9. Product scoring

Scores are 1–5. For confidence, usefulness, distinctness, discovery, product fit, explanation, and compatibility, 5 is favorable. For implementation effort, maintenance risk, and confusion risk, 5 means **more costly or risky**. Scores are evidence notes, not a total-ranking algorithm.

| Candidate      | Confidence                                        | Usefulness                               | Distinctness                          | Discovery                       | Product fit                               | Explanation                                  | Compatibility                             | Effort                               | Maintenance risk                       | Confusion risk                             |
| -------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------- | -------------------------------------------- | ----------------------------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------ |
| DuPont         | **5** — two exact independent cycles agree        | **5** — common 24/7 rotation             | **5** — unique 28-day order           | **5** — strong named intent     | **5** — individual cycle is sufficient    | **4** — long but block preview is clear      | **4** — tokens fit; config shape does not | **3** — new rotating-preset branch   | **2** — stable definition              | **2** — qualified 28-day label helps       |
| Pitman         | **3** — skeleton agrees, shift switching does not | **4** — familiar to shift workers        | **1** — duplicates fixed 2-2-3        | **4** — meaningful alias intent | **4** — individual skeleton fits          | **3** — alias caveat required                | **5** — existing preset covers fixed form | **1** — no new implementation        | **4** — alias drift                    | **5** — Pitman/Panama rules vary           |
| 2D/2N/4O       | **5** — three public-service sources agree        | **5** — compact common rotation          | **5** — differs from fixed 4-on/4-off | **4** — literal search intent   | **5** — directly personal                 | **5** — name states the cycle                | **4** — tokens fit; config shape does not | **3** — rotating-preset branch       | **1** — literal stable definition      | **2** — only 4-on/4-off shorthand is risky |
| Continental    | **5** — exact research cycle agrees               | **3** — useful to 8-hour workers         | **5** — unique three-shift cycle      | **4** — established name        | **4** — individual row is sufficient      | **3** — 28 positions and Swing need teaching | **1** — Evening absent                    | **5** — cross-cutting domain change  | **4** — new shift kind surface         | **4** — confused with 2-2-3                |
| Southern Swing | **3** — family is real; direction conflicts       | **3** — sector usage persists            | **5** — three-shift weekly rotation   | **3** — recognizable but noisy  | **3** — individual row possible           | **2** — direction needs qualification        | **1** — Evening absent                    | **5** — domain plus variant decision | **5** — divergent definitions          | **5** — forward/backward conflict          |
| 6-on/4-off     | **2** — ratio masks variants                      | **4** — broad descriptive demand         | **3** — fixed form could be new       | **4** — literal search phrase   | **4** — worker-centric if qualified       | **2** — name omits shift kinds               | **2** — common form needs Evening         | **4** — research/domain work remains | **4** — employer variations            | **5** — high underqualified-name risk      |
| 7/7 fixed      | **5** — union and occupational evidence           | **5** — widely useful block schedule     | **5** — no current equivalent         | **5** — strong literal intent   | **5** — directly personal                 | **5** — very simple                          | **5** — current fixed model fits          | **2** — mostly additive              | **2** — stable when qualified          | **3** — rotating variant must be visible   |
| 7/7 rotating   | **5** — PHMSA and union orders agree              | **4** — important remote/industrial form | **5** — true 28-day rotation          | **4** — shared family intent    | **5** — one-person sequence is complete   | **5** — explicit UI name states order        | **4** — tokens fit; config shape does not | **3** — rotating-preset branch       | **2** — sequence stable when qualified | **3** — fixed variant must be visible      |
| 14/14 fixed    | **4** — ratio verified; shift kind varies         | **3** — valuable in narrower sectors     | **5** — no equivalent                 | **3** — niche intent            | **3** — personal but travel often matters | **5** — literal fixed version is simple      | **5** — fixed model fits                  | **2** — straightforward              | **3** — sector exceptions              | **3** — “on” does not identify shift kind  |

## 10. Recommended Phase 5B2 set

| Priority | ID                          | Why now                                                                        | Evidence threshold |
| -------- | --------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| 1        | `2-day-2-night-4-off`       | High confidence, compact, and clearly different from existing 4-on/4-off       | Met                |
| 2        | `dupont-28-day`             | High-value named rotation with two exact authoritative sequences               | Met                |
| 3        | `7-on-7-off-fixed`          | Adds a simple fixed option and strong literal search/use value                 | Met                |
| 4        | `7-day-7-off-7-night-7-off` | Prevents the fixed/alternating 7/7 ambiguity while serving true rotation users | Met                |

Approval is for definitions only. Phase 5B2 still requires explicit user approval and a separate implementation plan.

## 11. Proposed selector UX

Use a native **select plus preview** inside the existing preset mode:

- Label: “Shift pattern” with concise help text.
- Two `<optgroup>` sections: **Fixed shift** and **Day/Night rotation**.
- Fixed group: 4 On / 4 Off, 2-2-3, 7 On / 7 Off.
- Rotating group: 2 Days / 2 Nights / 4 Off, DuPont, 7 Days / 7 Off / 7 Nights / 7 Off.
- Show the Day/Night selector only for fixed presets.
- Below the select, always show subtitle, segmented cycle preview, length, working/off counts, and a short variation warning where needed.
- On mobile, keep the select and preview in one vertical panel; do not render six full cards.
- Do not add search at six presets. Reconsider search only when the reviewed library exceeds roughly ten genuinely distinct options.
- Preserve keyboard-native selection, programmatic labels/descriptions, visible focus, token text in addition to color, and an announcement when the preview changes.

Compact mobile structure:

```text
[Preset]
Shift pattern
[ 2 Days / 2 Nights / 4 Off       v ]

Day/Night rotation · 8-day cycle
[D][D][N][N][O][O][O][O]
4 working · 4 off

Start date
[ yyyy-mm-dd ]
[ Generate schedule ]
```

## 12. URL and backward-compatibility implications

- Preserve all existing `p=4-on-4-off` and `p=2-2-3` links and their `shift=day|night` meaning exactly.
- `7-on-7-off-fixed` can retain the existing fixed-preset URL shape with a required `shift` value.
- Concrete rotating presets must not carry a fake `shift` parameter. Phase 5B2 should extend the codec with a discriminated preset definition so a known rotating `p` ID uses its concrete cycle and does not require `shift`.
- The decoder should continue accepting valid old links. New canonical serialization should omit `shift` for rotating IDs.
- Decide explicitly whether an incoming rotating ID with `shift` is rejected with a useful error or normalized by discarding the irrelevant field. Silent reinterpretation is prohibited.
- Unknown IDs remain invalid; aliases should resolve in UI/content, not become duplicate URL IDs.
- A URL-version bump is not inherently required if the additive grammar is unambiguous, but the choice must be recorded in Phase 5B2 before code changes.

## 13. SEO and content recommendations

| Approved preset                   | Generator        | Indexable content recommendation                                                                   |
| --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| 2 Days / 2 Nights / 4 Off         | Add in Phase 5B2 | Future individually reviewed guide; definition and public-service examples are distinct and strong |
| DuPont                            | Add in Phase 5B2 | Future individually reviewed guide with employer-variation and fatigue disclaimers                 |
| 7 On / 7 Off — Fixed              | Add in Phase 5B2 | Initially comparison hub; later one reviewed 7-on/7-off family guide, not a thin separate page     |
| 7 Days / 7 Off / 7 Nights / 7 Off | Add in Phase 5B2 | Share the future reviewed 7-on/7-off family guide and explain both variants side by side           |

Preset implementation must not automatically create a route. Do not mass-generate pages. Any guide requires unique explanatory value, definition evidence, intent review, non-duplicative copy, and an explicit indexability decision.

## 14. Required future test cases

### Domain and preset integrity

- Each new ID is unique, lowercase, URL-safe, and exhaustively handled.
- Exact cycle arrays equal this specification token for token.
- Counts and lengths match metadata.
- Rotating presets contain no unresolved generic Work positions.
- Fixed presets require Day or Night; rotating presets do not.
- All cycles repeat across negative and positive date offsets, leap days, month/year boundaries, and daylight-saving calendar dates without phase drift.
- The anchor date resolves to position zero and the previous/next dates wrap correctly.

### Regression and duplicates

- Existing `4-on-4-off` and `2-2-3` sequences and URLs remain unchanged.
- No `pitman` or `panama` ID is introduced.
- `2-day-2-night-4-off` is not equal to either fixed 4-on/4-off variant.
- The two 7/7 variants are unequal and cannot be selected under an unqualified label.

### URL codec

- Round-trip every fixed and rotating preset.
- Decode all existing V1 fixtures unchanged.
- Require `shift` for fixed presets and omit it canonically for rotating presets.
- Test extra `shift` on rotating IDs according to the approved decision.
- Reject unknown/duplicate IDs and malformed dates deterministically.

### UI, accessibility, export, and content

- Groups and labels are exposed to assistive technology.
- Fixed/rotating field visibility follows selection without losing focus.
- Preview updates are announced and never depend only on color.
- Long labels fit narrow mobile widths and 200% zoom.
- Calendar, print, and ICS preserve Day versus Night for every concrete token.
- Guide definitions, preview strings, metadata counts, and domain arrays are cross-checked by content-integrity tests.

## 15. Open decisions requiring approval

1. Approve all four proposed IDs and exact anchors, or reduce the first expansion.
2. Approve two separately qualified 7/7 presets rather than one ambiguous family option.
3. Approve a discriminated fixed-versus-rotating preset schema.
4. Choose decoder behavior for an irrelevant `shift` parameter on rotating preset URLs: explicit error or canonical normalization.
5. Confirm the select-plus-preview replacement for current preset cards.
6. Decide whether Phase 5B2 changes generator support only, leaving all new SEO routes to a later content phase (recommended).
7. Keep Evening/Swing outside Phase 5B2 and require a separate domain-expansion proposal (recommended).

## 16. Research limitations

- Named schedules are workplace vocabulary, not controlled standards; employer agreements can legitimately redefine rotation timing.
- Sources often describe crew coverage rather than one worker, so only unambiguous worker rows were normalized.
- Shift clock times were intentionally excluded because the product models shift kind, not hours or time zones.
- Search-demand judgments are qualitative; no paid keyword-volume dataset was used.
- Some authoritative documents are older but remain useful for stable cycle definitions; current employer agreements were preferred where available.
- Approval here does not endorse fatigue safety, labor compliance, overtime treatment, or suitability for a particular worker.

## 17. Direct source list

All sources were opened and accessed **2026-09-17**.

### Approved definitions

- Perma-Fix Northwest / UA Local 598, collective bargaining agreement, Article 13 (DuPont and Panama): <https://www.sec.gov/Archives/edgar/data/891532/000149315225021473/ex10-1.htm>
- PHMSA, James C. Miller, “Shift Plans with Seven Consecutive Shifts” (DuPont, Continental, alternating 7/7): <https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/docs/technical-resources/pipeline/control-room-management/69006/shiftplanswithseven.pdf>
- North American Process Technology Alliance, “Shift Worker Tips” (DuPont industry context): <https://www.naptaonline.org/wp-content/uploads/2022/12/COM-PTEC-Shift-Work-Tips-19Aug2020-DAL-updated.pdf>
- City of Winnipeg Fire Paramedic Service, Communications Operator Application Manual (2D/2N/4O): <https://legacy.winnipeg.ca/FPS/Careers/Recruitment_Forms/Application%20Manual%20-%20Communications%20Operator%20(September%202025)%20-%20FINAL.pdf>
- Merseyside Fire & Rescue Service, “About the Role” (2D/2N/4O): <https://www.merseyfire.gov.uk/careers/roles/fire-control/about-the-role/>
- Warwickshire County Council, “Work for Fire Control — Jayne’s story” (2D/2N/4O): <https://www.warwickshire.gov.uk/news/article/6373/work-for-fire-control-jayne-s-story>
- PHMSA, Control Room Management FAQs (7 Day-or-Night shifts followed by 7 Off): <https://www.phmsa.dot.gov/sites/phmsa.dot.gov/files/docs/technical-resources/pipeline/control-room-management/60636/faqs-control-room-management-20180726.pdf>
- SMS Equipment / IUOE Local 115 collective agreement, Letters 10–11 (fixed Day 7/7): <https://www.bcbargaining.ca/content/956/SMSEquipment_IUOE2016.pdf>
- Louisiana-Pacific Dawson Creek collective agreement, Article 7 (alternating 7D/7O/7N/7O): <https://conifer.ca/wp-content/uploads/2022/09/LPDawsonCreek_2021-2025CollectiveAgreement_SIGNED.pdf>

### Conflicts, exclusions, and specialization

- Public Safety Aviation Accreditation Commission/PARAS, “Airport Law Enforcement Staffing,” section 7 (Pitman/Panama distinction): <https://www.sskies.org/images/uploads/subpage/PARAS_0055.AirportLEOStaffing_.FinalReport_.pdf>
- James C. Miller, “Investigating the Effects of Shift Work on Police Officer Health” appendix material hosted by Arizona State University (Continental exact cycle): <https://popcenter.asu.edu/sites/g/files/litvpz3631/files/library/crisp/fatigue-effects.pdf>
- Cefic-LRI workshop presentation (Continental as morning/afternoon/night): <https://cefic-lri.org/wp-content/uploads/2014/03/Rushton-et-al-Cefic-workshop.pdf>
- US Bureau of Mines/CDC, “Improving Safety at Small Underground Mines” (Southern Swing backward table): <https://stacks.cdc.gov/view/cdc/227518/cdc_227518_DS1.pdf>
- Hurdiel et al., law-enforcement sleep-pattern research (traditional Southern Swing direction): <https://research.stmarys.ac.uk/id/eprint/5949/5/PDFAcute%20and%20long-term%20sleep%20measurements%20produce%20opposing%20results%20on%20sleep%20quality%20in%208hr%20and%2012hr%20shift%20patterns%20in%20law%20enforcement%20officers.pdf>
- UK Civil Aviation Authority, “Assessing employment costs at NERL” (typical and variant 6-on/4-off blocks): <https://www.caa.co.uk/media/rxmhjcon/assess-efficiency-nerl-employment-costs.pdf>
- State of Alaska, “Assignment to 14-on/14-off LTC Alternate Workweek Schedule”: <https://doa.alaska.gov/dop/fileadmin/LaborRelations/pdf/LTC14on14off.pdf>
- Canadian compressed-workweek collective agreement (7/7, 14/14, and other sector schedules): <https://negotech.service.canada.ca/eng/agreements/14/1428903a.pdf>

## 18. Phase boundary

This specification changes no preset, production code, URL parser, dependency, route, or SEO page. Stop here until the definitions and open decisions are explicitly approved for Phase 5B2.
