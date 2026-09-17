import {
  parseISODate,
  type ISODate,
  type ScheduleOccurrence,
} from "@/features/schedule/domain";

import {
  plannerError,
  plannerFailure,
  plannerSuccess,
  type DateExceptionId,
  type PlannerError,
  type PlannerResult,
  type ShiftDefinitionId,
  type ShiftDefinitionRegistry,
} from "./planner-types";

export const MAX_PERSONAL_NOTE_LENGTH = 500;
export const MAX_DATE_EXCEPTIONS = 366;

export type PrimaryDateException =
  | {
      readonly type: "replacement";
      readonly definitionId: ShiftDefinitionId;
    }
  | { readonly type: "leave" }
  | { readonly type: "sick" }
  | {
      readonly type: "training";
      readonly definitionId: ShiftDefinitionId;
    };

export type AdditionalWorkOccurrence = {
  readonly definitionId: ShiftDefinitionId;
};

export type DateException = {
  readonly id: DateExceptionId;
  readonly date: ISODate;
  readonly primary?: PrimaryDateException;
  readonly additionalWork?: AdditionalWorkOccurrence;
  readonly note?: string;
};

export type DateExceptionInput = {
  readonly id?: unknown;
  readonly date?: unknown;
  readonly primary?: unknown;
  readonly additionalWork?: unknown;
  readonly note?: unknown;
};

const EXCEPTION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function definitionReference(
  value: unknown,
  registry: ShiftDefinitionRegistry,
  path: string,
): PlannerResult<ShiftDefinitionId> {
  if (typeof value !== "string" || value === "") {
    return plannerFailure(
      plannerError("MISSING_SHIFT_DEFINITION_REFERENCE", { path }),
    );
  }

  const definition = registry.definitions.find(({ id }) => id === value);
  if (definition === undefined) {
    return plannerFailure(
      plannerError("UNKNOWN_SHIFT_DEFINITION_REFERENCE", { path, value }),
    );
  }

  return plannerSuccess(definition.id);
}

function oneValue(
  value: unknown,
  code: "MULTIPLE_PRIMARY_EXCEPTIONS" | "MULTIPLE_ADDITIONAL_WORK_OCCURRENCES",
  path: string,
): PlannerResult<unknown | undefined> {
  if (!Array.isArray(value)) {
    return plannerSuccess(value);
  }
  if (value.length > 1) {
    return plannerFailure(plannerError(code, { path, value: value.length }));
  }
  return plannerSuccess(value[0]);
}

function validatePrimary(
  value: unknown,
  registry: ShiftDefinitionRegistry,
  baseOccurrence: ScheduleOccurrence | undefined,
): PlannerResult<PrimaryDateException | undefined> {
  const single = oneValue(value, "MULTIPLE_PRIMARY_EXCEPTIONS", "primary");
  if (!single.ok || single.value === undefined || single.value === null) {
    return single as PlannerResult<PrimaryDateException | undefined>;
  }
  if (typeof single.value !== "object" || Array.isArray(single.value)) {
    return plannerFailure(
      plannerError("INVALID_PRIMARY_EXCEPTION_TYPE", { path: "primary" }),
    );
  }

  const candidate = single.value as {
    readonly type?: unknown;
    readonly definitionId?: unknown;
  };
  if (candidate.type === "leave" || candidate.type === "sick") {
    if (baseOccurrence?.shift === "off") {
      return plannerFailure(
        plannerError(
          candidate.type === "leave" ? "LEAVE_ON_OFF" : "SICK_ON_OFF",
          {
            path: "primary.type",
          },
        ),
      );
    }
    return plannerSuccess(Object.freeze({ type: candidate.type }));
  }

  if (candidate.type === "replacement" || candidate.type === "training") {
    const reference = definitionReference(
      candidate.definitionId,
      registry,
      "primary.definitionId",
    );
    if (!reference.ok) {
      return reference;
    }
    return plannerSuccess(
      Object.freeze({ type: candidate.type, definitionId: reference.value }),
    );
  }

  return plannerFailure(
    plannerError("INVALID_PRIMARY_EXCEPTION_TYPE", {
      path: "primary.type",
      value: typeof candidate.type === "string" ? candidate.type : undefined,
    }),
  );
}

function validateAdditional(
  value: unknown,
  registry: ShiftDefinitionRegistry,
): PlannerResult<AdditionalWorkOccurrence | undefined> {
  const single = oneValue(
    value,
    "MULTIPLE_ADDITIONAL_WORK_OCCURRENCES",
    "additionalWork",
  );
  if (!single.ok || single.value === undefined || single.value === null) {
    return single as PlannerResult<AdditionalWorkOccurrence | undefined>;
  }
  if (typeof single.value !== "object" || Array.isArray(single.value)) {
    return plannerFailure(
      plannerError("UNSUPPORTED_OCCURRENCE_COMBINATION", {
        path: "additionalWork",
      }),
    );
  }
  const reference = definitionReference(
    (single.value as { readonly definitionId?: unknown }).definitionId,
    registry,
    "additionalWork.definitionId",
  );
  if (!reference.ok) {
    return reference;
  }
  return plannerSuccess(Object.freeze({ definitionId: reference.value }));
}

function normalizeNote(value: unknown): PlannerResult<string | undefined> {
  if (value === undefined || value === null) {
    return plannerSuccess(undefined);
  }
  if (typeof value !== "string") {
    return plannerFailure(plannerError("INVALID_NOTE_TYPE", { path: "note" }));
  }
  const normalized = value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .normalize("NFC")
    .trim();
  if (normalized === "") {
    return plannerFailure(
      plannerError("EMPTY_NORMALIZED_NOTE", { path: "note" }),
    );
  }
  if (Array.from(normalized).length > MAX_PERSONAL_NOTE_LENGTH) {
    return plannerFailure(
      plannerError("NOTE_TOO_LONG", {
        path: "note",
        limit: MAX_PERSONAL_NOTE_LENGTH,
      }),
    );
  }
  return plannerSuccess(normalized);
}

export function validateDateException(
  input: unknown,
  registry: ShiftDefinitionRegistry,
  baseOccurrence?: ScheduleOccurrence,
): PlannerResult<DateException> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return plannerFailure(
      plannerError("UNSUPPORTED_OCCURRENCE_COMBINATION", { path: "exception" }),
    );
  }
  const candidate = input as DateExceptionInput;
  const errors: PlannerError[] = [];
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  if (!EXCEPTION_ID_PATTERN.test(id)) {
    errors.push(plannerError("INVALID_EXCEPTION_IDENTIFIER", { path: "id" }));
  }

  const dateResult = parseISODate(candidate.date);
  if (!dateResult.ok) {
    errors.push(
      plannerError(
        dateResult.errors.some(({ code }) => code === "UNSUPPORTED_YEAR")
          ? "UNSUPPORTED_EXCEPTION_YEAR"
          : "INVALID_EXCEPTION_DATE",
        {
          path: "date",
          value:
            typeof candidate.date === "string" ? candidate.date : undefined,
        },
      ),
    );
  }
  if (
    dateResult.ok &&
    baseOccurrence !== undefined &&
    baseOccurrence.date !== dateResult.value
  ) {
    errors.push(plannerError("INVALID_BASE_OCCURRENCE", { path: "date" }));
  }

  const primary = validatePrimary(candidate.primary, registry, baseOccurrence);
  const additional = validateAdditional(candidate.additionalWork, registry);
  const note = normalizeNote(candidate.note);
  if (!primary.ok) errors.push(...primary.errors);
  if (!additional.ok) errors.push(...additional.errors);
  if (!note.ok) errors.push(...note.errors);

  if (
    primary.ok &&
    additional.ok &&
    note.ok &&
    primary.value === undefined &&
    additional.value === undefined &&
    note.value === undefined
  ) {
    errors.push(
      plannerError("UNSUPPORTED_OCCURRENCE_COMBINATION", {
        path: "exception",
      }),
    );
  }

  if (
    errors.length > 0 ||
    !dateResult.ok ||
    !primary.ok ||
    !additional.ok ||
    !note.ok
  ) {
    return plannerFailure(...errors);
  }

  return plannerSuccess(
    Object.freeze({
      id: id as DateExceptionId,
      date: dateResult.value,
      ...(primary.value === undefined ? {} : { primary: primary.value }),
      ...(additional.value === undefined
        ? {}
        : { additionalWork: additional.value }),
      ...(note.value === undefined ? {} : { note: note.value }),
    }),
  );
}

export function validateDateExceptionCollection(
  input: unknown,
  registry: ShiftDefinitionRegistry,
): PlannerResult<readonly DateException[]> {
  if (!Array.isArray(input)) {
    return plannerFailure(
      plannerError("UNSUPPORTED_OCCURRENCE_COMBINATION", {
        path: "exceptions",
      }),
    );
  }
  if (input.length > MAX_DATE_EXCEPTIONS) {
    return plannerFailure(
      plannerError("PROJECTION_RANGE_TOO_LARGE", {
        path: "exceptions",
        value: input.length,
        limit: MAX_DATE_EXCEPTIONS,
      }),
    );
  }

  const values: DateException[] = [];
  const errors: PlannerError[] = [];
  input.forEach((item, index) => {
    const result = validateDateException(item, registry);
    if (result.ok) values.push(result.value);
    else
      errors.push(
        ...result.errors.map((error) => Object.freeze({ ...error, index })),
      );
  });
  const ids = new Set<string>();
  const dates = new Set<string>();
  values.forEach((value, index) => {
    if (ids.has(value.id)) {
      errors.push(
        plannerError("DUPLICATE_EXCEPTION_IDENTIFIER", {
          path: `exceptions.${index}.id`,
          index,
        }),
      );
    }
    if (dates.has(value.date)) {
      errors.push(
        plannerError("DUPLICATE_EXCEPTION_DATE", {
          path: `exceptions.${index}.date`,
          index,
        }),
      );
    }
    ids.add(value.id);
    dates.add(value.date);
  });
  return errors.length > 0
    ? plannerFailure(...errors)
    : plannerSuccess(Object.freeze([...values]));
}

export function upsertDateException(
  values: readonly DateException[],
  value: DateException,
): readonly DateException[] {
  return Object.freeze(
    [...values.filter(({ date }) => date !== value.date), value].sort(
      (left, right) => left.date.localeCompare(right.date),
    ),
  );
}

export function removeDateExceptionLayer(
  values: readonly DateException[],
  date: ISODate,
  layer: "primary" | "additionalWork" | "note" | "all",
): readonly DateException[] {
  const current = values.find((value) => value.date === date);
  if (current === undefined || layer === "all") {
    return Object.freeze(values.filter((value) => value.date !== date));
  }
  const { primary, additionalWork, note, ...identity } = current;
  const next = {
    ...identity,
    ...(layer === "primary" || primary === undefined ? {} : { primary }),
    ...(layer === "additionalWork" || additionalWork === undefined
      ? {}
      : { additionalWork }),
    ...(layer === "note" || note === undefined ? {} : { note }),
  };
  if (
    next.primary === undefined &&
    next.additionalWork === undefined &&
    next.note === undefined
  ) {
    return Object.freeze(values.filter((value) => value.date !== date));
  }
  return Object.freeze(
    values.map((value) => (value.date === date ? Object.freeze(next) : value)),
  );
}
