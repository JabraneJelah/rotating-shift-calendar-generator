import {
  differenceInCalendarDays,
  parseISODate,
  type ISOYearMonth,
} from "@/features/schedule/domain";

import type { EffectiveScheduleDate } from "./effective-schedule";
import type { ShiftCategory } from "./planner-types";

export type EffectiveScheduleStatistics = {
  readonly dates: number;
  readonly workingDates: number;
  readonly categories: Readonly<Record<ShiftCategory, number>>;
  readonly trainingOccurrences: number;
  readonly additionalWorkOccurrences: number;
  readonly leaveDates: number;
  readonly sickDates: number;
  readonly weekendWorkingDates: number;
  readonly overnightOccurrences: number;
  readonly knownGrossMinutes: number;
  readonly knownBreakMinutes: number;
  readonly knownNetMinutes: number;
  readonly knownAdditionalGrossMinutes: number;
  readonly knownAdditionalNetMinutes: number;
  readonly untimedWorkingOccurrences: number;
  readonly untimedAdditionalWorkOccurrences: number;
  readonly complete: boolean;
  readonly additionalWorkComplete: boolean;
};

const mondayResult = parseISODate("1970-01-05");
if (!mondayResult.ok) throw new Error("Internal weekday anchor must be valid.");
const MONDAY = mondayResult.value;

function isWeekend(date: EffectiveScheduleDate["date"]): boolean {
  const index = ((differenceInCalendarDays(date, MONDAY) % 7) + 7) % 7;
  return index >= 5;
}

export function calculateEffectiveStatistics(
  dates: readonly EffectiveScheduleDate[],
): EffectiveScheduleStatistics {
  const categories: Record<ShiftCategory, number> = {
    day: 0,
    evening: 0,
    night: 0,
    other: 0,
  };
  let workingDates = 0;
  let trainingOccurrences = 0;
  let additionalWorkOccurrences = 0;
  let leaveDates = 0;
  let sickDates = 0;
  let weekendWorkingDates = 0;
  let overnightOccurrences = 0;
  let knownGrossMinutes = 0;
  let knownBreakMinutes = 0;
  let knownNetMinutes = 0;
  let knownAdditionalGrossMinutes = 0;
  let knownAdditionalNetMinutes = 0;
  let untimedWorkingOccurrences = 0;
  let untimedAdditionalWorkOccurrences = 0;

  for (const date of dates) {
    if (date.isWorkingDate) workingDates += 1;
    if (date.isWorkingDate && isWeekend(date.date)) weekendWorkingDates += 1;
    if (date.primary.kind === "leave") leaveDates += 1;
    if (date.primary.kind === "sick") sickDates += 1;

    for (const occurrence of date.workingOccurrences) {
      categories[occurrence.definition.category] += 1;
      if (occurrence.kind === "training") trainingOccurrences += 1;
      if (occurrence.kind === "additional") additionalWorkOccurrences += 1;
      if (occurrence.calculation === null) {
        untimedWorkingOccurrences += 1;
        if (occurrence.role === "additional") {
          untimedAdditionalWorkOccurrences += 1;
        }
        continue;
      }
      knownGrossMinutes += occurrence.calculation.grossMinutes;
      knownBreakMinutes += occurrence.calculation.breakMinutes;
      knownNetMinutes += occurrence.calculation.netMinutes;
      if (occurrence.role === "additional") {
        knownAdditionalGrossMinutes += occurrence.calculation.grossMinutes;
        knownAdditionalNetMinutes += occurrence.calculation.netMinutes;
      }
      if (occurrence.calculation.crossesMidnight) overnightOccurrences += 1;
    }
  }

  return Object.freeze({
    dates: dates.length,
    workingDates,
    categories: Object.freeze(categories),
    trainingOccurrences,
    additionalWorkOccurrences,
    leaveDates,
    sickDates,
    weekendWorkingDates,
    overnightOccurrences,
    knownGrossMinutes,
    knownBreakMinutes,
    knownNetMinutes,
    knownAdditionalGrossMinutes,
    knownAdditionalNetMinutes,
    untimedWorkingOccurrences,
    untimedAdditionalWorkOccurrences,
    complete: untimedWorkingOccurrences === 0,
    additionalWorkComplete: untimedAdditionalWorkOccurrences === 0,
  });
}

export function calculateMonthlyEffectiveStatistics(
  dates: readonly EffectiveScheduleDate[],
  month: ISOYearMonth,
): EffectiveScheduleStatistics {
  return calculateEffectiveStatistics(
    dates.filter(({ date }) => date.startsWith(`${month}-`)),
  );
}

export function calculateYearlyEffectiveStatistics(
  dates: readonly EffectiveScheduleDate[],
  year: number,
): EffectiveScheduleStatistics {
  const prefix = `${year.toString().padStart(4, "0")}-`;
  return calculateEffectiveStatistics(
    dates.filter(({ date }) => date.startsWith(prefix)),
  );
}
