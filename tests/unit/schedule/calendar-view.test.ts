import { describe, expect, it } from "vitest";

import {
  parseISODate,
  parseISOYearMonth,
  type ISODate,
  type ISOYearMonth,
  type PresetScheduleConfig,
} from "@/features/schedule/domain";
import {
  createMonthlyCalendarView,
  formatFullDate,
  formatMonthLabel,
  getAdjacentViewMonth,
  getMondayFirstWeekdayIndex,
  getMonthRange,
  getViewMonthFromDate,
} from "@/features/schedule/presentation/calendar-view";

function validDate(value: string): ISODate {
  const result = parseISODate(value);

  if (!result.ok) {
    throw new Error(`Expected ${value} to be a valid date.`);
  }

  return result.value;
}

function validMonth(value: string): ISOYearMonth {
  const result = parseISOYearMonth(value);

  if (!result.ok) {
    throw new Error(`Expected ${value} to be a valid month.`);
  }

  return result.value;
}

function presetConfig(startDate = "2026-10-01"): PresetScheduleConfig {
  return {
    kind: "preset",
    version: 1,
    presetId: "4-on-4-off",
    startDate: validDate(startDate),
    workingShift: "day",
  };
}

describe("calendar view helpers", () => {
  it("derives a view month and English month label", () => {
    expect(getViewMonthFromDate(validDate("2026-10-31"))).toBe("2026-10");
    expect(formatMonthLabel(validMonth("2026-10"))).toBe("October 2026");
  });

  it("creates ordinary and leap-month ranges", () => {
    expect(getMonthRange(validMonth("2026-10"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(getMonthRange(validMonth("2028-02"))).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });

  it("uses Monday as weekday index zero", () => {
    expect(getMondayFirstWeekdayIndex(validDate("2026-10-05"))).toBe(0);
    expect(getMondayFirstWeekdayIndex(validDate("2026-10-04"))).toBe(6);
  });

  it("navigates across years and stops at supported boundaries", () => {
    expect(getAdjacentViewMonth(validMonth("2026-12"), 1)).toBe("2027-01");
    expect(getAdjacentViewMonth(validMonth("2026-01"), -1)).toBe("2025-12");
    expect(getAdjacentViewMonth(validMonth("0001-01"), -1)).toBeNull();
    expect(getAdjacentViewMonth(validMonth("9999-12"), 1)).toBeNull();
  });

  it("formats a full date without locale APIs", () => {
    expect(formatFullDate(validDate("2026-10-01"))).toBe(
      "Thursday, October 1, 2026",
    );
  });
});

describe("monthly calendar presentation", () => {
  it("uses domain occurrences and derives October totals", () => {
    const result = createMonthlyCalendarView(
      presetConfig(),
      validMonth("2026-10"),
    );

    if (!result.ok) {
      throw new Error("Expected October 2026 to render.");
    }

    expect(result.value.occurrences).toHaveLength(31);
    expect(result.value.occurrences[0]).toEqual({
      date: "2026-10-01",
      shift: "day",
      cycleIndex: 0,
    });
    expect(result.value.occurrences.at(-1)?.date).toBe("2026-10-31");
    expect(result.value.counts).toEqual({ day: 16, night: 0, off: 15 });
    expect(result.value.weeks).toHaveLength(5);
  });

  it("renders leap February exactly once per date", () => {
    const result = createMonthlyCalendarView(
      presetConfig("2028-02-01"),
      validMonth("2028-02"),
    );

    if (!result.ok) {
      throw new Error("Expected leap February to render.");
    }

    expect(result.value.occurrences).toHaveLength(29);
    expect(result.value.occurrences.at(-1)?.date).toBe("2028-02-29");
    expect(new Set(result.value.occurrences.map(({ date }) => date)).size).toBe(
      29,
    );
  });

  it("supports a six-row Monday-first month", () => {
    const result = createMonthlyCalendarView(
      presetConfig("2026-08-01"),
      validMonth("2026-08"),
    );

    if (!result.ok) {
      throw new Error("Expected August 2026 to render.");
    }

    expect(result.value.weeks).toHaveLength(6);
  });
});
