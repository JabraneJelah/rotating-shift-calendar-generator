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

The Phase 2B generator starts with the `4 on / 4 off` preset, Day shift, and an intentionally empty start date. Users may select the `2-2-3` preset, switch the fixed working shift, or build a custom ordered cycle with native Day/Night/Off selects. Custom cycles retain at least one position and support up to 56.

Successful generation moves focus to the result heading and shows a Monday-first semantic table. Every date cell includes a visible day number, icon, and Day/Night/Off text plus a full accessible date-and-shift name. The result includes schedule context, monthly counts, a legend, and 44px previous/next controls. Month navigation preserves the validated pattern and updates the URL without adding a history entry for every viewed month.

Failed submission retains all values, connects field copy with `aria-describedby`, marks invalid fields, and moves focus to the error summary. Invalid shared URLs show a separate alert while leaving the form available for recovery. A polite live region announces generation and month changes without interrupting routine editing.

At narrow widths the form stacks, cycle rows remain bounded, the seven-column calendar compacts its spacing and type, and no page-level horizontal scroll is introduced. Wider layouts increase spacing without turning the focused workflow into a dashboard.

## Shipped share and calendar-file actions

After a valid schedule is generated or restored, a compact action panel appears between the monthly summary and calendar grid. The primary generation workflow remains visually dominant. `Copy schedule link` copies the canonical V1 URL including the visible month and announces success in a polite live region. Success and error announcements clear after a short interval without animation or focus movement.

If clipboard access is missing or rejected, the panel explains the failure and reveals a visibly labelled, read-only input containing the canonical link. Its contents are selected when practical and on focus so keyboard and touch users can copy manually; deprecated scripted copy is not used.

`Download calendar file` creates the currently visible month locally and announces success or failure. It never downloads on page load. Both actions are real, text-labelled 44px buttons with existing focus indicators. They stack at narrow widths, wrap at wider widths, reserve a small status area to avoid major layout shift, and do not cover or horizontally widen the calendar.

## Shipped yearly and print workflow

After generation, a native radio group switches between Month and Year. The year view displays twelve semantic Monday-first calendar tables, annual Day/Night/Off totals, schedule identity, an accessible legend, and labelled previous/next year controls. It uses one column on narrow screens, two at medium widths, and three on wide screens. Compact cells retain full accessible date-and-shift names while showing the day number plus D, N, or O, so color is never the only cue.

Switching views moves focus to the new result heading and announces the change politely. Year mode is intentionally transient and never rewrites the V1 URL; returning to Month restores the preserved visible month. Copy and calendar-file actions continue to name that month explicitly.

The text-labelled print action invokes native browser printing for the active view. Print media hides site navigation, marketing, configuration, errors, view controls, and actions while keeping a small product label, schedule heading, schedule context, totals, calendar tables, and legend. Monthly print requests portrait output. Year print requests landscape output with January–June followed by a page break and July–December, arranged three across and two down. Browser print engines and user-selected margins, headers, scale, paper, and background settings may alter final pagination, so the layout is a strong request rather than a guarantee.

## Motion

Motion is brief and functional. Honor `prefers-reduced-motion`, avoid autoplaying effects, and do not make important feedback depend on animation.

## Advertising rules

Advertising is not part of the current product. If introduced later, it must not appear inside the generator workflow, between a control and its result, or in a way that resembles a product action. Reserve ad dimensions to prevent layout shift, keep ads out of print, cap density on small screens, and prioritize Core Web Vitals and task completion over revenue.
