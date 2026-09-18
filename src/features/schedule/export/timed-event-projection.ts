import {
  addCalendarDays,
  serializeScheduleQuery,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import type { EffectiveScheduleDate } from "@/features/schedule/planner";

import {
  MAX_TIMED_EXPORT_YEAR,
  MIN_TIMED_EXPORT_YEAR,
  timedFailure,
  timedSuccess,
  type IANATimeZone,
  type TimedBoundaryIssue,
  type TimedDisambiguation,
  type TimedProjectedEvent,
  type TimedResult,
} from "./timed-export-types";
import {
  findLocalDateTimeCandidates,
  type LocalResolution,
} from "./timezone-adapter";

type ProjectTimedEventsInput = {
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
  readonly timeZone: IANATimeZone;
  readonly disambiguations?: Readonly<
    Record<string, TimedDisambiguation | undefined>
  >;
};

function eventIdentity(
  date: EffectiveScheduleDate,
  occurrence: EffectiveScheduleDate["workingOccurrences"][number],
): string {
  return `${date.date}:${occurrence.role}:${occurrence.kind}:${occurrence.definition.id}`;
}

function boundaryKey(identity: string, boundary: "start" | "end"): string {
  return `${identity}:${boundary}`;
}

function resolveBoundary(
  issue: Omit<TimedBoundaryIssue, "candidates">,
  timeZone: IANATimeZone,
  choice: TimedDisambiguation | undefined,
):
  | {
      readonly kind: "resolved";
      readonly value: { readonly utc: string; readonly offsetMinutes: number };
    }
  | { readonly kind: "gap"; readonly issue: TimedBoundaryIssue }
  | { readonly kind: "overlap"; readonly issue: TimedBoundaryIssue }
  | { readonly kind: "failure" } {
  const result = findLocalDateTimeCandidates(issue.date, issue.time, timeZone);
  if (!result.ok) return { kind: "failure" };
  const resolution: LocalResolution = result.value;

  if (resolution.kind === "gap") {
    return { kind: "gap", issue: Object.freeze(issue) };
  }

  if (resolution.kind === "overlap") {
    if (choice === undefined) {
      return {
        kind: "overlap",
        issue: Object.freeze({ ...issue, candidates: resolution.candidates }),
      };
    }
    const candidate = resolution.candidates[choice === "earlier" ? 0 : 1];
    return { kind: "resolved", value: candidate };
  }

  return { kind: "resolved", value: resolution.candidate };
}

export function projectTimedEvents(
  input: ProjectTimedEventsInput,
): TimedResult<readonly TimedProjectedEvent[]> {
  const configuration = serializeScheduleQuery({ config: input.config });
  if (!configuration.ok) {
    return timedFailure({ code: "INVALID_TIMED_DEFINITION" });
  }

  const unsupported = input.dates.find((date) => {
    const year = Number(date.date.slice(0, 4));
    return year < MIN_TIMED_EXPORT_YEAR || year > MAX_TIMED_EXPORT_YEAR;
  });

  if (unsupported !== undefined) {
    return timedFailure({
      code: "UNSUPPORTED_TIMED_EXPORT_YEAR",
      occurrenceDate: unsupported.date,
    });
  }

  const untimed = input.dates.flatMap((date) =>
    date.workingOccurrences
      .filter((occurrence) => occurrence.definition.time === undefined)
      .map((occurrence) => `${date.date}: ${occurrence.definition.name}`),
  );

  if (untimed.length > 0) {
    return timedFailure({
      code: "UNTIMED_WORK_OCCURRENCES",
      count: untimed.length,
      labels: Object.freeze(untimed),
    });
  }

  const events: TimedProjectedEvent[] = [];
  const gaps: TimedBoundaryIssue[] = [];
  const overlaps: TimedBoundaryIssue[] = [];

  for (const date of input.dates) {
    for (const occurrence of date.workingOccurrences) {
      const time = occurrence.definition.time;
      if (time === undefined || occurrence.calculation === null) {
        return timedFailure({ code: "INVALID_TIMED_DEFINITION" });
      }

      const identity = eventIdentity(date, occurrence);
      const endDateResult = occurrence.calculation.crossesMidnight
        ? addCalendarDays(date.date, 1)
        : { ok: true as const, value: date.date };

      if (!endDateResult.ok) {
        return timedFailure({
          code: "DATE_OVERFLOW",
          occurrenceDate: date.date,
        });
      }

      const startIssue = {
        key: boundaryKey(identity, "start"),
        eventIdentity: identity,
        label: occurrence.definition.name,
        boundary: "start" as const,
        date: date.date,
        time: time.startTime,
        timeZone: input.timeZone,
      };
      const endIssue = {
        key: boundaryKey(identity, "end"),
        eventIdentity: identity,
        label: occurrence.definition.name,
        boundary: "end" as const,
        date: endDateResult.value,
        time: time.endTime,
        timeZone: input.timeZone,
      };
      const start = resolveBoundary(
        startIssue,
        input.timeZone,
        input.disambiguations?.[startIssue.key],
      );
      const end = resolveBoundary(
        endIssue,
        input.timeZone,
        input.disambiguations?.[endIssue.key],
      );

      for (const boundary of [start, end]) {
        if (boundary.kind === "gap") gaps.push(boundary.issue);
        if (boundary.kind === "overlap") overlaps.push(boundary.issue);
        if (boundary.kind === "failure") {
          return timedFailure({
            code: "TIME_ZONE_CONVERSION_FAILED",
            occurrenceDate: date.date,
            timeZone: input.timeZone,
          });
        }
      }

      if (start.kind !== "resolved" || end.kind !== "resolved") continue;
      if (Date.parse(end.value.utc) <= Date.parse(start.value.utc)) {
        return timedFailure({
          code: "INVALID_TIMED_DEFINITION",
          occurrenceDate: date.date,
        });
      }

      events.push(
        Object.freeze({
          identity,
          occurrenceDate: date.date,
          role: occurrence.role,
          origin: occurrence.kind,
          definitionId: occurrence.definition.id,
          summary:
            occurrence.kind === "training"
              ? `Training — ${occurrence.definition.name}`
              : occurrence.kind === "additional"
                ? `Additional Work — ${occurrence.definition.name}`
                : occurrence.definition.name,
          category: occurrence.definition.category,
          localStartDate: date.date,
          localStartTime: time.startTime,
          localEndDate: endDateResult.value,
          localEndTime: time.endTime,
          timeZone: input.timeZone,
          utcStart: start.value.utc as TimedProjectedEvent["utcStart"],
          utcEnd: end.value.utc as TimedProjectedEvent["utcEnd"],
          startOffsetMinutes: start.value.offsetMinutes,
          endOffsetMinutes: end.value.offsetMinutes,
          overnight: occurrence.calculation.crossesMidnight,
          is24Hours: occurrence.calculation.is24Hours,
          breakMinutes: occurrence.calculation.breakMinutes,
        }),
      );
    }
  }

  if (gaps.length > 0) {
    return timedFailure({
      code: "NONEXISTENT_LOCAL_TIME",
      count: gaps.length,
      timeZone: input.timeZone,
      boundaries: Object.freeze(gaps),
    });
  }

  if (overlaps.length > 0) {
    return timedFailure({
      code: "AMBIGUOUS_LOCAL_TIME",
      count: overlaps.length,
      timeZone: input.timeZone,
      boundaries: Object.freeze(overlaps),
    });
  }

  return timedSuccess(Object.freeze(events));
}
