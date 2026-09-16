# Shift Calendar agent guide

Before editing, inspect the relevant existing code and read the document that owns the behavior. Never change unrelated files. Preserve established architecture, naming, accessibility, and design patterns.

Use these sources of truth:

- Product scope: `docs/PRODUCT.md`
- Shift rules and terminology: `docs/DOMAIN.md`
- Architecture and boundaries: `docs/ARCHITECTURE.md`
- Interface work: `docs/UI-UX.md`
- Routes, metadata, or content: `docs/SEO.md`
- Testing: `docs/TESTING.md`
- Security or data handling: `docs/SECURITY.md`

For substantial features, create or update an implementation plan under `docs/plans/`. Keep schedule calculations as pure TypeScript outside React. Default to React Server Components; add a Client Component only for browser interaction or browser APIs. Protect SEO, accessibility, Core Web Vitals, and mobile usability. Avoid unnecessary dependencies and speculative abstractions.

Before completion, run formatting checks, linting, type checking, relevant tests, and the production build. Never claim a check passed unless it was executed. Update documentation when a durable decision, contract, or behavior changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
