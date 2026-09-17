import { describe, expect, it } from "vitest";

import {
  parseISODate,
  parseISOYearMonth,
  expandSchedule,
  validateScheduleConfig,
  type ISODate,
  type ISOYearMonth,
  type ScheduleConfig,
  type ScheduleOccurrence,
  type ShiftKind,
} from "@/features/schedule/domain";
import {
  escapeICSText,
  foldICSContentLine,
  generateICS,
} from "@/features/schedule/export";

function date(value: string): ISODate {
  const result = parseISODate(value);
  if (!result.ok) throw new Error(`Invalid test date: ${value}`);
  return result.value;
}

function month(value: string): ISOYearMonth {
  const result = parseISOYearMonth(value);
  if (!result.ok) throw new Error(`Invalid test month: ${value}`);
  return result.value;
}

function config(): ScheduleConfig {
  const result = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: "2024-02-01",
    cycle: ["day", "night", "off"],
  });
  if (!result.ok) throw new Error("Invalid test configuration");
  return result.value;
}

function occurrence(
  value: string,
  shift: ShiftKind = "day",
  cycleIndex = 0,
): ScheduleOccurrence {
  return Object.freeze({ date: date(value), shift, cycleIndex });
}

function exportInput(
  occurrences: readonly ScheduleOccurrence[],
  viewMonth = "2024-02",
) {
  return {
    calendarName: "Shift Calendar",
    config: config(),
    occurrences,
    viewMonth: month(viewMonth),
    generatedAt: "20260916T101112Z",
  } as const;
}

function yearExportInput(year: number) {
  const yearText = year.toString().padStart(4, "0");
  const expansion = expandSchedule(
    config(),
    date(`${yearText}-01-01`),
    date(`${yearText}-12-31`),
  );

  if (!expansion.ok) throw new Error(`Unable to expand ${year}.`);

  return {
    calendarName: "Shift Calendar",
    config: config(),
    occurrences: expansion.value,
    year,
    generatedAt: "20260916T101112Z",
  } as const;
}

function successfulContent(occurrences: readonly ScheduleOccurrence[]): string {
  const result = generateICS(exportInput(occurrences));
  if (!result.success) {
    throw new Error(`Unexpected export failure: ${result.error.code}`);
  }
  return result.content;
}

function uidLines(content: string): readonly string[] {
  return content.split("\r\n").filter((line) => line.startsWith("UID:"));
}

describe("ICS serialization", () => {
  it("emits the required calendar envelope with CRLF and a final CRLF", () => {
    const result = generateICS(exportInput([occurrence("2024-02-01")]));

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(result.content).toContain("VERSION:2.0\r\n");
    expect(result.content).toContain(
      "PRODID:-//Shift Calendar//Calendar Export 1.0//EN\r\n",
    );
    expect(result.content).toContain("CALSCALE:GREGORIAN\r\n");
    expect(result.content).toContain("METHOD:PUBLISH\r\n");
    expect(result.content.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(result.content.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
  });

  it("creates one ordered event per occurrence with exact shift summaries", () => {
    const content = successfulContent([
      occurrence("2024-02-01", "day", 0),
      occurrence("2024-02-02", "night", 1),
      occurrence("2024-02-03", "off", 2),
    ]);

    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(content.indexOf("DTSTART;VALUE=DATE:20240201")).toBeLessThan(
      content.indexOf("DTSTART;VALUE=DATE:20240202"),
    );
    expect(content).toContain("SUMMARY:Day Shift\r\n");
    expect(content).toContain("SUMMARY:Night Shift\r\n");
    expect(content).toContain("SUMMARY:Off Day\r\n");
    expect(content.match(/DTSTAMP:20260916T101112Z/g)).toHaveLength(3);
  });

  it.each([
    ["ordinary date", "2024-02", "2024-02-01", "20240202"],
    ["month boundary", "2024-02", "2024-02-29", "20240301"],
    ["year boundary", "2024-12", "2024-12-31", "20250101"],
    ["leap-day boundary", "2028-02", "2028-02-29", "20280301"],
    ["DST-adjacent spring date", "2024-03", "2024-03-10", "20240311"],
    ["DST-adjacent autumn date", "2024-11", "2024-11-03", "20241104"],
  ])("uses an exclusive date-only end for %s", (_, viewMonth, start, end) => {
    const result = generateICS(exportInput([occurrence(start)], viewMonth));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.content).toContain(
      `DTSTART;VALUE=DATE:${start.replaceAll("-", "")}\r\n`,
    );
    expect(result.content).toContain(`DTEND;VALUE=DATE:${end}\r\n`);
  });

  it("returns controlled failures for invalid collections and timestamps", () => {
    expect(generateICS(exportInput([]))).toMatchObject({
      success: false,
      error: { code: "EMPTY_OCCURRENCES" },
    });
    expect(
      generateICS({
        ...exportInput([occurrence("2024-02-01")]),
        generatedAt: "2024-02-01T00:00:00Z",
      }),
    ).toMatchObject({ success: false, error: { code: "INVALID_TIMESTAMP" } });
    expect(
      generateICS(
        exportInput([
          occurrence("2024-02-01"),
          occurrence("2024-02-01", "night"),
        ]),
      ),
    ).toMatchObject({ success: false, error: { code: "DUPLICATE_DATE" } });
    expect(
      generateICS(
        exportInput([occurrence("2024-02-02"), occurrence("2024-02-01")]),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "INVALID_OCCURRENCE_ORDER" },
    });
    expect(generateICS(exportInput([occurrence("2024-03-01")]))).toMatchObject({
      success: false,
      error: { code: "OCCURRENCE_OUTSIDE_MONTH" },
    });
    expect(
      generateICS(exportInput([occurrence("9999-12-31")], "9999-12")),
    ).toMatchObject({ success: false, error: { code: "DATE_OVERFLOW" } });
  });

  it("uses deterministic UIDs and content while distinguishing dates", () => {
    const input = exportInput([
      occurrence("2024-02-01"),
      occurrence("2024-02-02"),
    ]);
    const first = generateICS(input);
    const second = generateICS(input);

    expect(first).toEqual(second);
    if (!first.success) return;

    const uids = uidLines(first.content);
    expect(uids).toHaveLength(2);
    expect(uids[0]).not.toBe(uids[1]);
    expect(uids[0]).toMatch(
      /^UID:sc-[a-f0-9]{16}-20240201-day@shift-calendar\.invalid$/,
    );
  });

  it("escapes special ICS text characters and blocks raw line injection", () => {
    expect(escapeICSText("A\\B,C;D\r\nE\rF\nG")).toBe(
      "A\\\\B\\,C\\;D\\nE\\nF\\nG",
    );

    const result = generateICS({
      ...exportInput([occurrence("2024-02-01")]),
      calendarName: "Team\\A, B; C\r\nINJECTED:yes",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.content).toContain(
      "X-WR-CALNAME:Team\\\\A\\, B\\; C\\nINJECTED:yes\r\n",
    );
    expect(result.content).not.toContain("\r\nINJECTED:yes\r\n");
  });

  it("folds long Unicode content lines at the 75-octet recommendation", () => {
    const folded = foldICSContentLine(`DESCRIPTION:${"é".repeat(60)}`);

    expect(folded.length).toBeGreaterThan(1);
    expect(folded[1]?.startsWith(" ")).toBe(true);
    for (const line of folded) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("returns the safe visible-month filename and exact MIME type", () => {
    const result = generateICS(exportInput([occurrence("2024-02-01")]));

    expect(result).toMatchObject({
      success: true,
      filename: "shift-calendar-2024-02.ics",
      mimeType: "text/calendar;charset=utf-8",
    });
    if (!result.success) return;
    expect(result.filename).toMatch(/^[a-z0-9-]+\.ics$/);
  });

  it.each([
    [2026, 365],
    [2028, 366],
  ])("exports a complete %s year with %s events", (year, eventCount) => {
    const result = generateICS(yearExportInput(year));

    expect(result).toMatchObject({
      success: true,
      filename: `shift-calendar-${year}.ics`,
      mimeType: "text/calendar;charset=utf-8",
    });
    if (!result.success) return;

    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(eventCount);
    expect(result.content).toContain(
      `DTSTART;VALUE=DATE:${year.toString()}0101\r\n`,
    );
    expect(result.content).toContain(
      `DTSTART;VALUE=DATE:${year.toString()}1231\r\n`,
    );
    expect(result.content).not.toContain(`DTSTART;VALUE=DATE:${year - 1}`);
    expect(result.content).not.toContain(`DTSTART;VALUE=DATE:${year + 1}`);
  });

  it("rejects incomplete and out-of-year yearly collections", () => {
    const input = yearExportInput(2026);

    expect(
      generateICS({ ...input, occurrences: input.occurrences.slice(1) }),
    ).toMatchObject({
      success: false,
      error: { code: "INCOMPLETE_EXPORT_RANGE" },
    });
    expect(
      generateICS({
        ...input,
        occurrences: [occurrence("2025-12-31"), ...input.occurrences.slice(1)],
      }),
    ).toMatchObject({
      success: false,
      error: { code: "OCCURRENCE_OUTSIDE_YEAR" },
    });
  });

  it("fails atomically when the final exclusive end exceeds year 9999", () => {
    expect(generateICS(yearExportInput(9999))).toMatchObject({
      success: false,
      error: { code: "DATE_OVERFLOW", occurrenceDate: "9999-12-31" },
    });
  });
});
