// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  expandSchedule,
  parseISODate,
  parseISOYearMonth,
  validateScheduleConfig,
  type ISODate,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import { generateICS } from "@/features/schedule/export";
import { createTimedExport } from "@/features/schedule/export/timed-export-runtime";
import {
  projectEffectiveSchedule,
  validateShiftDefinitionRegistry,
  type EffectiveScheduleDate,
} from "@/features/schedule/planner";

function date(value: string): ISODate {
  const result = parseISODate(value);
  if (!result.ok) throw new Error("date fixture");
  return result.value;
}

const configResult = validateScheduleConfig({
  kind: "custom",
  version: 1,
  startDate: "1970-01-01",
  cycle: ["day"],
});
const registryResult = validateShiftDefinitionRegistry({
  definitions: [
    {
      id: "builtin-day",
      name: "Day shift",
      shortLabel: "D",
      category: "day",
      color: "amber",
      startTime: "08:00",
      endTime: "16:00",
      breakMinutes: 30,
    },
    {
      id: "builtin-night",
      name: "Night shift",
      shortLabel: "N",
      category: "night",
      color: "indigo",
      startTime: "22:00",
      endTime: "06:00",
      breakMinutes: 0,
    },
  ],
  dayDefinitionId: "builtin-day",
  nightDefinitionId: "builtin-night",
});
if (!configResult.ok || !registryResult.ok) throw new Error("shared fixture");
const config: ScheduleConfig = configResult.value;
const registry = registryResult.value;

function effective(from: string, to: string): readonly EffectiveScheduleDate[] {
  const expanded = expandSchedule(config, date(from), date(to));
  if (!expanded.ok) throw new Error("expansion fixture");
  const result = projectEffectiveSchedule(expanded.value, registry, []);
  if (!result.ok) throw new Error("projection fixture");
  return result.value;
}

describe("timed export range boundaries", () => {
  it("exports January 1970", async () => {
    const month = parseISOYearMonth("1970-01");
    if (!month.ok) throw new Error("month fixture");
    const result = await createTimedExport({
      calendarName: "Timed",
      config,
      dates: effective("1970-01-01", "1970-01-31"),
      viewMonth: month.value,
      generatedAt: "20260918T120000Z",
      timeZone: "UTC",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.filename).toBe("shift-calendar-1970-01-timed.ics");
    expect(result.value.content.match(/BEGIN:VEVENT/g)).toHaveLength(31);
  });

  it("exports the complete year 1970", async () => {
    const result = await createTimedExport({
      calendarName: "Timed",
      config,
      dates: effective("1970-01-01", "1970-12-31"),
      year: 1970,
      generatedAt: "20260918T120000Z",
      timeZone: "UTC",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.content.match(/BEGIN:VEVENT/g)).toHaveLength(365);
  });

  it("exports December 2037", async () => {
    const month = parseISOYearMonth("2037-12");
    if (!month.ok) throw new Error("month fixture");
    const result = await createTimedExport({
      calendarName: "Timed",
      config,
      dates: effective("2037-12-01", "2037-12-31"),
      viewMonth: month.value,
      generatedAt: "20260918T120000Z",
      timeZone: "UTC",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.filename).toBe("shift-calendar-2037-12-timed.ics");
    expect(result.value.content.match(/BEGIN:VEVENT/g)).toHaveLength(31);
  });

  it("exports the complete year 2037", async () => {
    const result = await createTimedExport({
      calendarName: "Timed",
      config,
      dates: effective("2037-01-01", "2037-12-31"),
      year: 2037,
      generatedAt: "20260918T120000Z",
      timeZone: "UTC",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.content.match(/BEGIN:VEVENT/g)).toHaveLength(365);
  });

  it.each([
    ["1969-12-01", "1969-12-31", 1969],
    ["2038-01-01", "2038-01-31", 2038],
  ] as const)(
    "rejects timed occurrences in %s without partial output",
    async (from, to, year) => {
      const result = await createTimedExport({
        calendarName: "Timed",
        config,
        dates: effective(from, to),
        year,
        generatedAt: "20260918T120000Z",
        timeZone: "UTC",
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "UNSUPPORTED_TIMED_EXPORT_YEAR", occurrenceDate: from },
      });
    },
  );

  it.each([
    ["1969-12-01", "1969-12-31", "1969-12"],
    ["2038-01-01", "2038-01-31", "2038-01"],
  ] as const)(
    "keeps existing all-day export available outside the timed range in %s",
    (from, to, viewMonth) => {
      const occurrences = expandSchedule(config, date(from), date(to));
      const month = parseISOYearMonth(viewMonth);
      if (!occurrences.ok || !month.ok) throw new Error("all-day fixture");
      const result = generateICS({
        calendarName: "Shift Calendar",
        config,
        occurrences: occurrences.value,
        viewMonth: month.value,
        generatedAt: "20260918T120000Z",
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(31);
      expect(result.filename).toBe(`shift-calendar-${viewMonth}.ics`);
    },
  );
});
