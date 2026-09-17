# Product definition

## User problem

Rotating workers often receive schedules as a short cycle—such as four shifts followed by four days off—but need to know what that cycle means months from now. Manually extending a pattern is slow and error-prone, especially when night work crosses midnight or a worker needs a printable or importable result.

## Audience

The English-first launch serves nurses and other healthcare workers, security guards, factory workers, firefighters, technicians, and anyone working a repeating day/night schedule. Users are likely to check the product quickly on a phone, sometimes during a shift, so clarity and speed outrank novelty.

## Value proposition

Enter a known or custom rotation once and receive a clear calendar that is easy to revisit, print, export, and share. The product should explain its assumptions and make the generated result auditable rather than acting like an opaque scheduling system.

## Initial user journey

1. Choose a known pattern or define a custom cycle.
2. Select the calendar date corresponding to the first item in that cycle.
3. Configure day shifts, night shifts, and days off.
4. Generate a monthly or yearly calendar.
5. Print it, export an ICS file, or share the configuration.

## MVP scope

- A small, verified library of common rotation patterns
- A custom pattern builder for day, night, and off-day sequences
- Date-only pattern anchoring and deterministic calendar generation
- Monthly and yearly views designed for mobile and print
- Monday- or Sunday-first presentation, next-schedule information, and worked-weekend-date totals
- Accessible legend and non-color indicators
- ICS export and shareable configuration URLs
- Indexable explanatory pages for supported patterns and calculators
- Local-first operation without an account or saved server data

## Supported preset library

The verified library contains three fixed presets and three concrete Day/Night rotations. Fixed `4-on-4-off`, fixed `2-2-3`, and fixed `7-on-7-off` require a Day or Night choice. `2-day-2-night-4-off`, DuPont 28-day, and `7-day-7-off-7-night-7-off` contain their complete Day/Night/Off order and do not accept a separate shift choice. Pattern names and starting points can vary by employer, so the interface shows the exact cycle and anchor for confirmation against an official rota.

The selector is a grouped native list with a persistent ordered preview. Six presets do not justify search. Evening/Swing patterns remain outside the product until a separately approved domain expansion can represent them accurately.

## Calendar output contract

Generated schedules offer a detailed monthly view and a compact twelve-month overview. Users can choose Monday- or Sunday-first display; Sunday is stored as optional V1 presentation state while omission means Monday for backward compatibility. Changing this preference does not change schedule calculation. Switching to the year view remains transient: shared links, reload, and history restoration return to the monthly view represented by the URL. Year navigation likewise does not mutate that URL.

One shared insight panel names tomorrow's schedule position and the next Day/Night working occurrence. Month and year summaries count worked Saturday/Sunday dates, not complete weekends. Separate ICS actions export the preserved visible month or the actively displayed complete year; exports remain date-only and include Day, Night, and Off events. The print action prints whichever view is active. Print CSS requests a portrait monthly page or a two-page landscape year split after six months, but browser and printer settings ultimately control pagination, margins, headers, scaling, and background graphics.

## Non-goals

The MVP is not an employer roster, payroll or time-clock system. It will not assign multiple employees, negotiate swaps, track leave, provide legal or fatigue advice, or guarantee that a named pattern matches a particular employer's implementation. Accounts, authentication, payments, a database, a CMS, a backend API, ads, analytics, and localization are outside the current foundation.

## Success metrics

Initial validation will use privacy-conscious, aggregate measurement only after a measurement plan is approved. Core metrics are:

- Number of completed calendar generations
- Generator completion rate (completed generations divided by generator starts)
- Returning visitors
- Calendar exports, separated by format where useful
- Search impressions and organic clicks

Supporting quality signals include generation errors, Core Web Vitals, accessibility defects, and the share of visits reaching a generated calendar. No target numbers are invented before baseline traffic exists.

## Monetization assumptions

Organic search is the intended discovery channel. AdSense may be tested only after the tool demonstrates repeat utility and real usage. Ads must never interrupt configuration, resemble controls, cause layout shifts, or compromise performance. The product must remain useful without advertising.
