import {
  addCalendarDays,
  resolvePresetPattern,
  resolveScheduleOccurrence,
  type DomainResult,
  type ISODate,
  type ScheduleConfig,
  type ScheduleOccurrence,
} from "@/features/schedule/domain";
import {
  projectEffectiveSchedule,
  type DateException,
  type EffectiveScheduleDate,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

export type ScheduleInsights = {
  readonly nextPosition: ScheduleOccurrence;
  readonly nextWorkingDay: ScheduleOccurrence;
};

export type EffectiveScheduleInsights = {
  readonly nextPosition: EffectiveScheduleDate;
  readonly nextWorkingDate: EffectiveScheduleDate | null;
};

export type EffectiveScheduleInsightsResult =
  | { readonly ok: true; readonly value: EffectiveScheduleInsights }
  | { readonly ok: false };

function getCycleLength(config: ScheduleConfig): number {
  if (config.kind === "custom") {
    return config.cycle.length;
  }

  const patternResult = resolvePresetPattern(
    config.presetId,
    "workingShift" in config ? config.workingShift : undefined,
  );

  if (!patternResult.ok) {
    throw new Error("A validated preset schedule must resolve to a pattern.");
  }

  return patternResult.value.cycle.length;
}

export function createEffectiveScheduleInsights(
  config: ScheduleConfig,
  today: ISODate,
  registry: ShiftDefinitionRegistry,
  exceptions: readonly DateException[],
): EffectiveScheduleInsightsResult {
  const base: ScheduleOccurrence[] = [];
  for (let offset = 1; offset <= 366; offset += 1) {
    const date = addCalendarDays(today, offset);
    if (!date.ok) break;
    base.push(resolveScheduleOccurrence(config, date.value));
  }
  if (base.length === 0) return Object.freeze({ ok: false });
  const projected = projectEffectiveSchedule(base, registry, exceptions);
  if (!projected.ok || projected.value[0] === undefined) {
    return Object.freeze({ ok: false });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      nextPosition: projected.value[0],
      nextWorkingDate:
        projected.value.find(({ isWorkingDate }) => isWorkingDate) ?? null,
    }),
  });
}

export function createScheduleInsights(
  config: ScheduleConfig,
  today: ISODate,
): DomainResult<ScheduleInsights> {
  const tomorrowResult = addCalendarDays(today, 1);

  if (!tomorrowResult.ok) {
    return tomorrowResult;
  }

  const nextPosition = resolveScheduleOccurrence(config, tomorrowResult.value);

  for (let offset = 1; offset <= getCycleLength(config); offset += 1) {
    const dateResult =
      offset === 1 ? tomorrowResult : addCalendarDays(today, offset);

    if (!dateResult.ok) {
      return dateResult;
    }

    const occurrence =
      offset === 1
        ? nextPosition
        : resolveScheduleOccurrence(config, dateResult.value);

    if (occurrence.shift !== "off") {
      return Object.freeze({
        ok: true,
        value: Object.freeze({ nextPosition, nextWorkingDay: occurrence }),
      });
    }
  }

  throw new Error(
    "A validated schedule must resolve a working day within the cycle limit.",
  );
}
