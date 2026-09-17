import { describe, expect, it } from "vitest";

import {
  parseISODate,
  type ISODate,
  type PresetScheduleConfig,
} from "@/features/schedule/domain";
import {
  createYearlyCalendarView,
  getAdjacentYear,
} from "@/features/schedule/presentation/yearly-calendar-view";

function validDate(value: string): ISODate {
  const result = parseISODate(value);

  if (!result.ok) throw new Error(`Invalid fixture date: ${value}`);
  return result.value;
}

function presetConfig(startDate: string): PresetScheduleConfig {
  return {
    kind: "preset",
    version: 1,
    presetId: "4-on-4-off",
    startDate: validDate(startDate),
    workingShift: "day",
  };
}

describe("yearly calendar presentation", () => {
  it("builds twelve ordered months and totals every common-year date", () => {
    const result = createYearlyCalendarView(presetConfig("2026-10-01"), 2026);

    if (!result.ok) throw new Error("Expected a valid yearly view.");

    expect(result.value.months).toHaveLength(12);
    expect(result.value.months[0]?.label).toBe("January 2026");
    expect(result.value.months[11]?.label).toBe("December 2026");
    expect(result.value.occurrences).toHaveLength(365);
    expect(result.value.months.flatMap((month) => month.occurrences)).toEqual(
      result.value.occurrences,
    );
    expect(
      result.value.counts.day +
        result.value.counts.night +
        result.value.counts.off,
    ).toBe(365);
    expect(result.value.weekendDates.total).toBe(104);
  });

  it("includes leap day exactly once and totals 366 dates", () => {
    const result = createYearlyCalendarView(presetConfig("2028-02-01"), 2028);

    if (!result.ok) throw new Error("Expected a valid leap-year view.");

    expect(result.value.occurrences).toHaveLength(366);
    expect(
      result.value.occurrences.filter(({ date }) => date === "2028-02-29"),
    ).toHaveLength(1);
    expect(result.value.months[1]?.occurrences).toHaveLength(29);
    expect(result.value.weekendDates.total).toBe(106);
  });

  it("changes only grid presentation when Sunday is selected", () => {
    const monday = createYearlyCalendarView(presetConfig("2026-10-01"), 2026);
    const sunday = createYearlyCalendarView(
      presetConfig("2026-10-01"),
      2026,
      "sunday",
    );

    if (!monday.ok || !sunday.ok) throw new Error("Expected valid views.");

    expect(sunday.value.occurrences).toEqual(monday.value.occurrences);
    expect(sunday.value.weekendDates).toEqual(monday.value.weekendDates);
    expect(sunday.value.weekStart).toBe("sunday");
    expect(sunday.value.months[0]?.weeks).not.toEqual(
      monday.value.months[0]?.weeks,
    );
  });

  it("preserves the cycle phase when the anchor lies outside the year", () => {
    const result = createYearlyCalendarView(presetConfig("2026-10-01"), 2025);

    if (!result.ok) throw new Error("Expected a valid previous-year view.");

    expect(result.value.occurrences[0]).toEqual({
      date: "2025-01-01",
      shift: "day",
      cycleIndex: 2,
    });
  });

  it("navigates supported years and rejects invalid boundaries", () => {
    expect(getAdjacentYear(1, -1)).toBeNull();
    expect(getAdjacentYear(9999, 1)).toBeNull();
    expect(getAdjacentYear(2026, 1)).toBe(2027);
    expect(
      createYearlyCalendarView(presetConfig("2026-01-01"), 10_000),
    ).toEqual({
      ok: false,
      errors: [{ code: "UNSUPPORTED_YEAR", path: "year", value: 10_000 }],
    });
  });
});
