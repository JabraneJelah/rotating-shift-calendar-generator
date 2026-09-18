import {
  serializeScheduleQuery,
  type ScheduleConfig,
} from "@/features/schedule/domain";

import { escapeICSText, foldICSContentLine } from "./ics-escape";
import { ICS_MIME_TYPE } from "./ics-types";
import {
  timedFailure,
  timedSuccess,
  type TimedExportScope,
  type TimedICSExportSuccess,
  type TimedProjectedEvent,
  type TimedResult,
} from "./timed-export-types";

const CRLF = "\r\n";
const PRODUCT_IDENTIFIER = "-//Shift Calendar//Timed Work Calendar 1.0//EN";
const UID_DOMAIN = "shift-calendar.invalid";

type SerializeTimedICSInput = {
  readonly calendarName: string;
  readonly config: ScheduleConfig;
  readonly events: readonly TimedProjectedEvent[];
  readonly generatedAt: string;
} & TimedExportScope;

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

function addLine(lines: string[], name: string, value: string): void {
  lines.push(...foldICSContentLine(`${name}:${value}`));
}

function compactInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return null;
  return value.replaceAll("-", "").replaceAll(":", "");
}

function validTimestamp(value: string): boolean {
  return /^\d{8}T\d{6}Z$/.test(value);
}

function uidToken(value: string): string {
  return value.replaceAll(":", "-").replaceAll("|", "-");
}

export function serializeTimedICS(
  input: SerializeTimedICSInput,
): TimedResult<TimedICSExportSuccess> {
  if (input.calendarName.trim() === "" || !validTimestamp(input.generatedAt)) {
    return timedFailure({ code: "TIMED_ICS_SERIALIZATION_FAILED" });
  }

  const identity = serializeScheduleQuery({ config: input.config });
  if (!identity.ok) {
    return timedFailure({ code: "TIMED_ICS_SERIALIZATION_FAILED" });
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_IDENTIFIER}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  addLine(lines, "X-WR-CALNAME", escapeICSText(input.calendarName));
  const hash = configurationHash(identity.value);

  for (const event of input.events) {
    const start = compactInstant(event.utcStart);
    const end = compactInstant(event.utcEnd);
    if (
      start === null ||
      end === null ||
      Date.parse(event.utcEnd) <= Date.parse(event.utcStart)
    ) {
      return timedFailure({
        code: "TIMED_ICS_SERIALIZATION_FAILED",
        occurrenceDate: event.occurrenceDate,
      });
    }

    const description = [
      `Work timezone: ${event.timeZone}`,
      ...(event.breakMinutes > 0
        ? [`Break: ${event.breakMinutes} minutes`]
        : []),
    ].join("\n");

    lines.push("BEGIN:VEVENT");
    addLine(
      lines,
      "UID",
      `sc-timed-v1-${hash}-${uidToken(event.identity)}@${UID_DOMAIN}`,
    );
    lines.push(`DTSTAMP:${input.generatedAt}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    addLine(lines, "SUMMARY", escapeICSText(event.summary));
    addLine(lines, "DESCRIPTION", escapeICSText(description));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const rangeLabel =
    input.year === undefined ? input.viewMonth : `${input.year}`;

  return timedSuccess(
    Object.freeze({
      success: true,
      content: `${lines.join(CRLF)}${CRLF}`,
      filename: `shift-calendar-${rangeLabel}-timed.ics`,
      mimeType: ICS_MIME_TYPE,
    }),
  );
}
