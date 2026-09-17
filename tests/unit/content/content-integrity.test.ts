import { describe, expect, it } from "vitest";

import { shiftScheduleList } from "@/content/shift-schedules";
import {
  addCalendarDays,
  expandSchedule,
  parseISODate,
  resolvePresetPattern,
  type PresetScheduleConfig,
} from "@/features/schedule/domain";

describe("shift schedule content integrity", () => {
  for (const guide of shiftScheduleList) {
    it(`${guide.presetId} derives its cycle, counts, and example from the domain`, () => {
      const pattern = resolvePresetPattern(guide.presetId, "day");
      expect(pattern.ok).toBe(true);
      if (!pattern.ok) return;

      expect(guide.cycle).toEqual(pattern.value.cycle);
      expect(guide.cycleLength).toBe(pattern.value.cycle.length);
      expect(guide.workPositions).toBe(
        pattern.value.cycle.filter((shift) => shift !== "off").length,
      );
      expect(guide.offPositions).toBe(
        pattern.value.cycle.filter((shift) => shift === "off").length,
      );

      const start = parseISODate(guide.exampleStart);
      expect(start.ok).toBe(true);
      if (!start.ok) return;
      const end = addCalendarDays(start.value, guide.cycleLength - 1);
      expect(end.ok).toBe(true);
      if (!end.ok) return;

      const config: PresetScheduleConfig = {
        kind: "preset",
        version: 1,
        presetId: guide.presetId,
        startDate: start.value,
        workingShift: "day",
      };
      const expected = expandSchedule(config, start.value, end.value);
      expect(expected.ok).toBe(true);
      if (!expected.ok) return;

      expect(guide.example).toEqual(
        expected.value.map(({ date, cycleIndex, shift }) => ({
          date,
          cyclePosition: cycleIndex + 1,
          shift,
        })),
      );
    });

    it(`${guide.presetId} keeps fixed-shift and accuracy safeguards visible`, () => {
      expect(guide.shiftExplanation).toMatch(/does not|doesn't/i);
      expect(guide.shiftExplanation).toMatch(/automatically|fixed/i);
      expect(guide.accuracyNote).toMatch(/employer|rota/i);
      expect(guide.accuracyNote.length).toBeGreaterThan(60);
      expect(guide.seo.path).toBe(`/shift-schedules/${guide.presetId}`);
      expect(guide.h1).toMatch(
        guide.presetId === "4-on-4-off" ? /4 on \/ 4 off/i : /2-2-3/i,
      );
    });
  }
});
