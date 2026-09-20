import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Shift Calendar — Rotating Shift Planner",
    short_name: "Shift Calendar",
    description:
      "Create, save, print and export rotating shift schedules on your device.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf9",
    theme_color: "#176b64",
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    orientation: "any",
    icons: [
      {
        src: "/icons/shift-calendar-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/shift-calendar-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/shift-calendar-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/shift-calendar-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
