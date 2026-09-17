import {
  differenceInCalendarDays,
  type ISODate,
  type ScheduleOccurrence,
} from "@/features/schedule/domain";

import type { DateException } from "./date-exceptions";
import {
  plannerError,
  plannerFailure,
  plannerSuccess,
  type NominalShiftCalculation,
  type PlannerResult,
  type ShiftDefinition,
  type ShiftDefinitionRegistry,
} from "./planner-types";
import { resolveShiftDefinition } from "./shift-definitions";
import { calculateNominalShift } from "./time-only";

export const MAX_EFFECTIVE_PROJECTION_DAYS = 366;

export type EffectiveWorkingOccurrence = {
  readonly role: "primary" | "additional";
  readonly kind: "generated" | "replacement" | "training" | "additional";
  readonly definition: ShiftDefinition;
  readonly calculation: NominalShiftCalculation | null;
};

export type EffectivePrimary =
  | {
      readonly kind: "work";
      readonly origin: "generated" | "replacement" | "training";
      readonly definition: ShiftDefinition;
      readonly calculation: NominalShiftCalculation | null;
    }
  | { readonly kind: "off"; readonly origin: "generated" }
  | { readonly kind: "leave"; readonly origin: "exception" }
  | { readonly kind: "sick"; readonly origin: "exception" };

export type EffectiveScheduleDate = {
  readonly date: ISODate;
  readonly base: ScheduleOccurrence;
  readonly primary: EffectivePrimary;
  readonly additionalWork: EffectiveWorkingOccurrence | null;
  readonly note: string | null;
  readonly workingOccurrences: readonly EffectiveWorkingOccurrence[];
  readonly isWorkingDate: boolean;
  readonly hasOvernightWork: boolean;
  readonly knownGrossMinutes: number;
  readonly knownBreakMinutes: number;
  readonly knownNetMinutes: number;
  readonly untimedWorkingOccurrences: number;
};

function calculationFor(
  definition: ShiftDefinition,
): NominalShiftCalculation | null {
  if (definition.time === undefined) return null;
  const result = calculateNominalShift(definition.time);
  if (!result.ok) {
    throw new Error(
      "A validated shift definition must calculate successfully.",
    );
  }
  return result.value;
}

function findDefinition(
  registry: ShiftDefinitionRegistry,
  id: string,
): ShiftDefinition | undefined {
  return registry.definitions.find((definition) => definition.id === id);
}

function workPrimary(
  origin: "generated" | "replacement" | "training",
  definition: ShiftDefinition,
): Extract<EffectivePrimary, { kind: "work" }> {
  return Object.freeze({
    kind: "work",
    origin,
    definition,
    calculation: calculationFor(definition),
  });
}

export function projectEffectiveSchedule(
  baseOccurrences: readonly ScheduleOccurrence[],
  registry: ShiftDefinitionRegistry,
  exceptions: readonly DateException[],
): PlannerResult<readonly EffectiveScheduleDate[]> {
  if (
    baseOccurrences.length === 0 ||
    baseOccurrences.length > MAX_EFFECTIVE_PROJECTION_DAYS
  ) {
    return plannerFailure(
      plannerError("PROJECTION_RANGE_TOO_LARGE", {
        path: "baseOccurrences",
        value: baseOccurrences.length,
        limit: MAX_EFFECTIVE_PROJECTION_DAYS,
      }),
    );
  }

  for (let index = 0; index < baseOccurrences.length; index += 1) {
    const occurrence = baseOccurrences[index];
    const previous = baseOccurrences[index - 1];
    if (
      occurrence === undefined ||
      !["day", "night", "off"].includes(occurrence.shift) ||
      !Number.isSafeInteger(occurrence.cycleIndex) ||
      (previous !== undefined &&
        differenceInCalendarDays(occurrence.date, previous.date) !== 1)
    ) {
      return plannerFailure(
        plannerError("INVALID_BASE_OCCURRENCE", {
          path: `baseOccurrences.${index}`,
          index,
        }),
      );
    }
  }

  const exceptionByDate = new Map(exceptions.map((item) => [item.date, item]));
  const result: EffectiveScheduleDate[] = [];

  for (const base of baseOccurrences) {
    const exception = exceptionByDate.get(base.date);
    let primary: EffectivePrimary;

    if (exception?.primary?.type === "leave") {
      if (base.shift === "off") {
        return plannerFailure(
          plannerError("LEAVE_ON_OFF", { path: base.date }),
        );
      }
      primary = Object.freeze({ kind: "leave", origin: "exception" });
    } else if (exception?.primary?.type === "sick") {
      if (base.shift === "off") {
        return plannerFailure(plannerError("SICK_ON_OFF", { path: base.date }));
      }
      primary = Object.freeze({ kind: "sick", origin: "exception" });
    } else if (
      exception?.primary?.type === "replacement" ||
      exception?.primary?.type === "training"
    ) {
      const definition = findDefinition(
        registry,
        exception.primary.definitionId,
      );
      if (definition === undefined) {
        return plannerFailure(
          plannerError("UNKNOWN_SHIFT_DEFINITION_REFERENCE", {
            path: `${base.date}.primary.definitionId`,
          }),
        );
      }
      primary = workPrimary(exception.primary.type, definition);
    } else if (base.shift === "off") {
      primary = Object.freeze({ kind: "off", origin: "generated" });
    } else {
      const definition = resolveShiftDefinition(registry, base.shift);
      if (definition === null) {
        return plannerFailure(
          plannerError("INVALID_BASE_OCCURRENCE", { path: base.date }),
        );
      }
      primary = workPrimary("generated", definition);
    }

    let additionalWork: EffectiveWorkingOccurrence | null = null;
    if (exception?.additionalWork !== undefined) {
      const definition = findDefinition(
        registry,
        exception.additionalWork.definitionId,
      );
      if (definition === undefined) {
        return plannerFailure(
          plannerError("UNKNOWN_SHIFT_DEFINITION_REFERENCE", {
            path: `${base.date}.additionalWork.definitionId`,
          }),
        );
      }
      additionalWork = Object.freeze({
        role: "additional",
        kind: "additional",
        definition,
        calculation: calculationFor(definition),
      });
    }

    const workingOccurrences: EffectiveWorkingOccurrence[] = [];
    if (primary.kind === "work") {
      workingOccurrences.push(
        Object.freeze({
          role: "primary",
          kind: primary.origin,
          definition: primary.definition,
          calculation: primary.calculation,
        }),
      );
    }
    if (additionalWork !== null) workingOccurrences.push(additionalWork);

    const timed = workingOccurrences.filter(
      (occurrence) => occurrence.calculation !== null,
    );
    result.push(
      Object.freeze({
        date: base.date,
        base,
        primary,
        additionalWork,
        note: exception?.note ?? null,
        workingOccurrences: Object.freeze(workingOccurrences),
        isWorkingDate: workingOccurrences.length > 0,
        hasOvernightWork: timed.some(
          (occurrence) => occurrence.calculation?.crossesMidnight,
        ),
        knownGrossMinutes: timed.reduce(
          (sum, occurrence) =>
            sum + (occurrence.calculation?.grossMinutes ?? 0),
          0,
        ),
        knownBreakMinutes: timed.reduce(
          (sum, occurrence) =>
            sum + (occurrence.calculation?.breakMinutes ?? 0),
          0,
        ),
        knownNetMinutes: timed.reduce(
          (sum, occurrence) => sum + (occurrence.calculation?.netMinutes ?? 0),
          0,
        ),
        untimedWorkingOccurrences: workingOccurrences.length - timed.length,
      }),
    );
  }

  return plannerSuccess(Object.freeze(result));
}
