# Plan 001 — project foundation

**Status:** Complete  
**Scope:** Phase 1 only

## Context

Shift Calendar starts from an empty repository. Before schedule rules are implemented, the project needs a compatible production stack, clear boundaries, an honest placeholder interface, SEO primitives, test tooling, and documentation that prevents later work from coupling domain logic to presentation.

## Goals

- Establish Next.js App Router, React, strict TypeScript, Tailwind CSS, and shadcn/ui conventions.
- Pin mutually compatible package versions with npm and a lockfile.
- Create a responsive, semantic homepage demonstrating the design direction without simulating a generator.
- Add validated site-origin configuration and native metadata, sitemap, robots, and manifest routes.
- Configure lint, formatting, unit/component tests, and Playwright.
- Record product, domain, architecture, UI/UX, SEO, testing, security, and roadmap decisions.

## Non-goals

- Schedule calculation, real form interaction, calendar rendering, export, sharing, analytics, ads, accounts, persistence, APIs, or localization
- Creating the future route families documented in the SEO direction
- Adding dependencies reserved for Phase 2 needs

## Boundaries affected

- `src/app` for the homepage, layout, metadata, and metadata routes
- `src/components` for layout and one UI primitive
- `src/features/schedule` for the honest generator placeholder only
- `src/lib` for class composition and site configuration
- `src/styles` for global tokens
- `tests` and root tool configuration
- `docs` for durable project sources of truth

## Implementation

- [x] Inspect the repository and confirm no existing files conflict.
- [x] Resolve current package metadata and select compatible versions.
- [x] Add npm scripts, TypeScript strict configuration, Tailwind/PostCSS, ESLint, and Prettier.
- [x] Initialize shadcn/ui-compatible aliases, tokens, utilities, and primitive location.
- [x] Build the server-rendered homepage and metadata foundation.
- [x] Add a React Testing Library test and Playwright smoke test.
- [x] Add required documentation and agent routing guidance.
- [x] Run formatter, lint, typecheck, unit tests, production build, local-start check, and Playwright smoke test.
- [x] Review the final dependency tree, working tree, and file list.

## Testing

The homepage component test asserts the primary heading and explicitly disabled Phase 2 placeholder. The Playwright smoke test verifies the same contract through the running application. Static checks and a production build validate framework integration.

## Risks and open decisions

- Exact behavior of named shift presets must be approved before Phase 2; names are not sufficient definitions.
- The date-only representation and versioned share URL schema need Phase 2 decisions and tests.
- ICS timed-event and time-zone behavior belongs after core generation semantics are stable.
- Production canonical origin remains deployment configuration and cannot be finalized without the real domain.
