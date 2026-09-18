// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";

import {
  expandSchedule,
  parseISODate,
  validateScheduleConfig,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import { projectTimedEvents } from "@/features/schedule/export/timed-event-projection";
import {
  initializeTimeZoneAdapter,
  validateTimeZone,
} from "@/features/schedule/export/timezone-adapter";
import {
  projectEffectiveSchedule,
  validateDateException,
  validateShiftDefinitionRegistry,
  type EffectiveScheduleDate,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

beforeAll(async () => {
  await initializeTimeZoneAdapter();
});

function registry(
  startTime = "22:00",
  endTime = "06:00",
  is24Hours = false,
): ShiftDefinitionRegistry {
  const result = validateShiftDefinitionRegistry({
    definitions: [
      {
        id: "builtin-day",
        name: "Day shift",
        shortLabel: "D",
        category: "day",
        color: "amber",
        startTime,
        endTime,
        is24Hours,
        breakMinutes: 30,
      },
      {
        id: "builtin-night",
        name: "Night shift",
        shortLabel: "N",
        category: "night",
        color: "indigo",
        startTime,
        endTime,
        is24Hours,
        breakMinutes: 0,
      },
    ],
    dayDefinitionId: "builtin-day",
    nightDefinitionId: "builtin-night",
  });
  if (!result.ok) throw new Error("registry fixture");
  return result.value;
}

function fixture(
  occurrenceDate: string,
  definitions = registry(),
): {
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
} {
  const config = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: occurrenceDate,
    cycle: ["day"],
  });
  const day = parseISODate(occurrenceDate);
  if (!config.ok || !day.ok) throw new Error("config fixture");
  const expanded = expandSchedule(config.value, day.value, day.value);
  if (!expanded.ok) throw new Error("expand fixture");
  const effective = projectEffectiveSchedule(expanded.value, definitions, []);
  if (!effective.ok) throw new Error("effective fixture");
  return { config: config.value, dates: effective.value };
}

function zone(name: string) {
  const result = validateTimeZone(name);
  if (!result.ok) throw new Error("zone fixture");
  return result.value;
}

describe("timed event projection", () => {
  it("resolves overnight work across fall-back independently", () => {
    const value = fixture("2026-10-31");
    const result = projectTimedEvents({
      ...value,
      timeZone: zone("America/New_York"),
    });
    expect(result).toMatchObject({
      ok: true,
      value: [
        {
          localStartDate: "2026-10-31",
          localEndDate: "2026-11-01",
          utcStart: "2026-11-01T02:00:00Z",
          utcEnd: "2026-11-01T11:00:00Z",
          overnight: true,
        },
      ],
    });
  });

  it.each([
    ["2026-03-07", 23],
    ["2026-10-31", 25],
  ])(
    "preserves an explicit civil 24-hour interval beginning %s",
    (day, hours) => {
      const value = fixture(day, registry("08:00", "08:00", true));
      const result = projectTimedEvents({
        ...value,
        timeZone: zone("America/New_York"),
      });
      if (!result.ok) throw new Error(result.error.code);
      expect(result.value[0]?.is24Hours).toBe(true);
      expect(
        (Date.parse(result.value[0]!.utcEnd) -
          Date.parse(result.value[0]!.utcStart)) /
          3_600_000,
      ).toBe(hours);
    },
  );

  it("allows a 2037-12-31 overnight end boundary in 2038", () => {
    const value = fixture("2037-12-31");
    const result = projectTimedEvents({ ...value, timeZone: zone("UTC") });
    expect(result).toMatchObject({
      ok: true,
      value: [{ localEndDate: "2038-01-01", utcEnd: "2038-01-01T06:00:00Z" }],
    });
  });

  it("allows a 2037-12-31 explicit 24-hour end boundary in 2038", () => {
    const value = fixture("2037-12-31", registry("08:00", "08:00", true));
    expect(
      projectTimedEvents({ ...value, timeZone: zone("UTC") }),
    ).toMatchObject({
      ok: true,
      value: [{ localEndDate: "2038-01-01", utcEnd: "2038-01-01T08:00:00Z" }],
    });
  });

  it.each(["1969-12-31", "2038-01-01"])(
    "rejects an occurrence beginning on %s",
    (day) => {
      const value = fixture(day);
      expect(
        projectTimedEvents({ ...value, timeZone: zone("UTC") }),
      ).toMatchObject({
        ok: false,
        error: {
          code: "UNSUPPORTED_TIMED_EXPORT_YEAR",
          occurrenceDate: day,
        },
      });
    },
  );

  it("rejects untimed work atomically", () => {
    const definitions = validateShiftDefinitionRegistry({
      definitions: [
        {
          id: "builtin-day",
          name: "Day",
          shortLabel: "D",
          category: "day",
          color: "amber",
        },
        {
          id: "builtin-night",
          name: "Night",
          shortLabel: "N",
          category: "night",
          color: "indigo",
        },
      ],
      dayDefinitionId: "builtin-day",
      nightDefinitionId: "builtin-night",
    });
    if (!definitions.ok) throw new Error("untimed fixture");
    const value = fixture("2026-06-01", definitions.value);
    expect(
      projectTimedEvents({ ...value, timeZone: zone("UTC") }),
    ).toMatchObject({
      ok: false,
      error: { code: "UNTIMED_WORK_OCCURRENCES", count: 1 },
    });
  });

  it("collects a gap without shifting it", () => {
    const value = fixture("2026-03-08", registry("02:30", "10:30"));
    expect(
      projectTimedEvents({ ...value, timeZone: zone("America/New_York") }),
    ).toMatchObject({
      ok: false,
      error: { code: "NONEXISTENT_LOCAL_TIME", count: 1 },
    });
  });

  it("requires and applies an explicit overlap choice", () => {
    const value = fixture("2026-11-01", registry("01:30", "09:30"));
    const first = projectTimedEvents({
      ...value,
      timeZone: zone("America/New_York"),
    });
    if (first.ok || first.error.boundaries === undefined)
      throw new Error("overlap fixture");
    const key = first.error.boundaries[0]!.key;
    expect(first.error.code).toBe("AMBIGUOUS_LOCAL_TIME");
    expect(
      projectTimedEvents({
        ...value,
        timeZone: zone("America/New_York"),
        disambiguations: { [key]: "later" },
      }),
    ).toMatchObject({
      ok: true,
      value: [{ utcStart: "2026-11-01T06:30:00Z" }],
    });
  });

  it("omits Off, Leave, Sick, and private notes", () => {
    const config = validateScheduleConfig({
      kind: "custom",
      version: 1,
      startDate: "2026-06-01",
      cycle: ["day", "day", "off"],
    });
    const from = parseISODate("2026-06-01");
    const to = parseISODate("2026-06-03");
    const definitions = registry("08:00", "16:00");
    if (!config.ok || !from.ok || !to.ok) throw new Error("omission fixture");
    const expanded = expandSchedule(config.value, from.value, to.value);
    if (!expanded.ok) throw new Error("omission expansion fixture");
    const raw = [
      {
        id: "leave",
        date: "2026-06-01",
        primary: { type: "leave" },
        note: "secret leave note",
      },
      {
        id: "sick",
        date: "2026-06-02",
        primary: { type: "sick" },
        note: "secret sick note",
      },
      { id: "off-note", date: "2026-06-03", note: "secret off note" },
    ];
    const exceptions = raw.map((value, index) => {
      const result = validateDateException(
        value,
        definitions,
        expanded.value[index],
      );
      if (!result.ok) throw new Error("omission exception fixture");
      return result.value;
    });
    const effective = projectEffectiveSchedule(
      expanded.value,
      definitions,
      exceptions,
    );
    if (!effective.ok) throw new Error("omission projection fixture");
    const result = projectTimedEvents({
      config: config.value,
      dates: effective.value,
      timeZone: zone("UTC"),
    });
    expect(result).toEqual({ ok: true, value: [] });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("includes timed Training and additional work as separate events", () => {
    const config = validateScheduleConfig({
      kind: "custom",
      version: 1,
      startDate: "2026-06-01",
      cycle: ["off", "day"],
    });
    const day = parseISODate("2026-06-01");
    const definitions = registry("08:00", "16:00");
    if (!config.ok || !day.ok) throw new Error("exception fixture");
    const expanded = expandSchedule(config.value, day.value, day.value);
    if (!expanded.ok) throw new Error("exception expansion fixture");
    const exception = validateDateException(
      {
        id: "training-and-additional",
        date: day.value,
        primary: { type: "training", definitionId: "builtin-day" },
        additionalWork: { definitionId: "builtin-night" },
      },
      definitions,
      expanded.value[0],
    );
    if (!exception.ok) throw new Error("exception validation fixture");
    const effective = projectEffectiveSchedule(expanded.value, definitions, [
      exception.value,
    ]);
    if (!effective.ok) throw new Error("effective exception fixture");
    const result = projectTimedEvents({
      config: config.value,
      dates: effective.value,
      timeZone: zone("UTC"),
    });
    expect(result).toMatchObject({
      ok: true,
      value: [
        {
          role: "primary",
          origin: "training",
          summary: "Training — Day shift",
        },
        {
          role: "additional",
          origin: "additional",
          summary: "Additional Work — Night shift",
        },
      ],
    });
  });
});
