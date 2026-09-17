import type { Metadata } from "next";

import { PatternGuide } from "@/components/content/pattern-guide";
import { shiftScheduleGuides } from "@/content/shift-schedules";
import { createPageMetadata } from "@/lib/metadata";

const guide = shiftScheduleGuides["4-on-4-off"];

export const metadata: Metadata = createPageMetadata(guide.seo);

export default function FourOnFourOffPage() {
  return <PatternGuide guide={guide} />;
}
