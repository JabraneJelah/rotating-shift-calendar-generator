export const PLANNER_SAFETY_EVENT = "shift-calendar:pwa-safety";
export const UPDATE_CHANNEL_NAME = "shift-calendar-app-updates-v1";

export type PlannerSafetyDetail = {
  readonly safeToRefresh: boolean;
  readonly pendingWrite: boolean;
  readonly conflict: boolean;
  readonly meaningfulUse: boolean;
};

export type UpdateChannelMessage =
  | {
      readonly type: "REQUEST_STATUS";
      readonly requestId: string;
      readonly senderTabId: string;
    }
  | {
      readonly type: "TAB_STATUS";
      readonly requestId: string;
      readonly tabId: string;
      readonly applicationVersion: string;
      readonly safeToRefresh: boolean;
      readonly pendingWrite: boolean;
      readonly conflict: boolean;
    };

export type WorkerClientMessage =
  | {
      readonly type: "GET_RELEASE";
      readonly requestId: string;
    }
  | {
      readonly type: "QUERY_CLIENTS";
      readonly requestId: string;
    }
  | {
      readonly type: "ACTIVATE_UPDATE";
      readonly releaseId: string;
    };

export type WorkerServerMessage =
  | {
      readonly type: "RELEASE_INFO";
      readonly requestId: string;
      readonly releaseId: string;
    }
  | {
      readonly type: "CLIENT_COUNT";
      readonly requestId: string;
      readonly releaseId: string;
      readonly count: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === [...expected].sort()[index])
  );
}

export function isPlannerSafetyDetail(
  value: unknown,
): value is PlannerSafetyDetail {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "conflict",
      "meaningfulUse",
      "pendingWrite",
      "safeToRefresh",
    ]) &&
    typeof value.safeToRefresh === "boolean" &&
    typeof value.pendingWrite === "boolean" &&
    typeof value.conflict === "boolean" &&
    typeof value.meaningfulUse === "boolean"
  );
}

export function isUpdateChannelMessage(
  value: unknown,
): value is UpdateChannelMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "REQUEST_STATUS") {
    return (
      hasExactKeys(value, ["requestId", "senderTabId", "type"]) &&
      typeof value.requestId === "string" &&
      typeof value.senderTabId === "string"
    );
  }
  if (value.type === "TAB_STATUS") {
    return (
      hasExactKeys(value, [
        "applicationVersion",
        "conflict",
        "pendingWrite",
        "requestId",
        "safeToRefresh",
        "tabId",
        "type",
      ]) &&
      typeof value.requestId === "string" &&
      typeof value.tabId === "string" &&
      typeof value.applicationVersion === "string" &&
      typeof value.safeToRefresh === "boolean" &&
      typeof value.pendingWrite === "boolean" &&
      typeof value.conflict === "boolean"
    );
  }
  return false;
}

export function isWorkerServerMessage(
  value: unknown,
): value is WorkerServerMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "RELEASE_INFO") {
    return (
      hasExactKeys(value, ["releaseId", "requestId", "type"]) &&
      typeof value.requestId === "string" &&
      typeof value.releaseId === "string"
    );
  }
  if (value.type === "CLIENT_COUNT") {
    return (
      hasExactKeys(value, ["count", "releaseId", "requestId", "type"]) &&
      typeof value.requestId === "string" &&
      typeof value.releaseId === "string" &&
      Number.isSafeInteger(value.count) &&
      Number(value.count) >= 0
    );
  }
  return false;
}
