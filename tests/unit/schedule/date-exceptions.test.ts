// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  expandSchedule,
  parseISODate,
  parseISOYearMonth,
  validateScheduleConfig,
  type ScheduleOccurrence,
} from "@/features/schedule/domain";
import {
  calculateEffectiveStatistics,
  calculateMonthlyEffectiveStatistics,
  calculateYearlyEffectiveStatistics,
  projectEffectiveSchedule,
  removeDateExceptionLayer,
  upsertDateException,
  validateDateException,
  validateDateExceptionCollection,
  validateShiftDefinitionRegistry,
  type DateException,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

function registry(): ShiftDefinitionRegistry {
  const result = validateShiftDefinitionRegistry({
    definitions: [
      {
        id: "builtin-day",
        name: "Day shift",
        shortLabel: "D",
        category: "day",
        color: "amber",
        startTime: "07:00",
        endTime: "15:00",
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
  if (!result.ok) throw new Error("fixture registry");
  return result.value;
}

function untimedRegistry(): ShiftDefinitionRegistry {
  const result = validateShiftDefinitionRegistry({
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
  if (!result.ok) throw new Error("fixture registry");
  return result.value;
}

function base(): readonly ScheduleOccurrence[] {
  const config = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: "2026-10-01",
    cycle: ["day", "night", "off"],
  });
  const from = parseISODate("2026-10-01");
  const to = parseISODate("2026-10-04");
  if (!config.ok || !from.ok || !to.ok) throw new Error("base fixture");
  const result = expandSchedule(config.value, from.value, to.value);
  if (!result.ok) throw new Error("base fixture");
  return result.value;
}

function valid(
  input: object,
  baseOccurrence?: ScheduleOccurrence,
): DateException {
  const result = validateDateException(input, registry(), baseOccurrence);
  if (!result.ok)
    throw new Error(result.errors.map(({ code }) => code).join(","));
  return result.value;
}

describe("date exceptions", () => {
  it.each(["replacement", "training"] as const)(
    "accepts %s on generated Off",
    (type) => {
      const result = validateDateException(
        {
          id: `test-${type}`,
          date: "2026-10-03",
          primary: { type, definitionId: "builtin-night" },
        },
        registry(),
        base()[2],
      );
      expect(result.ok).toBe(true);
    },
  );

  it.each(["leave", "sick"] as const)("rejects %s on generated Off", (type) => {
    const result = validateDateException(
      { id: `test-${type}`, date: "2026-10-03", primary: { type } },
      registry(),
      base()[2],
    );
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: type === "leave" ? "LEAVE_ON_OFF" : "SICK_ON_OFF" }],
    });
  });

  it.each(["leave", "sick"] as const)(
    "accepts and counts %s on generated work",
    (type) => {
      const occurrences = base();
      const entry = valid(
        {
          id: `test-${type}`,
          date: "2026-10-01",
          primary: { type },
        },
        occurrences[0],
      );
      const projected = projectEffectiveSchedule(occurrences, registry(), [
        entry,
      ]);
      if (!projected.ok) throw new Error("projection");
      expect(projected.value[0]).toMatchObject({
        primary: { kind: type },
        isWorkingDate: false,
        workingOccurrences: [],
      });
      expect(calculateEffectiveStatistics(projected.value)).toMatchObject({
        leaveDates: type === "leave" ? 1 : 0,
        sickDates: type === "sick" ? 1 : 0,
      });
    },
  );

  it("normalizes notes and enforces the 500-character limit", () => {
    const result = validateDateException(
      { id: "note", date: "2026-10-01", note: "  private\r\nnote  " },
      registry(),
    );
    expect(result).toMatchObject({
      ok: true,
      value: { note: "private\nnote" },
    });
    expect(
      validateDateException(
        { id: "long", date: "2026-10-01", note: "x".repeat(501) },
        registry(),
      ),
    ).toMatchObject({ ok: false, errors: [{ code: "NOTE_TOO_LONG" }] });
  });

  it("rejects invalid dates, empty notes, unknown definitions, and empty records", () => {
    expect(
      validateDateException(
        { id: "bad", date: "2026-02-30", note: "x" },
        registry(),
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_EXCEPTION_DATE" }],
    });
    expect(
      validateDateException(
        { id: "bad", date: "2026-01-01", note: "  " },
        registry(),
      ),
    ).toMatchObject({ ok: false, errors: [{ code: "EMPTY_NORMALIZED_NOTE" }] });
    expect(
      validateDateException(
        {
          id: "bad",
          date: "2026-01-01",
          additionalWork: { definitionId: "missing" },
        },
        registry(),
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_SHIFT_DEFINITION_REFERENCE" }],
    });
    expect(
      validateDateException({ id: "bad", date: "2026-01-01" }, registry()),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "UNSUPPORTED_OCCURRENCE_COMBINATION" }],
    });
  });

  it("accepts supported boundary dates and rejects unsupported years", () => {
    expect(
      validateDateException(
        { id: "minimum", date: "0001-01-01", note: "minimum" },
        registry(),
      ).ok,
    ).toBe(true);
    expect(
      validateDateException(
        { id: "maximum", date: "9999-12-31", note: "maximum" },
        registry(),
      ).ok,
    ).toBe(true);
    expect(
      validateDateException(
        { id: "outside", date: "0000-12-31", note: "outside" },
        registry(),
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "UNSUPPORTED_EXCEPTION_YEAR" }],
    });
  });

  it("enforces primary and additional cardinality at the untrusted boundary", () => {
    expect(
      validateDateException(
        {
          id: "many",
          date: "2026-10-01",
          primary: [{ type: "leave" }, { type: "sick" }],
        },
        registry(),
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "MULTIPLE_PRIMARY_EXCEPTIONS" }],
    });
    expect(
      validateDateException(
        {
          id: "many",
          date: "2026-10-01",
          additionalWork: [
            { definitionId: "builtin-day" },
            { definitionId: "builtin-night" },
          ],
        },
        registry(),
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "MULTIPLE_ADDITIONAL_WORK_OCCURRENCES" }],
    });
  });

  it("rejects duplicate identifiers and duplicate dates", () => {
    const result = validateDateExceptionCollection(
      [
        { id: "same", date: "2026-10-01", note: "one" },
        { id: "same", date: "2026-10-01", note: "two" },
      ],
      registry(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          "DUPLICATE_EXCEPTION_IDENTIFIER",
          "DUPLICATE_EXCEPTION_DATE",
        ]),
      );
  });

  it("upserts, removes layers independently, and restores by deletion", () => {
    const entry = valid(
      {
        id: "exception-2026-10-01",
        date: "2026-10-01",
        primary: { type: "leave" },
        additionalWork: { definitionId: "builtin-night" },
        note: "private",
      },
      base()[0],
    );
    const values = upsertDateException([], entry);
    const withoutPrimary = removeDateExceptionLayer(
      values,
      entry.date,
      "primary",
    );
    expect(withoutPrimary[0]).toMatchObject({
      additionalWork: {},
      note: "private",
    });
    expect(withoutPrimary[0]).not.toHaveProperty("primary");
    expect(removeDateExceptionLayer(values, entry.date, "all")).toEqual([]);
    expect(Object.isFrozen(values)).toBe(true);
  });
});

describe("effective projection and statistics", () => {
  it("applies primary then additional work without mutating the base", () => {
    const occurrences = base();
    const snapshot = JSON.stringify(occurrences);
    const entry = valid(
      {
        id: "exception-2026-10-01",
        date: "2026-10-01",
        primary: { type: "leave" },
        additionalWork: { definitionId: "builtin-night" },
        note: "private",
      },
      occurrences[0],
    );
    const projected = projectEffectiveSchedule(occurrences, registry(), [
      entry,
    ]);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value[0]).toMatchObject({
      primary: { kind: "leave" },
      isWorkingDate: true,
      note: "private",
      workingOccurrences: [{ kind: "additional" }],
    });
    expect(JSON.stringify(occurrences)).toBe(snapshot);
    expect(Object.isFrozen(projected.value[0])).toBe(true);
  });

  it("replaces generated work and makes Off plus additional work a working date", () => {
    const occurrences = base();
    const replacement = valid(
      {
        id: "replacement",
        date: "2026-10-01",
        primary: { type: "replacement", definitionId: "builtin-night" },
      },
      occurrences[0],
    );
    const additional = valid(
      {
        id: "additional",
        date: "2026-10-03",
        additionalWork: { definitionId: "builtin-day" },
      },
      occurrences[2],
    );
    const projected = projectEffectiveSchedule(occurrences, registry(), [
      replacement,
      additional,
    ]);
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.value[0].primary).toMatchObject({
      kind: "work",
      origin: "replacement",
      definition: { category: "night" },
    });
    expect(projected.value[2]).toMatchObject({
      primary: { kind: "off" },
      isWorkingDate: true,
    });
  });

  it("calculates overlapping counts, weekend dates, overnight and known minutes", () => {
    const occurrences = base();
    const entries = [
      valid(
        {
          id: "training",
          date: "2026-10-03",
          primary: { type: "training", definitionId: "builtin-night" },
        },
        occurrences[2],
      ),
      valid(
        {
          id: "additional",
          date: "2026-10-04",
          additionalWork: { definitionId: "builtin-day" },
        },
        occurrences[3],
      ),
    ];
    const projected = projectEffectiveSchedule(
      occurrences,
      registry(),
      entries,
    );
    if (!projected.ok) throw new Error("projection");
    const stats = calculateEffectiveStatistics(projected.value);
    expect(stats).toMatchObject({
      workingDates: 4,
      categories: { day: 3, evening: 0, night: 2, other: 0 },
      trainingOccurrences: 1,
      additionalWorkOccurrences: 1,
      weekendWorkingDates: 2,
      overnightOccurrences: 2,
      knownGrossMinutes: 2400,
      knownBreakMinutes: 90,
      knownNetMinutes: 2310,
      complete: true,
    });
  });

  it("preserves known subtotals and reports untimed occurrences", () => {
    const projected = projectEffectiveSchedule(base(), untimedRegistry(), []);
    if (!projected.ok) throw new Error("projection");
    expect(calculateEffectiveStatistics(projected.value)).toMatchObject({
      knownNetMinutes: 0,
      untimedWorkingOccurrences: 3,
      complete: false,
    });
  });

  it("strictly scopes monthly and yearly statistics across a leap-year boundary", () => {
    const config = validateScheduleConfig({
      kind: "custom",
      version: 1,
      startDate: "2028-02-28",
      cycle: ["day"],
    });
    const from = parseISODate("2028-02-28");
    const to = parseISODate("2029-01-01");
    const month = parseISOYearMonth("2028-02");
    if (!config.ok || !from.ok || !to.ok || !month.ok)
      throw new Error("scope fixture");
    const expanded = expandSchedule(config.value, from.value, to.value);
    if (!expanded.ok) throw new Error("scope fixture");
    const projected = projectEffectiveSchedule(expanded.value, registry(), []);
    if (!projected.ok) throw new Error("scope projection");
    expect(
      calculateMonthlyEffectiveStatistics(projected.value, month.value),
    ).toMatchObject({ dates: 2, workingDates: 2 });
    expect(
      calculateYearlyEffectiveStatistics(projected.value, 2028),
    ).toMatchObject({ dates: 308, workingDates: 308 });
  });

  it("rejects oversized or non-consecutive base projections", () => {
    const one = base()[0];
    if (one === undefined) throw new Error("fixture");
    expect(
      projectEffectiveSchedule(
        Array.from({ length: 367 }, () => one),
        registry(),
        [],
      ),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "PROJECTION_RANGE_TOO_LARGE" }],
    });
    expect(
      projectEffectiveSchedule([base()[0]!, base()[2]!], registry(), []),
    ).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_BASE_OCCURRENCE" }],
    });
  });
});
