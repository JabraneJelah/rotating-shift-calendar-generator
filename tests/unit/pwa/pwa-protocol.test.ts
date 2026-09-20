// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  isPlannerSafetyDetail,
  isUpdateChannelMessage,
  isWorkerServerMessage,
} from "@/features/pwa/pwa-protocol";

describe("PWA message validation", () => {
  it("accepts exact private-free planner safety state", () => {
    expect(
      isPlannerSafetyDetail({
        safeToRefresh: true,
        pendingWrite: false,
        conflict: false,
        meaningfulUse: true,
      }),
    ).toBe(true);
    expect(
      isPlannerSafetyDetail({
        safeToRefresh: true,
        pendingWrite: false,
        conflict: false,
        meaningfulUse: true,
        plannerName: "private",
      }),
    ).toBe(false);
  });

  it("rejects malformed or expanded cross-tab messages", () => {
    expect(
      isUpdateChannelMessage({
        type: "REQUEST_STATUS",
        requestId: "request",
        senderTabId: "tab",
      }),
    ).toBe(true);
    expect(
      isUpdateChannelMessage({
        type: "TAB_STATUS",
        requestId: "request",
        tabId: "tab",
        applicationVersion: "0.1.0",
        safeToRefresh: true,
        pendingWrite: false,
        conflict: false,
        note: "private",
      }),
    ).toBe(false);
  });

  it("validates exact worker response messages", () => {
    expect(
      isWorkerServerMessage({
        type: "RELEASE_INFO",
        requestId: "request",
        releaseId: "release",
      }),
    ).toBe(true);
    expect(
      isWorkerServerMessage({
        type: "CLIENT_COUNT",
        requestId: "request",
        releaseId: "release",
        count: 2,
      }),
    ).toBe(true);
    expect(
      isWorkerServerMessage({
        type: "CLIENT_COUNT",
        requestId: "request",
        releaseId: "release",
        count: -1,
      }),
    ).toBe(false);
  });
});
