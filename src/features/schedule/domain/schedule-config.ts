import { parseISODate, parseISOYearMonth } from "./date-only";
import {
  isPresetId,
  isWorkingShiftKind,
  MAX_CUSTOM_CYCLE_LENGTH,
  validateCustomPattern,
} from "./presets";
import {
  domainError,
  domainFailure,
  domainSuccess,
  type DomainError,
  type DomainResult,
  type ScheduleConfig,
  type ScheduleShareState,
  type ShiftKind,
} from "./schedule-types";

const KNOWN_QUERY_PARAMETERS = new Set([
  "v",
  "kind",
  "p",
  "s",
  "shift",
  "cycle",
  "m",
]);

const PRESET_QUERY_PARAMETERS = new Set(["v", "kind", "p", "s", "shift", "m"]);

const CUSTOM_QUERY_PARAMETERS = new Set(["v", "kind", "s", "cycle", "m"]);

const SHIFT_TO_TOKEN = {
  day: "d",
  night: "n",
  off: "o",
} as const satisfies Record<ShiftKind, string>;

const TOKEN_TO_SHIFT: Readonly<Record<string, ShiftKind>> = Object.freeze({
  d: "day",
  n: "night",
  o: "off",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

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

function errorsAtPath(
  errors: readonly DomainError[],
  path: string,
): readonly DomainError[] {
  return errors.map(({ code, ...context }) =>
    domainError(code, { ...context, path }),
  );
}

function missingField<T>(path: string): DomainResult<T> {
  return domainFailure(domainError("MISSING_FIELD", { path }));
}

export function validateScheduleConfig(
  value: unknown,
): DomainResult<ScheduleConfig> {
  if (!isRecord(value)) {
    return domainFailure(domainError("INVALID_CONFIGURATION"));
  }

  if (!hasOwn(value, "version")) {
    return missingField("version");
  }

  if (value.version !== 1) {
    return domainFailure(
      domainError("UNSUPPORTED_CONFIG_VERSION", {
        path: "version",
        value: errorValue(value.version),
      }),
    );
  }

  if (!hasOwn(value, "kind")) {
    return missingField("kind");
  }

  if (value.kind !== "preset" && value.kind !== "custom") {
    return domainFailure(
      domainError("INVALID_CONFIG_KIND", {
        path: "kind",
        value: errorValue(value.kind),
      }),
    );
  }

  if (!hasOwn(value, "startDate")) {
    return missingField("startDate");
  }

  const startDateResult = parseISODate(value.startDate);

  if (!startDateResult.ok) {
    return domainFailure(...errorsAtPath(startDateResult.errors, "startDate"));
  }

  if (value.kind === "preset") {
    if (!hasOwn(value, "presetId")) {
      return missingField("presetId");
    }

    if (!isPresetId(value.presetId)) {
      return domainFailure(
        domainError("UNKNOWN_PRESET", {
          path: "presetId",
          value: errorValue(value.presetId),
        }),
      );
    }

    if (!hasOwn(value, "workingShift")) {
      return missingField("workingShift");
    }

    if (!isWorkingShiftKind(value.workingShift)) {
      return domainFailure(
        domainError("INVALID_WORKING_SHIFT", {
          path: "workingShift",
          value: errorValue(value.workingShift),
        }),
      );
    }

    return domainSuccess(
      Object.freeze({
        kind: "preset",
        version: 1,
        presetId: value.presetId,
        startDate: startDateResult.value,
        workingShift: value.workingShift,
      }),
    );
  }

  if (!hasOwn(value, "cycle")) {
    return missingField("cycle");
  }

  const patternResult = validateCustomPattern(value.cycle);

  if (!patternResult.ok) {
    return domainFailure(...patternResult.errors);
  }

  return domainSuccess(
    Object.freeze({
      kind: "custom",
      version: 1,
      startDate: startDateResult.value,
      cycle: patternResult.value.cycle,
    }),
  );
}

function requiredParameter(
  parameters: URLSearchParams,
  name: string,
): DomainResult<string> {
  const value = parameters.get(name);

  if (value === null || value === "") {
    return domainFailure(domainError("MISSING_PARAMETER", { path: name }));
  }

  return domainSuccess(value);
}

function validateParameterStructure(
  parameters: URLSearchParams,
): DomainResult<URLSearchParams> {
  const seen = new Set<string>();

  for (const [name] of parameters.entries()) {
    if (!KNOWN_QUERY_PARAMETERS.has(name)) {
      return domainFailure(
        domainError("UNKNOWN_PARAMETER", { path: name, value: name }),
      );
    }

    if (seen.has(name)) {
      return domainFailure(
        domainError("DUPLICATE_PARAMETER", { path: name, value: name }),
      );
    }

    seen.add(name);
  }

  return domainSuccess(parameters);
}

function rejectVariantParameters(
  parameters: URLSearchParams,
  allowed: ReadonlySet<string>,
): DomainResult<URLSearchParams> {
  for (const name of parameters.keys()) {
    if (!allowed.has(name)) {
      return domainFailure(
        domainError("UNKNOWN_PARAMETER", { path: name, value: name }),
      );
    }
  }

  return domainSuccess(parameters);
}

function parseOptionalViewMonth(
  parameters: URLSearchParams,
): DomainResult<ScheduleShareState["viewMonth"]> {
  const rawViewMonth = parameters.get("m");

  if (rawViewMonth === null) {
    return domainSuccess(undefined);
  }

  return parseISOYearMonth(rawViewMonth);
}

function shareState(
  config: ScheduleConfig,
  viewMonth: ScheduleShareState["viewMonth"],
): ScheduleShareState {
  if (viewMonth === undefined) {
    return Object.freeze({ config });
  }

  return Object.freeze({ config, viewMonth });
}

export function parseScheduleQuery(
  input: string | URLSearchParams,
): DomainResult<ScheduleShareState> {
  const parameters =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : new URLSearchParams(input);
  const structureResult = validateParameterStructure(parameters);

  if (!structureResult.ok) {
    return structureResult;
  }

  const versionResult = requiredParameter(parameters, "v");

  if (!versionResult.ok) {
    return versionResult;
  }

  if (versionResult.value !== "1") {
    return domainFailure(
      domainError("UNSUPPORTED_CONFIG_VERSION", {
        path: "v",
        value: versionResult.value,
      }),
    );
  }

  const kindResult = requiredParameter(parameters, "kind");

  if (!kindResult.ok) {
    return kindResult;
  }

  if (kindResult.value !== "preset" && kindResult.value !== "custom") {
    return domainFailure(
      domainError("INVALID_CONFIG_KIND", {
        path: "kind",
        value: kindResult.value,
      }),
    );
  }

  const allowedParameters =
    kindResult.value === "preset"
      ? PRESET_QUERY_PARAMETERS
      : CUSTOM_QUERY_PARAMETERS;
  const variantResult = rejectVariantParameters(parameters, allowedParameters);

  if (!variantResult.ok) {
    return variantResult;
  }

  const startDateParameter = requiredParameter(parameters, "s");

  if (!startDateParameter.ok) {
    return startDateParameter;
  }

  const startDateResult = parseISODate(startDateParameter.value);

  if (!startDateResult.ok) {
    return domainFailure(...errorsAtPath(startDateResult.errors, "s"));
  }

  const viewMonthResult = parseOptionalViewMonth(parameters);

  if (!viewMonthResult.ok) {
    return viewMonthResult;
  }

  if (kindResult.value === "preset") {
    const presetResult = requiredParameter(parameters, "p");

    if (!presetResult.ok) {
      return presetResult;
    }

    if (!isPresetId(presetResult.value)) {
      return domainFailure(
        domainError("UNKNOWN_PRESET", {
          path: "p",
          value: presetResult.value,
        }),
      );
    }

    const workingShiftResult = requiredParameter(parameters, "shift");

    if (!workingShiftResult.ok) {
      return workingShiftResult;
    }

    if (!isWorkingShiftKind(workingShiftResult.value)) {
      return domainFailure(
        domainError("INVALID_WORKING_SHIFT", {
          path: "shift",
          value: workingShiftResult.value,
        }),
      );
    }

    const config = Object.freeze({
      kind: "preset" as const,
      version: 1 as const,
      presetId: presetResult.value,
      startDate: startDateResult.value,
      workingShift: workingShiftResult.value,
    });

    return domainSuccess(shareState(config, viewMonthResult.value));
  }

  const cycleResult = requiredParameter(parameters, "cycle");

  if (!cycleResult.ok) {
    return cycleResult;
  }

  const tokens = cycleResult.value.split(",");

  if (tokens.length > MAX_CUSTOM_CYCLE_LENGTH) {
    return domainFailure(
      domainError("CYCLE_TOO_LONG", {
        path: "cycle",
        value: tokens.length,
        limit: MAX_CUSTOM_CYCLE_LENGTH,
      }),
    );
  }

  const cycle: ShiftKind[] = [];

  for (const [index, token] of tokens.entries()) {
    const shift = TOKEN_TO_SHIFT[token];

    if (shift === undefined) {
      return domainFailure(
        domainError("INVALID_CYCLE_TOKEN", {
          path: "cycle",
          value: token,
          index,
        }),
      );
    }

    cycle.push(shift);
  }

  const patternResult = validateCustomPattern(cycle);

  if (!patternResult.ok) {
    return patternResult;
  }

  const config = Object.freeze({
    kind: "custom" as const,
    version: 1 as const,
    startDate: startDateResult.value,
    cycle: patternResult.value.cycle,
  });

  return domainSuccess(shareState(config, viewMonthResult.value));
}

export function serializeScheduleQuery(value: unknown): DomainResult<string> {
  if (!isRecord(value) || !hasOwn(value, "config")) {
    return domainFailure(domainError("INVALID_CONFIGURATION"));
  }

  const configResult = validateScheduleConfig(value.config);

  if (!configResult.ok) {
    return configResult;
  }

  let viewMonth: ScheduleShareState["viewMonth"];

  if (hasOwn(value, "viewMonth") && value.viewMonth !== undefined) {
    const viewMonthResult = parseISOYearMonth(value.viewMonth);

    if (!viewMonthResult.ok) {
      return viewMonthResult;
    }

    viewMonth = viewMonthResult.value;
  }

  const config = configResult.value;
  const parts = [`v=1`, `kind=${config.kind}`];

  if (config.kind === "preset") {
    parts.push(
      `p=${config.presetId}`,
      `s=${config.startDate}`,
      `shift=${config.workingShift}`,
    );
  } else {
    parts.push(
      `s=${config.startDate}`,
      `cycle=${config.cycle.map((shift) => SHIFT_TO_TOKEN[shift]).join(",")}`,
    );
  }

  if (viewMonth !== undefined) {
    parts.push(`m=${viewMonth}`);
  }

  return domainSuccess(parts.join("&"));
}
