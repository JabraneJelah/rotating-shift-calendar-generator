import { describe, expect, it } from "vitest";

import {
  differenceInCalendarDays,
  expandSchedule,
  parseISODate,
  resolveScheduleOccurrence,
  type DomainResult,
  type ISODate,
  type PresetScheduleConfig,
  type ScheduleConfig,
} from "@/features/schedule/domain";

function validDate(value: string): ISODate {
  const result = parseISODate(value);

  if (!result.ok) {
    throw new Error(`Expected ${value} to be a valid ISO date.`);
  }

  return result.value;
}

function expectError<T>(result: DomainResult<T>, code: string): void {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error(`Expected ${code}, but validation succeeded.`);
  }

  expect(result.errors[0]?.code).toBe(code);
}

function presetConfig(
  presetId: PresetScheduleConfig["presetId"] = "4-on-4-off",
  workingShift: PresetScheduleConfig["workingShift"] = "day",
): PresetScheduleConfig {
  return {
    kind: "preset",
    version: 1,
    presetId,
    startDate: validDate("2026-10-01"),
    workingShift,
  };
}

describe("schedule occurrence resolution", () => {
  it.each([
    ["2026-10-01", 0, "day"],
    ["2026-10-08", 7, "off"],
    ["2026-10-09", 0, "day"],
    ["2026-09-30", 7, "off"],
    ["2026-10-17", 0, "day"],
    ["2026-09-15", 0, "day"],
    ["2026-09-14", 7, "off"],
  ] as const)("maps %s to 4-on/4-off index %i", (date, cycleIndex, shift) => {
    expect(resolveScheduleOccurrence(presetConfig(), validDate(date))).toEqual({
      date,
      shift,
      cycleIndex,
    });
  });

  it("uses the selected fixed shift for a night preset", () => {
    expect(
      resolveScheduleOccurrence(
        presetConfig("4-on-4-off", "night"),
        validDate("2026-10-02"),
      ),
    ).toEqual({ date: "2026-10-02", shift: "night", cycleIndex: 1 });
  });

  it.each([
    ["2026-10-01", 0, "day"],
    ["2026-10-14", 13, "off"],
    ["2026-10-15", 0, "day"],
    ["2026-09-30", 13, "off"],
  ] as const)("wraps 2-2-3 on %s", (date, cycleIndex, shift) => {
    expect(
      resolveScheduleOccurrence(presetConfig("2-2-3", "day"), validDate(date)),
    ).toEqual({ date, shift, cycleIndex });
  });

  it("resolves a mixed custom cycle", () => {
    const config: ScheduleConfig = {
      kind: "custom",
      version: 1,
      startDate: validDate("2026-10-01"),
      cycle: ["day", "night", "off"],
    };

    expect(resolveScheduleOccurrence(config, validDate("2026-09-30"))).toEqual({
      date: "2026-09-30",
      shift: "off",
      cycleIndex: 2,
    });
    expect(resolveScheduleOccurrence(config, validDate("2026-10-02"))).toEqual({
      date: "2026-10-02",
      shift: "night",
      cycleIndex: 1,
    });
  });
});

describe("inclusive range expansion", () => {
  it("expands a one-day range", () => {
    expect(
      expandSchedule(
        presetConfig(),
        validDate("2026-10-01"),
        validDate("2026-10-01"),
      ),
    ).toEqual({
      ok: true,
      value: [{ date: "2026-10-01", shift: "day", cycleIndex: 0 }],
    });
  });

  it.each([
    ["full month", "2026-10-01", "2026-10-31", 31],
    ["month boundary", "2026-10-30", "2026-11-02", 4],
    ["year boundary", "2026-12-30", "2027-01-02", 4],
    ["leap February", "2028-02-01", "2028-02-29", 29],
  ])("expands a %s without gaps", (_name, from, to, expectedLength) => {
    const result = expandSchedule(
      presetConfig(),
      validDate(from),
      validDate(to),
    );

    if (!result.ok) {
      throw new Error(`Expected ${from} through ${to} to expand.`);
    }

    expect(result.value).toHaveLength(expectedLength);
    expect(result.value[0]?.date).toBe(from);
    expect(result.value.at(-1)?.date).toBe(to);
    expect(new Set(result.value.map(({ date }) => date)).size).toBe(
      expectedLength,
    );

    for (let index = 1; index < result.value.length; index += 1) {
      const previous = result.value[index - 1];
      const current = result.value[index];

      if (previous === undefined || current === undefined) {
        throw new Error("Expected each range position to exist.");
      }

      expect(differenceInCalendarDays(current.date, previous.date)).toBe(1);
    }
  });

  it("rejects a reversed range", () => {
    expectError(
      expandSchedule(
        presetConfig(),
        validDate("2026-10-02"),
        validDate("2026-10-01"),
      ),
      "INVALID_RANGE",
    );
  });

  it("accepts the maximum 366-day inclusive range", () => {
    const result = expandSchedule(
      presetConfig(),
      validDate("2028-01-01"),
      validDate("2028-12-31"),
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toHaveLength(366);
    }
  });

  it("rejects a 367-day inclusive range", () => {
    expectError(
      expandSchedule(
        presetConfig(),
        validDate("2028-01-01"),
        validDate("2029-01-01"),
      ),
      "RANGE_TOO_LARGE",
    );
  });
});
