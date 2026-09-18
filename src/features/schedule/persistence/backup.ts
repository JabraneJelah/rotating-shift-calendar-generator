import {
  isPlainRecord,
  normalizePlannerName,
  plannerNameKey,
  scanUntrustedValue,
  validatePersistedPlanner,
  validateTimestamp,
} from "./persistence-validation";
import {
  BACKUP_FORMAT_VERSION,
  MAX_BACKUP_BYTES,
  MAX_BACKUP_PLANNERS,
  MAX_PLANNER_NAME_LENGTH,
  PlannerPersistenceError,
  type ImportReview,
  type PersistedPlannerV1,
  type PlannerBackupV1,
} from "./persistence-types";

const JSON_MIME_TYPES = new Set(["", "application/json", "text/json"]);

function exactEnvelopeKeys(value: Record<string, unknown>): void {
  const expected = new Set([
    "format",
    "backupVersion",
    "product",
    "exportedAt",
    "scope",
    "planners",
  ]);
  if (
    Object.keys(value).length !== expected.size ||
    Object.keys(value).some((key) => !expected.has(key))
  ) {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
}

export function parsePlannerBackup(
  text: string,
  isSupportedTimeZone: (value: string) => boolean,
): PlannerBackupV1 {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) {
    throw new PlannerPersistenceError("BACKUP_TOO_LARGE");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  scanUntrustedValue(parsed);
  if (!isPlainRecord(parsed))
    throw new PlannerPersistenceError("INVALID_BACKUP");
  exactEnvelopeKeys(parsed);
  if (
    parsed.format !== "shift-calendar-planner-backup" ||
    parsed.product !== "shift-calendar"
  ) {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  if (parsed.backupVersion !== BACKUP_FORMAT_VERSION) {
    throw new PlannerPersistenceError("UNSUPPORTED_BACKUP_VERSION");
  }
  if (parsed.scope !== "single" && parsed.scope !== "all") {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  let exportedAt: string;
  try {
    exportedAt = validateTimestamp(parsed.exportedAt, "exportedAt");
  } catch {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  if (!Array.isArray(parsed.planners))
    throw new PlannerPersistenceError("INVALID_BACKUP");
  if (parsed.planners.length === 0)
    throw new PlannerPersistenceError("EMPTY_BACKUP");
  if (parsed.planners.length > MAX_BACKUP_PLANNERS) {
    throw new PlannerPersistenceError("IMPORT_LIMIT_EXCEEDED");
  }
  if (parsed.scope === "single" && parsed.planners.length !== 1) {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  let planners: PersistedPlannerV1[];
  try {
    planners = parsed.planners.map((planner) =>
      validatePersistedPlanner(planner, isSupportedTimeZone),
    );
  } catch (error) {
    if (
      error instanceof PlannerPersistenceError &&
      (error.code === "UNSUPPORTED_PLANNER_VERSION" ||
        error.code === "UNSUPPORTED_DOMAIN_VERSION")
    ) {
      throw error;
    }
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const planner of planners) {
    const nameKey = plannerNameKey(planner.name);
    if (ids.has(planner.id) || names.has(nameKey)) {
      throw new PlannerPersistenceError("INVALID_BACKUP");
    }
    ids.add(planner.id);
    names.add(nameKey);
  }
  return Object.freeze({
    format: "shift-calendar-planner-backup",
    backupVersion: 1,
    product: "shift-calendar",
    exportedAt,
    scope: parsed.scope,
    planners: Object.freeze(planners),
  });
}

export function validateBackupFile(
  file: Pick<File, "name" | "size" | "type">,
): void {
  if (file.size === 0) throw new PlannerPersistenceError("EMPTY_BACKUP");
  if (file.size > MAX_BACKUP_BYTES)
    throw new PlannerPersistenceError("BACKUP_TOO_LARGE");
  if (
    !file.name.toLowerCase().endsWith(".json") ||
    !JSON_MIME_TYPES.has(file.type.toLowerCase())
  ) {
    throw new PlannerPersistenceError("INVALID_BACKUP");
  }
}

function truncateCodePoints(value: string, length: number): string {
  return Array.from(value).slice(0, length).join("");
}

export function resolveImportedName(
  sourceName: string,
  occupiedKeys: ReadonlySet<string>,
): string {
  const normalized = normalizePlannerName(sourceName);
  if (!occupiedKeys.has(plannerNameKey(normalized))) return normalized;
  for (let index = 1; index <= 10_000; index += 1) {
    const suffix = index === 1 ? " (imported)" : ` (imported ${index})`;
    const base = truncateCodePoints(
      normalized,
      MAX_PLANNER_NAME_LENGTH - Array.from(suffix).length,
    ).trimEnd();
    const candidate = `${base}${suffix}`;
    if (!occupiedKeys.has(plannerNameKey(candidate))) return candidate;
  }
  throw new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
}

export function createImportReview(
  backup: PlannerBackupV1,
  existingNames: readonly string[],
): ImportReview {
  const occupied = new Set(existingNames.map(plannerNameKey));
  const planners = backup.planners.map((source) => {
    const proposedName = resolveImportedName(source.name, occupied);
    occupied.add(plannerNameKey(proposedName));
    return Object.freeze({
      source,
      proposedName,
      nameAdjusted: proposedName !== source.name,
    });
  });
  return Object.freeze({
    exportedAt: backup.exportedAt,
    backupVersion: 1,
    planners: Object.freeze(planners),
  });
}

export function createPlannerBackup(
  planners: readonly PersistedPlannerV1[],
  scope: "single" | "all",
  exportedAt: string,
  isSupportedTimeZone: (value: string) => boolean,
): PlannerBackupV1 {
  if (planners.length === 0) throw new PlannerPersistenceError("EMPTY_BACKUP");
  if (
    planners.length > MAX_BACKUP_PLANNERS ||
    (scope === "single" && planners.length !== 1)
  ) {
    throw new PlannerPersistenceError("IMPORT_LIMIT_EXCEEDED");
  }
  const validated = planners.map((planner) =>
    validatePersistedPlanner(planner, isSupportedTimeZone),
  );
  return Object.freeze({
    format: "shift-calendar-planner-backup",
    backupVersion: 1,
    product: "shift-calendar",
    exportedAt: validateTimestamp(exportedAt, "exportedAt"),
    scope,
    planners: Object.freeze(validated),
  });
}

export function serializePlannerBackup(backup: PlannerBackupV1): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function sanitizePlannerFilename(name: string): string {
  const normalized = name
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
  return truncateCodePoints(normalized, 48).replace(/-$/u, "") || "planner";
}

export function plannerBackupFilename(
  scope: "single" | "all",
  date: string,
  name?: string,
): string {
  return scope === "single"
    ? `shift-calendar-planner-${sanitizePlannerFilename(name ?? "planner")}-${date}.json`
    : `shift-calendar-backup-${date}.json`;
}

type DownloadEnvironment = {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly document: Document;
};

export function downloadPlannerBackup(
  content: string,
  filename: string,
  environment: DownloadEnvironment = {
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
    document,
  },
): void {
  const url = environment.createObjectURL(
    new Blob([content], { type: "application/json;charset=utf-8" }),
  );
  const anchor = environment.document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    environment.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    environment.revokeObjectURL(url);
  }
}
