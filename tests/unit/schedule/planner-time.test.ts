// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  calculateNominalShift,
  compareLocalTime,
  formatLocalTime,
  localTimeToMinutes,
  parseLocalTime,
  type LocalTime,
  type PlannerResult,
} from "@/features/schedule/planner";

function validTime(value: string): LocalTime {
  const result = parseLocalTime(value);

  if (!result.ok) {
    throw new Error(`Expected ${value} to be a valid local time.`);
  }

  return result.value;
}

function expectError<T>(result: PlannerResult<T>, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`Expected ${code}, but validation succeeded.`);
  }
  expect(result.errors[0]?.code).toBe(code);
}

describe("local time", () => {
  it.each(["00:00", "07:30", "22:00", "23:59"])(
    "accepts and canonically formats %s",
    (value) => {
      const result = parseLocalTime(value);
      expect(result).toEqual({ ok: true, value });
      if (result.ok) {
        expect(formatLocalTime(result.value)).toBe(value);
      }
    },
  );

  it.each(["7:30", "24:00", "12:60", "07:30:00", "", " 07:30 "])(
    "rejects the non-canonical time %s",
    (value) => expectError(parseLocalTime(value), "INVALID_TIME_FORMAT"),
  );

  it("converts and compares minutes after midnight", () => {
    expect(localTimeToMinutes(validTime("00:00"))).toBe(0);
    expect(localTimeToMinutes(validTime("23:59"))).toBe(1_439);
    expect(compareLocalTime(validTime("07:00"), validTime("08:00"))).toBe(-1);
    expect(compareLocalTime(validTime("08:00"), validTime("08:00"))).toBe(0);
  });
});

describe("nominal shift calculations", () => {
  it("calculates same-day gross, break, and net minutes", () => {
    expect(
      calculateNominalShift({
        startTime: validTime("07:00"),
        endTime: validTime("15:00"),
        is24Hours: false,
        breakMinutes: 30,
      }),
    ).toEqual({
      ok: true,
      value: {
        grossMinutes: 480,
        breakMinutes: 30,
        netMinutes: 450,
        crossesMidnight: false,
        is24Hours: false,
      },
    });
  });

  it("calculates 22:00 to 06:00 as eight nominal overnight hours", () => {
    expect(
      calculateNominalShift({
        startTime: validTime("22:00"),
        endTime: validTime("06:00"),
        is24Hours: false,
        breakMinutes: 0,
      }),
    ).toEqual({
      ok: true,
      value: {
        grossMinutes: 480,
        breakMinutes: 0,
        netMinutes: 480,
        crossesMidnight: true,
        is24Hours: false,
      },
    });
  });

  it("requires explicit 24-hour intent for equal times", () => {
    const base = {
      startTime: validTime("08:00"),
      endTime: validTime("08:00"),
      breakMinutes: 60,
    };

    expectError(
      calculateNominalShift({ ...base, is24Hours: false }),
      "EQUAL_SHIFT_TIMES",
    );
    expect(calculateNominalShift({ ...base, is24Hours: true })).toEqual({
      ok: true,
      value: {
        grossMinutes: 1_440,
        breakMinutes: 60,
        netMinutes: 1_380,
        crossesMidnight: true,
        is24Hours: true,
      },
    });
  });

  it("rejects a 24-hour flag with unequal times", () => {
    expectError(
      calculateNominalShift({
        startTime: validTime("08:00"),
        endTime: validTime("09:00"),
        is24Hours: true,
        breakMinutes: 0,
      }),
      "INVALID_24_HOUR_CONFIGURATION",
    );
  });

  it("requires the break to be a non-negative integer shorter than gross", () => {
    const base = {
      startTime: validTime("08:00"),
      endTime: validTime("09:00"),
      is24Hours: false,
    };

    expectError(
      calculateNominalShift({ ...base, breakMinutes: -1 }),
      "INVALID_BREAK_DURATION",
    );
    expectError(
      calculateNominalShift({ ...base, breakMinutes: 1.5 }),
      "INVALID_BREAK_DURATION",
    );
    expectError(
      calculateNominalShift({ ...base, breakMinutes: 60 }),
      "BREAK_NOT_SHORTER_THAN_SHIFT",
    );
  });
});
