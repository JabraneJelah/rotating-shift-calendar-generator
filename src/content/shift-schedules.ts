import {
  addCalendarDays,
  expandSchedule,
  parseISODate,
  resolvePresetPattern,
  type PresetScheduleConfig,
  type ShiftKind,
} from "@/features/schedule/domain";

import type {
  GuidePresetId,
  PageSeo,
  ShiftScheduleGuide,
} from "./content-types";

const EXAMPLE_START = "2026-01-05";

const guideEditorial = {
  "4-on-4-off": {
    label: "4 on / 4 off",
    shortLabel: "4 on 4 off",
    seo: {
      title: "4 On 4 Off Schedule Calendar & Guide",
      description:
        "See the exact eight-day 4 on 4 off cycle, follow a dated example, and create a fixed day- or night-shift calendar.",
      path: "/shift-schedules/4-on-4-off",
    },
    h1: "4 on / 4 off shift schedule",
    definition:
      "The version supported here is an eight-day cycle: four consecutive working positions followed by four consecutive off positions, then the same sequence starts again.",
    anchorExplanation:
      "The pattern start date is cycle position 1—the first working day, not an arbitrary day in the middle of a block. Choosing the correct anchor keeps every later date aligned with your rota.",
    shiftExplanation:
      "Choose Day to label every working position as a day shift, or Night to label every working position as a night shift. Shift Calendar does not automatically alternate day and night blocks.",
    advantages: [
      "The eight-day sequence is short enough to check against a rota at a glance.",
      "Four consecutive off positions can make longer-range personal planning easier.",
      "The repeating structure works well for month, year, print, and calendar-file views.",
    ],
    tradeoffs: [
      "Work and off blocks move across weekdays because eight days do not align with a seven-day week.",
      "A wrong start-date anchor shifts the entire generated calendar.",
      "Similar names can describe different employer rules, shift times, or changeover arrangements.",
    ],
    audience:
      "People comparing a published rota with a four-work, four-off sequence commonly evaluate this pattern. The name alone is not enough: compare the full sequence and anchor date with your employer’s schedule.",
    faqs: [
      {
        question: "What does 4 on 4 off mean?",
        answer:
          "In this tool, it means four working positions followed by four off positions in a repeating eight-day cycle.",
      },
      {
        question: "How long is the cycle?",
        answer:
          "One complete cycle lasts eight calendar days before position 1 repeats.",
      },
      {
        question: "What date should I use as the start date?",
        answer:
          "Use the date of the first working position in a confirmed four-day work block. Check it against an official rota before relying on later dates.",
      },
      {
        question: "Can the pattern use night shifts?",
        answer:
          "Yes. Select Night and all four working positions are shown as Night; off positions remain Off.",
      },
      {
        question: "Does it automatically rotate between days and nights?",
        answer:
          "No. This preset is fixed Day or fixed Night. It does not alternate between those shift types.",
      },
      {
        question: "Can I print or export the result?",
        answer:
          "Yes. After generating a schedule, you can print the active month or year view and download the visible month as an ICS calendar file.",
      },
    ],
    accuracyNote:
      "Verify the sequence, first working date, and Day or Night choice against your employer’s actual rota. Shift Calendar does not determine shift length, pay, overtime, or workplace policy.",
    relatedPresetId: "2-2-3",
  },
  "2-2-3": {
    label: "2-2-3",
    shortLabel: "2-2-3",
    seo: {
      title: "2-2-3 Shift Schedule Calendar & Guide",
      description:
        "See the exact fourteen-day fixed-shift 2-2-3 cycle, review a dated example, and create a day- or night-shift calendar.",
      path: "/shift-schedules/2-2-3",
    },
    h1: "2-2-3 shift schedule",
    definition:
      "The version supported here is a fourteen-day cycle with two work, two off, three work, two off, two work, and three off positions.",
    anchorExplanation:
      "The selected start date is cycle position 1—the first working position in the opening two-day block. It anchors the complete fourteen-day sequence, so it should be checked against a known rota.",
    shiftExplanation:
      "Choose Day to make all seven working positions Day, or Night to make all seven working positions Night. This calculator does not automatically rotate working positions between days and nights.",
    advantages: [
      "The complete fourteen-day view makes the alternating two- and three-position blocks explicit.",
      "Seven work and seven off positions create an even distribution within this cycle without implying shift hours.",
      "A fixed-shift interpretation is straightforward to inspect, print, share, and export.",
    ],
    tradeoffs: [
      "The 2-2-3 name is used for variations, so the label may not fully describe an employer’s order.",
      "This fixed Day or Night model does not represent automatic day/night changeovers.",
      "A start date taken from the wrong work block moves every later position in the calendar.",
    ],
    audience:
      "People whose rota is described as 2-2-3, or as part of the Panama-schedule family, may use this guide to compare sequences. Terminology is not universal, so the exact fourteen positions matter more than the name.",
    terminologyNote:
      "“Panama schedule” can refer to schedules in this family, but employers may rotate teams, swap day and night blocks, or modify the order. This page describes only the fixed-shift sequence shown below.",
    faqs: [
      {
        question: "What is a 2-2-3 schedule?",
        answer:
          "In this implementation, it is a repeating sequence of two work, two off, three work, two off, two work, and three off positions.",
      },
      {
        question: "How many days are in this implementation?",
        answer:
          "The full cycle is fourteen calendar days, with seven working and seven off positions.",
      },
      {
        question: "Is 2-2-3 the same as a Panama schedule?",
        answer:
          "The terms can overlap, but they are not universal guarantees of one sequence. Compare all fourteen positions with your actual rota.",
      },
      {
        question: "Does this calculator rotate day and night shifts?",
        answer:
          "No. It applies your fixed Day or fixed Night choice to every working position.",
      },
      {
        question: "What if my employer uses a different order?",
        answer:
          "Use the custom-cycle option in the generator if it can represent the confirmed order, and verify the result with the source rota.",
      },
      {
        question: "Can I export the schedule?",
        answer:
          "Yes. A generated schedule can be printed, shared with its canonical link, and exported one visible month at a time as an ICS file.",
      },
    ],
    accuracyNote:
      "Compare all fourteen positions, the anchor date, and the fixed Day or Night choice with your employer’s actual rota. Similar schedule names can describe different rules.",
    relatedPresetId: "4-on-4-off",
  },
} as const satisfies Record<
  GuidePresetId,
  {
    readonly label: string;
    readonly shortLabel: string;
    readonly seo: PageSeo;
    readonly h1: string;
    readonly definition: string;
    readonly anchorExplanation: string;
    readonly shiftExplanation: string;
    readonly advantages: readonly string[];
    readonly tradeoffs: readonly string[];
    readonly audience: string;
    readonly terminologyNote?: string;
    readonly faqs: readonly { question: string; answer: string }[];
    readonly accuracyNote: string;
    readonly relatedPresetId: GuidePresetId;
  }
>;

function requireValue<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
  context: string,
): T {
  if (!result.ok) {
    throw new Error(`Unable to create verified content: ${context}.`);
  }

  return result.value;
}

function buildGuide(presetId: GuidePresetId): ShiftScheduleGuide {
  const editorial = guideEditorial[presetId];
  const pattern = requireValue(
    resolvePresetPattern(presetId, "day"),
    `${presetId} day pattern`,
  );
  const startDate = requireValue(parseISODate(EXAMPLE_START), "example start");
  const endDate = requireValue(
    addCalendarDays(startDate, pattern.cycle.length - 1),
    `${presetId} example end`,
  );
  const config: PresetScheduleConfig = {
    kind: "preset",
    version: 1,
    presetId,
    startDate,
    workingShift: "day",
  };
  const occurrences = requireValue(
    expandSchedule(config, startDate, endDate),
    `${presetId} example`,
  );
  const workPositions = pattern.cycle.filter((shift) => shift !== "off").length;

  return Object.freeze({
    presetId,
    ...editorial,
    cycle: pattern.cycle,
    cycleLength: pattern.cycle.length,
    workPositions,
    offPositions: pattern.cycle.length - workPositions,
    exampleStart: EXAMPLE_START,
    example: Object.freeze(
      occurrences.map(({ date, cycleIndex, shift }) =>
        Object.freeze({ date, cyclePosition: cycleIndex + 1, shift }),
      ),
    ),
  });
}

export const shiftScheduleGuides = Object.freeze({
  "4-on-4-off": buildGuide("4-on-4-off"),
  "2-2-3": buildGuide("2-2-3"),
});

export const shiftScheduleList = Object.freeze([
  shiftScheduleGuides["4-on-4-off"],
  shiftScheduleGuides["2-2-3"],
]);

export function shiftLabel(shift: ShiftKind): "Day" | "Night" | "Off" {
  switch (shift) {
    case "day":
      return "Day";
    case "night":
      return "Night";
    case "off":
      return "Off";
  }
}
