import { describe, expect, it } from "vitest";

import {
  validateScheduleConfig,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import {
  validateDateExceptionCollection,
  validateShiftDefinitionRegistry,
  type DateException,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import {
  createImportReview,
  createPlannerBackup,
  migratePersistedPlanner,
  parsePlannerBackup,
  persistenceErrorMessage,
  plannerBackupFilename,
  PlannerPersistenceError,
  sanitizePlannerFilename,
  scanUntrustedValue,
  serializePlannerBackup,
  validatePersistedPlanner,
  type PersistedPlannerV1,
  type PersistenceErrorCode,
} from "@/features/schedule/persistence";

function domainFixture(): {
  readonly schedule: ScheduleConfig;
  readonly registry: ShiftDefinitionRegistry;
  readonly exceptions: readonly DateException[];
} {
  const schedule = validateScheduleConfig({
    kind: "preset",
    version: 1,
    presetId: "2-day-2-night-4-off",
    startDate: "2026-09-01",
  });
  const registry = validateShiftDefinitionRegistry({
    definitions: [
      {
        id: "builtin-day",
        name: "Day shift",
        shortLabel: "D",
        category: "day",
        color: "amber",
        startTime: "07:00",
        endTime: "19:00",
        breakMinutes: 30,
      },
      {
        id: "builtin-night",
        name: "Night shift",
        shortLabel: "N",
        category: "night",
        color: "indigo",
        startTime: "19:00",
        endTime: "07:00",
        breakMinutes: 30,
      },
    ],
    dayDefinitionId: "builtin-day",
    nightDefinitionId: "builtin-night",
  });
  if (!schedule.ok || !registry.ok) throw new Error("fixture");
  const exceptions = validateDateExceptionCollection(
    [
      {
        id: "exception-2026-09-03",
        date: "2026-09-03",
        primary: { type: "training", definitionId: "builtin-day" },
        additionalWork: { definitionId: "builtin-night" },
        note: "Fictional note",
      },
    ],
    registry.value,
  );
  if (!exceptions.ok) throw new Error("fixture");
  return {
    schedule: schedule.value,
    registry: registry.value,
    exceptions: exceptions.value,
  };
}

function planner(
  overrides: Partial<PersistedPlannerV1> = {},
): PersistedPlannerV1 {
  const fixture = domainFixture();
  return {
    schemaVersion: 1,
    domainVersion: 1,
    id: "6ac1a6a8-1bf2-4a57-9a85-7e29c43e64c1",
    revision: 3,
    name: "Fictional Rotation",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-18T11:45:00.000Z",
    schedule: fixture.schedule,
    weekStart: "monday",
    shiftDefinitions: fixture.registry,
    exceptions: fixture.exceptions,
    timeZone: "Africa/Casablanca",
    ...overrides,
  };
}

function captureError(action: () => unknown): PlannerPersistenceError {
  try {
    action();
  } catch (error) {
    if (error instanceof PlannerPersistenceError) return error;
    throw error;
  }
  throw new Error("Expected persistence error");
}

describe("planner persistence validation", () => {
  it("round-trips the authoritative aggregate and nested validated time details", () => {
    const result = validatePersistedPlanner(
      JSON.parse(JSON.stringify(planner())) as unknown,
      (zone) => zone === "Africa/Casablanca",
    );
    expect(result.shiftDefinitions.definitions[0]?.time).toEqual({
      startTime: "07:00",
      endTime: "19:00",
      is24Hours: false,
      breakMinutes: 30,
    });
    expect(result.exceptions[0]?.note).toBe("Fictional note");
  });

  it("rejects invalid timezone, unknown fields, bad revisions, and future versions", () => {
    expect(
      captureError(() => validatePersistedPlanner(planner(), () => false)).code,
    ).toBe("INVALID_PLANNER");
    expect(
      captureError(() =>
        validatePersistedPlanner({ ...planner(), revision: 0 }, () => true),
      ).code,
    ).toBe("INVALID_PLANNER");
    expect(
      captureError(() =>
        validatePersistedPlanner(
          { ...planner(), unexpected: true },
          () => true,
        ),
      ).code,
    ).toBe("INVALID_PLANNER");
    expect(
      captureError(() =>
        migratePersistedPlanner({ ...planner(), schemaVersion: 2 }, () => true),
      ).code,
    ).toBe("UNSUPPORTED_PLANNER_VERSION");
  });

  it("rejects unsafe keys, excessive depth, and aggregate strings", () => {
    const unsafe = JSON.parse(
      '{"safe":true,"__proto__":{"polluted":true}}',
    ) as unknown;
    expect(captureError(() => scanUntrustedValue(unsafe)).code).toBe(
      "INVALID_BACKUP",
    );
    let deep: unknown = "end";
    for (let index = 0; index < 13; index += 1) deep = [deep];
    expect(captureError(() => scanUntrustedValue(deep)).code).toBe(
      "INVALID_BACKUP",
    );
    expect(
      captureError(() => scanUntrustedValue("a".repeat(1_000_001))).code,
    ).toBe("INVALID_BACKUP");
  });
});

describe("planner JSON backup", () => {
  it("serializes and parses a strict single-planner backup", () => {
    const backup = createPlannerBackup(
      [planner()],
      "single",
      "2026-09-18T12:00:00.000Z",
      () => true,
    );
    const text = serializePlannerBackup(backup);
    const parsed = parsePlannerBackup(text, () => true);
    expect(parsed).toEqual(backup);
    expect(text).toMatch(/^\{\n/);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("rejects empty, mixed-invalid, duplicate, and unsupported backups atomically", () => {
    const base = createPlannerBackup(
      [planner()],
      "single",
      "2026-09-18T12:00:00.000Z",
      () => true,
    );
    expect(
      captureError(() =>
        parsePlannerBackup(
          JSON.stringify({ ...base, backupVersion: 2 }),
          () => true,
        ),
      ).code,
    ).toBe("UNSUPPORTED_BACKUP_VERSION");
    expect(
      captureError(() =>
        parsePlannerBackup(
          JSON.stringify({ ...base, scope: "all", planners: [] }),
          () => true,
        ),
      ).code,
    ).toBe("EMPTY_BACKUP");
    expect(
      captureError(() =>
        parsePlannerBackup(
          JSON.stringify({
            ...base,
            scope: "all",
            planners: [planner(), planner()],
          }),
          () => true,
        ),
      ).code,
    ).toBe("INVALID_BACKUP");
    expect(
      captureError(() =>
        parsePlannerBackup(
          JSON.stringify({
            ...base,
            scope: "all",
            planners: [planner(), { ...planner(), id: "invalid" }],
          }),
          () => true,
        ),
      ).code,
    ).toBe("INVALID_BACKUP");
  });

  it("plans deterministic import-as-new names without changing nested IDs", () => {
    const backup = createPlannerBackup(
      [planner()],
      "single",
      "2026-09-18T12:00:00.000Z",
      () => true,
    );
    const review = createImportReview(backup, ["fictional rotation"]);
    expect(review.planners[0]?.proposedName).toBe(
      "Fictional Rotation (imported)",
    );
    expect(review.planners[0]?.source.shiftDefinitions.dayDefinitionId).toBe(
      "builtin-day",
    );
  });

  it("sanitizes deterministic filenames", () => {
    expect(sanitizePlannerFilename("  /Night \\ Team:*?  ")).toBe("night-team");
    expect(sanitizePlannerFilename("勤務表")).toBe("planner");
    expect(plannerBackupFilename("single", "2026-09-18", "Night Team")).toBe(
      "shift-calendar-planner-night-team-2026-09-18.json",
    );
    expect(plannerBackupFilename("all", "2026-09-18")).toBe(
      "shift-calendar-backup-2026-09-18.json",
    );
  });
});

describe("persistence error messages", () => {
  it("maps every stable code to non-technical copy", () => {
    const codes: readonly PersistenceErrorCode[] = [
      "STORAGE_UNAVAILABLE",
      "STORAGE_BLOCKED",
      "STORAGE_OPEN_FAILED",
      "QUOTA_EXCEEDED",
      "TRANSACTION_ABORTED",
      "PLANNER_NOT_FOUND",
      "PLANNER_REVISION_CONFLICT",
      "PLANNER_NAME_CONFLICT",
      "PLANNER_LIMIT_EXCEEDED",
      "INVALID_PLANNER_NAME",
      "INVALID_PLANNER",
      "CORRUPT_RECORD",
      "UNSUPPORTED_PLANNER_VERSION",
      "UNSUPPORTED_DOMAIN_VERSION",
      "INVALID_BACKUP",
      "EMPTY_BACKUP",
      "BACKUP_TOO_LARGE",
      "UNSUPPORTED_BACKUP_VERSION",
      "IMPORT_LIMIT_EXCEEDED",
      "FILE_READ_FAILED",
      "VERSION_CHANGE_REQUIRED",
    ];
    for (const code of codes) {
      expect(
        persistenceErrorMessage(new PlannerPersistenceError(code)),
      ).not.toContain(code);
    }
  });
});
