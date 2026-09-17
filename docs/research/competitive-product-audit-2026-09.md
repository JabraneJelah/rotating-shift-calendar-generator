# Shift Calendar competitive product audit — September 2026

## 1. Executive summary

**Recommendation: pursue Strategy A, a focused individual utility.** Shift Calendar should remain the fastest credible way for one rotating-shift worker to turn a known cycle into a private calendar without an account. It can borrow a small number of advanced-personal-planner capabilities, but only when they preserve local-only calculation, a simple date-based model, and a short path to a useful result.

The strongest direct competitor is RotaPlanner's public generator. It demonstrates demand for richer shift definitions, a searchable pattern library, week-start choice, yearly visualization, and personal statistics. It also demonstrates the cost of breadth: a long page, many commercial exits, and a slightly overloaded journey. WhosOffice, Taskade, and Smartsheet primarily serve managers or acquire leads for broader products. Their team, collaboration, AI, payroll-adjacent, and template-management features are not evidence that Shift Calendar should become workforce-management software.

Shift Calendar already has defensible advantages: no account, no tracking, no remote storage, deterministic and timezone-independent schedule generation, canonical share links, semantic calendars, useful ICS/print outputs, concise controls, and accurate limitations. The live UI had no horizontal page overflow at 320, 390, 768, 1024, or 1440 px before generation, in month view, or in the 12-month year view. Its largest gaps are a two-item preset library, no week-start setting, only visible-month ICS, and limited personal insight beyond Day/Night/Off counts.

The recommended next phase contains four coherent improvements:

1. Build a **verified preset discovery system**: a small larger library, exact cycle previews, terminology/variation warnings, and search once the library justifies it.
2. Add a **configurable week start** shared by month, year, print, and export descriptions.
3. Add **export range choice** for visible month or generated year, keeping standards-based ICS and no provider authorization.
4. Add **low-risk personal summaries**: next shift/next working day and weekend-work totals, without wage, overtime, or compliance claims.

Do not build multiple employees, staffing/coverage, swaps, leave approvals, AI scheduling, payroll, direct provider integrations, or accounts. Postpone exact-time shifts, manual overrides, saved schedules, holidays/leave, and pay calculations until usage data shows that users want a more advanced personal planner.

## 2. Research scope and date

- Inspection date: **2026-09-17** (Africa/Casablanca).
- Repository baseline: `main` at `6fb961f`; working tree was clean before this report.
- Preparation completed: `AGENTS.md`, all requested product/domain/architecture/UI/SEO/security/testing/decision/roadmap documents, all completed numbered plans, the current schedule implementation, public domain API, unit/component/end-to-end tests, and Git state were reviewed.
- Runtime: documented Node 24 line; actual local runtime was Node `v24.12.0`.
- Verification: local app returned HTTP 200 at `http://127.0.0.1:3000`; Vitest passed **13 files / 151 tests**; an independent browser pass exercised generation and year view at 320, 390, 768, 1024, and 1440 px.
- Competitors: the four requested public pages were inspected in desktop and mobile-sized headless Chromium, supplemented by their publicly indexable page content. No account, trial, payment, contact form, or access-control bypass was used.
- This is a product audit, not a formal legal, labor-compliance, security, performance, or WCAG conformance audit.

## 3. Current-product baseline

### Product and technical boundary

Shift Calendar is a single-worker, date-only repeating-cycle calculator. It supports two fixed-shift presets (`4-on-4-off`, `2-2-3`), a custom sequence of Day/Night/Off values up to 56 positions, a required anchor date, monthly and yearly views, month/year navigation, canonical query-string restoration, current-month all-day ICS, native print, and crawlable pattern guides.

The public domain API centralizes ISO date/month parsing, date arithmetic, validation, URL serialization/parsing, schedule expansion, preset definitions, and typed errors. It deliberately excludes exact clock times, breaks, overtime, wages, employee identity, staffing, and compliance. This boundary is technically coherent and matches the privacy promise.

### Observed current journey

| Stage      | Direct observation                                                                       | Assessment                                              |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Understand | Outcome-oriented H1, three benefit cues, explicit “No account required,” and a jump link | Product purpose is clear in well under a minute.        |
| Configure  | Choose Preset/Custom, pattern, Day/Night for presets, and anchor date                    | Few required decisions; progressive disclosure is good. |
| Generate   | One submit; validation summary receives focus; valid result receives focus               | Clear recovery and keyboard-oriented behavior.          |
| Use        | Month/year switch, navigation, totals, legend, copy link, ICS, print                     | More complete than a disposable calculator.             |
| Learn      | Pattern index, two guides, methodology/About page                                        | Trustworthy but shallow organic-discovery surface.      |

### Responsive and implementation observations

|   Width | Initial overflow | Month overflow | Year overflow | Notes                                                               |
| ------: | ---------------: | -------------: | ------------: | ------------------------------------------------------------------- |
|  320 px |             0 px |           0 px |          0 px | Controls stack correctly; year view is readable but extremely long. |
|  390 px |             0 px |           0 px |          0 px | Strong phone layout; action buttons remain usable.                  |
|  768 px |             0 px |           0 px |          0 px | Form and summaries use width efficiently.                           |
| 1024 px |             0 px |           0 px |          0 px | Comfortable transition layout.                                      |
| 1440 px |             0 px |           0 px |          0 px | Three-column year grid is clear; content width remains controlled.  |

Development-server timings are not production benchmarks. In this local pass, warm page loads were about 0.7 seconds after an initial 2.7-second load, and the generated calendar became observable in about 1 second. These numbers are environment-specific and should not be used as a public performance claim.

## 4. Competitor-category explanation

| Product     | Category                                | Actual comparison value                                                                                           |
| ----------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| RotaPlanner | Dedicated pattern/rota generator        | Closest feature and workflow benchmark for personal cycle creation.                                               |
| WhosOffice  | Free utility attached to workforce SaaS | Shows preset/custom demand and a deliberate generator-to-demo funnel.                                             |
| Taskade     | AI team workspace                       | Shows manager-oriented positioning and the limits of a landing page whose useful result lives in another product. |
| Smartsheet  | Searchable template/content library     | Shows long-tail search capture and format choice, not a better personal cycle calculator.                         |

The category distinction matters. A feature in a workforce suite may solve approvals, staffing, or collaboration rather than the individual worker's “when do I work?” problem.

## 5. Evidence standards and research limitations

Every material competitor observation below is tagged:

- **Directly observed** — visible or exercised on the public page during this audit.
- **Marketing claim** — stated by the vendor, but not independently exercised.
- **Inference** — a bounded interpretation of observable design or copy.
- **Could not verify** — required account access, an unavailable workflow, or evidence beyond the public page.

Limitations:

- Desktop and mobile were emulated in Chromium, not tested on physical assistive-technology/device combinations.
- Network timing is affected by geography, redirects, third-party scripts, caching, and headless browsing. It is recorded only as context.
- Taskade's generated result opens in Taskade; it was not submitted because doing so crosses into an account/product workflow. Its roster, swap, automation, permissions, and payroll-related statements remain marketing claims.
- Smartsheet redirected the browser to the French-localized page and displayed a consent dialog. The indexable English page supplied the same template categories. Downloads and linked Google files were not opened.
- WhosOffice displayed a large cookie-preference panel that obscured content on mobile and part of the generated result on desktop. Generation itself remained testable.
- RotaPlanner's public individual generator was exercised; its team-rota playground was not opened because it is a separate commercial workflow.
- Public inspection can identify obvious semantic and interaction issues but cannot establish formal accessibility compliance.

## 6. Detailed review of each competitor

### 6.1 RotaPlanner shift-pattern generator

Source: [RotaPlanner shift-pattern generator](https://www.rotaplanner.app/shift-patterns/generator) — inspected 2026-09-17.

**Positioning.** **Directly observed:** the page leads with a free rotating-shift generator, then expands into an individual yearly calendar, hours/pay estimates, weekend statistics, PDF/print, and a team-rota conversion. The free utility is useful without registration, but the page also promotes sign-up, login, paid plans, scheduling software, and a team-rota playground. **Inference:** it combines a complete acquisition utility with a strong SaaS funnel.

**Initial journey.** **Directly observed:** define Day/Evening/Night clock times or a custom shift type; compose an ordered cycle using Day/Evening/Night/Off; click Generate; then adjust start date and week start in the result. The default eight-day sequence generated immediately (about 0.14 seconds after the click in this run). The result showed a full year, print/PDF actions, hours/pay inputs, weekend count, and a team-rota form. Pattern cards for 14-on/14-off, 4-on/4-off, 6-on/4-off, 7-on/7-off alternating days/nights, and DuPont were visible, with search.

**Desktop/mobile.** **Directly observed:** desktop is compact and information-rich, with the main utility centered in a narrow column. Mobile stacks cleanly but measured about 25 px of page overflow at 390 px in this run; the overall page is very long. The generator is usable near the top, while numerous content and commercial links follow. **Inference:** breadth improves discoverability but reduces calm and focus.

**Accessibility notes.** **Directly observed:** native select/button controls and visible text cues are present. Several visible time inputs returned no accessible name in the browser inspection. Shift colors are paired with letters/labels in the editor and key. The generated calendar's assistive semantics were not fully verified. **Could not verify:** keyboard order across all controls, screen-reader calendar quality, reduced motion, and contrast conformance.

**Claims not treated as verified.** **Marketing claim:** broader software can notify employees, track hours, and manage leave. **Could not verify:** team scheduling, saved state, employee communications, leave management, or account-only capabilities.

### 6.2 WhosOffice shift generator

Source: [WhosOffice shift generator](https://www.whosoffice.com/tools/shift-generator/) — inspected 2026-09-17.

**Positioning.** **Directly observed:** the page calls the tool simple and free but frames the problem as choosing a rostering setup for staff. It prominently links to a free trial and demo. **Inference:** the generator's primary business role is lead generation for workforce-management SaaS rather than a durable personal calendar.

**Initial journey.** **Directly observed:** choose a start date, duration, and template; selecting a template reveals its parameters; click Generate; scroll to a horizontal generated-shifts grid. Duration choices ran from 1 to 18 months in the control, while post-result copy said the free sample is limited to five months. Templates included Four on Four off, one week on/off, two-shift, three-shift, staggered, day/night with rest, alternating weeks, and custom. A generated one-month 4-on/4-off plan took about 2.2 seconds including a page submission/load in this run.

**Desktop/mobile.** **Directly observed:** desktop uses wide space effectively for its row-based schedule, but the persistent header and consent panel obscure content. At 390 px the page itself did not overflow, yet the cookie panel dominated the screen and the generated wide grid is intrinsically difficult to read on a phone. Inputs are large and clear. **Inference:** it is optimized for evaluating team coverage on desktop, not daily personal reference.

**Accessibility notes.** **Directly observed:** controls are native and preceded visually by prompts, but inspected date/select elements did not expose `aria-label` values; label association was not confirmed. The consent UI competes with the main task, including on mobile. The output uses a table-like grid and color plus a key. **Could not verify:** full keyboard behavior, focus after submission, error announcements, or screen-reader table relationships.

**Claims not treated as verified.** **Marketing claim:** custom plans help estimate staff requirements; the paid platform supports unlimited forward planning and flexible staff management. **Could not verify:** platform scheduling, leave, overtime, HR storage, reports, rules, or mobile apps.

### 6.3 Taskade employee-shift-calendar generator

Source: [Taskade AI employee shift calendar](https://www.taskade.com/generate/calendars/employee-shift-calendar) — inspected 2026-09-17.

**Positioning.** **Directly observed:** the public page provides a prompt field and “Generate with AI”; it states the result opens in Taskade. Most of the page is educational/marketing content about team coverage, roles, open shifts, swaps, leave, reminders, payroll export, and multiple views. **Inference:** the target is a manager building a collaborative operations workspace, not one worker calculating a deterministic rotation.

**Initial journey.** **Directly observed:** the above-the-fold action is to describe an app/calendar in one prompt and submit. A sign-up CTA is present. The page includes a sample 2-2-3 roster and long explanatory content. **Could not verify:** the first generated result, mandatory onboarding, output editability, persistence, access controls, or whether generation works without account creation, because the form was not submitted into the separate Taskade workflow.

**Desktop/mobile.** **Directly observed:** both layouts were responsive with no measured page overflow. The hero is visually polished, but the page is extremely long on mobile and the product screenshot is too small to inspect meaningfully without zooming. Many adjacent AI-generator links and product concepts compete for attention.

**Accessibility notes.** **Directly observed:** a skip link, heading hierarchy, a described prompt control, and native button were present. Much proof is embedded in product imagery and dense marketing tables. **Could not verify:** generated-calendar semantics, error handling, keyboard workflow inside Taskade, or screen-reader behavior.

**Claims not treated as verified.** **Marketing claim:** AI respects coverage/rest rules, flags open shifts, supports live swaps, leave, seven project views, reminders, permissions, and payroll export. **Could not verify:** all of those capabilities in this audit.

### 6.4 Smartsheet shift-schedule templates

Source: [Smartsheet shift-schedule templates](https://www.smartsheet.com/content/shift-schedule-templates) — inspected 2026-09-17.

**Positioning.** **Directly observed:** the page is a content collection offering blank/sample templates in Excel, Word, PDF, Google Docs, and Google Sheets for basic, 8-hour, 10-hour, 12-hour, weekly, night, monthly, restaurant, and advanced schedules. **Inference:** it captures broad schedule-template search demand and then cross-sells Smartsheet; it is not an interactive pattern calculator.

**Initial journey.** **Directly observed:** scan the table of contents, select a use case and format, then follow a download/document link. There is no schedule-generation form on the page. Content explains each template's intended audience and fields. Trial/demo calls to action are visible. **Could not verify:** downloaded template quality, formula accuracy, editing experience, or whether individual links require account/sign-in.

**Desktop/mobile.** **Directly observed:** both layouts were responsive with no measured overflow, but the page is very long. Mobile makes each template image and download cluster readable through stacking, while repeated content increases scanning cost. A localization redirect and consent dialog appeared in the browser.

**Accessibility notes.** **Directly observed:** headings and link text provide a navigable content structure; images had discoverable labels in the indexable representation. Consent and repeated format links add noise. **Could not verify:** the accessibility of downloadable Office/PDF/Google artifacts or the Smartsheet product.

**Claims not treated as verified.** **Marketing claim:** advanced templates provide availability tracking and automated hours; Smartsheet timeline supports real-time collaboration. **Could not verify:** those behaviors or product workflows.

## 7. Competitor feature matrix

Legend: **O** directly observed on the public page; **M** marketing claim only; **N** not present in the inspected public journey; **?** could not verify.

| Capability                         |      Shift Calendar |          RotaPlanner |                   WhosOffice |           Taskade |                   Smartsheet |
| ---------------------------------- | ------------------: | -------------------: | ---------------------------: | ----------------: | ---------------------------: |
| Useful result without account      |                   O |                    O |                            O |                 ? |           O (template links) |
| Deterministic personal cycle       |                   O |                    O |           O, manager framing |               M/? |                            N |
| Preset patterns                    |               O (2) |        O (5 visible) |           O (8 incl. custom) |         M/content |           O (template types) |
| Custom ordered cycle               |                   O |                    O |                            O |                 M |   Editable after download, ? |
| Day / Night / Off                  |                   O |                    O |                            O |         M/content |       O in templates/content |
| Evening/custom shift type          |                   N |                    O |                O custom rows |                 M |         O in template fields |
| Exact shift times                  |                   N |                    O |                O custom rows |                 M |               O in templates |
| Configurable week start            |                   N |                    O |                   N observed |                 ? |           Template-dependent |
| Month result                       |                   O |        O inside year |                            O |                 M |                   O template |
| Year result                        |                   O |                    O |               O via duration |                 ? |              N as calculator |
| Shareable canonical URL            |                   O |           N observed |                   N observed | M account sharing |      Link to file/product, ? |
| Print                              |                   O |                    O |        Browser print only, ? |                 ? |           Template-dependent |
| ICS                                |             O month |           N observed |                   N observed |                 ? |                   N observed |
| PDF                                | Native print-to-PDF |             O export |                   N observed |                 ? |            O template format |
| Hours/pay statistics               |                   N |                    O |             N in free result |                 M |        O/M template formulas |
| Weekend statistic                  |                   N |                    O |                            N |        N observed |                   N observed |
| Multiple workers/coverage          |                   N | Separate team funnel |                          O/M |                 M |                O/M templates |
| No tracking/remote storage promise |                   O |           N observed | N; consent/marketing scripts |                 N | N; consent/marketing scripts |

Sources and evidence: **Directly observed** on the four pages linked in Sections 6 and 24 on 2026-09-17. Taskade collaboration/AI rows and Smartsheet calculated/collaborative rows are **Marketing claims** unless explicitly marked observed.

## 8. Generator-workflow comparison

| Product        | Understand                                           | Mandatory inputs to first result                                                         |    Submit steps | First result                        | Competing CTAs                             | Registration-free utility            |
| -------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------: | ----------------------------------- | ------------------------------------------ | ------------------------------------ |
| Shift Calendar | Clear outcome, privacy and account stance above form | Pattern + anchor date; working shift for preset                                          |               1 | Focused month; year one toggle away | Low                                        | Yes                                  |
| RotaPlanner    | Clear but more concepts                              | Default cycle makes zero edits mandatory; generate, then date/week-start can be adjusted |               1 | Full year plus calculators          | High after result                          | Yes                                  |
| WhosOffice     | Clear generator, manager language                    | Date, duration, pattern                                                                  |               1 | Wide multi-month staff-style grid   | Trial/demo and cookie UI                   | Yes                                  |
| Taskade        | Clear AI promise, vague mechanics                    | Free-text prompt                                                                         | 1 to leave page | **Could not verify**                | Sign-up, product menus, related generators | **Could not verify**                 |
| Smartsheet     | Clear template collection                            | Choose use case and format                                                               |   No generation | External/downloadable template      | Demo/trial/product                         | Yes for page; downloads not verified |

**Design conclusion:** Shift Calendar should retain explicit structured inputs. A deterministic cycle should not be replaced by an AI prompt. Progressive disclosure can improve preset discovery without turning the main form into a library page.

## 9. UI/UX comparison

- **Information hierarchy:** Shift Calendar is the calmest and most linear. RotaPlanner exposes greater power early. WhosOffice mixes utility and sales. Taskade and Smartsheet prioritize acquisition content after an attractive hero.
- **Input density:** Shift Calendar is appropriately sparse. RotaPlanner's shift-time rows and click-built sequence are efficient for advanced users but raise the learning threshold. WhosOffice has few top-level inputs but reveals an operations-style grid.
- **Preset selection:** Shift Calendar's select is sufficient for two choices but will not scale. RotaPlanner's preview cards and search communicate the sequence before use. The transferable principle is “preview before select,” not the visual card styling.
- **Custom-cycle editing:** Shift Calendar's ordered rows are understandable and accessible but become long near the 56-position cap. RotaPlanner's colored chips are compact but removal-by-click can be less explicit. A compact, keyboard-safe summary/preview would improve Shift Calendar without copying the interaction.
- **Calendar clarity:** Shift Calendar uses label, icon, color, legend, semantic cell labels, and counts. Its phone month is strong. Its phone year is technically usable but produces a very long page; progressive month folding or a compact list is worth validating later.
- **Button hierarchy:** Shift Calendar keeps Generate primary and sharing/export secondary. Competitors' commercial calls to action weaken the task hierarchy.
- **Trust:** Shift Calendar's local-calculation statement, explicit limitations, and absence of tracking/consent overlays are tangible trust advantages.
- **Polish principle:** preserve quiet surfaces, obvious form groups, visible state, and non-color labels. Use available desktop width only when it improves comparison; do not stretch the core form.

## 10. Accessibility observations

### Shift Calendar

**Directly observed in implementation and browser testing:** skip link; one H1 per route; native radio/select/date/button controls; form labels and help text; `aria-invalid` and focused alert summary; focus transfer to generated heading; semantic month tables; full-date/shift accessible cell names; text/icon/color redundancy; 44 px-class controls; no narrow-screen overflow; native reduced-motion-friendly UI; and keyboard-triggered generation covered by Playwright. These are strong foundations, not a formal WCAG claim.

Risks to keep testing: tiny compact year labels at mobile widths, 200% zoom, high-contrast/forced-colors, screen-reader verbosity across 12 tables, the custom editor at long cycle lengths, and print contrast.

### Competitors

- **RotaPlanner — Directly observed:** native controls and text/color keys; some time inputs lacked an accessible name in browser inspection. **Could not verify:** generated calendar semantics and focus behavior.
- **WhosOffice — Directly observed:** native controls and a key; consent overlay interfered with the task; accessible label association and post-submit focus were not confirmed.
- **Taskade — Directly observed:** skip link and named prompt; generated result remained **Could not verify**.
- **Smartsheet — Directly observed:** content headings and descriptive links; downloadable artifact accessibility remained **Could not verify**.

## 11. SEO/content comparison

| Product        | Search intent                                | Content approach                                      | Strength                                        | Weakness                                                          |
| -------------- | -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Shift Calendar | “rotating shift calendar,” 4-on/4-off, 2-2-3 | Indexable utility + two accurate guides + methodology | Content and calculator agree; credible cautions | Too little verified pattern coverage                              |
| RotaPlanner    | Generator, named patterns, rota concepts     | Utility, pattern pages, glossary, blog, updates       | Broad topical cluster and strong internal links | Very long, commercially dense, some repetition                    |
| WhosOffice     | Shift generator and workforce planning       | Free tool inside SaaS site                            | Strong authority/conversion path                | Free result is secondary to demo funnel                           |
| Taskade        | AI employee schedule/calendar queries        | Long AI landing page, FAQs, related generators        | Broad query coverage                            | Many claims are not demonstrated on-page; risk of intent mismatch |
| Smartsheet     | “shift schedule template” + format/use case  | Editorial collection with many download formats       | Excellent long-tail format/use-case coverage    | Templates solve a different job and page is repetitive            |

Recommended principle: expand only where the generator can support the exact pattern. Each pattern page should include a verified ordered sequence, definition of cycle day 1, variation warning, dated example from the same domain engine, and direct generator handoff. Do not mass-generate near-duplicate pages, manufacture industry claims, or call the current fixed `2-2-3` implementation a universally rotating Panama/Pitman schedule.

## 12. Monetization comparison

| Product     | Observed commercial mechanism                                                | Fit for Shift Calendar                                                                |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| RotaPlanner | Sign-up/login, team-rota handoff, paid plans, scheduling-software cross-sell | Demonstrates a free utility can acquire users, but requires a separate SaaS business. |
| WhosOffice  | Free trial, demo, lead form, SaaS feature cross-sell                         | Poor fit; manager leads are outside current audience.                                 |
| Taskade     | Sign-up, account-based workspace, AI credit/free-plan funnel                 | Poor fit; conversion depends on a broad platform.                                     |
| Smartsheet  | Template downloads, free trial, demo, product cross-sell                     | Content strategy is relevant; platform funnel is not.                                 |

For a 500–2,000 DH/month first-year objective, realistic low-complexity options—only after traffic and trust exist—are an optional support/tip link, a single clearly disclosed relevant affiliate/sponsor, or a paid one-time convenience artifact. Ad networks, data-driven targeting, or a subscription workforce product would require much more traffic, consent complexity, support, and trust sacrifice. No monetization mechanism should precede evidence of recurring usage.

## 13. Current product's genuine advantages

1. **Privacy is an implementation fact, not a slogan:** local computation, no accounts, database, remote schedule storage, tracking, or ads.
2. **The calculation model is deterministic and timezone-independent:** date-only arithmetic avoids common DST/calendar drift problems.
3. **The free utility is complete:** generation, navigation, restore/share, ICS, year view, and print work without registration.
4. **Accessibility is structural:** semantic tables, redundant labels, focus management, validation summary, and tested narrow layouts.
5. **Content integrity:** pattern guides describe the exact implemented cycles and disclose terminology limitations.
6. **Low cognitive load:** the first useful result needs few decisions and one submission.
7. **Durable share links:** a schedule can be restored without an account or browser storage.

## 14. Current product's important gaps

1. The preset library is too small to capture or serve many common, well-defined pattern intents.
2. Users cannot choose Sunday versus Monday week start, a common personal-calendar preference.
3. ICS covers only the visible month, creating repeated work for a user who wants a full-year calendar.
4. The product answers “what is my pattern?” but less often “what is next?” or “how many weekends do I work?”
5. Preset discovery does not preview cycle order before generation and will not scale as a plain select.
6. The mobile year view is correct but very long; usefulness should be validated before redesigning it.
7. No usage evidence exists yet to justify higher-risk personal-planner features such as exact times, exceptions, leave, or saved state.

## 15. Features that appear attractive but should not be added

- **AI-generated schedules:** the core calculation is explicit and deterministic; AI adds uncertainty, cost, privacy questions, and little individual value.
- **Multiple employees, staffing, coverage, approvals, and swaps:** these require identity, authorization, concurrency, audit logs, notifications, data retention, support, and often labor-rule handling.
- **Estimated wages/overtime/compliance now:** rates, premiums, currencies, tax, breaks, jurisdiction rules, and rounding create misleading precision and maintenance liability.
- **Direct Google/Outlook integration now:** OAuth, provider review, tokens, revocation, backend/security work, and support are disproportionate when ICS already provides interoperable export.
- **Large unverified preset dump:** common names have employer and regional variants; an incorrect preset damages trust more than a missing one.
- **Dark mode as a strategic feature:** pleasant but weak discovery, differentiation, and monetization value compared with functional gaps.
- **Competitor-style long landing pages or template cloning:** they would dilute task focus and risk thin or derivative content.

## 16. Evaluation of all required candidate features

Frequency: H = high, M = medium, L = low. Effort: S = small, M = medium, L = large, XL = platform-scale. Evidence abbreviations: RP = RotaPlanner, WO = WhosOffice, TA = Taskade, SS = Smartsheet. Competitor evidence uses the Section 6 source URLs and labels.

### 16.1 User, market, and recommendation evaluation

|   # | Candidate                     | Problem / audience                                         | Competitor evidence                                                           | Promise fit / frequency                    | Differentiation / organic value      | Monetization        | Recommendation                                                                  |
| --: | ----------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------ | ------------------- | ------------------------------------------------------------------------------- |
|   1 | Custom shift names            | Users use employer-specific labels; individual             | RP **Directly observed** custom type; WO **Directly observed** custom row     | Good / M                                   | Medium / low-medium                  | Low                 | **P2**; bundle only with a validated shift-definition model.                    |
|   2 | Custom shift colors           | Match personal conventions; individual                     | RP and WO **Directly observed**                                               | Good if accessible / M                     | Low / low                            | Low                 | **Later**; never color-only; palette/contrast maintenance.                      |
|   3 | Start/end times               | Make exports and hours more useful; individual             | RP **Directly observed**; WO/SS **Directly observed** fields/templates        | Moves toward Strategy B / H for some       | Medium / medium                      | Medium              | **P2** after demand validation and overnight design.                            |
|   4 | Overnight shifts              | Correct date boundaries for night work; individual         | RP times **Directly observed**; TA/SS discussion **Marketing/content**        | Necessary if #3 / M                        | Medium / medium                      | Low-medium          | **P2 dependency**; do not fake with date-only events.                           |
|   5 | Evening/swing type            | Represent three-shift workplaces; individual               | RP **Directly observed**; SS **Directly observed** in content                 | Strong / M                                 | Medium / medium                      | Low                 | **P2**; custom cycles already offer a migration path.                           |
|   6 | Configurable week start       | Match locale/workplace convention; individual              | RP **Directly observed**                                                      | Excellent / H                              | Medium / medium                      | Low                 | **P1** next phase.                                                              |
|   7 | Larger verified presets       | Faster setup and captures named-pattern intent; individual | RP/WO **Directly observed** libraries                                         | Excellent / H                              | High through accuracy / high         | Medium via traffic  | **P1** next phase, only verified exact cycles.                                  |
|   8 | Searchable preset selector    | Find a pattern as library grows; individual                | RP **Directly observed** search                                               | Good once >6–8 presets / M                 | Medium / medium                      | Indirect            | **P1**, coupled to #7; avoid premature search for tiny list.                    |
|   9 | Pattern comparison            | Choose among unfamiliar rotations; worker/planner          | WO says “compare”; comparison behavior only partly **Directly observed**      | Moderate / L-M                             | Medium / high content                | Indirect            | **P2**; start with previews and guide comparisons.                              |
|  10 | Selectable calendar duration  | View/export needed range; individual                       | WO **Directly observed** 1–18 month selector; RP full year                    | Good / M                                   | Medium / medium                      | Low                 | **P2**; export range is higher priority than arbitrary display range.           |
|  11 | Hours-per-shift calculator    | Estimate working hours; individual                         | RP **Directly observed**                                                      | Strategy-B edge / M                        | Medium / medium                      | Medium              | **P2**, only after exact duration semantics.                                    |
|  12 | Monthly/yearly hour totals    | Answer workload totals; individual                         | RP **Directly observed**; SS formulas **Marketing claim**                     | Good only with #3/#11 / M                  | Medium / medium                      | Medium              | **Later/P2 dependency**; no assumed 8/12-hour default.                          |
|  13 | Weekend-work totals           | Quantify lifestyle impact; individual                      | RP **Directly observed**                                                      | Excellent / M                              | High personal value / medium         | Low                 | **P1** next phase.                                                              |
|  14 | Estimated wage calculator     | Estimate gross pay; individual                             | RP **Directly observed**                                                      | Weakens simplicity / L-M                   | Medium / search medium               | Medium              | **Later**; regional/premium/overtime caveats are substantial.                   |
|  15 | Next-shift summary            | Answer immediate daily question; individual                | Not prominent in inspected tools; gap is an **Inference**                     | Excellent / H                              | High / medium                        | Low                 | **P1** next phase.                                                              |
|  16 | Countdown to next working day | Quick “days until work” answer; individual                 | No public direct evidence; **Inference**                                      | Good / H                                   | Medium / medium                      | Low                 | **P2**; time-zone/today semantics need care.                                    |
|  17 | Manual date overrides         | Handle swaps, overtime, sickness; individual               | TA live editing **Marketing claim**; templates editable **Directly observed** | Moves toward Strategy B / M                | High / medium                        | Medium              | **Later**, after persistence/share conflict is designed.                        |
|  18 | Holidays and leave            | See real personal availability; individual                 | WO/TA **Marketing claims**; SS template fields **Directly observed**          | Strategy-B feature / M                     | Medium / high                        | Medium              | **Later**; locale feeds and personal data expand scope.                         |
|  19 | Notes attached to dates       | Remember context; individual                               | SS editable cells **Directly observed**; TA fields **Marketing claim**        | Moderate / M                               | Low / low                            | Low                 | **Later**; persistence and URL/privacy burden.                                  |
|  20 | Local browser persistence     | Return without re-entering data; repeat individual         | Competitor persistence often account-based, **Could not verify**              | Strong privacy fit / H for repeat users    | High / low                           | Medium              | **P2**; explicit opt-in, clear/reset controls, schema migration.                |
|  21 | Installable PWA/offline       | Reliable access at work; mobile individual                 | TA apps **Marketing claim**; others **Could not verify**                      | Good / M                                   | Medium / low-medium                  | Low                 | **P2** after usage; cached-content/update testing required.                     |
|  22 | CSV/spreadsheet export        | Analyze or edit externally; power user                     | SS formats **Directly observed**                                              | Moderate / L-M                             | Low / medium                         | Low                 | **Later**; date/shift CSV is easy but secondary to calendar use.                |
|  23 | Full-year ICS export          | Add full schedule once; individual                         | No inspected direct equivalent; PDF/year at RP **Directly observed**          | Excellent / H                              | High / medium                        | Low                 | **P1** next phase.                                                              |
|  24 | Direct provider integration   | One-click sync/update; individual                          | TA integrations **Marketing claim**                                           | Poor near-term / M                         | Medium / medium                      | Medium              | **Later/Reject now**; OAuth/token/backend burden.                               |
|  25 | Multiple employees            | Schedule a team; manager                                   | WO/TA/SS **Directly observed positioning/Marketing claims**                   | Conflicts / N/A                            | Crowded market / high search         | High SaaS potential | **Reject** for current product.                                                 |
|  26 | Staffing/coverage             | Ensure roles are covered; manager                          | WO/TA **Marketing claims**; templates **Directly observed**                   | Conflicts / N/A                            | Crowded / high                       | High                | **Reject**.                                                                     |
|  27 | Swaps/leave requests          | Operational collaboration; teams                           | TA/WO **Marketing claims**                                                    | Conflicts / N/A                            | Low against SaaS incumbents / medium | Subscription        | **Reject**.                                                                     |
|  28 | AI-generated schedules        | Draft complex rosters; manager                             | TA **Marketing claim**                                                        | Conflicts with deterministic utility / N/A | Trend value / high but noisy         | Possible SaaS       | **Reject**.                                                                     |
|  29 | Localization                  | Understand dates/copy; global individuals                  | SS redirect **Directly observed**; week conventions across products           | Strong eventual fit / H by locale          | High / high                          | Indirect traffic    | **P2**; design locale-aware dates/week start and translated content governance. |
|  30 | Dark mode/appearance          | Comfort/preference; individual                             | Not material in inspected journeys                                            | Good but non-core / M                      | Low / low                            | None                | **Later**.                                                                      |

### 16.2 Engineering, accessibility, privacy, and maintenance evaluation

|   # | Candidate            |               Effort | Domain-model impact                                | URL compatibility                             | Accessibility complexity                        | Privacy/security impact               | Maintenance burden          |
| --: | -------------------- | -------------------: | -------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- | ------------------------------------- | --------------------------- |
|   1 | Custom names         |                    M | Add shift definitions/IDs separate from kind       | Query v2 or optional encoded map              | Name length, duplicate names, labels            | User text in share URL                | M: escaping, migrations     |
|   2 | Custom colors        |                    M | Presentation metadata                              | Optional query v2                             | Contrast, forced colors, non-color cues         | Low                                   | M: palette rules            |
|   3 | Start/end times      |                    L | Replace date-only assumption with timed definition | Query v2 mandatory                            | Clear time/date announcements                   | Sensitive work times in URLs/exports  | L: zones, DST, formatting   |
|   4 | Overnight            |                    L | End date differs; duration and event boundaries    | Coupled to #3                                 | Explain date ownership                          | Same as #3                            | L: DST/provider behavior    |
|   5 | Evening type         |                    M | Extend `ShiftKind` or introduce definitions        | Current parsers reject new code; versioning   | Icon/label/color redundancy                     | Low                                   | M                           |
|   6 | Week start           |                  S-M | Presentation preference, not occurrence engine     | Backward-compatible optional param            | Correct header/order/table associations         | None                                  | S                           |
|   7 | Preset library       | M per verified batch | New immutable preset cycles                        | Existing preset IDs stable; additive IDs      | Preview labels/order                            | None                                  | M: source/variation reviews |
|   8 | Searchable selector  |                    M | None                                               | None                                          | Combobox/listbox behavior, keyboard, no-results | None                                  | M                           |
|   9 | Pattern comparison   |                  M-L | Reuse preset metadata/engine                       | Share selected candidates only if needed      | Dense comparison on mobile                      | None                                  | M                           |
|  10 | Duration             |                    M | Expansion range beyond current views               | Optional range; bound length                  | Result size/navigation                          | Large URLs only if encoded            | M                           |
|  11 | Hours/shift          |                    M | Add duration metadata/calculation                  | Optional param/version                        | Units and error copy                            | Work details in URLs                  | M                           |
|  12 | Hour totals          |                    M | Depends on #11, exceptions                         | Same                                          | Tables/rounding descriptions                    | Low                                   | M-L                         |
|  13 | Weekend totals       |                  S-M | Derived from existing dates                        | None                                          | Clear weekend definition                        | None                                  | S-M: locale definition      |
|  14 | Wages                |                    L | Currency/rates/premiums/rounding                   | Avoid URL or versioned private params         | Numeric/currency errors                         | Financial data                        | L/XL: regional rules        |
|  15 | Next shift           |                  S-M | Derived occurrence query around “today”            | None; result remains config-based             | Live/current-state wording                      | Local date only                       | S-M                         |
|  16 | Countdown            |                    M | Local-today boundary                               | None                                          | Do not rely on live animation                   | Time zone/local date                  | M                           |
|  17 | Overrides            |                    L | Exception layer with precedence                    | Query v2 potentially huge                     | Editing calendar cells accessibly               | Personal events in URL/storage        | L                           |
|  18 | Holidays/leave       |                    L | New occurrence annotations/exceptions              | Query/storage design                          | Multiple statuses per date                      | Personal absence data                 | L: locale feeds             |
|  19 | Notes                |                  M-L | Free-text per date                                 | Poor URL fit                                  | Editing/retrieval/verbosity                     | Potential sensitive text/XSS escaping | L                           |
|  20 | Local persistence    |                    M | Schema/version around config                       | Canonical URL must override/merge predictably | Save/clear status and controls                  | Shared-device disclosure/clear        | M: migrations               |
|  21 | PWA/offline          |                  M-L | None                                               | None                                          | Offline/update messaging                        | Cache policy                          | M-L: service-worker updates |
|  22 | CSV                  |                  S-M | Serializer over occurrences                        | None                                          | Accessible action/status                        | Exported local file                   | S-M                         |
|  23 | Full-year ICS        |                    M | Existing 366-day bounded expansion                 | None                                          | Range label/status/file size                    | Exported work schedule                | M: provider QA              |
|  24 | Provider integration |                   XL | Timed IDs/sync state likely                        | OAuth callback/state                          | Auth and sync errors                            | Tokens/account data/high              | XL                          |
|  25 | Employees            |                   XL | Identity and schedule ownership                    | New app/data URLs                             | Complex grids/permissions                       | High personal data                    | XL                          |
|  26 | Coverage             |                   XL | Roles, demand, constraints                         | New model                                     | Dense planning UI                               | High                                  | XL + rule support           |
|  27 | Swaps/requests       |                   XL | Workflow states/audit trail                        | Auth routes                                   | Notifications/status                            | High                                  | XL                          |
|  28 | AI                   |                   XL | Prompt/result validation                           | New workflow                                  | Explainability/error recovery                   | Prompts/provider transfer             | XL: cost/model drift        |
|  29 | Localization         |                    L | Locale at presentation boundary                    | Locale routes or negotiation; canonical plan  | Translation quality, RTL, date terms            | Low                                   | L ongoing                   |
|  30 | Dark mode            |                    M | Presentation only                                  | Local preference, no URL needed               | Contrast across all states                      | Local preference only                 | M                           |

## 17. Comparison of Strategies A, B, and C

| Dimension                                   | A — Focused individual utility                                      | B — Advanced personal planner                            | C — Workforce management                                               |
| ------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Target                                      | One worker with a known repeating cycle                             | One worker managing times, exceptions, leave, pay, notes | Managers and teams                                                     |
| Advantage                                   | Speed, privacy, deterministic accuracy, zero account                | Richer daily utility without team overhead               | Operational system of record                                           |
| Build complexity                            | Low-medium                                                          | Medium-high                                              | Very high                                                              |
| Infrastructure                              | Static/client app; optional hosting only                            | Local database/PWA; perhaps optional sync later          | Auth, database, roles, notifications, audit, billing, integrations     |
| Privacy duties                              | Minimal; schedules can stay local                                   | Sensitive work/leave/notes on device and in exports      | Employee PII, availability, leave, roles, retention, security response |
| Support burden                              | Low                                                                 | Medium                                                   | High/continuous                                                        |
| Monetization                                | Tips, disclosed sponsor/affiliate, small one-time convenience offer | One-time/PWA premium or privacy-first paid tier          | Recurring per-seat SaaS                                                |
| SEO                                         | Strong named-pattern and calculator intent                          | Strong personal-planner/how-to intent                    | Broad but extremely competitive commercial intent                      |
| Incumbent risk                              | Low; competitors often over-serve                                   | Moderate; shift-worker apps exist                        | Very high; directly competes with mature SaaS                          |
| Fit with 500–2,000 DH/month first-year goal | **Best**: modest traffic/conversion can validate cheaply            | Possible later, but more build/support before validation | Poor: revenue goal does not justify platform cost and risk             |

**Selected strategy: A.** Add a few high-value personal conveniences from B only when they remain deterministic, local, optional, and compatible with the account-free path. Reconsider B after launch if repeat use, export behavior, support requests, or direct user interviews show demand. Do not start C without a separate business thesis and explicit product reset.

## 18. Prioritization scorecard

Scores are 1–5. For **User value, Strategic fit, Differentiation, Organic discovery, and Monetization**, higher is better. For **Effort, Technical risk, Maintenance, and Privacy/legal risk**, lower is better. No aggregate total is used because summing benefits and risks would hide important dependencies and category errors.

| Candidate                   |          Value | Fit | Diff. | Organic | Monet. | Effort | Tech risk | Maint. | Privacy/legal | Why this rank                                                                                 |
| --------------------------- | -------------: | --: | ----: | ------: | -----: | -----: | --------: | -----: | ------------: | --------------------------------------------------------------------------------------------- |
| Verified preset library     |              5 |   5 |     4 |       5 |      3 |      3 |         2 |      3 |             1 | Direct demand and SEO fit; accuracy process is the main cost.                                 |
| Configurable week start     |              4 |   5 |     3 |       3 |      1 |      2 |         2 |      2 |             1 | Common preference, small boundary-preserving change.                                          |
| Full-year ICS               |              5 |   5 |     4 |       3 |      2 |      3 |         2 |      3 |             1 | Removes repeated monthly export; existing engine already caps a year.                         |
| Next-shift summary          |              5 |   5 |     5 |       3 |      2 |      2 |         2 |      2 |             1 | Excellent daily utility and differentiation with no new stored data.                          |
| Weekend totals              |              4 |   5 |     4 |       3 |      1 |      2 |         2 |      2 |             1 | Personally meaningful, derived from current dates.                                            |
| Searchable selector         |              3 |   4 |     3 |       3 |      1 |      3 |         2 |      3 |             1 | Valuable only with a larger library; accessible combobox quality matters.                     |
| Local persistence           |              4 |   4 |     4 |       1 |      3 |      3 |         3 |      3 |             2 | Repeat-use value is high, but share URL precedence and shared-device privacy need evidence.   |
| Shift times/overnight       |              5 |   3 |     4 |       4 |      3 |      5 |         5 |      5 |             3 | Valuable, but changes the date-only contract, URLs, ICS, DST, and privacy surface.            |
| Manual overrides            |              4 |   3 |     4 |       3 |      3 |      5 |         4 |      5 |             3 | Solves real life, but creates persistence and exception-precedence complexity.                |
| Localization                |              4 |   4 |     4 |       5 |      3 |      4 |         3 |      5 |             1 | Strong reach; ongoing translation and indexation governance make it post-launch.              |
| Wage calculator             |              3 |   2 |     2 |       4 |      3 |      4 |         4 |      5 |             5 | Searchable but legally/regional complex and easy to misrepresent.                             |
| Multiple employees/coverage | 4 for managers |   1 |     1 |       4 |      5 |      5 |         5 |      5 |             5 | A different market and infrastructure; attractive revenue does not rescue strategic conflict. |

Why the leaders deserve priority: preset discovery expands both immediate utility and high-intent content; week start removes a common cultural friction at low risk; year ICS completes an existing export rather than inventing a new platform; next shift and weekend totals create recurring personal value from data the engine already calculates.

## 19. P0/P1/P2/Later/Reject roadmap

### P0 — Improve before public launch

- **No blocking feature gap found.** The current utility is launchable within its documented scope.
- Keep release verification for 320–1440 px, keyboard focus, URL restoration, leap years, ICS, and print as mandatory quality gates.
- Treat any newly discovered pattern-definition error, inaccessible generation flow, or export corruption as P0 defects rather than feature work.

### P1 — Strong next-phase candidate

- #6 configurable week start.
- #7 larger verified preset library.
- #8 searchable preset selector, introduced with the library rather than alone.
- #13 weekend-work totals.
- #15 next-shift summary.
- #23 full-year ICS export.

### P2 — Validate after launch

- #1 custom shift names.
- #3 start/end times and #4 overnight shifts as one discovery track.
- #5 evening/swing shift type.
- #9 pattern comparison.
- #10 selectable display duration.
- #11 hours-per-shift calculator, with #12 totals dependent on it.
- #16 countdown.
- #20 local persistence.
- #21 PWA/offline.
- #29 localization.

### Later — Valuable only after meaningful usage

- #2 custom colors.
- #12 hour totals if not validated with #11.
- #14 wage calculator.
- #17 manual overrides.
- #18 holidays and leave.
- #19 date notes.
- #22 CSV/spreadsheet export.
- #24 direct provider integration.
- #30 dark mode.

### Reject — Conflicts with current product strategy

- #25 multiple employees.
- #26 staffing and coverage planning.
- #27 swaps and leave-request workflows.
- #28 AI-generated schedules.
- Direct provider integration (#24) is not rejected forever, but is rejected for the present strategy/scale.

## 20. Recommended next phase: verified personal utility expansion

Limit the phase to these four improvements:

1. **Verified preset discovery:** add a small batch of genuinely common presets only after exact ordered sequences, cycle-day anchors, and variation warnings are documented. Add cycle previews and accessible search when the option count warrants it. Candidate research should include—but must not automatically ship—DuPont, 6-on/4-off, 7-on/7-off alternating, 14-on/14-off, 2-day/2-night/4-off, Continental, and Southern Swing.
2. **Configurable week start:** Sunday or Monday initially, consistently applied to month/year tables and print.
3. **Month/year ICS range:** retain visible-month default and offer a generated-year export; no OAuth/provider integration.
4. **Personal “what's next” insight:** show next shift/next working day and weekend-work totals using existing date-only occurrences.

The phase deliberately excludes exact times, pay, exceptions, persistence, accounts, team features, and AI. It strengthens the current promise rather than repositioning the product.

## 21. Acceptance criteria for each recommended improvement

### 21.1 Verified preset discovery

- Every preset has a stable ID, exact ordered sequence, cycle length, cycle-day-1 definition, source record, and employer/region variation warning where applicable.
- A preset is not published merely because a competitor names it.
- The form shows a concise text/visual cycle preview before generation; Day/Night/Off remain non-color-coded in meaning.
- Search, if introduced, is keyboard operable, labeled, announces no-results state, and does not hide the custom-cycle route.
- Existing preset URLs remain valid; new IDs are additive and canonical.
- Each published guide uses the same preset object/domain engine for examples and passes content-integrity tests.
- Unit tests cover full-cycle order and boundary repetition; Playwright covers selection, search, URL restore, mobile layout, and guide-to-generator handoff.

### 21.2 Configurable week start

- Users can choose Monday or Sunday; the current default is preserved for old links.
- Month/year headers, leading/trailing blanks, print, and accessible weekday names reorder consistently without altering schedule dates.
- The choice is encoded as an optional canonical URL parameter only if product review decides it is part of shareable state; parsing remains backward-compatible.
- Keyboard, focus, table-header associations, 320 px layout, and both week-start variants are tested.

### 21.3 Month/year ICS range

- Export control clearly offers “visible month” and “generated year”; visible month remains the safe default.
- Year export contains exactly 365 or 366 all-day events for the selected generated year, with stable unique UIDs and correct exclusive `DTEND` dates.
- The export never silently changes to timed events and requires no account/network request.
- Filename, status message, description, and tests identify the selected range.
- Serialization is tested for leap year, year boundary, escaping, CRLF format, and at least Google/Apple/Outlook import smoke checks documented without promising continuous sync.

### 21.4 Next shift and weekend totals

- “Next” is defined against the user's local calendar date and clearly distinguishes next scheduled occurrence from next working Day/Night occurrence.
- If the viewed/generated range does not contain the answer, calculation safely expands within the existing 366-day product bound or explains the limit.
- Weekend definition is explicit and independent of visual week start; initially Saturday/Sunday unless localization research approves another model.
- Results include text labels, not color alone, and do not auto-update in a way that disrupts screen readers.
- Unit tests cover today-on-shift, today-off, year boundary, leap day, all-night, and custom cycles; UI tests cover empty/error/generated states.

## 22. Dependencies and domain-model implications

| Improvement           | Domain dependency                                                        | URL/schema implication                                                     | Presentation/export dependency                              |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Preset discovery      | Additive preset records and verified metadata; schedule engine unchanged | Preserve current IDs; add new IDs only                                     | Search/preview and guide content derive from same source    |
| Week start            | Calendar-grid presentation option; occurrence engine unchanged           | Optional backward-compatible query field or local-only preference decision | Month/year/print must share ordering                        |
| Year ICS              | Existing bounded expansion and ICS serializer                            | None if export choice is transient                                         | Serializer/action copy/tests; file size remains small       |
| Next/weekend insights | Pure derivation over occurrences plus local “today” adapter              | None                                                                       | Summary placement, definitions, focus/live-region restraint |

Before implementation, write a numbered plan that decides:

1. authoritative sources and review standard for each preset;
2. whether week start is shareable schedule state or viewer preference;
3. whether ICS range is a transient action choice or remembered preference;
4. the precise semantics of “next shift,” “working day,” and “weekend.”

No recommended change requires a database, account, analytics, remote storage, or a replacement of the date-only engine.

## 23. Risks and open product decisions

- **Pattern ambiguity:** names such as Panama, Pitman, Continental, and Southern Swing have variants. Open decision: what qualifies as sufficient independent/authoritative verification?
- **Library scale:** search is unnecessary at very small scale. Open decision: establish a threshold (suggested: 7–8 presets) and validate mobile interaction before implementing a complex combobox.
- **Share semantics:** week start can be a property of the schedule view or the viewer. This affects canonical URLs and user expectations.
- **“Today” semantics:** current schedule math is timezone-independent; next-shift UI introduces a local-date clock at the presentation boundary. Keep it out of the pure engine or inject it explicitly for deterministic tests.
- **Weekend definition:** Saturday/Sunday is not universal. Copy must state the definition until localization exists.
- **ICS expectations:** an imported file is a snapshot, not a live subscription. The UI must not imply two-way sync or automatic updates.
- **Content integrity:** more pattern pages increase editorial maintenance. Only publish when a supported preset, verified cycle, example, metadata, and tests ship together.
- **Mobile year density:** current no-overflow result does not prove that users prefer twelve stacked tables. Validate behavior before adding an alternate list/accordion.
- **Monetization trust:** even a small sponsor/affiliate can weaken the “private utility” feel. Define placement, disclosure, and prohibited categories before testing.
- **No analytics tension:** organic-growth decisions need evidence, but tracking conflicts with the promise. Use privacy-preserving aggregate hosting/search-console data only after a separate consent/security decision, or rely on opt-in feedback and support signals.

## 24. Source list with direct URLs

### External public sources

- RotaPlanner shift-pattern generator — **Directly observed**, inspected 2026-09-17: <https://www.rotaplanner.app/shift-patterns/generator>
- WhosOffice shift generator — **Directly observed**, inspected 2026-09-17: <https://www.whosoffice.com/tools/shift-generator/>
- Taskade employee-shift-calendar page — public page **Directly observed**; generated/account product behavior **Marketing claim / Could not verify**, inspected 2026-09-17: <https://www.taskade.com/generate/calendars/employee-shift-calendar>
- Smartsheet shift-schedule templates — public collection **Directly observed**; downloaded artifacts and product behavior **Could not verify**, inspected 2026-09-17: <https://www.smartsheet.com/content/shift-schedule-templates>

### Internal evidence reviewed

- `AGENTS.md`, `README.md`
- `docs/PRODUCT.md`, `docs/DOMAIN.md`, `docs/ARCHITECTURE.md`, `docs/UI-UX.md`, `docs/SEO.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`
- `docs/plans/001-project-foundation.md` through `docs/plans/006-static-content-seo.md`, plus the plans README
- `src/features/schedule/domain/**`, `presentation/**`, `export/**`, and schedule components
- App routes, content registry, metadata/structured-data helpers, and global styles
- All current unit/component tests and Playwright suites, with focused review of schedule engine/generator/homepage/discovery coverage

### Evidence label reminder

All competitor capabilities in this report should be read according to their inline evidence labels. Vendor copy is not independent proof, and inaccessible account-only behavior was not upgraded from **Marketing claim** or **Could not verify** to availability.
