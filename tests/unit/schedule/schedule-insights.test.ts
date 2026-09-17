import { describe, expect, it } from "vitest";

import {
  parseISODate,
  validateScheduleConfig,
  type ISODate,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import { createScheduleInsights } from "@/features/schedule/presentation/schedule-insights";

function date(value: string): ISODate {
  const result = parseISODate(value);
  if (!result.ok) throw new Error(`Invalid fixture date: ${value}`);
  return result.value;
}

function config(value: unknown): ScheduleConfig {
  const result = validateScheduleConfig(value);
  if (!result.ok) throw new Error("Invalid fixture config.");
  return result.value;
}

describe("schedule insights", () => {
  it("separates tomorrow's schedule position from the next working day", () => {
    const result = createScheduleInsights(
      config({
        kind: "custom",
        version: 1,
        startDate: "2026-09-17",
        cycle: ["day", "off", "off", "night"],
      }),
      date("2026-09-17"),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        nextPosition: {
          date: "2026-09-18",
          shift: "off",
          cycleIndex: 1,
        },
        nextWorkingDay: {
          date: "2026-09-20",
          shift: "night",
          cycleIndex: 3,
        },
      },
    });
  });

  it("handles long off runs, negative offsets, and leap boundaries", () => {
    const longCycle = [
      "day",
      ...Array.from({ length: 55 }, () => "off"),
    ] as const;
    const result = createScheduleInsights(
      config({
        kind: "custom",
        version: 1,
        startDate: "2028-03-01",
        cycle: longCycle,
      }),
      date("2028-02-28"),
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        nextPosition: { date: "2028-02-29", shift: "off", cycleIndex: 55 },
        nextWorkingDay: { date: "2028-03-01", shift: "day", cycleIndex: 0 },
      },
    });
  });

  it("returns the typed supported-boundary failure without scanning forever", () => {
    const result = createScheduleInsights(
      config({
        kind: "preset",
        version: 1,
        presetId: "4-on-4-off",
        startDate: "9999-12-31",
        workingShift: "day",
      }),
      date("9999-12-31"),
    );

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "UNSUPPORTED_YEAR" }],
    });
  });
});
