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
- Accessible legend and non-color indicators
- ICS export and shareable configuration URLs
- Indexable explanatory pages for supported patterns and calculators
- Local-first operation without an account or saved server data

## Calendar output contract

Generated schedules offer a detailed monthly view and a compact twelve-month overview. Switching to the year view is a presentation choice, not saved state: shared V1 links, reload, and history restoration return to the monthly view represented by the URL. Year navigation likewise does not mutate that URL.

Copy and ICS actions continue to target the preserved visible month. The print action prints whichever view is active. Print CSS requests a portrait monthly page or a two-page landscape year split after six months, but browser and printer settings ultimately control pagination, margins, headers, scaling, and background graphics.

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
