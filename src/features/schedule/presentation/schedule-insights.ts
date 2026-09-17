import {
  addCalendarDays,
  resolvePresetPattern,
  resolveScheduleOccurrence,
  type DomainResult,
  type ISODate,
  type ScheduleConfig,
  type ScheduleOccurrence,
} from "@/features/schedule/domain";

export type ScheduleInsights = {
  readonly nextPosition: ScheduleOccurrence;
  readonly nextWorkingDay: ScheduleOccurrence;
};

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
