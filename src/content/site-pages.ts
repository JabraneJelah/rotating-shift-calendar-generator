import type { PageSeo } from "./content-types";

export const pageSeo = {
  schedules: {
    title: "Rotating Shift Schedule Patterns",
    description:
      "Compare 4 on 4 off and 2-2-3 rotating shift patterns, understand each cycle, and create a calendar for your own start date.",
    path: "/shift-schedules",
  },
  about: {
    title: "About Shift Calendar",
    description:
      "Learn how Shift Calendar calculates repeating schedules, protects schedule privacy, and supports calendar export and printing.",
    path: "/about",
    absoluteTitle: true,
  },
} as const satisfies Record<string, PageSeo>;

export const indexablePaths = [
  "/",
  "/shift-schedules",
  "/shift-schedules/4-on-4-off",
  "/shift-schedules/2-2-3",
  "/about",
] as const;
