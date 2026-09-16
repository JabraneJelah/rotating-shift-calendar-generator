import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  compareISODate,
  differenceInCalendarDays,
  parseISODate,
  parseISOYearMonth,
  type DomainResult,
  type ISODate,
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

describe("ISO date validation", () => {
  it.each(["2026-01-01", "2028-02-29", "0001-01-01", "9999-12-31"])(
    "accepts the valid calendar date %s",
    (value) => {
      expect(parseISODate(value)).toEqual({ ok: true, value });
    },
  );

  it.each([
    ["2026-02-29", "INVALID_CALENDAR_DATE"],
    ["2026-13-01", "INVALID_CALENDAR_DATE"],
    ["2026-04-31", "INVALID_CALENDAR_DATE"],
    ["2026-00-10", "INVALID_CALENDAR_DATE"],
    ["2026-1-1", "INVALID_DATE_FORMAT"],
    ["01/01/2026", "INVALID_DATE_FORMAT"],
    ["", "INVALID_DATE_FORMAT"],
    ["0000-12-31", "UNSUPPORTED_YEAR"],
    ["10000-01-01", "INVALID_DATE_FORMAT"],
  ])("rejects %s with %s", (value, code) => {
    expectError(parseISODate(value), code);
  });

  it("applies the full Gregorian leap-year rule", () => {
    expect(parseISODate("2000-02-29").ok).toBe(true);
    expectError(parseISODate("1900-02-29"), "INVALID_CALENDAR_DATE");
  });

  it("validates optional view months independently", () => {
    expect(parseISOYearMonth("2026-10")).toEqual({
      ok: true,
      value: "2026-10",
    });
    expectError(parseISOYearMonth("2026-1"), "INVALID_VIEW_MONTH");
    expectError(parseISOYearMonth("2026-13"), "INVALID_VIEW_MONTH");
    expectError(parseISOYearMonth("0000-12"), "INVALID_VIEW_MONTH");
  });
});

describe("date-only arithmetic", () => {
  it.each([
    ["2026-01-10", 1, "2026-01-11"],
    ["2026-01-10", -1, "2026-01-09"],
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-03-07", 2, "2026-03-09"],
    ["2026-11-01", 1, "2026-11-02"],
  ])("adds %i day(s) to %s", (input, amount, expected) => {
    expect(addCalendarDays(validDate(input), amount)).toEqual({
      ok: true,
      value: expected,
    });
  });

  it("rejects a non-integer offset", () => {
    expectError(
      addCalendarDays(validDate("2026-01-01"), 1.5),
      "INVALID_DAY_OFFSET",
    );
  });

  it("rejects arithmetic outside the supported year range", () => {
    expectError(
      addCalendarDays(validDate("9999-12-31"), 1),
      "UNSUPPORTED_YEAR",
    );
    expectError(
      addCalendarDays(validDate("0001-01-01"), -1),
      "UNSUPPORTED_YEAR",
    );
  });

  it("compares fixed-width dates chronologically", () => {
    expect(
      compareISODate(validDate("2026-01-01"), validDate("2026-01-02")),
    ).toBe(-1);
    expect(
      compareISODate(validDate("2026-01-02"), validDate("2026-01-02")),
    ).toBe(0);
    expect(
      compareISODate(validDate("2027-01-01"), validDate("2026-12-31")),
    ).toBe(1);
  });

  it("calculates signed calendar-day differences across boundaries", () => {
    expect(
      differenceInCalendarDays(
        validDate("2028-03-01"),
        validDate("2028-02-28"),
      ),
    ).toBe(2);
    expect(
      differenceInCalendarDays(
        validDate("2025-12-31"),
        validDate("2026-01-01"),
      ),
    ).toBe(-1);
  });
});
