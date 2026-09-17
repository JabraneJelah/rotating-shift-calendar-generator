// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  expandSchedule,
  parseISODate,
  parseISOYearMonth,
  validateScheduleConfig,
} from "@/features/schedule/domain";
import { generateEffectiveICS, generateICS } from "@/features/schedule/export";
import {
  DEFAULT_SHIFT_DEFINITION_REGISTRY,
  projectEffectiveSchedule,
  validateDateException,
} from "@/features/schedule/planner";

function fixture() {
  const config = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: "2026-10-01",
    cycle: ["day", "off"],
  });
  const from = parseISODate("2026-10-01");
  const to = parseISODate("2026-10-31");
  const month = parseISOYearMonth("2026-10");
  if (!config.ok || !from.ok || !to.ok || !month.ok) throw new Error("fixture");
  const expanded = expandSchedule(config.value, from.value, to.value);
  if (!expanded.ok) throw new Error("fixture");
  return {
    config: config.value,
    occurrences: expanded.value,
    month: month.value,
  };
}

describe("effective all-day ICS", () => {
  it("is byte-equivalent to the legacy export without exceptions", () => {
    const value = fixture();
    const effective = projectEffectiveSchedule(
      value.occurrences,
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      [],
    );
    if (!effective.ok) throw new Error("projection");
    const legacy = generateICS({
      calendarName: "Shift Calendar",
      config: value.config,
      occurrences: value.occurrences,
      viewMonth: value.month,
      generatedAt: "20260917T120000Z",
    });
    const advanced = generateEffectiveICS({
      calendarName: "Shift Calendar",
      config: value.config,
      dates: effective.value,
      viewMonth: value.month,
      generatedAt: "20260917T120000Z",
    });
    expect(advanced).toEqual(legacy);
  });

  it("exports effective primary and additional events without private notes", () => {
    const value = fixture();
    const changed = validateDateException(
      {
        id: "exception-2026-10-01",
        date: "2026-10-01",
        primary: { type: "leave" },
        additionalWork: { definitionId: "builtin-night" },
        note: "secret note",
      },
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      value.occurrences[0],
    );
    if (!changed.ok) throw new Error("exception");
    const effective = projectEffectiveSchedule(
      value.occurrences,
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      [changed.value],
    );
    if (!effective.ok) throw new Error("projection");
    const result = generateEffectiveICS({
      calendarName: "Shift Calendar",
      config: value.config,
      dates: effective.value,
      viewMonth: value.month,
      generatedAt: "20260917T120000Z",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const unfolded = result.content.replaceAll("\r\n ", "");
    expect(result.content).toContain("SUMMARY:Leave");
    expect(result.content).toContain("SUMMARY:Additional Work — Night shift");
    expect(unfolded).toContain("-primary-leave@shift-calendar.invalid");
    expect(unfolded).toContain(
      "-additional-builtin-night@shift-calendar.invalid",
    );
    expect(result.content).not.toContain("secret note");
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(32);
  });

  it("restores the legacy primary UID after removing an exception", () => {
    const value = fixture();
    const effective = projectEffectiveSchedule(
      value.occurrences,
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      [],
    );
    if (!effective.ok) throw new Error("projection");
    const result = generateEffectiveICS({
      calendarName: "Shift Calendar",
      config: value.config,
      dates: effective.value,
      viewMonth: value.month,
      generatedAt: "20260917T120000Z",
    });
    expect(result.success && result.content).toMatch(
      /-20261001-day@shift-calendar\.invalid/,
    );
  });

  it("rejects an incomplete effective month", () => {
    const value = fixture();
    const effective = projectEffectiveSchedule(
      value.occurrences.slice(1),
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      [],
    );
    if (!effective.ok) throw new Error("projection");
    expect(
      generateEffectiveICS({
        calendarName: "Shift Calendar",
        config: value.config,
        dates: effective.value,
        viewMonth: value.month,
        generatedAt: "20260917T120000Z",
      }),
    ).toEqual({ success: false, error: { code: "INCOMPLETE_EXPORT_RANGE" } });
  });

  it("exports a complete leap year with effective additional work", () => {
    const value = fixture();
    const from = parseISODate("2028-01-01");
    const to = parseISODate("2028-12-31");
    if (!from.ok || !to.ok) throw new Error("year fixture");
    const expanded = expandSchedule(value.config, from.value, to.value);
    if (!expanded.ok) throw new Error("year fixture");
    const changed = validateDateException(
      {
        id: "exception-2028-02-29",
        date: "2028-02-29",
        additionalWork: { definitionId: "builtin-night" },
      },
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      expanded.value[59],
    );
    if (!changed.ok) throw new Error("exception");
    const effective = projectEffectiveSchedule(
      expanded.value,
      DEFAULT_SHIFT_DEFINITION_REGISTRY,
      [changed.value],
    );
    if (!effective.ok) throw new Error("projection");
    const result = generateEffectiveICS({
      calendarName: "Shift Calendar",
      config: value.config,
      dates: effective.value,
      year: 2028,
      generatedAt: "20260917T120000Z",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.filename).toBe("shift-calendar-2028.ics");
    expect(result.content).toContain("SUMMARY:Additional Work — Night shift");
    expect(result.content.match(/BEGIN:VEVENT/g)).toHaveLength(367);
  });
});
