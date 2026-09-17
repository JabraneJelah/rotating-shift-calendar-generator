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
  createCalendarWeeks,
  countWeekendDates,
  formatFullDate,
  formatMonthLabel,
  getAdjacentViewMonth,
  getMondayFirstWeekdayIndex,
  getWeekdayLabels,
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

  it("rotates headings and complete rows for Sunday-first presentation", () => {
    const monday = createMonthlyCalendarView(
      presetConfig(),
      validMonth("2026-10"),
      "monday",
    );
    const sunday = createMonthlyCalendarView(
      presetConfig(),
      validMonth("2026-10"),
      "sunday",
    );

    if (!monday.ok || !sunday.ok) {
      throw new Error("Expected both week-start modes to render.");
    }

    expect(getWeekdayLabels("monday").short).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(getWeekdayLabels("sunday").short).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
    expect(monday.value.weeks[0]?.slice(0, 3)).toEqual([null, null, null]);
    expect(sunday.value.weeks[0]?.slice(0, 4)).toEqual([
      null,
      null,
      null,
      null,
    ]);
    expect(sunday.value.weeks.flat().filter((value) => value !== null)).toEqual(
      sunday.value.occurrences,
    );
    expect(
      new Set(
        sunday.value.weeks
          .flat()
          .filter((value) => value !== null)
          .map((value) => value.date),
      ).size,
    ).toBe(31);
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

  it("counts worked Saturday and Sunday dates only", () => {
    const result = createMonthlyCalendarView(
      presetConfig(),
      validMonth("2026-10"),
    );

    if (!result.ok) throw new Error("Expected October 2026 to render.");

    expect(result.value.weekendDates).toEqual({ worked: 7, total: 9 });
    expect(result.value.weekendDates).toEqual(
      countWeekendDates(result.value.occurrences),
    );
    expect(
      createCalendarWeeks(result.value.occurrences, "sunday")
        .flat()
        .filter(Boolean),
    ).toHaveLength(31);
  });

  it("counts Day and Night weekend dates but excludes Off and weekdays", () => {
    expect(
      countWeekendDates([
        { date: validDate("2026-10-03"), shift: "day", cycleIndex: 0 },
        { date: validDate("2026-10-04"), shift: "night", cycleIndex: 1 },
        { date: validDate("2026-10-10"), shift: "off", cycleIndex: 2 },
        { date: validDate("2026-10-05"), shift: "day", cycleIndex: 3 },
      ]),
    ).toEqual({ worked: 2, total: 3 });
  });
});
