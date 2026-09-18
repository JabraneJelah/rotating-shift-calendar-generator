// @vitest-environment node

import { describe, expect, it } from "vitest";

import { validateScheduleConfig } from "@/features/schedule/domain";
import { serializeTimedICS } from "@/features/schedule/export/timed-ics-serializer";
import type { TimedProjectedEvent } from "@/features/schedule/export/timed-export-types";
import { parseISODate } from "@/features/schedule/domain";
import { parseLocalTime } from "@/features/schedule/planner";

function fixture() {
  const config = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: "2026-10-01",
    cycle: ["day"],
  });
  const day = parseISODate("2026-10-01");
  const nextDay = parseISODate("2026-10-02");
  const start = parseLocalTime("22:00");
  const end = parseLocalTime("06:00");
  if (!config.ok || !day.ok || !nextDay.ok || !start.ok || !end.ok)
    throw new Error("fixture");
  const event: TimedProjectedEvent = {
    identity: "2026-10-01:primary:generated:builtin-day",
    occurrenceDate: day.value,
    role: "primary",
    origin: "generated",
    definitionId: "builtin-day",
    summary: "Dāy, shift; team",
    category: "day",
    localStartDate: day.value,
    localStartTime: start.value,
    localEndDate: nextDay.value,
    localEndTime: end.value,
    timeZone: "Europe/Paris" as TimedProjectedEvent["timeZone"],
    utcStart: "2026-10-01T20:00:00Z" as TimedProjectedEvent["utcStart"],
    utcEnd: "2026-10-02T04:00:00Z" as TimedProjectedEvent["utcEnd"],
    startOffsetMinutes: 120,
    endOffsetMinutes: 120,
    overnight: true,
    is24Hours: false,
    breakMinutes: 30,
  };
  return { config: config.value, event };
}

describe("timed UTC ICS serializer", () => {
  it("emits folded escaped UTC events without TZID or VTIMEZONE", () => {
    const { config, event } = fixture();
    const result = serializeTimedICS({
      calendarName: "Shift Calendar — Timed Work",
      config,
      events: [event],
      viewMonth: "2026-10" as never,
      generatedAt: "20260918T120000Z",
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.filename).toBe("shift-calendar-2026-10-timed.ics");
    expect(result.value.mimeType).toBe("text/calendar;charset=utf-8");
    expect(result.value.content).toContain("DTSTART:20261001T200000Z\r\n");
    expect(result.value.content).toContain("DTEND:20261002T040000Z\r\n");
    expect(result.value.content).not.toContain("TZID");
    expect(result.value.content).not.toContain("VTIMEZONE");
    expect(result.value.content).toContain("SUMMARY:Dāy\\, shift\\; team");
    expect(result.value.content).toContain("Work timezone: Europe/Paris");
    expect(result.value.content).toContain("Break: 30 minutes");
    expect(result.value.content.endsWith("\r\n")).toBe(true);
    expect(result.value.content.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("keeps UIDs stable across time, timezone, and ambiguity changes", () => {
    const { config, event } = fixture();
    const changed: TimedProjectedEvent = {
      ...event,
      timeZone: "America/New_York" as TimedProjectedEvent["timeZone"],
      utcStart: "2026-10-02T02:00:00Z" as TimedProjectedEvent["utcStart"],
      utcEnd: "2026-10-02T10:00:00Z" as TimedProjectedEvent["utcEnd"],
      breakMinutes: 45,
    };
    const serialize = (value: TimedProjectedEvent) =>
      serializeTimedICS({
        calendarName: "Timed",
        config,
        events: [value],
        year: 2026,
        generatedAt: "20260918T120000Z",
      });
    const left = serialize(event);
    const right = serialize(changed);
    if (!left.ok || !right.ok) throw new Error("serialization");
    const uid = (content: string) => /^UID:(.+)$/m.exec(content)?.[1];
    expect(uid(left.value.content)).toBe(uid(right.value.content));
    expect(uid(left.value.content)).toContain("sc-timed-v1-");
    expect(left.value.filename).toBe("shift-calendar-2026-timed.ics");
  });

  it("keeps primary and additional identities separate", () => {
    const { config, event } = fixture();
    const additional: TimedProjectedEvent = {
      ...event,
      identity: "2026-10-01:additional:additional:builtin-day",
      role: "additional",
      origin: "additional",
      summary: "Additional Work — Day shift",
    };
    const result = serializeTimedICS({
      calendarName: "Timed",
      config,
      events: [event, additional],
      year: 2026,
      generatedAt: "20260918T120000Z",
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    const uids = [...result.value.content.matchAll(/^UID:(.+)$/gm)].map(
      (match) => match[1],
    );
    expect(new Set(uids).size).toBe(2);
  });
});
