import {
  timedFailure,
  type TimedExportRequest,
  type TimedExportResponse,
  type TimedResult,
  type TimeZoneSupport,
} from "./timed-export-types";
import { projectTimedEvents } from "./timed-event-projection";
import { serializeTimedICS } from "./timed-ics-serializer";
import {
  initializeTimeZoneAdapter,
  validateTimeZone,
} from "./timezone-adapter";

export type {
  TimedBoundaryIssue,
  TimedDisambiguation,
  TimedExportError,
  TimedExportRequest,
  TimedExportResponse,
  TimeZoneSupport,
} from "./timed-export-types";

export async function loadTimeZoneSupport(): Promise<
  TimedResult<TimeZoneSupport>
> {
  try {
    return { ok: true, value: await initializeTimeZoneAdapter() };
  } catch (error: unknown) {
    const candidate = error as {
      readonly code?: string;
      readonly activeIanaVersion?: string;
    };
    return timedFailure({
      code:
        candidate.code === "TIME_ZONE_DATA_VERSION_MISMATCH"
          ? "TIME_ZONE_DATA_VERSION_MISMATCH"
          : "TIME_ZONE_INITIALIZATION_FAILED",
      activeIanaVersion: candidate.activeIanaVersion,
    });
  }
}

export async function createTimedExport(
  input: TimedExportRequest,
): Promise<TimedExportResponse> {
  const support = await loadTimeZoneSupport();
  if (!support.ok) return support;

  const timeZone = validateTimeZone(input.timeZone);
  if (!timeZone.ok) return timeZone;

  const projected = projectTimedEvents({
    config: input.config,
    dates: input.dates,
    timeZone: timeZone.value,
    disambiguations: input.disambiguations,
  });
  if (!projected.ok) return projected;

  return serializeTimedICS({
    calendarName: input.calendarName,
    config: input.config,
    events: projected.value,
    generatedAt: input.generatedAt,
    ...(input.year === undefined
      ? { viewMonth: input.viewMonth }
      : { year: input.year }),
  });
}
