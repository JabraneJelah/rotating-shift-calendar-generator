import {
  expandSchedule,
  MAX_SUPPORTED_YEAR,
  MIN_SUPPORTED_YEAR,
  parseISODate,
  parseISOYearMonth,
  type DomainResult,
  type ISODate,
  type ISOYearMonth,
  type ScheduleConfig,
  type ScheduleOccurrence,
  type WeekStart,
} from "@/features/schedule/domain";

import {
  countShifts,
  countWeekendDates,
  createCalendarWeeks,
  formatMonthLabel,
  type MonthlyScheduleCounts,
  type WeekendDateCounts,
} from "./calendar-view";

export type YearlyMonthView = {
  readonly viewMonth: ISOYearMonth;
  readonly label: string;
  readonly occurrences: readonly ScheduleOccurrence[];
  readonly weeks: readonly (readonly (ScheduleOccurrence | null)[])[];
};

export type YearlyCalendarView = {
  readonly year: number;
  readonly from: ISODate;
  readonly to: ISODate;
  readonly months: readonly YearlyMonthView[];
  readonly occurrences: readonly ScheduleOccurrence[];
  readonly counts: MonthlyScheduleCounts;
  readonly weekendDates: WeekendDateCounts;
  readonly weekStart: WeekStart;
};

function unsupportedYear<T>(year: number): DomainResult<T> {
  return Object.freeze({
    ok: false,
    errors: Object.freeze([
      Object.freeze({
        code: "UNSUPPORTED_YEAR" as const,
        path: "year",
        value: year,
      }),
    ]),
  });
}

function internalDate(value: string): ISODate {
  const result = parseISODate(value);

  if (!result.ok) {
    throw new Error(`Expected a valid internally constructed date: ${value}`);
  }

  return result.value;
}

function internalMonth(value: string): ISOYearMonth {
  const result = parseISOYearMonth(value);

  if (!result.ok) {
    throw new Error(`Expected a valid internally constructed month: ${value}`);
  }

  return result.value;
}

export function getAdjacentYear(
  year: number,
  direction: -1 | 1,
): number | null {
  const adjacentYear = year + direction;

  return adjacentYear < MIN_SUPPORTED_YEAR || adjacentYear > MAX_SUPPORTED_YEAR
    ? null
    : adjacentYear;
}

export function createYearlyCalendarView(
  config: ScheduleConfig,
  year: number,
  weekStart: WeekStart = "monday",
): DomainResult<YearlyCalendarView> {
  if (
    !Number.isSafeInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR
  ) {
    return unsupportedYear(year);
  }

  const yearText = year.toString().padStart(4, "0");
  const from = internalDate(`${yearText}-01-01`);
  const to = internalDate(`${yearText}-12-31`);
  const expansionResult = expandSchedule(config, from, to);

  if (!expansionResult.ok) {
    return expansionResult;
  }

  const occurrencesByMonth = Array.from(
    { length: 12 },
    () => [] as ScheduleOccurrence[],
  );

  for (const occurrence of expansionResult.value) {
    const monthIndex = Number(occurrence.date.slice(5, 7)) - 1;
    occurrencesByMonth[monthIndex]?.push(occurrence);
  }

  const months = occurrencesByMonth.map((occurrences, monthIndex) => {
    const viewMonth = internalMonth(
      `${yearText}-${(monthIndex + 1).toString().padStart(2, "0")}`,
    );

    return Object.freeze({
      viewMonth,
      label: formatMonthLabel(viewMonth),
      occurrences: Object.freeze(occurrences),
      weeks: createCalendarWeeks(occurrences, weekStart),
    });
  });

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      year,
      from,
      to,
      months: Object.freeze(months),
      occurrences: expansionResult.value,
      counts: countShifts(expansionResult.value),
      weekendDates: countWeekendDates(expansionResult.value),
      weekStart,
    }),
  });
}
