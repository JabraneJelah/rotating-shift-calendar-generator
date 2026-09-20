# UI and UX direction

## Principles

The interface is calm, modern, and practical. It should feel trustworthy to a worker checking tomorrow's shift on a phone. The visual system uses neutral surfaces, a restrained teal primary, generous touch targets, and clear type hierarchy rather than a heavy brand identity.

## Mobile-first behavior

- Design the primary journey for a narrow phone viewport first; progressively add columns and context.
- Keep primary actions reachable and at least 44 by 44 CSS pixels.
- Avoid horizontal scrolling in forms and calendar controls. Calendar grids may use a deliberately designed compact or scrollable presentation only when readability is preserved.
- Preserve entered configuration across harmless viewport changes and validation errors.
- Use concise labels with supporting help text for unfamiliar rotation concepts.

## Responsive layout

Content uses a bounded reading width and fluid gutters. Form and result panels stack on small screens and may sit side by side when space permits. Breakpoints respond to content pressure, not named devices. Print styles must remove navigation and controls while preserving the legend and schedule identity.

## Accessibility

- Meet WCAG 2.2 AA contrast for text, controls, focus indicators, and meaningful graphical elements.
- Never communicate day, night, or off status by color alone; use labels, icons, abbreviations, or patterns too.
- All controls require programmatic names, instructions, and associated errors.
- Preserve logical heading order, landmarks, and DOM order.
- Support complete keyboard navigation without traps. Focus follows user actions predictably.
- Use a clearly visible `:focus-visible` treatment that is not removed for aesthetic reasons.
- Announce generated, successful, or failed outcomes with an appropriate live region without over-announcing routine input.

## Forms and states

Validation should happen after a field is meaningfully interacted with and again on submission. Keep a user's values, place a specific message beside the field, provide an error summary for multi-field failures, and move focus only when submission cannot continue.

Every asynchronous or data-dependent surface must intentionally define loading, empty, success, and error states. Loading indicators should reserve their final space; empty states should explain the next action; success should confirm what changed; errors should identify recovery steps. Never use a disabled control as the only explanation for unavailable behavior.

## Calendar readability

Calendar cells need legible date numbers, a concise shift label, and enough separation for scanning. The current tokens establish a warm yellow day shift, muted indigo night shift, and green off day, always paired with non-color cues. Legends must appear with results and in print. Dense yearly views should offer progressive detail rather than shrinking text below a useful size.

## Shipped monthly workflow

The generator starts with the fixed `4 On / 4 Off` preset, Day shift, and an intentionally empty start date. Presets use one visibly labelled native select with `Fixed Day or Night` and `Rotating Day and Night` optgroups. The Day/Night radio group is present only for fixed presets; switching through rotating presets retains the last fixed choice without submitting or serializing it. Six options do not justify search.

Every selected preset has one persistent preview showing its name, classification, cycle length, description, exact ordered D/N/O tokens, counts, and anchor. Tokens wrap at phone widths, include a visible text legend, and have a complete ordered screen-reader alternative. Rotating previews explain that their Day/Night positions are already defined and remind users to compare the cycle with their official rota. Custom cycles retain native Day/Night/Off selects, at least one position, and the 56-position limit.

Successful generation moves focus to the result heading and shows a semantic calendar table. A labelled native radio group selects Monday- or Sunday-first ordering; Monday is the backward-compatible default, and changing it updates the canonical link without adding browser history or moving focus. Every date cell includes a visible day number, icon, and Day/Night/Off text plus a full accessible date-and-shift name. The result includes schedule context, monthly counts, worked Saturday/Sunday date counts, a legend, and 44px previous/next controls. Month navigation preserves the validated pattern and updates the URL without adding a history entry for every viewed month.

Failed submission retains all values, connects field copy with `aria-describedby`, marks invalid fields, and moves focus to the error summary. Invalid shared URLs show a separate alert while leaving the form available for recovery. A polite live region announces generation and month changes without interrupting routine editing.

At narrow widths the form stacks, cycle rows remain bounded, the seven-column calendar compacts its spacing and type, and no page-level horizontal scroll is introduced. Wider layouts increase spacing without turning the focused workflow into a dashboard.

## Optional personal shift details

Phase 6A2 places one native, collapsed `Shift details (optional)` disclosure after the base schedule controls. The normal generator therefore retains its previous speed and density. Fixed schedules show only the selected Day or Night editor; rotating and mixed custom schedules show both. Unused Evening/Other definitions are not exposed.

Each visible editor has labelled name, short-label, curated-color, native time, explicit 24-hour, and unpaid-break controls. Palette choices include visible color names and selection state; every result still carries text and an icon. Time fields stack on narrow screens. Valid time pairs show gross, break, net, and same-day/next-day wording. The daylight-saving limitation appears only after a complete timed pair exists.

Edits remain drafts until Generate/Update is activated. Validation errors appear inline and in the established focusable summary; invalid edits preserve the last applied result. Reset restores default untimed Day/Night details without touching pattern, date, or week-start values. Applied calendars keep short labels in cells and move the full name/time/duration to accessible cell descriptions and a wrapping legend. Configuration controls remain hidden in print, while textual custom legends remain printable.

Phase 7B Step 1 makes the existing draft/applied distinction visible. Once a schedule exists, any further edit to mode, preset, working shift, start date, custom cycle, or shift details shows a restrained icon-and-text notice directly beside the calendar result (not only near the form) explaining that the visible calendar still reflects the last applied settings. The same transition is announced once to assistive technology through a dedicated polite live region, separate from the existing generation/update announcement, so repeated edits while already dirty do not re-announce. The submit button itself changes beyond its text label: it carries a "create" icon and solid emphasis before any schedule exists, an "apply" icon in a subdued outline treatment once generated with nothing pending, and the same "apply" icon with an added primary-tinted ring and a screen-reader-only "pending" suffix on its accessible name once edits are unapplied. Both the button's ring and the notice box beside the calendar deliberately use the primary/teal token rather than amber: amber is this product's established "something needs attention to avoid a bad outcome" signal (the Local Planners save-failure/conflict state), while an unapplied edit is a normal, expected, fully reversible part of using the form and carries no risk of loss, so it borrows the "this is part of the normal apply action" primary color instead. None of this is communicated by color alone; every state pairs an icon and/or text with any color change. The PWA "Update now" action (see Installation, connectivity, and updates) carries its own distinct refresh icon so it is never visually confused with "Update schedule" when both are visible on the same screen.

## Private date changes and effective statistics

Phase 6A3 adds one result-level `Add or edit date` action rather than interactive calendar cells. It opens a focused in-page editor with a native date field, generated/effective context, a primary-change selector, conditional definition choice, one Additional work control, and one plain-text private note. Save applies all layers atomically; Cancel discards drafts; primary, additional work, and note can be removed independently; Restore generated schedule removes every layer for the date.

Leave and Sick are refused on generated Off dates. Replacement, Training, and Additional work may use the currently applied Day/Night definitions on Off. Calendar cells remain semantic table cells and use concise LV/S/TR/+A/Note text plus complete accessible descriptions. Full note text appears only in the editor and is hidden from print.

Personal statistics appear only after private definitions or date changes exist. They distinguish unique working dates from occurrence counts, show absences/training/additional/weekend/overnight values, and label hour values as complete or known subtotals. Month statistics scope only the active month; annual statistics appear once above the year grid. The editor and statistics stack on phones and retain existing print and no-overflow behavior.

## Shipped share and calendar-file actions

After a valid schedule is generated or restored, a compact action panel appears between the monthly summary and calendar grid. The primary generation workflow remains visually dominant. `Copy schedule link` copies the canonical V1 URL including the visible month and announces success in a polite live region. Success and error announcements clear after a short interval without animation or focus movement.

If clipboard access is missing or rejected, the panel explains the failure and reveals a visibly labelled, read-only input containing the canonical link. Its contents are selected when practical and on focus so keyboard and touch users can copy manually; deprecated scripted copy is not used.

`Export this month (.ics)` creates the currently visible month locally. In Year view, `Export this year (.ics)` separately exports the active complete year. The panel warns that importing a file repeatedly may create duplicates in some calendar applications. Exports occur only on explicit activation and announce success or failure. Actions are real, text-labelled 44px buttons with existing focus indicators. They stack at narrow widths, wrap at wider widths, reserve a small status area to avoid major layout shift, and do not cover or horizontally widen the calendar.

`Export timed work calendar` opens a focused in-page panel and lazy-loads timezone support. No zone is selected automatically. A labelled native text input and datalist accept exact IANA identifiers; privacy copy states that the schedule stays in the browser. Nonexistent DST times explain that the clocks move forward and block download. Repeated times present fieldset/radio choices for earlier and later occurrences, with an explicit apply-to-all action and no preselection. Cancel closes the panel and restores focus. Unsupported years explain that timed export supports 1970–2037 and direct the user to the still-available all-day export.

Phase 6B1 places a compact `Local planners` region after the generator introduction. Before first save it exposes one labelled name field and explicit Save planner action. Saved state shows the current name, a restrained save-state badge, and a native disclosure for Open, Rename, Duplicate, confirmed Delete, JSON export/import, and return to a new unsaved planner. Import always presents count, proposed names, version and non-overwrite copy before confirmation. Controls stack and names wrap on narrow screens without moving the generator below a dashboard-sized header.

Meaningful completion uses a polite live region; blocking storage, import, migration, and conflict failures are visible alerts with retry/reload actions. Routine autosave never moves focus. Inline name forms are labelled and keyboard operable, the file input remains native, deletion uses native confirmation, and closing/switching is disabled during an active write. Copy explains that V1 is base-only; backup copy identifies JSON as a private document and local storage as neither synchronized nor encrypted.

## Shipped yearly and print workflow

After generation, a native radio group switches between Month and Year. A separate `Up next` region appears once per generated schedule and distinguishes tomorrow's cycle position from the next Day/Night working day; it is static result content rather than a repeating live announcement. The year view displays twelve semantic calendar tables in the chosen weekday order, annual Day/Night/Off and worked-weekend-date totals, schedule identity, an accessible legend, and labelled previous/next year controls. It uses one column on narrow screens, two at medium widths, and three on wide screens. Compact cells retain full accessible date-and-shift names while showing the day number plus D, N, or O, so color is never the only cue.

Switching views moves focus to the new result heading and announces the change politely. Year mode is intentionally transient and never rewrites the V1 URL; returning to Month restores the preserved visible month. Copy continues to name that month explicitly, while the two export buttons clearly distinguish month scope from active-year scope.

The text-labelled print action invokes native browser printing for the active view. Print media hides site navigation, marketing, configuration, errors, view controls, and actions while keeping a small product label, schedule heading, schedule context, totals, calendar tables, and legend. Monthly print requests portrait output. Year print requests landscape output with January–June followed by a page break and July–December, arranged three across and two down. Browser print engines and user-selected margins, headers, scale, paper, and background settings may alter final pagination, so the layout is a strong request rather than a guarantee.

## Installation, connectivity, and updates

The normal website remains the primary experience. A restrained install action appears only after meaningful planner use and only when the browser exposes its install prompt; dismissal is a non-authoritative 90-day local preference. Unsupported platforms retain their normal browser installation controls and are never shown a false programmatic-install promise.

Connectivity is a small, non-blocking status. One polite announcement is made when the browser reports offline and one when it reports reconnection; color is never the only signal and planner controls remain available. `navigator.onLine` is treated as a hint rather than proof that a specific asset is reachable.

An available update is user-mediated. **Later** leaves the current release running. **Update now** is enabled only after the current planner and all known tabs report a safe state. Activation never steals focus or refreshes while edits, saving, failures, or conflicts are present. The dedicated offline document works without JavaScript, explains the limitation, and provides ordinary links and a retry button. **Update now** carries a refresh icon distinct from the generator's "Update schedule" action so the two same-named-sounding actions remain visually distinguishable wherever both are visible.

## Motion

Motion is brief and functional. Honor `prefers-reduced-motion`, avoid autoplaying effects, and do not make important feedback depend on animation.

## Content discovery pages

Content pages use a comfortable `max-w-4xl` reading area (narrower for About), fluid gutters, one H1, direct introductory copy, restrained bordered sections, and the existing type and color system. Visible breadcrumbs wrap naturally, use ordinary links for ancestors, identify the current page with `aria-current`, and share their labels and paths with structured data.

Comparison and example tables retain semantic captions and headers. Their own bounded containers scroll horizontally at narrow widths without widening the document. Pattern cycles use compact labelled positions, never color alone. Generator calls to action remain prominent but subordinate to the explanation. The simple header navigation wraps at narrow widths, preserves 44px targets and visible focus, works from nested routes, and stays hidden in print.

## Advertising rules

Advertising is not part of the current product. If introduced later, it must not appear inside the generator workflow, between a control and its result, or in a way that resembles a product action. Reserve ad dimensions to prevent layout shift, keep ads out of print, cap density on small screens, and prioritize Core Web Vitals and task completion over revenue.
