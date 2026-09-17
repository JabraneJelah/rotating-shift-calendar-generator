import type { ShiftKind } from "@/features/schedule/domain";

export type GuidePresetId = "4-on-4-off" | "2-2-3";

export type PageSeo = {
  readonly title: string;
  readonly description: string;
  readonly path: `/${string}`;
  readonly absoluteTitle?: boolean;
};

export type BreadcrumbItem = {
  readonly label: string;
  readonly path: `/${string}`;
};

export type ContentSection = {
  readonly heading: string;
  readonly paragraphs: readonly string[];
};

export type FrequentlyAskedQuestion = {
  readonly question: string;
  readonly answer: string;
};

export type ScheduleExampleRow = {
  readonly date: string;
  readonly cyclePosition: number;
  readonly shift: ShiftKind;
};

export type ShiftScheduleGuide = {
  readonly presetId: GuidePresetId;
  readonly label: string;
  readonly shortLabel: string;
  readonly seo: PageSeo;
  readonly h1: string;
  readonly definition: string;
  readonly cycle: readonly ShiftKind[];
  readonly cycleLength: number;
  readonly workPositions: number;
  readonly offPositions: number;
  readonly exampleStart: string;
  readonly example: readonly ScheduleExampleRow[];
  readonly anchorExplanation: string;
  readonly shiftExplanation: string;
  readonly advantages: readonly string[];
  readonly tradeoffs: readonly string[];
  readonly audience: string;
  readonly terminologyNote?: string;
  readonly faqs: readonly FrequentlyAskedQuestion[];
  readonly accuracyNote: string;
  readonly relatedPresetId: GuidePresetId;
};
