import {
  addCalendarDays,
  compareISODate,
  parseISODate,
  serializeScheduleQuery,
  type ISODate,
  type ShiftKind,
} from "@/features/schedule/domain";

import { escapeICSText, foldICSContentLine } from "./ics-escape";
import {
  ICS_MIME_TYPE,
  type ICSExportError,
  type ICSExportInput,
  type ICSExportResult,
} from "./ics-types";

const CRLF = "\r\n";
const PRODUCT_IDENTIFIER = "-//Shift Calendar//Calendar Export 1.0//EN";
const UID_DOMAIN = "shift-calendar.invalid";

const SHIFT_SUMMARIES = Object.freeze({
  day: "Day Shift",
  night: "Night Shift",
  off: "Off Day",
} satisfies Record<ShiftKind, string>);

function failure(error: ICSExportError): ICSExportResult {
  return Object.freeze({ success: false, error: Object.freeze(error) });
}

function isValidTimestamp(value: string): boolean {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);

  if (match === null) {
    return false;
  }

  const dateResult = parseISODate(`${match[1]}-${match[2]}-${match[3]}`);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6]);

  return (
    dateResult.ok &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

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

function eventUID(
  identityHash: string,
  date: string,
  shift: ShiftKind,
): string {
  return `sc-${identityHash}-${compactDate(date)}-${shift}@${UID_DOMAIN}`;
}

function addContentLine(lines: string[], name: string, value: string): void {
  lines.push(...foldICSContentLine(`${name}:${value}`));
}

export function generateICS(input: ICSExportInput): ICSExportResult {
  if (input.calendarName.trim() === "") {
    return failure({ code: "INVALID_CALENDAR_NAME" });
  }

  if (!isValidTimestamp(input.generatedAt)) {
    return failure({ code: "INVALID_TIMESTAMP" });
  }

  if (input.occurrences.length === 0) {
    return failure({ code: "EMPTY_OCCURRENCES" });
  }

  const identityResult = serializeScheduleQuery({ config: input.config });

  if (!identityResult.ok) {
    return failure({ code: "INVALID_CONFIGURATION" });
  }

  let previousDate: ISODate | undefined;

  for (const occurrence of input.occurrences) {
    if (!occurrence.date.startsWith(`${input.viewMonth}-`)) {
      return failure({
        code: "OCCURRENCE_OUTSIDE_MONTH",
        occurrenceDate: occurrence.date,
      });
    }

    if (previousDate !== undefined) {
      const order = compareISODate(previousDate, occurrence.date);

      if (order === 0) {
        return failure({
          code: "DUPLICATE_DATE",
          occurrenceDate: occurrence.date,
        });
      }

      if (order === 1) {
        return failure({
          code: "INVALID_OCCURRENCE_ORDER",
          occurrenceDate: occurrence.date,
        });
      }
    }

    previousDate = occurrence.date;
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_IDENTIFIER}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  addContentLine(lines, "X-WR-CALNAME", escapeICSText(input.calendarName));

  const identityHash = configurationHash(identityResult.value);
  const description = escapeICSText(
    `${input.calendarName} schedule for ${input.viewMonth}.`,
  );

  for (const occurrence of input.occurrences) {
    const endDateResult = addCalendarDays(occurrence.date, 1);

    if (!endDateResult.ok) {
      return failure({
        code: "DATE_OVERFLOW",
        occurrenceDate: occurrence.date,
      });
    }

    lines.push("BEGIN:VEVENT");
    addContentLine(
      lines,
      "UID",
      eventUID(identityHash, occurrence.date, occurrence.shift),
    );
    lines.push(`DTSTAMP:${input.generatedAt}`);
    lines.push(`DTSTART;VALUE=DATE:${compactDate(occurrence.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(endDateResult.value)}`);
    addContentLine(lines, "SUMMARY", SHIFT_SUMMARIES[occurrence.shift]);
    addContentLine(lines, "DESCRIPTION", description);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return Object.freeze({
    success: true,
    content: `${lines.join(CRLF)}${CRLF}`,
    filename: `shift-calendar-${input.viewMonth}.ics`,
    mimeType: ICS_MIME_TYPE,
  });
}
