import {
  differenceInCalendarDays,
  expandSchedule,
  getPresetDefinition,
  MAX_SUPPORTED_YEAR,
  MIN_SUPPORTED_YEAR,
  parseISODate,
  parseISOYearMonth,
  type DomainResult,
  type ISODate,
  type ISOYearMonth,
  type ScheduleConfig,
  type ScheduleOccurrence,
  type ShiftKind,
  type WeekStart,
} from "@/features/schedule/domain";

export const WEEKDAY_SHORT_LABELS = Object.freeze([
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const);

export const WEEKDAY_FULL_LABELS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const);

export const MONTH_NAMES = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const);

export const SHIFT_LABELS = Object.freeze({
  day: "Day shift",
  night: "Night shift",
  off: "Off",
} satisfies Record<ShiftKind, string>);

export const SHIFT_SHORT_LABELS = Object.freeze({
  day: "Day",
  night: "Night",
  off: "Off",
} satisfies Record<ShiftKind, string>);

export type MonthlyScheduleCounts = {
  readonly day: number;
  readonly night: number;
  readonly off: number;
};

export type WeekendDateCounts = {
  readonly worked: number;
  readonly total: number;
};

export type MonthlyCalendarView = {
  readonly viewMonth: ISOYearMonth;
  readonly label: string;
  readonly from: ISODate;
  readonly to: ISODate;
  readonly occurrences: readonly ScheduleOccurrence[];
  readonly weeks: readonly (readonly (ScheduleOccurrence | null)[])[];
  readonly counts: MonthlyScheduleCounts;
  readonly weekendDates: WeekendDateCounts;
  readonly weekStart: WeekStart;
};

function parsedDate(value: string): ISODate {
  const result = parseISODate(value);

  if (!result.ok) {
    throw new Error(`Expected an internally constructed ISO date: ${value}`);
  }

  return result.value;
}

function parsedMonth(value: string): ISOYearMonth {
  const result = parseISOYearMonth(value);

  if (!result.ok) {
    throw new Error(`Expected an internally constructed ISO month: ${value}`);
  }

  return result.value;
}

const MONDAY_ANCHOR = parsedDate("1970-01-05");

function monthParts(viewMonth: ISOYearMonth): {
  readonly year: number;
  readonly month: number;
} {
  const [year, month] = viewMonth.split("-").map(Number);

  return { year, month };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function getViewMonthFromDate(date: ISODate): ISOYearMonth {
  return parsedMonth(date.slice(0, 7));
}

export function getMonthRange(viewMonth: ISOYearMonth): {
  readonly from: ISODate;
  readonly to: ISODate;
} {
  const { year, month } = monthParts(viewMonth);
  const lastDay = daysInMonth(year, month);

  return Object.freeze({
    from: parsedDate(`${viewMonth}-01`),
    to: parsedDate(`${viewMonth}-${lastDay.toString().padStart(2, "0")}`),
  });
}

export function getAdjacentViewMonth(
  viewMonth: ISOYearMonth,
  direction: -1 | 1,
): ISOYearMonth | null {
  const { year, month } = monthParts(viewMonth);
  const monthIndex = year * 12 + (month - 1) + direction;
  const nextYear = Math.floor(monthIndex / 12);
  const nextMonth = positiveModulo(monthIndex, 12) + 1;

  if (nextYear < MIN_SUPPORTED_YEAR || nextYear > MAX_SUPPORTED_YEAR) {
    return null;
  }

  return parsedMonth(
    `${nextYear.toString().padStart(4, "0")}-${nextMonth
      .toString()
      .padStart(2, "0")}`,
  );
}

export function getMondayFirstWeekdayIndex(date: ISODate): number {
  return positiveModulo(differenceInCalendarDays(date, MONDAY_ANCHOR), 7);
}

export function getWeekdayIndex(date: ISODate, weekStart: WeekStart): number {
  const mondayIndex = getMondayFirstWeekdayIndex(date);

  return weekStart === "monday"
    ? mondayIndex
    : positiveModulo(mondayIndex + 1, 7);
}

export function getWeekdayLabels(weekStart: WeekStart): {
  readonly short: readonly string[];
  readonly full: readonly string[];
} {
  if (weekStart === "monday") {
    return Object.freeze({
      short: WEEKDAY_SHORT_LABELS,
      full: WEEKDAY_FULL_LABELS,
    });
  }

  return Object.freeze({
    short: Object.freeze([
      WEEKDAY_SHORT_LABELS[6],
      ...WEEKDAY_SHORT_LABELS.slice(0, 6),
    ]),
    full: Object.freeze([
      WEEKDAY_FULL_LABELS[6],
      ...WEEKDAY_FULL_LABELS.slice(0, 6),
    ]),
  });
}

export function formatMonthLabel(viewMonth: ISOYearMonth): string {
  const { year, month } = monthParts(viewMonth);
  const monthName = MONTH_NAMES[month - 1];

  if (monthName === undefined) {
    throw new Error("A validated view month must contain a known month.");
  }

  return `${monthName} ${year}`;
}

export function formatFullDate(date: ISODate): string {
  const [yearText, monthText, dayText] = date.split("-");
  const monthName = MONTH_NAMES[Number(monthText) - 1];
  const weekdayName = WEEKDAY_FULL_LABELS[getMondayFirstWeekdayIndex(date)];

  if (
    yearText === undefined ||
    dayText === undefined ||
    monthName === undefined ||
    weekdayName === undefined
  ) {
    throw new Error("A validated date must have a complete English label.");
  }

  return `${weekdayName}, ${monthName} ${Number(dayText)}, ${Number(yearText)}`;
}

export function createCalendarWeeks(
  occurrences: readonly ScheduleOccurrence[],
  weekStart: WeekStart = "monday",
): readonly (readonly (ScheduleOccurrence | null)[])[] {
  const first = occurrences[0];

  if (first === undefined) {
    return Object.freeze([]);
  }

  const cells: (ScheduleOccurrence | null)[] = [
    ...Array.from(
      { length: getWeekdayIndex(first.date, weekStart) },
      () => null,
    ),
    ...occurrences,
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (readonly (ScheduleOccurrence | null)[])[] = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(Object.freeze(cells.slice(index, index + 7)));
  }

  return Object.freeze(weeks);
}

export function countShifts(
  occurrences: readonly ScheduleOccurrence[],
): MonthlyScheduleCounts {
  const counts = { day: 0, night: 0, off: 0 };

  for (const occurrence of occurrences) {
    counts[occurrence.shift] += 1;
  }

  return Object.freeze(counts);
}

export function countWeekendDates(
  occurrences: readonly ScheduleOccurrence[],
): WeekendDateCounts {
  let worked = 0;
  let total = 0;

  for (const occurrence of occurrences) {
    const weekdayIndex = getMondayFirstWeekdayIndex(occurrence.date);

    if (weekdayIndex < 5) {
      continue;
    }

    total += 1;

    if (occurrence.shift !== "off") {
      worked += 1;
    }
  }

  return Object.freeze({ worked, total });
}

export function getScheduleName(config: ScheduleConfig): string {
  if (config.kind === "custom") {
    return "Custom cycle";
  }

  return getPresetDefinition(config.presetId).name;
}

export function createMonthlyCalendarView(
  config: ScheduleConfig,
  viewMonth: ISOYearMonth,
  weekStart: WeekStart = "monday",
): DomainResult<MonthlyCalendarView> {
  const { from, to } = getMonthRange(viewMonth);
  const expansionResult = expandSchedule(config, from, to);

  if (!expansionResult.ok) {
    return expansionResult;
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      viewMonth,
      label: formatMonthLabel(viewMonth),
      from,
      to,
      occurrences: expansionResult.value,
      weeks: createCalendarWeeks(expansionResult.value, weekStart),
      counts: countShifts(expansionResult.value),
      weekendDates: countWeekendDates(expansionResult.value),
      weekStart,
    }),
  });
}
