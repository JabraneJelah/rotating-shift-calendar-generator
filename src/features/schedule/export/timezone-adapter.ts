import { TzDatabase } from "timezonecomplete";
import tzdata from "tzdata";

import type { ISODate } from "@/features/schedule/domain";
import type { LocalTime } from "@/features/schedule/planner";

import {
  EXPECTED_IANA_VERSION,
  timedFailure,
  timedSuccess,
  type IANATimeZone,
  type TimedCandidate,
  type TimedDisambiguation,
  type TimedResult,
  type TimeZoneSupport,
  type UTCInstant,
} from "./timed-export-types";

const MINUTE_MS = 60_000;
const CANDIDATE_WINDOW_MINUTES = 18 * 60;
const OFFSET_SAMPLE_POINTS = Object.freeze([
  -CANDIDATE_WINDOW_MINUTES,
  0,
  CANDIDATE_WINDOW_MINUTES,
]);

let initializationPromise: Promise<TimeZoneSupport> | null = null;
let initializedDatabase: TzDatabase | null = null;

function utcInstant(value: number): UTCInstant {
  return new Date(value).toISOString().replace(".000Z", "Z") as UTCInstant;
}

function localFieldsToNeutralMilliseconds(
  date: ISODate,
  time: LocalTime,
): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

function supportedCanonicalZones(): readonly string[] {
  const names = Object.entries(tzdata.zones)
    .filter(([, definition]) => Array.isArray(definition))
    .map(([name]) => name);

  if (!names.includes("UTC")) names.push("UTC");
  names.sort((left, right) => left.localeCompare(right));
  return Object.freeze(names);
}

export function verifyIanaVersion(
  version: string,
): TimedResult<typeof EXPECTED_IANA_VERSION> {
  return version === EXPECTED_IANA_VERSION
    ? timedSuccess(EXPECTED_IANA_VERSION)
    : timedFailure({
        code: "TIME_ZONE_DATA_VERSION_MISMATCH",
        activeIanaVersion: version,
      });
}

function initialize(): TimeZoneSupport {
  const version = verifyIanaVersion(tzdata.version);
  if (!version.ok) {
    throw Object.assign(new Error("Unexpected embedded IANA version."), {
      ...version.error,
    });
  }

  TzDatabase.init(tzdata);
  const database = TzDatabase.instance();

  if (!database.exists("Africa/Casablanca")) {
    throw Object.assign(new Error("Required timezone data is unavailable."), {
      code: "TIME_ZONE_INITIALIZATION_FAILED",
    });
  }

  const sentinelOffset = database
    .totalOffset("Africa/Casablanca", Date.UTC(2026, 8, 21, 12))
    .minutes();

  if (sentinelOffset !== 0) {
    throw Object.assign(new Error("Stale timezone data was initialized."), {
      code: "TIME_ZONE_DATA_VERSION_MISMATCH",
      activeIanaVersion: tzdata.version,
    });
  }

  initializedDatabase = database;
  return Object.freeze({
    activeIanaVersion: tzdata.version,
    timeZones: supportedCanonicalZones(),
  });
}

export function initializeTimeZoneAdapter(): Promise<TimeZoneSupport> {
  if (initializationPromise !== null) return initializationPromise;

  initializationPromise = Promise.resolve()
    .then(initialize)
    .catch((error: unknown) => {
      initializationPromise = null;
      initializedDatabase = null;
      throw error;
    });

  return initializationPromise;
}

export function getActiveIanaVersion(): string | null {
  return initializedDatabase === null ? null : tzdata.version;
}

export function validateTimeZone(value: string): TimedResult<IANATimeZone> {
  if (value.trim() === "") {
    return timedFailure({ code: "MISSING_TIME_ZONE" });
  }

  if (initializedDatabase === null) {
    return timedFailure({ code: "UNSUPPORTED_TIME_ZONE_RUNTIME" });
  }

  const normalized = value.trim();
  const canonical = supportedCanonicalZones().includes(normalized);

  if (!canonical || !initializedDatabase.exists(normalized)) {
    return timedFailure({ code: "UNKNOWN_TIME_ZONE", timeZone: normalized });
  }

  return timedSuccess(normalized as IANATimeZone);
}

export type LocalResolution =
  | { readonly kind: "unique"; readonly candidate: TimedCandidate }
  | { readonly kind: "gap" }
  | {
      readonly kind: "overlap";
      readonly candidates: readonly [TimedCandidate, TimedCandidate];
    };

export function findLocalDateTimeCandidates(
  date: ISODate,
  time: LocalTime,
  timeZone: IANATimeZone,
): TimedResult<LocalResolution> {
  const database = initializedDatabase;
  if (database === null) {
    return timedFailure({ code: "UNSUPPORTED_TIME_ZONE_RUNTIME" });
  }

  try {
    const localMilliseconds = localFieldsToNeutralMilliseconds(date, time);
    const offsets = new Set<number>();

    for (const minute of OFFSET_SAMPLE_POINTS) {
      offsets.add(
        database
          .totalOffset(timeZone, localMilliseconds + minute * MINUTE_MS)
          .minutes(),
      );
    }

    const candidates = [...offsets]
      .map((offsetMinutes) => ({
        instantMilliseconds: localMilliseconds - offsetMinutes * MINUTE_MS,
        offsetMinutes,
      }))
      .filter(
        ({ instantMilliseconds, offsetMinutes }) =>
          database.totalOffset(timeZone, instantMilliseconds).minutes() ===
            offsetMinutes &&
          instantMilliseconds + offsetMinutes * MINUTE_MS === localMilliseconds,
      )
      .sort(
        (left, right) => left.instantMilliseconds - right.instantMilliseconds,
      )
      .filter(
        (candidate, index, values) =>
          index === 0 ||
          candidate.instantMilliseconds !==
            values[index - 1]?.instantMilliseconds,
      )
      .map(
        ({ instantMilliseconds, offsetMinutes }) =>
          Object.freeze({
            utc: utcInstant(instantMilliseconds),
            offsetMinutes,
          }) satisfies TimedCandidate,
      );

    if (candidates.length === 0) {
      return timedSuccess(Object.freeze({ kind: "gap" }));
    }

    if (candidates.length === 1 && candidates[0] !== undefined) {
      return timedSuccess(
        Object.freeze({ kind: "unique", candidate: candidates[0] }),
      );
    }

    if (
      candidates.length === 2 &&
      candidates[0] !== undefined &&
      candidates[1] !== undefined
    ) {
      return timedSuccess(
        Object.freeze({
          kind: "overlap",
          candidates: Object.freeze([
            candidates[0],
            candidates[1],
          ]) as readonly [TimedCandidate, TimedCandidate],
        }),
      );
    }

    return timedFailure({
      code: "TIME_ZONE_CONVERSION_FAILED",
      occurrenceDate: date,
      timeZone,
    });
  } catch {
    return timedFailure({
      code: "TIME_ZONE_CONVERSION_FAILED",
      occurrenceDate: date,
      timeZone,
    });
  }
}

export function resolveLocalDateTime(
  date: ISODate,
  time: LocalTime,
  timeZone: IANATimeZone,
  disambiguation?: TimedDisambiguation,
): TimedResult<TimedCandidate | LocalResolution> {
  const candidates = findLocalDateTimeCandidates(date, time, timeZone);
  if (!candidates.ok) return candidates;
  if (candidates.value.kind === "unique") {
    return timedSuccess(candidates.value.candidate);
  }
  if (candidates.value.kind === "overlap" && disambiguation !== undefined) {
    return timedSuccess(
      candidates.value.candidates[disambiguation === "earlier" ? 0 : 1],
    );
  }
  return candidates;
}
