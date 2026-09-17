import {
  addCalendarDays,
  compareISODate,
  differenceInCalendarDays,
  parseISODate,
  serializeScheduleQuery,
  type ISODate,
  type ISOYearMonth,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import type { EffectiveScheduleDate } from "@/features/schedule/planner";

import { escapeICSText, foldICSContentLine } from "./ics-escape";
import { ICS_MIME_TYPE, type ICSExportResult } from "./ics-types";

const CRLF = "\r\n";
const PRODUCT_IDENTIFIER = "-//Shift Calendar//Calendar Export 1.0//EN";
const UID_DOMAIN = "shift-calendar.invalid";

export type EffectiveICSExportInput = {
  readonly calendarName: string;
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
  readonly generatedAt: string;
} & (
  | { readonly viewMonth: ISOYearMonth; readonly year?: never }
  | { readonly year: number; readonly viewMonth?: never }
);

function compactDate(date: string): string {
  return date.replaceAll("-", "");
}

function fnv1a(value: string, seed: number): string {
  let hash = seed;
  for (const codePoint of value) {
    for (const byte of new TextEncoder().encode(codePoint)) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function configurationHash(identity: string): string {
  return `${fnv1a(identity, 0x811c9dc5)}${fnv1a(`shift-calendar:${identity}`, 0x9e3779b9)}`;
}

function validTimestamp(value: string): boolean {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (match === null) return false;
  const date = parseISODate(`${match[1]}-${match[2]}-${match[3]}`);
  return (
    date.ok &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59
  );
}

function addLine(lines: string[], name: string, value: string) {
  lines.push(...foldICSContentLine(`${name}:${value}`));
}

function primarySummary(value: EffectiveScheduleDate): string {
  if (value.primary.kind === "off") return "Off Day";
  if (value.primary.kind === "leave") return "Leave";
  if (value.primary.kind === "sick") return "Sick";
  if (value.primary.origin === "training")
    return `Training — ${value.primary.definition.name}`;
  if (value.primary.origin === "replacement")
    return value.primary.definition.name;
  return value.base.shift === "day" ? "Day Shift" : "Night Shift";
}

function primaryUidToken(value: EffectiveScheduleDate): string {
  if (value.primary.origin === "generated") return value.base.shift;
  if (value.primary.kind === "leave" || value.primary.kind === "sick")
    return `primary-${value.primary.kind}`;
  return `primary-${value.primary.origin}-${value.primary.definition.id}`;
}

export function generateEffectiveICS(
  input: EffectiveICSExportInput,
): ICSExportResult {
  if (input.calendarName.trim() === "")
    return { success: false, error: { code: "INVALID_CALENDAR_NAME" } };
  if (!validTimestamp(input.generatedAt))
    return { success: false, error: { code: "INVALID_TIMESTAMP" } };
  if (input.dates.length === 0)
    return { success: false, error: { code: "EMPTY_OCCURRENCES" } };
  const identity = serializeScheduleQuery({ config: input.config });
  if (!identity.ok)
    return { success: false, error: { code: "INVALID_CONFIGURATION" } };

  const isYear = input.year !== undefined;
  let expectedFrom: ISODate;
  let expectedTo: ISODate;
  if (isYear) {
    if (
      !Number.isSafeInteger(input.year) ||
      input.year < 1 ||
      input.year > 9999
    )
      return { success: false, error: { code: "INVALID_EXPORT_YEAR" } };
    const text = input.year.toString().padStart(4, "0");
    const from = parseISODate(`${text}-01-01`);
    const to = parseISODate(`${text}-12-31`);
    if (!from.ok || !to.ok)
      return { success: false, error: { code: "INVALID_EXPORT_YEAR" } };
    expectedFrom = from.value;
    expectedTo = to.value;
  } else {
    const [year, month] = input.viewMonth.split("-").map(Number);
    const from = parseISODate(`${input.viewMonth}-01`);
    const nextMonth =
      month === 12
        ? year === 9999
          ? null
          : `${(year + 1).toString().padStart(4, "0")}-01-01`
        : `${year.toString().padStart(4, "0")}-${(month + 1)
            .toString()
            .padStart(2, "0")}-01`;
    const next = nextMonth === null ? null : parseISODate(nextMonth);
    const to =
      next === null
        ? parseISODate("9999-12-31")
        : next.ok
          ? addCalendarDays(next.value, -1)
          : next;
    if (!from.ok || !to.ok)
      return { success: false, error: { code: "OCCURRENCE_OUTSIDE_MONTH" } };
    expectedFrom = from.value;
    expectedTo = to.value;
  }

  for (let index = 0; index < input.dates.length; index += 1) {
    const value = input.dates[index];
    const previous = input.dates[index - 1];
    if (
      value === undefined ||
      (previous !== undefined && compareISODate(value.date, previous.date) <= 0)
    )
      return {
        success: false,
        error: {
          code: "INVALID_OCCURRENCE_ORDER",
          occurrenceDate: value?.date,
        },
      };
    if (
      previous !== undefined &&
      differenceInCalendarDays(value.date, previous.date) !== 1
    )
      return {
        success: false,
        error: { code: "INCOMPLETE_EXPORT_RANGE", occurrenceDate: value.date },
      };
    if (
      compareISODate(value.date, expectedFrom) < 0 ||
      compareISODate(value.date, expectedTo) > 0
    )
      return {
        success: false,
        error: {
          code: isYear ? "OCCURRENCE_OUTSIDE_YEAR" : "OCCURRENCE_OUTSIDE_MONTH",
          occurrenceDate: value.date,
        },
      };
  }
  if (
    input.dates[0]?.date !== expectedFrom ||
    input.dates.at(-1)?.date !== expectedTo ||
    input.dates.length !==
      differenceInCalendarDays(expectedTo, expectedFrom) + 1
  )
    return { success: false, error: { code: "INCOMPLETE_EXPORT_RANGE" } };

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_IDENTIFIER}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  addLine(lines, "X-WR-CALNAME", escapeICSText(input.calendarName));
  const hash = configurationHash(identity.value);
  const rangeLabel = isYear ? `${input.year}` : input.viewMonth;
  const description = escapeICSText(
    `${input.calendarName} schedule for ${rangeLabel}.`,
  );

  function event(
    date: EffectiveScheduleDate,
    uidToken: string,
    summary: string,
  ) {
    const end = addCalendarDays(date.date, 1);
    if (!end.ok) return false;
    lines.push("BEGIN:VEVENT");
    addLine(
      lines,
      "UID",
      `sc-${hash}-${compactDate(date.date)}-${uidToken}@${UID_DOMAIN}`,
    );
    lines.push(`DTSTAMP:${input.generatedAt}`);
    lines.push(`DTSTART;VALUE=DATE:${compactDate(date.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(end.value)}`);
    addLine(lines, "SUMMARY", escapeICSText(summary));
    addLine(lines, "DESCRIPTION", description);
    lines.push("END:VEVENT");
    return true;
  }

  for (const date of input.dates) {
    if (!event(date, primaryUidToken(date), primarySummary(date)))
      return {
        success: false,
        error: { code: "DATE_OVERFLOW", occurrenceDate: date.date },
      };
    if (
      date.additionalWork !== null &&
      !event(
        date,
        `additional-${date.additionalWork.definition.id}`,
        `Additional Work — ${date.additionalWork.definition.name}`,
      )
    )
      return {
        success: false,
        error: { code: "DATE_OVERFLOW", occurrenceDate: date.date },
      };
  }
  lines.push("END:VCALENDAR");
  return Object.freeze({
    success: true,
    content: `${lines.join(CRLF)}${CRLF}`,
    filename: `shift-calendar-${rangeLabel}.ics`,
    mimeType: ICS_MIME_TYPE,
  });
}
