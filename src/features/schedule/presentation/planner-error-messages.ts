import type {
  PlannerError,
  PlannerErrorCode,
} from "@/features/schedule/planner";

export const PLANNER_ERROR_MESSAGES = {
  INVALID_TIME_FORMAT: "Enter a time in 24-hour HH:mm format.",
  PARTIAL_SHIFT_TIME: "Enter both a start time and an end time, or neither.",
  INVALID_24_HOUR_CONFIGURATION:
    "Choose 24 hours only when the start and end times are the same.",
  EQUAL_SHIFT_TIMES:
    "Equal start and end times require the explicit 24-hour option.",
  INVALID_BREAK_DURATION: "Enter a non-negative whole number of break minutes.",
  BREAK_REQUIRES_TIME: "Add shift times before adding an unpaid break.",
  BREAK_NOT_SHORTER_THAN_SHIFT:
    "The unpaid break must be shorter than the shift.",
  INVALID_SHIFT_DEFINITION_ID:
    "This shift definition has an invalid identifier.",
  DUPLICATE_SHIFT_DEFINITION_ID:
    "Each shift definition must have a unique identifier.",
  INVALID_SHIFT_NAME: "Enter a shift name.",
  SHIFT_NAME_TOO_LONG: "Keep the shift name to 40 characters or fewer.",
  DUPLICATE_SHIFT_NAME: "Use a different name for each shift definition.",
  INVALID_SHORT_LABEL: "Enter a short shift label.",
  SHORT_LABEL_TOO_LONG: "Keep the short label to 4 characters or fewer.",
  INVALID_SHIFT_CATEGORY: "Choose a supported shift category.",
  INVALID_SHIFT_COLOR: "Choose one of the available shift colors.",
  INVALID_SHIFT_DEFINITION: "Complete this shift definition.",
  INVALID_DEFINITION_COLLECTION: "The shift definitions could not be read.",
  TOO_MANY_SHIFT_DEFINITIONS:
    "A personal planner can contain no more than 12 shift definitions.",
  MISSING_DAY_DEFINITION: "Add the required Day shift definition.",
  MISSING_NIGHT_DEFINITION: "Add the required Night shift definition.",
  INVALID_DAY_DEFINITION: "The Day mapping must use a Day definition.",
  INVALID_NIGHT_DEFINITION: "The Night mapping must use a Night definition.",
  INVALID_EXCEPTION_DATE: "Enter a valid calendar date in YYYY-MM-DD format.",
  UNSUPPORTED_EXCEPTION_YEAR: "Choose a date from year 0001 through 9999.",
  INVALID_EXCEPTION_IDENTIFIER: "This date change has an invalid identifier.",
  DUPLICATE_EXCEPTION_IDENTIFIER:
    "Each date change must have a unique identifier.",
  DUPLICATE_EXCEPTION_DATE: "Only one set of changes is allowed per date.",
  MULTIPLE_PRIMARY_EXCEPTIONS:
    "Choose no more than one primary change for this date.",
  MULTIPLE_ADDITIONAL_WORK_OCCURRENCES:
    "Add no more than one additional-work occurrence for this date.",
  INVALID_PRIMARY_EXCEPTION_TYPE: "Choose a supported date-change type.",
  MISSING_SHIFT_DEFINITION_REFERENCE: "Choose a working shift definition.",
  UNKNOWN_SHIFT_DEFINITION_REFERENCE:
    "The selected working shift definition is unavailable.",
  LEAVE_ON_OFF: "Leave can only replace a scheduled working shift.",
  SICK_ON_OFF: "Sick can only replace a scheduled working shift.",
  INVALID_NOTE_TYPE: "Enter the personal note as plain text.",
  EMPTY_NORMALIZED_NOTE: "Enter note text or remove the note.",
  NOTE_TOO_LONG: "Keep the personal note to 500 characters or fewer.",
  UNSUPPORTED_OCCURRENCE_COMBINATION:
    "Add a primary change, additional work, or a personal note.",
  PROJECTION_RANGE_TOO_LARGE:
    "The effective schedule range cannot exceed 366 dates.",
  INVALID_BASE_OCCURRENCE:
    "The generated schedule could not be combined with this date change.",
} satisfies Record<PlannerErrorCode, string>;

export type PlannerFieldErrors = Readonly<Record<string, string>>;

export type PresentedPlannerErrors = {
  readonly fields: PlannerFieldErrors;
  readonly summary: readonly string[];
};

export function getPlannerErrorMessage(error: PlannerError): string {
  return PLANNER_ERROR_MESSAGES[error.code];
}

export function presentPlannerErrors(
  errors: readonly PlannerError[],
): PresentedPlannerErrors {
  const fields: Record<string, string> = {};
  const summary: string[] = [];

  for (const error of errors) {
    const message = getPlannerErrorMessage(error);

    if (error.path !== undefined) {
      fields[error.path] ??= message;
    }
    if (!summary.includes(message)) {
      summary.push(message);
    }
  }

  return Object.freeze({
    fields: Object.freeze(fields),
    summary: Object.freeze(summary),
  });
}
