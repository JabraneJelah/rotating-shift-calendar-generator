import type { Metadata } from "next";

import { PatternGuide } from "@/components/content/pattern-guide";
import { shiftScheduleGuides } from "@/content/shift-schedules";
import { createPageMetadata } from "@/lib/metadata";

const guide = shiftScheduleGuides["2-2-3"];

export const metadata: Metadata = createPageMetadata(guide.seo);

export default function TwoTwoThreePage() {
  return <PatternGuide guide={guide} />;
}
