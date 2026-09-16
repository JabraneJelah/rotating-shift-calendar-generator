import {
  domainError,
  domainFailure,
  domainSuccess,
  type DomainResult,
  type ISODate,
  type ISOYearMonth,
} from "./schedule-types";

export const MIN_SUPPORTED_YEAR = 1;
export const MAX_SUPPORTED_YEAR = 9999;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

type CalendarParts = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function primitiveErrorValue(
  value: unknown,
): string | number | boolean | null | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return undefined;
}

function formatISODate({ year, month, day }: CalendarParts): ISODate {
  const value = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  // The formatter is private and receives only validated integer calendar parts.
  return value as ISODate;
}

function partsFromISODate(date: ISODate): CalendarParts {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

/** Converts a proleptic-Gregorian date to an integer day number. */
function toDayNumber({ year, month, day }: CalendarParts): number {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;

  return era * 146_097 + dayOfEra - 719_468;
}

/** Converts an integer day number back to a proleptic-Gregorian date. */
function fromDayNumber(dayNumber: number): CalendarParts {
  const adjustedDayNumber = dayNumber + 719_468;
  const era = Math.floor(adjustedDayNumber / 146_097);
  const dayOfEra = adjustedDayNumber - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1_460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  let year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  year += month <= 2 ? 1 : 0;

  return { year, month, day };
}

export function parseISODate(value: unknown): DomainResult<ISODate> {
  if (typeof value !== "string") {
    return domainFailure(
      domainError("INVALID_DATE_FORMAT", {
        path: "date",
        value: primitiveErrorValue(value),
      }),
    );
  }

  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return domainFailure(
      domainError("INVALID_DATE_FORMAT", { path: "date", value }),
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
    return domainFailure(
      domainError("UNSUPPORTED_YEAR", { path: "date", value: year }),
    );
  }

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return domainFailure(
      domainError("INVALID_CALENDAR_DATE", { path: "date", value }),
    );
  }

  // The strict format and calendar fields have been validated above.
  return domainSuccess(value as ISODate);
}

export function parseISOYearMonth(value: unknown): DomainResult<ISOYearMonth> {
  if (typeof value !== "string") {
    return domainFailure(
      domainError("INVALID_VIEW_MONTH", {
        path: "viewMonth",
        value: primitiveErrorValue(value),
      }),
    );
  }

  const match = ISO_YEAR_MONTH_PATTERN.exec(value);

  if (!match) {
    return domainFailure(
      domainError("INVALID_VIEW_MONTH", {
        path: "viewMonth",
        value,
      }),
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    month < 1 ||
    month > 12
  ) {
    return domainFailure(
      domainError("INVALID_VIEW_MONTH", {
        path: "viewMonth",
        value,
      }),
    );
  }

  return domainSuccess(value as ISOYearMonth);
}

export function addCalendarDays(
  date: ISODate,
  amount: number,
): DomainResult<ISODate> {
  if (!Number.isSafeInteger(amount)) {
    return domainFailure(
      domainError("INVALID_DAY_OFFSET", {
        path: "amount",
        value: amount,
      }),
    );
  }

  const result = fromDayNumber(toDayNumber(partsFromISODate(date)) + amount);

  if (result.year < MIN_SUPPORTED_YEAR || result.year > MAX_SUPPORTED_YEAR) {
    return domainFailure(
      domainError("UNSUPPORTED_YEAR", {
        path: "date",
        value: result.year,
      }),
    );
  }

  return domainSuccess(formatISODate(result));
}

export function compareISODate(left: ISODate, right: ISODate): -1 | 0 | 1 {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function differenceInCalendarDays(
  date: ISODate,
  startDate: ISODate,
): number {
  return (
    toDayNumber(partsFromISODate(date)) -
    toDayNumber(partsFromISODate(startDate))
  );
}
