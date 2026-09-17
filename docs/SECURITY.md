# Security and data handling

## Current posture

Phase 1 has no authentication, database, backend API, payments, analytics, ads, or user-submitted server storage. The public site URL is configuration, not a secret. `.env*` files are ignored except for `.env.example`.

## Data minimization

The MVP should generate schedules locally or during the request without retaining personal data. A rotation configuration is not inherently an identity, but free-text labels and shared URLs can reveal work patterns. Collect only fields required to generate the calendar, avoid names by default, and explain when a shared URL exposes its embedded configuration.

Do not put secrets, private notes, access tokens, or sensitive personal data into URLs, browser logs, analytics events, or ICS metadata. Any future telemetry requires a documented event inventory, retention policy, consent/legal review where applicable, and a way to exclude user-entered labels.

## Input and output controls

- Validate all URL, form, and environment input at its boundary with length and shape limits.
- Treat query parameters and imported configurations as untrusted.
- Use React's escaped text output; do not render user HTML.
- Prevent formula injection if CSV-like formats are ever added.
- Generate ICS with standards-aware escaping and safe line folding; do not interpolate raw text.
- Keep dependencies minimal, exact, audited, and updated through reviewed changes.

## Web controls

Use HTTPS in production and platform-managed headers/certificates. Add a tested Content Security Policy when external scripts or other origins are introduced; do not copy a permissive policy pre-emptively. Protect state-changing endpoints with appropriate origin/CSRF controls if any are added. Rate limits, authentication, and a database are unnecessary until such server capabilities exist.

Report suspected vulnerabilities privately to the repository owner; do not include exploit details or real user data in public issues.

## Phase 3A local sharing and export

Canonical share links are created only from validated generated state through the V1 serializer. The current origin/path is combined with that controlled query; unrelated parameters and fragments are excluded. Clipboard access occurs only after the explicit copy action. Rejection reveals the same canonical URL in a labelled read-only field and never falls back to deprecated command execution.

ICS text escapes backslash, comma, semicolon, and every newline form before UTF-8-aware folding, preventing free text from injecting content properties. Calendar dates come from validated occurrences, and exclusive end dates use the domain's date-only arithmetic. The stable UID contains an application-local configuration hash, date, shift kind, and reserved `.invalid` identifier—not a full URL, secret, filesystem path, or configured production hostname.

Downloads are created entirely in the browser with `text/calendar;charset=utf-8`. One object URL is created per explicit action, the temporary anchor is removed, and the URL is revoked in `finally`. Schedule data is not uploaded, logged, persisted, analyzed, or sent to a calendar provider.

## Phase 3B local printing

Printing is initiated only by an explicit user action and delegates directly to the browser's native print dialog. The application reuses escaped semantic calendar HTML and local CSS; it does not build raw HTML strings, rasterize content, contact a print/PDF service, load remote print assets, store print jobs, or transmit schedule data. Browser “Save as PDF” behavior remains local browser functionality rather than an application-generated download.

## Phase 4 structured content and JSON-LD

Structured data is built only from controlled typed breadcrumb definitions and the validated site origin. JSON-LD serialization escapes every `<` as `\u003c` before the string enters a script element, preventing a closing-tag sequence from becoming markup. No user input, URL query value, or remote content is interpolated into JSON-LD or rendered as raw HTML.

Content and schemas do not invent personal identities, employer affiliations, organization details, reviews, ratings, or credentials. About describes product behavior and methodology without exposing irrelevant internal or personal information.
