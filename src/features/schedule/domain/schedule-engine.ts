import {
  addCalendarDays,
  compareISODate,
  differenceInCalendarDays,
} from "./date-only";
import { trustedPresetPattern } from "./presets";
import {
  domainError,
  domainFailure,
  domainSuccess,
  type DomainResult,
  type ISODate,
  type ScheduleConfig,
  type ScheduleOccurrence,
  type SchedulePattern,
} from "./schedule-types";

export const MAX_EXPANSION_DAYS = 366;

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function patternForConfig(config: ScheduleConfig): SchedulePattern {
  if (config.kind === "preset") {
    return trustedPresetPattern(config.presetId, config.workingShift);
  }

  return Object.freeze({ cycle: config.cycle });
}

export function resolveScheduleOccurrence(
  config: ScheduleConfig,
  date: ISODate,
): ScheduleOccurrence {
  const pattern = patternForConfig(config);

  if (pattern.cycle.length === 0) {
    throw new Error("Validated schedule configurations must have a cycle.");
  }

  const offset = differenceInCalendarDays(date, config.startDate);
  const cycleIndex = positiveModulo(offset, pattern.cycle.length);
  const shift = pattern.cycle[cycleIndex];

  if (shift === undefined) {
    throw new Error("The calculated cycle index must resolve to a shift.");
  }

  return Object.freeze({ date, shift, cycleIndex });
}

export function expandSchedule(
  config: ScheduleConfig,
  from: ISODate,
  to: ISODate,
): DomainResult<readonly ScheduleOccurrence[]> {
  if (compareISODate(from, to) > 0) {
    return domainFailure(
      domainError("INVALID_RANGE", {
        path: "range",
        value: `${from}..${to}`,
      }),
    );
  }

  const rangeLength = differenceInCalendarDays(to, from) + 1;

  if (rangeLength > MAX_EXPANSION_DAYS) {
    return domainFailure(
      domainError("RANGE_TOO_LARGE", {
        path: "range",
        value: rangeLength,
        limit: MAX_EXPANSION_DAYS,
      }),
    );
  }

  const occurrences: ScheduleOccurrence[] = [];

  for (let offset = 0; offset < rangeLength; offset += 1) {
    const dateResult = addCalendarDays(from, offset);

    if (!dateResult.ok) {
      return dateResult;
    }

    occurrences.push(resolveScheduleOccurrence(config, dateResult.value));
  }

  return domainSuccess(Object.freeze(occurrences));
}
