# Security and data handling

## Current posture

Phase 1 has no authentication, database, backend API, payments, analytics, ads, or user-submitted server storage. The public site URL is configuration, not a secret. `.env*` files are ignored except for `.env.example`.

## Data minimization

The MVP should generate schedules locally or during the request without retaining personal data. A rotation configuration is not inherently an identity, but free-text labels and shared URLs can reveal work patterns. Collect only fields required to generate the calendar, avoid names by default, and explain when a shared URL exposes its embedded configuration.

Do not put secrets, private notes, access tokens, or sensitive personal data into URLs, browser logs, analytics events, or ICS metadata. Any future telemetry requires a documented event inventory, retention policy, consent/legal review where applicable, and a way to exclude user-entered labels.

Phase 6A2 personal details exist only in in-memory React state. They are not written to cookies, `localStorage`, IndexedDB, URLs, history payloads, ICS files, logs, analytics, or a server. A refresh discards them. Copied links disclose that only the base rotation is shared whenever private details have been applied.

Phase 6A3 date exceptions and notes use the same in-memory boundary. Replacement, absence, Training, Additional work, and note values never enter URLs, history payloads, browser storage, logs, analytics, metadata, or network requests. Notes are normalized and bounded plain text rendered only through React; they are excluded from copied links, print, accessible calendar names, and ICS. Exception-aware ICS is an explicit local download that includes effective status labels but never note contents. Refresh discards all date changes.

Phase 6A4 keeps timezone selection and overlap choices in component memory and performs conversion and file creation locally. Pinned IANA 2026d data is bundled and loaded only after the timed action; no timezone, schedule, credential, or private note is sent to a server. Initialization and conversion fail closed without `Intl`, UTC, guessed-offset, nested-data, or network fallback. Complete validation precedes Blob creation, preventing partial downloads.

## Input and output controls

- Validate all URL, form, and environment input at its boundary with length and shape limits.
- Treat query parameters and imported configurations as untrusted.
- Use React's escaped text output; do not render user HTML.
- Prevent formula injection if CSV-like formats are ever added.
- Generate ICS with standards-aware escaping and safe line folding; do not interpolate raw text.
- Keep dependencies minimal, exact, audited, and updated through reviewed changes.
- Validate personal names, short labels, identifiers, curated color tokens, canonical time strings, 24-hour intent, and integer breaks through the pure planner boundary. User text is rendered by React as text and is not inserted as HTML.

## Web controls

Use HTTPS in production and platform-managed headers/certificates. Add a tested Content Security Policy when external scripts or other origins are introduced; do not copy a permissive policy pre-emptively. Protect state-changing endpoints with appropriate origin/CSRF controls if any are added. Rate limits, authentication, and a database are unnecessary until such server capabilities exist.

Report suspected vulnerabilities privately to the repository owner; do not include exploit details or real user data in public issues.

## Phase 3A local sharing and export

Canonical share links are created only from validated generated state through the V1 serializer. The current origin/path is combined with that controlled query; unrelated parameters and fragments are excluded. Clipboard access occurs only after the explicit copy action. Rejection reveals the same canonical URL in a labelled read-only field and never falls back to deprecated command execution.

ICS text escapes backslash, comma, semicolon, and every newline form before UTF-8-aware folding, preventing free text from injecting content properties. Calendar dates come from validated occurrences, and exclusive end dates use the domain's date-only arithmetic. The stable UID contains an application-local configuration hash, date, shift kind, and reserved `.invalid` identifier—not a full URL, secret, filesystem path, or configured production hostname.

Downloads are created entirely in the browser with `text/calendar;charset=utf-8`. One object URL is created per explicit action, the temporary anchor is removed, and the URL is revoked in `finally`. Schedule data is not uploaded, logged, persisted, analyzed, or sent to a calendar provider.

Phase 5A extends the same boundary to complete-year files. The serializer accepts only an exact ordered, gap-free January 1–December 31 occurrence set, caps output naturally at 366 events, and fails atomically when the final event's exclusive end would exceed supported date arithmetic (year 9999). The week-start preference, next-schedule insight, and weekend totals are derived locally from validated date-only values. No account, storage, provider API, worker identity, or new telemetry is introduced.

Phase 5B2 adds only frozen in-bundle preset definitions and local form/query handling. Fixed-versus-rotating validation rejects inapplicable hidden shift data before calculation or export. Preset selection, previews, schedule expansion, links, ICS files, and printing remain entirely in the browser; no schedule configuration or production data is transmitted or persisted.

## Phase 6B1 local storage and backup

Saved planners use same-origin IndexedDB and are not uploaded. IndexedDB is neither encrypted secure storage nor a cloud backup: same-origin script, people using the same unlocked browser profile, sufficiently privileged extensions, and device compromise can access it; site-data clearing or browser eviction can remove it. The UI recommends treating JSON backups as private documents because they may contain names, shift times, absences, notes, and timezone details.

Every IndexedDB read and import is untrusted. Decoders reject non-plain/accessor objects, unsafe prototype-related keys, unknown fields, unsupported versions, invalid domain values, duplicate identities/references, files over 5 MiB, more than 20 planners, nesting beyond 12, and aggregate strings over 1,000,000 code points. Imports are reviewed, receive new planner IDs, and commit atomically as new records; a matching ID/name never authorizes replacement. No imported value is evaluated, merged unsafely, injected as HTML, logged, uploaded, or placed in a URL. Broadcast messages contain only action, planner ID, and revision.

## Phase 6B2 application caching

The production service worker is generated from the verified build graph and caches same-origin application assets only. Installation verifies status, redirect/opaque state, content type, byte limit, and SHA-256 revision before promoting a temporary cache. Partial generations cannot activate. Requests with ranges, cross-origin requests, unknown static assets, source maps, development assets, generated JSON/ICS blobs, imported backup contents, and arbitrary query variants are excluded.

The worker never reads or writes IndexedDB and never logs planner data. Inter-tab and worker messages accept exact schemas containing only release identifiers, random tab identifiers, and coarse `safe`, `pending`, or `conflict` states. New releases wait for explicit activation and all known tabs to be safe. HTTPS is mandatory outside browser-recognized localhost development, registration is production-only unless a test explicitly opts in, and `/sw.js` is served with `no-store`, a JavaScript MIME type, `nosniff`, and root scope. The Content Security Policy keeps scripts, connections, workers, fonts, forms, and frames same-origin except for the minimum inline allowances required by the current Next.js runtime and styles.

## Phase 3B local printing

Printing is initiated only by an explicit user action and delegates directly to the browser's native print dialog. The application reuses escaped semantic calendar HTML and local CSS; it does not build raw HTML strings, rasterize content, contact a print/PDF service, load remote print assets, store print jobs, or transmit schedule data. Browser “Save as PDF” behavior remains local browser functionality rather than an application-generated download.

## Phase 4 structured content and JSON-LD

Structured data is built only from controlled typed breadcrumb definitions and the validated site origin. JSON-LD serialization escapes every `<` as `\u003c` before the string enters a script element, preventing a closing-tag sequence from becoming markup. No user input, URL query value, or remote content is interpolated into JSON-LD or rendered as raw HTML.

Content and schemas do not invent personal identities, employer affiliations, organization details, reviews, ratings, or credentials. About describes product behavior and methodology without exposing irrelevant internal or personal information.
