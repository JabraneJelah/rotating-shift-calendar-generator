import { describe, expect, it } from "vitest";

import {
  parseScheduleQuery,
  serializeScheduleQuery,
  validateScheduleConfig,
  type DomainResult,
} from "@/features/schedule/domain";

function expectError<T>(result: DomainResult<T>, code: string): void {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error(`Expected ${code}, but validation succeeded.`);
  }

  expect(result.errors[0]?.code).toBe(code);
}

describe("schedule configuration validation", () => {
  it("validates and freezes a preset configuration", () => {
    const result = validateScheduleConfig({
      kind: "preset",
      version: 1,
      presetId: "4-on-4-off",
      startDate: "2026-10-01",
      workingShift: "day",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        kind: "preset",
        version: 1,
        presetId: "4-on-4-off",
        startDate: "2026-10-01",
        workingShift: "day",
      },
    });

    if (result.ok) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("validates and freezes a custom configuration and its cycle", () => {
    const result = validateScheduleConfig({
      kind: "custom",
      version: 1,
      startDate: "2026-10-01",
      cycle: ["day", "night", "off"],
    });

    expect(result.ok).toBe(true);

    if (result.ok && result.value.kind === "custom") {
      expect(result.value.cycle).toEqual(["day", "night", "off"]);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.cycle)).toBe(true);
    }
  });

  it("validates a rotating preset without a working shift", () => {
    expect(
      validateScheduleConfig({
        kind: "preset",
        version: 1,
        presetId: "2-day-2-night-4-off",
        startDate: "2026-10-01",
      }),
    ).toEqual({
      ok: true,
      value: {
        kind: "preset",
        version: 1,
        presetId: "2-day-2-night-4-off",
        startDate: "2026-10-01",
      },
    });
  });

  it("rejects a working shift on a rotating preset", () => {
    expectError(
      validateScheduleConfig({
        kind: "preset",
        version: 1,
        presetId: "dupont-28-day",
        startDate: "2026-10-01",
        workingShift: "day",
      }),
      "INAPPLICABLE_WORKING_SHIFT",
    );
  });

  it.each([
    [{}, "MISSING_FIELD"],
    [{ version: 2 }, "UNSUPPORTED_CONFIG_VERSION"],
    [{ version: 1, kind: "weekly" }, "INVALID_CONFIG_KIND"],
    [
      {
        version: 1,
        kind: "preset",
        startDate: "2026-10-01",
        presetId: "unknown",
        workingShift: "day",
      },
      "UNKNOWN_PRESET",
    ],
    [
      {
        version: 1,
        kind: "preset",
        startDate: "2026-10-01",
        presetId: "2-2-3",
        workingShift: "off",
      },
      "INVALID_WORKING_SHIFT",
    ],
    [
      {
        version: 1,
        kind: "custom",
        startDate: "2026-02-29",
        cycle: ["day"],
      },
      "INVALID_CALENDAR_DATE",
    ],
    [
      {
        version: 1,
        kind: "custom",
        startDate: "2026-10-01",
        cycle: ["off"],
      },
      "NO_WORKING_SHIFT",
    ],
  ] as const)("rejects malformed configuration %#", (value, code) => {
    expectError(validateScheduleConfig(value), code);
  });
});

describe("version-1 schedule query codec", () => {
  const presetCanonical = "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day";
  const customCanonical = "v=1&kind=custom&s=2026-10-01&cycle=d,d,n,n,o,o";

  it("round-trips a preset configuration", () => {
    const parsed = parseScheduleQuery(presetCanonical);

    expect(parsed).toEqual({
      ok: true,
      value: {
        config: {
          kind: "preset",
          version: 1,
          presetId: "4-on-4-off",
          startDate: "2026-10-01",
          workingShift: "day",
        },
      },
    });

    if (!parsed.ok) {
      throw new Error("Expected the canonical preset query to parse.");
    }

    expect(serializeScheduleQuery(parsed.value)).toEqual({
      ok: true,
      value: presetCanonical,
    });
  });

  it("round-trips a custom configuration", () => {
    const parsed = parseScheduleQuery(customCanonical);

    if (!parsed.ok) {
      throw new Error("Expected the canonical custom query to parse.");
    }

    expect(parsed.value.config).toEqual({
      kind: "custom",
      version: 1,
      startDate: "2026-10-01",
      cycle: ["day", "day", "night", "night", "off", "off"],
    });
    expect(serializeScheduleQuery(parsed.value)).toEqual({
      ok: true,
      value: customCanonical,
    });
  });

  it.each(["4-on-4-off", "2-2-3", "7-on-7-off-fixed"] as const)(
    "round-trips fixed preset %s for Day and Night",
    (presetId) => {
      for (const shift of ["day", "night"] as const) {
        const query = `v=1&kind=preset&p=${presetId}&s=2026-10-01&shift=${shift}`;
        const parsed = parseScheduleQuery(query);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
          expect(serializeScheduleQuery(parsed.value)).toEqual({
            ok: true,
            value: query,
          });
        }
      }
    },
  );

  it.each([
    "2-day-2-night-4-off",
    "dupont-28-day",
    "7-day-7-off-7-night-7-off",
  ] as const)("round-trips rotating preset %s without shift", (presetId) => {
    const query = `v=1&kind=preset&p=${presetId}&s=2026-10-01&m=2026-10&ws=sun`;
    const parsed = parseScheduleQuery(query);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.config).not.toHaveProperty("workingShift");
      expect(serializeScheduleQuery(parsed.value)).toEqual({
        ok: true,
        value: query,
      });
    }
  });

  it("rejects missing shift for fixed and any shift for rotating presets", () => {
    expectError(
      parseScheduleQuery("v=1&kind=preset&p=7-on-7-off-fixed&s=2026-10-01"),
      "MISSING_PARAMETER",
    );
    expectError(
      parseScheduleQuery(
        "v=1&kind=preset&p=dupont-28-day&s=2026-10-01&shift=night",
      ),
      "INAPPLICABLE_WORKING_SHIFT",
    );
  });

  it("round-trips an optional view month as presentation state", () => {
    const query = `${presetCanonical}&m=2026-10`;
    const parsed = parseScheduleQuery(query);

    if (!parsed.ok) {
      throw new Error("Expected a valid view month to parse.");
    }

    expect(parsed.value.viewMonth).toBe("2026-10");
    expect(serializeScheduleQuery(parsed.value)).toEqual({
      ok: true,
      value: query,
    });
  });

  it("keeps Monday implicit and round-trips Sunday presentation state", () => {
    const monday = serializeScheduleQuery({
      config: {
        kind: "preset",
        version: 1,
        presetId: "4-on-4-off",
        startDate: "2026-10-01",
        workingShift: "day",
      },
      viewMonth: "2026-10",
      weekStart: "monday",
    });
    const sundayQuery = `${presetCanonical}&m=2026-10&ws=sun`;
    const sunday = parseScheduleQuery(sundayQuery);

    expect(monday).toEqual({
      ok: true,
      value: `${presetCanonical}&m=2026-10`,
    });
    expect(sunday).toMatchObject({
      ok: true,
      value: { weekStart: "sunday" },
    });
    if (sunday.ok) {
      expect(serializeScheduleQuery(sunday.value)).toEqual({
        ok: true,
        value: sundayQuery,
      });
    }
  });

  it("canonicalizes valid noncanonical parameter ordering", () => {
    const parsed = parseScheduleQuery(
      "shift=day&s=2026-10-01&p=4-on-4-off&kind=preset&v=1",
    );

    if (!parsed.ok) {
      throw new Error("Expected reordered valid parameters to parse.");
    }

    expect(serializeScheduleQuery(parsed.value)).toEqual({
      ok: true,
      value: presetCanonical,
    });
  });

  it.each([
    [
      "v=2&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day",
      "UNSUPPORTED_CONFIG_VERSION",
    ],
    ["v=1&kind=preset&s=2026-10-01&shift=day", "MISSING_PARAMETER"],
    ["v=1&kind=preset&p=unknown&s=2026-10-01&shift=day", "UNKNOWN_PRESET"],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-02-29&shift=day",
      "INVALID_CALENDAR_DATE",
    ],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=off",
      "INVALID_WORKING_SHIFT",
    ],
    ["v=1&kind=custom&s=2026-10-01&cycle=d,x,o", "INVALID_CYCLE_TOKEN"],
    ["v=1&kind=custom&s=2026-10-01&cycle=d,,o", "INVALID_CYCLE_TOKEN"],
    [
      "v=1&kind=preset&p=4-on-4-off&p=2-2-3&s=2026-10-01&shift=day",
      "DUPLICATE_PARAMETER",
    ],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&foo=bar",
      "UNKNOWN_PARAMETER",
    ],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-1",
      "INVALID_VIEW_MONTH",
    ],
    ["v=1&kind=custom&s=2026-10-01&cycle=o,o", "NO_WORKING_SHIFT"],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&ws=mon",
      "INVALID_CONFIGURATION",
    ],
    [
      "v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&ws=sun&ws=sun",
      "DUPLICATE_PARAMETER",
    ],
  ])("rejects malformed query %s", (query, code) => {
    expectError(parseScheduleQuery(query), code);
  });

  it("rejects a query cycle above the maximum length", () => {
    const cycle = Array.from({ length: 57 }, () => "d").join(",");

    expectError(
      parseScheduleQuery(`v=1&kind=custom&s=2026-10-01&cycle=${cycle}`),
      "CYCLE_TOO_LONG",
    );
  });

  it("rejects an invalid object passed for serialization", () => {
    expectError(
      serializeScheduleQuery({
        config: {
          kind: "preset",
          version: 1,
          presetId: "4-on-4-off",
          startDate: "not-a-date",
          workingShift: "day",
        },
      }),
      "INVALID_DATE_FORMAT",
    );
  });
});
