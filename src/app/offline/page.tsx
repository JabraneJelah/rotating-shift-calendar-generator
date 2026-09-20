import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page unavailable offline",
  description: "Return to Shift Calendar or retry when you are connected.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function OfflinePage() {
  return (
    <main
      className="mx-auto flex min-h-[65vh] w-full max-w-3xl items-center px-5 py-14 sm:px-8"
      id="main-content"
    >
      <section
        aria-labelledby="offline-title"
        className="border-border bg-card w-full rounded-3xl border p-6 shadow-[0_24px_70px_-44px_oklch(0.32_0.07_220/0.38)] sm:p-10"
      >
        <p className="text-primary text-sm font-semibold">Offline</p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight"
          id="offline-title"
        >
          This page is not available offline.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
          You can open Shift Calendar to use planners saved on this browser, or
          try this page again when you’re connected.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            className="bg-primary text-primary-foreground focus-visible:ring-ring/45 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold outline-none hover:opacity-90 focus-visible:ring-3"
            href="/"
          >
            Open Shift Calendar
          </Link>
          <form action="" method="get">
            <button
              className="border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring/45 inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-5 text-sm font-semibold outline-none focus-visible:ring-3"
              type="submit"
            >
              Try again
            </button>
          </form>
        </div>
        <noscript>
          <p className="text-muted-foreground mt-4 text-sm">
            Reload this page after your connection returns.
          </p>
        </noscript>
      </section>
    </main>
  );
}
