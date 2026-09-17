import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/lib/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: {
    default: "Shift Calendar — Rotating Shift Planner",
    template: "%s | Shift Calendar",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en",
    url: "/",
    siteName: siteConfig.name,
    title: "Shift Calendar — Rotating Shift Planner",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f7faf9",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a
          className="print-hidden bg-foreground text-background focus-visible:ring-ring/45 sr-only fixed top-3 left-3 z-50 rounded-md px-4 py-2 outline-none focus:not-sr-only focus-visible:ring-3"
          href="#main-content"
        >
          Skip to main content
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
