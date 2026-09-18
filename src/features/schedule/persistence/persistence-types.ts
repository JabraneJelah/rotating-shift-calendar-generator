import type { ScheduleConfig, WeekStart } from "@/features/schedule/domain";
import type {
  DateException,
  ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

export const PLANNER_SCHEMA_VERSION = 1;
export const PLANNER_DOMAIN_VERSION = 1;
export const BACKUP_FORMAT_VERSION = 1;
export const MAX_SAVED_PLANNERS = 20;
export const MAX_PLANNER_NAME_LENGTH = 60;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_PLANNERS = 20;
export const MAX_JSON_DEPTH = 12;
export const MAX_JSON_STRING_CODE_POINTS = 1_000_000;

export type PlannerContent = {
  readonly schedule: ScheduleConfig;
  readonly weekStart: WeekStart;
  readonly shiftDefinitions: ShiftDefinitionRegistry;
  readonly exceptions: readonly DateException[];
  readonly timeZone?: string;
};

export type PersistedPlannerV1 = PlannerContent & {
  readonly schemaVersion: 1;
  readonly domainVersion: 1;
  readonly id: string;
  readonly revision: number;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type StoredPlannerRecordV1 = PersistedPlannerV1 & {
  readonly nameKey: string;
};

export type PlannerSummary = Pick<
  PersistedPlannerV1,
  "id" | "name" | "revision" | "createdAt" | "updatedAt"
>;

export type PlannerBackupV1 = {
  readonly format: "shift-calendar-planner-backup";
  readonly backupVersion: 1;
  readonly product: "shift-calendar";
  readonly exportedAt: string;
  readonly scope: "single" | "all";
  readonly planners: readonly PersistedPlannerV1[];
};

export type ImportReviewPlanner = {
  readonly source: PersistedPlannerV1;
  readonly proposedName: string;
  readonly nameAdjusted: boolean;
};

export type ImportReview = {
  readonly exportedAt: string;
  readonly backupVersion: 1;
  readonly planners: readonly ImportReviewPlanner[];
};

export type PersistenceErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_BLOCKED"
  | "STORAGE_OPEN_FAILED"
  | "QUOTA_EXCEEDED"
  | "TRANSACTION_ABORTED"
  | "PLANNER_NOT_FOUND"
  | "PLANNER_REVISION_CONFLICT"
  | "PLANNER_NAME_CONFLICT"
  | "PLANNER_LIMIT_EXCEEDED"
  | "INVALID_PLANNER_NAME"
  | "INVALID_PLANNER"
  | "CORRUPT_RECORD"
  | "UNSUPPORTED_PLANNER_VERSION"
  | "UNSUPPORTED_DOMAIN_VERSION"
  | "INVALID_BACKUP"
  | "EMPTY_BACKUP"
  | "BACKUP_TOO_LARGE"
  | "UNSUPPORTED_BACKUP_VERSION"
  | "IMPORT_LIMIT_EXCEEDED"
  | "FILE_READ_FAILED"
  | "VERSION_CHANGE_REQUIRED";

export class PlannerPersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  readonly path?: string;

  constructor(code: PersistenceErrorCode, path?: string) {
    super(code);
    this.name = "PlannerPersistenceError";
    this.code = code;
    this.path = path;
  }
}

export type SaveState =
  "unsaved" | "saving" | "saved" | "failed" | "conflict" | "unavailable";

export type StorageEventMessage = {
  readonly action: "created" | "updated" | "renamed" | "deleted" | "imported";
  readonly plannerId: string;
  readonly revision: number;
};

export function persistenceErrorMessage(
  error: PlannerPersistenceError,
): string {
  switch (error.code) {
    case "STORAGE_UNAVAILABLE":
    case "STORAGE_OPEN_FAILED":
      return "Local saving is not available in this browser. You can keep using the generator.";
    case "STORAGE_BLOCKED":
      return "Close other Shift Calendar tabs to finish updating local storage.";
    case "QUOTA_EXCEEDED":
      return "Browser storage is full. Export a backup or delete a saved planner, then retry.";
    case "TRANSACTION_ABORTED":
      return "The local save did not finish. Your current planner is still open; try again.";
    case "PLANNER_NOT_FOUND":
      return "That saved planner is no longer available in this browser.";
    case "PLANNER_REVISION_CONFLICT":
      return "A newer saved version exists in another tab. Reload it or duplicate your current planner.";
    case "PLANNER_NAME_CONFLICT":
      return "Choose a different planner name.";
    case "PLANNER_LIMIT_EXCEEDED":
    case "IMPORT_LIMIT_EXCEEDED":
      return "This browser can keep up to 20 saved planners. Delete one or import fewer planners.";
    case "INVALID_PLANNER_NAME":
      return "Enter a planner name from 1 to 60 characters without control characters.";
    case "INVALID_PLANNER":
      return "The current planner could not be saved because its data is invalid.";
    case "CORRUPT_RECORD":
      return "This saved planner could not be opened because its local data is damaged.";
    case "UNSUPPORTED_PLANNER_VERSION":
    case "UNSUPPORTED_DOMAIN_VERSION":
      return "This planner was created by an unsupported Shift Calendar version.";
    case "INVALID_BACKUP":
      return "Choose a valid Shift Calendar JSON backup.";
    case "EMPTY_BACKUP":
      return "This backup does not contain any planners.";
    case "BACKUP_TOO_LARGE":
      return "The backup is larger than the 5 MiB import limit.";
    case "UNSUPPORTED_BACKUP_VERSION":
      return "This backup was created by an unsupported Shift Calendar version.";
    case "FILE_READ_FAILED":
      return "The selected backup could not be read. Choose the file again.";
    case "VERSION_CHANGE_REQUIRED":
      return "Local storage was updated in another tab. Reload this page before saving again.";
    default: {
      const exhaustive: never = error.code;
      return exhaustive;
    }
  }
}
