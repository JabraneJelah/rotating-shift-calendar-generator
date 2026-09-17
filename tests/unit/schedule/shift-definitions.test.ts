// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  BUILTIN_DAY_DEFINITION_ID,
  BUILTIN_NIGHT_DEFINITION_ID,
  DEFAULT_SHIFT_DEFINITION_REGISTRY,
  MAX_SHIFT_DEFINITIONS,
  resolveShiftDefinition,
  validateShiftDefinition,
  validateShiftDefinitionRegistry,
  type PlannerResult,
  type ShiftDefinitionInput,
} from "@/features/schedule/planner";

function definition(
  overrides: Partial<ShiftDefinitionInput> = {},
): ShiftDefinitionInput {
  return {
    id: "custom-shift",
    name: "Custom shift",
    shortLabel: "C",
    category: "other",
    color: "teal",
    ...overrides,
  };
}

function registry(definitions: readonly unknown[]) {
  return {
    definitions,
    dayDefinitionId: BUILTIN_DAY_DEFINITION_ID,
    nightDefinitionId: BUILTIN_NIGHT_DEFINITION_ID,
  };
}

function builtins(): ShiftDefinitionInput[] {
  return [
    definition({
      id: BUILTIN_DAY_DEFINITION_ID,
      name: "Day shift",
      shortLabel: "D",
      category: "day",
      color: "amber",
    }),
    definition({
      id: BUILTIN_NIGHT_DEFINITION_ID,
      name: "Night shift",
      shortLabel: "N",
      category: "night",
      color: "indigo",
    }),
  ];
}

function expectError<T>(result: PlannerResult<T>, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error(`Expected ${code}, but validation succeeded.`);
  }
  expect(result.errors.some((error) => error.code === code)).toBe(true);
}

describe("shift definition validation", () => {
  it("trims text and freezes a valid untimed definition", () => {
    const result = validateShiftDefinition(
      definition({ name: "  Early shift  ", shortLabel: " E " }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Early shift");
      expect(result.value.shortLabel).toBe("E");
      expect(result.value.time).toBeUndefined();
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("validates timed, overnight, and explicit 24-hour definitions", () => {
    const overnight = validateShiftDefinition(
      definition({
        startTime: "22:00",
        endTime: "06:00",
        breakMinutes: "30",
      }),
    );
    const allDay = validateShiftDefinition(
      definition({
        startTime: "08:00",
        endTime: "08:00",
        is24Hours: true,
        breakMinutes: 60,
      }),
    );

    expect(overnight.ok).toBe(true);
    expect(allDay.ok).toBe(true);
  });

  it.each([
    [{ startTime: "08:00" }, "PARTIAL_SHIFT_TIME"],
    [{ endTime: "16:00" }, "PARTIAL_SHIFT_TIME"],
    [{ is24Hours: true }, "INVALID_24_HOUR_CONFIGURATION"],
    [{ breakMinutes: 15 }, "BREAK_REQUIRES_TIME"],
    [{ startTime: "08:00", endTime: "08:00" }, "EQUAL_SHIFT_TIMES"],
    [
      { startTime: "08:00", endTime: "09:00", is24Hours: true },
      "INVALID_24_HOUR_CONFIGURATION",
    ],
    [
      { startTime: "08:00", endTime: "09:00", breakMinutes: 60 },
      "BREAK_NOT_SHORTER_THAN_SHIFT",
    ],
  ] as const)("rejects invalid time input %#", (overrides, code) => {
    expectError(validateShiftDefinition(definition(overrides)), code);
  });

  it("enforces identifiers, names, labels, categories, and curated colors", () => {
    expectError(
      validateShiftDefinition(definition({ id: "Personal Day" })),
      "INVALID_SHIFT_DEFINITION_ID",
    );
    expectError(
      validateShiftDefinition(definition({ name: "   " })),
      "INVALID_SHIFT_NAME",
    );
    expectError(
      validateShiftDefinition(definition({ name: "x".repeat(41) })),
      "SHIFT_NAME_TOO_LONG",
    );
    expectError(
      validateShiftDefinition(definition({ shortLabel: "ABCDE" })),
      "SHORT_LABEL_TOO_LONG",
    );
    expectError(
      validateShiftDefinition(definition({ category: "swing" })),
      "INVALID_SHIFT_CATEGORY",
    );
    expectError(
      validateShiftDefinition(definition({ color: "#ffffff" })),
      "INVALID_SHIFT_COLOR",
    );
  });
});

describe("shift definition registry", () => {
  it("contains stable immutable Day and Night defaults", () => {
    expect(DEFAULT_SHIFT_DEFINITION_REGISTRY.definitions).toHaveLength(2);
    expect(
      resolveShiftDefinition(DEFAULT_SHIFT_DEFINITION_REGISTRY, "day")?.id,
    ).toBe(BUILTIN_DAY_DEFINITION_ID);
    expect(
      resolveShiftDefinition(DEFAULT_SHIFT_DEFINITION_REGISTRY, "night")?.id,
    ).toBe(BUILTIN_NIGHT_DEFINITION_ID);
    expect(
      resolveShiftDefinition(DEFAULT_SHIFT_DEFINITION_REGISTRY, "off"),
    ).toBeNull();
    expect(Object.isFrozen(DEFAULT_SHIFT_DEFINITION_REGISTRY)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SHIFT_DEFINITION_REGISTRY.definitions)).toBe(
      true,
    );
  });

  it("rejects more than 12 definitions", () => {
    const definitions = Array.from(
      { length: MAX_SHIFT_DEFINITIONS + 1 },
      (_, index) =>
        definition({
          id: `shift-${index}`,
          name: `Shift ${index}`,
          shortLabel: `${index}`,
        }),
    );
    expectError(
      validateShiftDefinitionRegistry(registry(definitions)),
      "TOO_MANY_SHIFT_DEFINITIONS",
    );
  });

  it("rejects duplicate identifiers and names case-insensitively", () => {
    const definitions = [
      ...builtins(),
      definition({ id: "same", name: "Alpha" }),
      definition({ id: "same", name: " alpha ", shortLabel: "A" }),
    ];
    const result = validateShiftDefinitionRegistry(registry(definitions));

    expectError(result, "DUPLICATE_SHIFT_DEFINITION_ID");
    expectError(result, "DUPLICATE_SHIFT_NAME");
  });

  it("allows duplicate short labels when full names differ", () => {
    const result = validateShiftDefinitionRegistry(
      registry([
        ...builtins(),
        definition({ id: "alpha", name: "Alpha", shortLabel: "X" }),
        definition({ id: "beta", name: "Beta", shortLabel: "X" }),
      ]),
    );
    expect(result.ok).toBe(true);
  });

  it("requires mapped Day and Night definitions with matching categories", () => {
    expectError(
      validateShiftDefinitionRegistry(registry([])),
      "MISSING_DAY_DEFINITION",
    );
    expectError(
      validateShiftDefinitionRegistry(
        registry([
          definition({
            id: BUILTIN_DAY_DEFINITION_ID,
            name: "Day",
            category: "night",
          }),
          definition({
            id: BUILTIN_NIGHT_DEFINITION_ID,
            name: "Night",
            category: "day",
          }),
        ]),
      ),
      "INVALID_DAY_DEFINITION",
    );
  });
});
