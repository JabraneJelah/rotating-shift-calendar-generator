"use client";

import {
  normalizePlannerName,
  plannerNameKey,
  scanUntrustedValue,
  storedRecordFromPlanner,
  validatePersistedPlanner,
  validatePlannerContent,
  validatePlannerId,
  validateStoredPlanner,
} from "./persistence-validation";
import {
  MAX_SAVED_PLANNERS,
  PlannerPersistenceError,
  type ImportReview,
  type PersistedPlannerV1,
  type PlannerContent,
  type PlannerSummary,
  type StorageEventMessage,
  type StoredPlannerRecordV1,
} from "./persistence-types";

const DATABASE_NAME = "shift-calendar-local";
const DATABASE_VERSION = 1;
const PLANNERS_STORE = "planners";
const META_STORE = "meta";
const LAST_OPENED_KEY = "lastOpenedPlannerId";
const CHANNEL_NAME = "shift-calendar-planners";

type RepositoryOptions = {
  readonly now?: () => Date;
  readonly generateId?: () => string;
  readonly onBlocked?: () => void;
  readonly onVersionChange?: () => void;
  readonly onConnectionClose?: () => void;
  readonly onExternalChange?: (message: StorageEventMessage) => void;
};

type MetaRecord = { readonly key: string; readonly value: string };

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), {
      once: true,
    });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ??
            new PlannerPersistenceError("TRANSACTION_ABORTED"),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(
          transaction.error ??
            new PlannerPersistenceError("TRANSACTION_ABORTED"),
        ),
      { once: true },
    );
  });
}

function mapStorageError(error: unknown): PlannerPersistenceError {
  if (error instanceof PlannerPersistenceError) return error;
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError")
      return new PlannerPersistenceError("QUOTA_EXCEEDED");
    if (error.name === "ConstraintError")
      return new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
    if (error.name === "NotFoundError")
      return new PlannerPersistenceError("PLANNER_NOT_FOUND");
  }
  return new PlannerPersistenceError("TRANSACTION_ABORTED");
}

function abortQuietly(transaction: IDBTransaction): void {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have completed or aborted.
  }
}

function summary(planner: PersistedPlannerV1): PlannerSummary {
  return Object.freeze({
    id: planner.id,
    name: planner.name,
    revision: planner.revision,
    createdAt: planner.createdAt,
    updatedAt: planner.updatedAt,
  });
}

function portablePlanner(stored: StoredPlannerRecordV1): PersistedPlannerV1 {
  return Object.freeze({
    schemaVersion: stored.schemaVersion,
    domainVersion: stored.domainVersion,
    id: stored.id,
    revision: stored.revision,
    name: stored.name,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    schedule: stored.schedule,
    weekStart: stored.weekStart,
    shiftDefinitions: stored.shiftDefinitions,
    exceptions: stored.exceptions,
    ...(stored.timeZone === undefined ? {} : { timeZone: stored.timeZone }),
  });
}

export class IndexedDBPlannerRepository {
  private readonly options: RepositoryOptions;
  private connectionPromise: Promise<IDBDatabase> | null = null;
  private channel: BroadcastChannel | null = null;
  private supportedTimeZones: ReadonlySet<string> | null = null;
  private closed = false;

  constructor(options: RepositoryOptions = {}) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    const database = await this.database();
    if (this.closed) {
      database.close();
      return;
    }
    if (this.channel === null && typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener(
        "message",
        (event: MessageEvent<unknown>) => {
          const value = event.data;
          if (
            typeof value === "object" &&
            value !== null &&
            "action" in value &&
            "plannerId" in value &&
            "revision" in value &&
            typeof value.plannerId === "string" &&
            typeof value.revision === "number" &&
            (value.action === "created" ||
              value.action === "updated" ||
              value.action === "renamed" ||
              value.action === "deleted" ||
              value.action === "imported")
          ) {
            this.options.onExternalChange?.(value as StorageEventMessage);
          }
        },
      );
    }
  }

  private database(): Promise<IDBDatabase> {
    if (this.connectionPromise !== null) return this.connectionPromise;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new PlannerPersistenceError("STORAGE_UNAVAILABLE"));
    }
    this.connectionPromise = new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      } catch {
        reject(new PlannerPersistenceError("STORAGE_OPEN_FAILED"));
        return;
      }
      request.addEventListener("upgradeneeded", () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PLANNERS_STORE)) {
          const planners = database.createObjectStore(PLANNERS_STORE, {
            keyPath: "id",
          });
          planners.createIndex("byNameKey", "nameKey", { unique: true });
          planners.createIndex("byUpdatedAt", "updatedAt");
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: "key" });
        }
      });
      request.addEventListener("blocked", () => this.options.onBlocked?.());
      request.addEventListener(
        "error",
        () => {
          this.connectionPromise = null;
          reject(new PlannerPersistenceError("STORAGE_OPEN_FAILED"));
        },
        { once: true },
      );
      request.addEventListener(
        "success",
        () => {
          const database = request.result;
          let versionChangeClose = false;
          database.addEventListener("versionchange", () => {
            versionChangeClose = true;
            database.close();
            this.connectionPromise = null;
            this.options.onVersionChange?.();
          });
          database.addEventListener("close", () => {
            this.connectionPromise = null;
            if (!versionChangeClose) this.options.onConnectionClose?.();
          });
          resolve(database);
        },
        { once: true },
      );
    });
    return this.connectionPromise;
  }

  private async loadTimeZones(): Promise<ReadonlySet<string>> {
    if (this.supportedTimeZones !== null) return this.supportedTimeZones;
    const runtime =
      await import("@/features/schedule/export/timed-export-runtime");
    const result = await runtime.loadTimeZoneSupport();
    if (!result.ok)
      throw new PlannerPersistenceError("INVALID_PLANNER", "timeZone");
    this.supportedTimeZones = new Set(result.value.timeZones);
    return this.supportedTimeZones;
  }

  async timeZoneSet(): Promise<ReadonlySet<string>> {
    return this.loadTimeZones();
  }

  private async validateUnknown(value: unknown): Promise<PersistedPlannerV1> {
    try {
      scanUntrustedValue(value);
      let stored = validateStoredPlanner(value, () => true);
      if (stored.timeZone !== undefined) {
        const zones = await this.loadTimeZones();
        stored = validateStoredPlanner(value, (zone) => zones.has(zone));
      }
      return portablePlanner(stored);
    } catch (error) {
      if (
        error instanceof PlannerPersistenceError &&
        (error.code === "UNSUPPORTED_PLANNER_VERSION" ||
          error.code === "UNSUPPORTED_DOMAIN_VERSION")
      ) {
        throw error;
      }
      throw new PlannerPersistenceError("CORRUPT_RECORD");
    }
  }

  private validateStoredSync(value: unknown): PersistedPlannerV1 {
    scanUntrustedValue(value);
    const stored = validateStoredPlanner(
      value,
      (zone) => this.supportedTimeZones?.has(zone) ?? false,
    );
    return portablePlanner(stored);
  }

  private async validateContent(
    content: PlannerContent,
  ): Promise<PlannerContent> {
    if (content.timeZone === undefined)
      return validatePlannerContent(content, () => false);
    const zones = await this.loadTimeZones();
    return validatePlannerContent(content, (zone) => zones.has(zone));
  }

  private timestamp(): string {
    return (this.options.now?.() ?? new Date()).toISOString();
  }

  private id(): string {
    return this.options.generateId?.() ?? crypto.randomUUID();
  }

  private broadcast(message: StorageEventMessage): void {
    this.channel?.postMessage(message);
  }

  async list(): Promise<readonly PlannerSummary[]> {
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readonly");
    const request = transaction.objectStore(PLANNERS_STORE).getAll();
    const raw = await requestResult(request);
    await transactionComplete(transaction);
    const planners: PersistedPlannerV1[] = [];
    for (const value of raw) {
      try {
        planners.push(await this.validateUnknown(value));
      } catch (error) {
        if (
          error instanceof PlannerPersistenceError &&
          (error.code === "CORRUPT_RECORD" ||
            error.code === "UNSUPPORTED_PLANNER_VERSION" ||
            error.code === "UNSUPPORTED_DOMAIN_VERSION")
        ) {
          continue;
        }
        throw error;
      }
    }
    return Object.freeze(
      planners
        .sort(
          (left, right) =>
            right.updatedAt.localeCompare(left.updatedAt) ||
            left.name.localeCompare(right.name),
        )
        .map(summary),
    );
  }

  async get(id: string): Promise<PersistedPlannerV1> {
    validatePlannerId(id);
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readonly");
    const raw = await requestResult(
      transaction.objectStore(PLANNERS_STORE).get(id),
    );
    await transactionComplete(transaction);
    if (raw === undefined)
      throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
    return this.validateUnknown(raw);
  }

  async create(
    nameValue: string,
    contentValue: PlannerContent,
  ): Promise<PersistedPlannerV1> {
    const name = normalizePlannerName(nameValue);
    const content = await this.validateContent(contentValue);
    const timestamp = this.timestamp();
    const planner = validatePersistedPlanner(
      {
        schemaVersion: 1,
        domainVersion: 1,
        id: this.id(),
        revision: 1,
        name,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...content,
      },
      (zone) => this.supportedTimeZones?.has(zone) ?? false,
    );
    const record = storedRecordFromPlanner(planner);
    const database = await this.database();
    const transaction = database.transaction(
      [PLANNERS_STORE, META_STORE],
      "readwrite",
    );
    try {
      const planners = transaction.objectStore(PLANNERS_STORE);
      const count = await requestResult(planners.count());
      if (count >= MAX_SAVED_PLANNERS)
        throw new PlannerPersistenceError("PLANNER_LIMIT_EXCEEDED");
      const existingName = await requestResult(
        planners.index("byNameKey").getKey(record.nameKey),
      );
      if (existingName !== undefined)
        throw new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
      planners.add(record);
      transaction
        .objectStore(META_STORE)
        .put({ key: LAST_OPENED_KEY, value: planner.id });
      await transactionComplete(transaction);
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
    this.broadcast({
      action: "created",
      plannerId: planner.id,
      revision: planner.revision,
    });
    return planner;
  }

  async update(
    id: string,
    expectedRevision: number,
    contentValue: PlannerContent,
  ): Promise<PersistedPlannerV1> {
    validatePlannerId(id);
    const content = await this.validateContent(contentValue);
    await this.get(id);
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readwrite");
    try {
      const store = transaction.objectStore(PLANNERS_STORE);
      const raw = await requestResult(store.get(id));
      if (raw === undefined)
        throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
      const current = this.validateStoredSync(raw);
      if (current.revision !== expectedRevision) {
        throw new PlannerPersistenceError("PLANNER_REVISION_CONFLICT");
      }
      const next = validatePersistedPlanner(
        {
          ...current,
          ...content,
          revision: current.revision + 1,
          updatedAt: this.timestamp(),
        },
        (zone) => this.supportedTimeZones?.has(zone) ?? false,
      );
      store.put(storedRecordFromPlanner(next));
      await transactionComplete(transaction);
      this.broadcast({
        action: "updated",
        plannerId: next.id,
        revision: next.revision,
      });
      return next;
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
  }

  async rename(
    id: string,
    nameValue: string,
    expectedRevision: number,
  ): Promise<PersistedPlannerV1> {
    const name = normalizePlannerName(nameValue);
    await this.get(id);
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readwrite");
    try {
      const store = transaction.objectStore(PLANNERS_STORE);
      const raw = await requestResult(store.get(id));
      if (raw === undefined)
        throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
      const current = this.validateStoredSync(raw);
      if (current.revision !== expectedRevision)
        throw new PlannerPersistenceError("PLANNER_REVISION_CONFLICT");
      const nameKey = plannerNameKey(name);
      const duplicate = await requestResult(
        store.index("byNameKey").getKey(nameKey),
      );
      if (duplicate !== undefined && duplicate !== id)
        throw new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
      const next = Object.freeze({
        ...current,
        name,
        revision: current.revision + 1,
        updatedAt: this.timestamp(),
      });
      store.put(storedRecordFromPlanner(next));
      await transactionComplete(transaction);
      this.broadcast({
        action: "renamed",
        plannerId: next.id,
        revision: next.revision,
      });
      return next;
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
  }

  async duplicate(id: string, nameValue: string): Promise<PersistedPlannerV1> {
    const source = await this.get(id);
    const name = normalizePlannerName(nameValue);
    const timestamp = this.timestamp();
    const duplicate = validatePersistedPlanner(
      {
        ...source,
        id: this.id(),
        revision: 1,
        name,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      (zone) => this.supportedTimeZones?.has(zone) ?? false,
    );
    const record = storedRecordFromPlanner(duplicate);
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readwrite");
    try {
      const store = transaction.objectStore(PLANNERS_STORE);
      const count = await requestResult(store.count());
      if (count >= MAX_SAVED_PLANNERS) {
        throw new PlannerPersistenceError("PLANNER_LIMIT_EXCEEDED");
      }
      const existingName = await requestResult(
        store.index("byNameKey").getKey(record.nameKey),
      );
      if (existingName !== undefined) {
        throw new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
      }
      store.add(record);
      await transactionComplete(transaction);
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
    this.broadcast({
      action: "created",
      plannerId: duplicate.id,
      revision: duplicate.revision,
    });
    return duplicate;
  }

  async delete(id: string, expectedRevision?: number): Promise<void> {
    validatePlannerId(id);
    await this.get(id);
    const database = await this.database();
    const transaction = database.transaction(
      [PLANNERS_STORE, META_STORE],
      "readwrite",
    );
    try {
      const planners = transaction.objectStore(PLANNERS_STORE);
      const raw = await requestResult(planners.get(id));
      if (raw === undefined)
        throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
      const current = this.validateStoredSync(raw);
      if (
        expectedRevision !== undefined &&
        current.revision !== expectedRevision
      ) {
        throw new PlannerPersistenceError("PLANNER_REVISION_CONFLICT");
      }
      planners.delete(id);
      const meta = transaction.objectStore(META_STORE);
      const pointer = (await requestResult(meta.get(LAST_OPENED_KEY))) as
        MetaRecord | undefined;
      if (pointer?.value === id) meta.delete(LAST_OPENED_KEY);
      await transactionComplete(transaction);
      this.broadcast({
        action: "deleted",
        plannerId: id,
        revision: current.revision,
      });
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
  }

  async getLastOpened(): Promise<string | null> {
    const database = await this.database();
    const transaction = database.transaction(META_STORE, "readonly");
    const value = (await requestResult(
      transaction.objectStore(META_STORE).get(LAST_OPENED_KEY),
    )) as MetaRecord | undefined;
    await transactionComplete(transaction);
    if (value === undefined) return null;
    try {
      return validatePlannerId(value.value, "lastOpenedPlannerId");
    } catch {
      await this.setLastOpened(null);
      return null;
    }
  }

  async setLastOpened(id: string | null): Promise<void> {
    if (id !== null) validatePlannerId(id);
    const database = await this.database();
    const transaction = database.transaction(META_STORE, "readwrite");
    const store = transaction.objectStore(META_STORE);
    if (id === null) store.delete(LAST_OPENED_KEY);
    else store.put({ key: LAST_OPENED_KEY, value: id });
    await transactionComplete(transaction).catch((error: unknown) => {
      throw mapStorageError(error);
    });
  }

  async importAsNew(
    review: ImportReview,
  ): Promise<readonly PersistedPlannerV1[]> {
    const zonesNeeded = review.planners.some(
      ({ source }) => source.timeZone !== undefined,
    );
    if (zonesNeeded) await this.loadTimeZones();
    const timestamp = this.timestamp();
    const records = review.planners.map(({ source, proposedName }) =>
      validatePersistedPlanner(
        {
          ...source,
          id: this.id(),
          revision: 1,
          name: proposedName,
          updatedAt: timestamp,
        },
        (zone) => this.supportedTimeZones?.has(zone) ?? false,
      ),
    );
    const database = await this.database();
    const transaction = database.transaction(PLANNERS_STORE, "readwrite");
    try {
      const store = transaction.objectStore(PLANNERS_STORE);
      const count = await requestResult(store.count());
      if (count + records.length > MAX_SAVED_PLANNERS) {
        throw new PlannerPersistenceError("IMPORT_LIMIT_EXCEEDED");
      }
      for (const record of records) {
        const duplicate = await requestResult(
          store.index("byNameKey").getKey(plannerNameKey(record.name)),
        );
        if (duplicate !== undefined)
          throw new PlannerPersistenceError("PLANNER_NAME_CONFLICT");
        store.add(storedRecordFromPlanner(record));
      }
      await transactionComplete(transaction);
    } catch (error) {
      abortQuietly(transaction);
      throw mapStorageError(error);
    }
    records.forEach((record) =>
      this.broadcast({
        action: "imported",
        plannerId: record.id,
        revision: record.revision,
      }),
    );
    return Object.freeze(records);
  }

  close(): void {
    this.closed = true;
    this.channel?.close();
    this.channel = null;
    void this.connectionPromise?.then((database) => database.close());
    this.connectionPromise = null;
  }
}
