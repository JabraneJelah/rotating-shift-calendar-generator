# Decision log

Statuses: **Accepted**, **Proposed**, **Superseded**.

## D-001 — Next.js App Router

**Status:** Accepted  
**Reason:** It provides server rendering, nested layouts, route-level metadata, and native sitemap/robots conventions in one deployable application.  
**Consequences:** Routes live in `src/app`; framework upgrades require release review; Pages Router patterns should not be introduced.

## D-002 — TypeScript strict mode

**Status:** Accepted  
**Reason:** Schedule and date rules need explicit contracts and strong refactoring safety.  
**Consequences:** `strict` remains enabled; boundary data must be narrowed or validated instead of asserted away.

## D-003 — Server Components by default

**Status:** Accepted  
**Reason:** Server-first rendering minimizes shipped JavaScript and supports resilient SEO content.  
**Consequences:** `"use client"` requires an interaction or browser-API need and should sit at the smallest practical boundary.

## D-004 — Pure TypeScript schedule domain

**Status:** Accepted  
**Reason:** Rotation rules must be deterministic, exhaustively testable, and reusable across rendering and export.  
**Consequences:** Domain modules cannot import React, Next.js, or browser APIs; date-only and time-aware values require distinct contracts.

## D-005 — No database in the MVP foundation

**Status:** Accepted  
**Reason:** The core utility can operate from user input and shareable configuration without storing accounts or schedules.  
**Consequences:** No Prisma, persistence service, migrations, or user records; revisit only when validated needs cannot be met locally or in URLs.

## D-006 — Native Next.js metadata, sitemap, and robots

**Status:** Accepted  
**Reason:** Framework-native APIs are typed, server-rendered, and sufficient for the initial SEO surface.  
**Consequences:** Metadata belongs with routes; the validated site origin is centralized; third-party SEO packages are not added.

## D-007 — Minimal exact dependency policy

**Status:** Accepted  
**Reason:** Fewer packages reduce client cost, security exposure, and maintenance work. Exact versions make installs reproducible.  
**Consequences:** Add a dependency only for current behavior; `date-fns` and `zod` wait for Phase 2; compatibility can take precedence over an ecosystem package's newest major.

## D-008 — English-first launch

**Status:** Accepted  
**Reason:** The initial audience is international English-speaking users and translation infrastructure would be premature.  
**Consequences:** Use clear, culturally neutral English and locale-safe date presentation; do not add an i18n library yet; avoid architecture that makes later localization needlessly difficult.

## D-009 — Node.js 24 LTS baseline

**Status:** Accepted  
**Reason:** Node 24 is the active LTS available during foundation setup and satisfies the selected Next.js and test tooling.  
**Consequences:** `package.json` and `.nvmrc` target major 24; CI and deployment must use that major until an intentional upgrade.

## D-010 — Public site origin from validated environment configuration

**Status:** Accepted  
**Reason:** Canonicals, sitemap entries, and robots host data need one deployment-specific origin without an invented domain in source.  
**Consequences:** `NEXT_PUBLIC_SITE_URL` must be an HTTP(S) origin; localhost is the build/development fallback; production deployment must set its real HTTPS origin.

## D-011 — Branded ISO date-only public contract

**Status:** Accepted  
**Reason:** A shift cycle maps civil dates, not instants. Strict branded `YYYY-MM-DD` values prevent arbitrary strings and timezone-sensitive `Date` objects from crossing the domain boundary.  
**Consequences:** Public dates support years 0001–9999, require explicit parsing, and never expose JavaScript `Date`; future time-aware types must remain separate.

## D-012 — Integer Gregorian calendar arithmetic

**Status:** Accepted  
**Reason:** Small proleptic-Gregorian day-number conversion is deterministic and avoids local timezone, daylight-saving, locale, mutation, and years-0–99 behavior in JavaScript `Date`.  
**Consequences:** The algorithm is owned code with comprehensive boundary tests; date-library dependencies remain unnecessary for Phase 2A.

## D-013 — Initial fixed-shift preset definitions

**Status:** Accepted  
**Reason:** Preset names are ambiguous unless the exact cycle is stable and visible.  
**Consequences:** `4-on-4-off` is four work then four off positions; `2-2-3` is the approved 14-position seven-work/seven-off sequence. Each substitutes either day or night at every work position; no automatic alternation is inferred.

## D-014 — Panama is an alias, not a preset

**Status:** Accepted  
**Reason:** Panama commonly names the 2-2-3 family, but employers implement it differently and a duplicate identifier would imply unsupported equivalence.  
**Consequences:** Content may mention the alternative name with a qualification; configuration accepts only `2-2-3`, and any distinct rotating sequence requires a future decision.

## D-015 — Version-1 share-query schema

**Status:** Accepted  
**Reason:** Durable links need an explicit version, canonical representation, and unambiguous parsing before UI or browser-history integration exists.  
**Consequences:** V1 distinguishes preset/custom configurations, uses `d`/`n`/`o` cycle tokens, optionally carries view month, rejects duplicate/unknown parameters, and serializes in one canonical order. Configured results remain non-indexable.

## D-016 — Typed validation results at untrusted boundaries

**Status:** Accepted  
**Reason:** URL and form data are expected to be malformed and later UI needs stable codes for accessible messages without parsing thrown exceptions.  
**Consequences:** Parsers and validators return `DomainResult` with machine-readable `DomainError` context. Only violations of already validated programmer invariants may throw.

## D-017 — Monday-first semantic monthly table

**Status:** Accepted

**Reason:** A real table gives dates stable weekday relationships, while Monday-first ordering matches the initial international worker audience and product brief.
**Consequences:** Monthly results use a caption, column headers, table cells, visible Day/Night/Off text, icons, and full accessible names. Week-start configuration and alternate calendar layouts are deferred.

## D-018 — Native history for generator URL state

**Status:** Accepted

**Reason:** The V1 codec already defines durable state, and native `pushState`, `replaceState`, and `popstate` integrate with the App Router without routing or state dependencies.
**Consequences:** Manual generation pushes one entry; month navigation and canonicalization replace the current entry; incoming values are parsed and emitted only by the domain codec.

## D-019 — Editable and generated state remain separate

**Status:** Accepted

**Reason:** Partially edited or invalid values must remain recoverable without being mistaken for schedule truth.
**Consequences:** Controlled form state may contain an empty date, but generated state contains only validated `ScheduleConfig` and derived occurrences. Validation errors never clear the user's edits.

## D-020 — One deep generator client boundary

**Status:** Accepted

**Reason:** The form, focus behavior, and history require browser APIs, while the route content and metadata do not.
**Consequences:** Only `ScheduleGenerator` declares `"use client"`; the page and layout remain Server Components. The form is disabled during the brief hydration restoration window so server defaults cannot overwrite early input.

## D-021 — Native controls and local state for Phase 2B

**Status:** Accepted

**Reason:** Native radios, selects, date input, buttons, React state, and the existing UI primitive cover the workflow accessibly.
**Consequences:** No form, schema, date, calendar, or global-state package is added. A future dependency still requires demonstrated behavior that the current approach cannot reasonably provide.

## D-022 — Date-only visible-month ICS export

**Status:** Accepted

**Reason:** The domain has calendar-day categories but no exact hours or time zones, and the visible month is the Phase 3A result users can currently verify.
**Consequences:** Export emits one all-day event for every Day, Night, and Off occurrence in the current month. `DTEND` is the exclusive next civil date. Year/range export, recurrence, and timed events remain deferred.

## D-023 — Dependency-free pure ICS serialization

**Status:** Accepted

**Reason:** The required RFC 5545 subset is small and controlled, and existing date-only arithmetic already handles the difficult calendar boundary.
**Consequences:** A framework-independent export layer owns CRLF serialization, text escaping, UTF-8-aware 75-octet folding, typed failures, and stable metadata. No calendar package or production dependency is added; browser Blob/download behavior remains separate.

## D-024 — Deterministic export identity and injected time

**Status:** Accepted

**Reason:** Repeat exports should identify the same occurrence consistently while tests must not depend on wall-clock time.
**Consequences:** UID format is `sc-<16-hex configuration hash>-<YYYYMMDD>-<shift>@shift-calendar.invalid`, derived from canonical V1 configuration identity without embedding the raw URL. `DTSTAMP` is an explicit basic UTC timestamp supplied by the UI at activation. The reserved domain can be deliberately revised when a production identity is configured.

## D-025 — Explicit canonical copy with manual fallback

**Status:** Accepted

**Reason:** Durable links existed before users had a clear, accessible way to obtain one, and clipboard permissions are not universally available.
**Consequences:** Generated results expose a copy button that reuses the V1 codec and current visible month. Clipboard success/failure is announced temporarily; absence or rejection reveals a labelled read-only canonical URL. No native-share-only, social, server, or deprecated `execCommand` path is introduced.

## D-026 — Year view is transient presentation state

**Status:** Accepted

**Reason:** Users need an annual overview without silently changing the shipped V1 sharing and visible-month export contract.

**Consequences:** Year mode derives from the preserved monthly view, navigates years without URL mutation, and returns to that month. Generation, reload, and history restoration select Month. One annual domain expansion is grouped into twelve compact semantic tables and annual totals. Copy and ICS actions remain monthly; no V2 schema or yearly ICS behavior is introduced.

## D-027 — Semantic active-view native printing

**Status:** Accepted

**Reason:** The browser already provides accessible print dialogs and PDF destinations, while the rendered semantic calendars are the most auditable print source.

**Consequences:** A text-labelled action invokes `window.print()`. Print CSS hides non-result UI, requests portrait monthly output and two landscape six-month year pages, and preserves identity, totals, non-color cues, and legend. No DOM cloning, canvas, PDF/print library, generated PDF dependency, or pagination guarantee is introduced; browser and printer settings remain authoritative.
