import {
  isPlainRecord,
  validatePersistedPlanner,
} from "./persistence-validation";
import {
  PlannerPersistenceError,
  type PersistedPlannerV1,
} from "./persistence-types";

export function migratePersistedPlanner(
  value: unknown,
  isSupportedTimeZone: (value: string) => boolean,
): PersistedPlannerV1 {
  if (!isPlainRecord(value) || typeof value.schemaVersion !== "number") {
    throw new PlannerPersistenceError("CORRUPT_RECORD", "schemaVersion");
  }
  if (value.schemaVersion !== 1) {
    throw new PlannerPersistenceError(
      "UNSUPPORTED_PLANNER_VERSION",
      "schemaVersion",
    );
  }
  return validatePersistedPlanner(value, isSupportedTimeZone);
}
