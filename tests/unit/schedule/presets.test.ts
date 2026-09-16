import { describe, expect, it } from "vitest";

import {
  MAX_CUSTOM_CYCLE_LENGTH,
  resolvePresetPattern,
  validateCustomPattern,
  type DomainResult,
} from "@/features/schedule/domain";

function expectError<T>(result: DomainResult<T>, code: string): void {
  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error(`Expected ${code}, but validation succeeded.`);
  }

  expect(result.errors[0]?.code).toBe(code);
}

describe("approved preset patterns", () => {
  it("resolves the exact day-shift 4-on/4-off cycle", () => {
    expect(resolvePresetPattern("4-on-4-off", "day")).toEqual({
      ok: true,
      value: {
        cycle: ["day", "day", "day", "day", "off", "off", "off", "off"],
      },
    });
  });

  it("resolves the exact night-shift 4-on/4-off cycle", () => {
    expect(resolvePresetPattern("4-on-4-off", "night")).toEqual({
      ok: true,
      value: {
        cycle: ["night", "night", "night", "night", "off", "off", "off", "off"],
      },
    });
  });

  it("resolves the exact day-shift 2-2-3 cycle", () => {
    const result = resolvePresetPattern("2-2-3", "day");

    expect(result).toEqual({
      ok: true,
      value: {
        cycle: [
          "day",
          "day",
          "off",
          "off",
          "day",
          "day",
          "day",
          "off",
          "off",
          "day",
          "day",
          "off",
          "off",
          "off",
        ],
      },
    });

    if (!result.ok) {
      throw new Error("Expected the approved 2-2-3 preset to resolve.");
    }

    expect(result.value.cycle.filter((shift) => shift === "day")).toHaveLength(
      7,
    );
    expect(result.value.cycle.filter((shift) => shift === "off")).toHaveLength(
      7,
    );
  });

  it("substitutes night at every 2-2-3 working position", () => {
    const result = resolvePresetPattern("2-2-3", "night");

    if (!result.ok) {
      throw new Error("Expected the approved 2-2-3 preset to resolve.");
    }

    expect(result.value.cycle).toEqual([
      "night",
      "night",
      "off",
      "off",
      "night",
      "night",
      "night",
      "off",
      "off",
      "night",
      "night",
      "off",
      "off",
      "off",
    ]);
  });

  it("rejects unknown presets and off as a working shift", () => {
    expectError(resolvePresetPattern("panama", "day"), "UNKNOWN_PRESET");
    expectError(
      resolvePresetPattern("4-on-4-off", "off"),
      "INVALID_WORKING_SHIFT",
    );
  });
});

describe("custom patterns", () => {
  it.each([
    ["mixed", ["day", "night", "off"]],
    ["day-only working", ["day", "day", "off"]],
    ["night-only working", ["night", "off"]],
  ])("accepts a valid %s cycle", (_name, cycle) => {
    expect(validateCustomPattern(cycle)).toEqual({
      ok: true,
      value: { cycle },
    });
  });

  it("rejects an empty cycle", () => {
    expectError(validateCustomPattern([]), "EMPTY_CYCLE");
  });

  it("rejects an all-off cycle", () => {
    expectError(validateCustomPattern(["off", "off"]), "NO_WORKING_SHIFT");
  });

  it("rejects invalid shift values at the untrusted boundary", () => {
    expectError(
      validateCustomPattern(["day", "holiday"]),
      "INVALID_SHIFT_KIND",
    );
  });

  it("accepts the maximum custom-cycle length", () => {
    const cycle = Array.from({ length: MAX_CUSTOM_CYCLE_LENGTH }, (_, index) =>
      index % 2 === 0 ? "day" : "off",
    );

    expect(validateCustomPattern(cycle).ok).toBe(true);
  });

  it("rejects a cycle above the maximum length", () => {
    const cycle = Array.from(
      { length: MAX_CUSTOM_CYCLE_LENGTH + 1 },
      () => "day",
    );

    expectError(validateCustomPattern(cycle), "CYCLE_TOO_LONG");
  });
});
