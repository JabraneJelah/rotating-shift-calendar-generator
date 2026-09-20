# Deployment

## Production contract

Shift Calendar targets a user-owned Ubuntu server behind an HTTPS reverse proxy and a versioned Docker image. HTTPS is required for service-worker registration except on browser-recognized localhost development. Build and run with the repository-declared Node.js 24 runtime; the PWA generator rejects older Node versions.

Set `NEXT_PUBLIC_SITE_URL` to the final public HTTPS origin before building. Build with `npm ci` followed by `npm run build`. The build command first creates the Next.js production output and then generates the release-specific `public/sw.js`; packaging an image before that second step produces an incomplete release. The generated worker is intentionally ignored by Git and must be copied into the runtime image from the completed build workspace.

## Required responses

The application config supplies the following policy; the reverse proxy must preserve it:

- `/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`, and `X-Content-Type-Options: nosniff`.
- `/manifest.webmanifest`: `Content-Type: application/manifest+json` and a revalidation policy rather than immutable caching.
- `/_next/static/*`: long-lived immutable caching because filenames are content-addressed.
- HTML documents, `/offline`, and stable icon paths: revalidate; do not mark them immutable.
- All application responses: preserve the configured Content Security Policy, referrer policy, frame denial, and content-type protection.

Compression may be enabled for text responses, including the worker and manifest, but intermediaries must not transform hashed static assets. The generator records raw, gzip, and Brotli measurements for release review.

## Atomic rollout

Publish assets before making new HTML or the new worker visible. A release should be deployed atomically through a versioned image or release directory and a health-checked proxy switch. Keep the immediately previous application assets available for at least 48 hours and while known old tabs remain controlled; the service worker intentionally retains at most two completed cache generations, but it cannot compensate for a server that deletes chunks still referenced by open clients.

Recommended order:

1. Build and test the complete image, including generated `public/sw.js`.
2. Start the new revision without routing public traffic to it.
3. Verify `/`, `/offline`, `/manifest.webmanifest`, `/sw.js`, one hashed chunk, and their headers over the production-like proxy.
4. Switch traffic atomically only after health checks pass.
5. Retain the previous image/assets for the rollback window and for existing clients.
6. Remove older revisions only after the release window and client-retention policy are satisfied.

A rollback switches traffic to the previous complete image. Do not serve an older worker with newer HTML or delete the previous chunk set during the transition. A failed PWA generator, missing static route, hash mismatch, budget violation, or stale timezone payload is a failed build and must not be deployed.

## Health checks

The release health check must verify successful responses for all six precached documents (`/`, `/about`, `/shift-schedules`, `/shift-schedules/4-on-4-off`, `/shift-schedules/2-2-3`, and `/offline`), the manifest, worker, install icons, and a representative immutable chunk. It should confirm that the worker is JavaScript with `no-store`, the manifest has its correct MIME type, the offline route is non-indexable, and static chunks are immutable.

Do not register the service worker in ordinary development or unit-test sessions. Production Playwright uses the explicit PWA configuration and an isolated origin. Installation, update behavior across multiple real devices, offline launch after restart, proxy headers, and rollback remain manual release checks.
