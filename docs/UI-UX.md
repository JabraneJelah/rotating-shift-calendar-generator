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

## Motion

Motion is brief and functional. Honor `prefers-reduced-motion`, avoid autoplaying effects, and do not make important feedback depend on animation.

## Advertising rules

Advertising is not part of the current product. If introduced later, it must not appear inside the generator workflow, between a control and its result, or in a way that resembles a product action. Reserve ad dimensions to prevent layout shift, keep ads out of print, cap density on small screens, and prioritize Core Web Vitals and task completion over revenue.
