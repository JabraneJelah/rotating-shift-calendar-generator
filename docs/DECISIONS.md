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
