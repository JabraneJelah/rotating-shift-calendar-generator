import {
  plannerError,
  plannerFailure,
  plannerSuccess,
  type LocalTime,
  type NominalShiftCalculation,
  type PlannerResult,
  type ShiftTimeDetails,
} from "./planner-types";

const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;

function errorValue(
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

export function parseLocalTime(
  value: unknown,
  path = "time",
): PlannerResult<LocalTime> {
  if (typeof value !== "string") {
    return plannerFailure(
      plannerError("INVALID_TIME_FORMAT", {
        path,
        value: errorValue(value),
      }),
    );
  }

  const match = LOCAL_TIME_PATTERN.exec(value);

  if (match === null) {
    return plannerFailure(plannerError("INVALID_TIME_FORMAT", { path, value }));
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return plannerFailure(plannerError("INVALID_TIME_FORMAT", { path, value }));
  }

  return plannerSuccess(value as LocalTime);
}

export function formatLocalTime(value: LocalTime): string {
  return value;
}

export function localTimeToMinutes(value: LocalTime): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function compareLocalTime(
  left: LocalTime,
  right: LocalTime,
): -1 | 0 | 1 {
  const difference = localTimeToMinutes(left) - localTimeToMinutes(right);
  return difference === 0 ? 0 : difference < 0 ? -1 : 1;
}

export function calculateNominalShift(
  time: ShiftTimeDetails,
  path = "time",
): PlannerResult<NominalShiftCalculation> {
  const startMinutes = localTimeToMinutes(time.startTime);
  const endMinutes = localTimeToMinutes(time.endTime);
  const equalTimes = startMinutes === endMinutes;

  if (equalTimes && !time.is24Hours) {
    return plannerFailure(
      plannerError("EQUAL_SHIFT_TIMES", { path: `${path}.endTime` }),
    );
  }

  if (!equalTimes && time.is24Hours) {
    return plannerFailure(
      plannerError("INVALID_24_HOUR_CONFIGURATION", {
        path: `${path}.is24Hours`,
      }),
    );
  }

  const crossesMidnight = equalTimes || endMinutes < startMinutes;
  const grossMinutes = equalTimes
    ? 1_440
    : endMinutes + (crossesMidnight ? 1_440 : 0) - startMinutes;

  if (!Number.isSafeInteger(time.breakMinutes) || time.breakMinutes < 0) {
    return plannerFailure(
      plannerError("INVALID_BREAK_DURATION", {
        path: `${path}.breakMinutes`,
        value: time.breakMinutes,
      }),
    );
  }

  if (time.breakMinutes >= grossMinutes) {
    return plannerFailure(
      plannerError("BREAK_NOT_SHORTER_THAN_SHIFT", {
        path: `${path}.breakMinutes`,
        value: time.breakMinutes,
        limit: grossMinutes - 1,
      }),
    );
  }

  return plannerSuccess(
    Object.freeze({
      grossMinutes,
      breakMinutes: time.breakMinutes,
      netMinutes: grossMinutes - time.breakMinutes,
      crossesMidnight,
      is24Hours: time.is24Hours,
    }),
  );
}
