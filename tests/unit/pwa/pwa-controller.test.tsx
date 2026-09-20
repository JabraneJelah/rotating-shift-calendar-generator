import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PwaController } from "@/features/pwa";
import {
  PLANNER_SAFETY_EVENT,
  type PlannerSafetyDetail,
} from "@/features/pwa/pwa-protocol";

describe("PWA application status", () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(
    navigator,
    "serviceWorker",
  );
  const originalSecureContext = Object.getOwnPropertyDescriptor(
    window,
    "isSecureContext",
  );

  beforeEach(() => {
    window.localStorage.clear();
    window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__ = true;
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    if (!("serviceWorker" in navigator)) {
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: Object.assign(new EventTarget(), {
          controller: null,
          register: vi.fn(async () =>
            Object.assign(new EventTarget(), {
              waiting: null,
              installing: null,
            }),
          ),
        }),
      });
    }
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__;
    if (originalServiceWorker === undefined) {
      Reflect.deleteProperty(navigator, "serviceWorker");
    } else {
      Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
    }
    if (originalSecureContext === undefined) {
      Reflect.deleteProperty(window, "isSecureContext");
    } else {
      Object.defineProperty(window, "isSecureContext", originalSecureContext);
    }
  });

  function installWorkerHarness(clientCount = 1) {
    const container = new EventTarget() as EventTarget & {
      controller: ServiceWorker;
      register: ReturnType<typeof vi.fn>;
    };
    const waitingPostMessage = vi.fn((message: Record<string, unknown>) => {
      if (message.type === "GET_RELEASE") {
        queueMicrotask(() =>
          container.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "RELEASE_INFO",
                requestId: message.requestId,
                releaseId: "release-b",
              },
            }),
          ),
        );
      }
    });
    const controllerPostMessage = vi.fn((message: Record<string, unknown>) => {
      if (message.type === "QUERY_CLIENTS") {
        queueMicrotask(() =>
          container.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "CLIENT_COUNT",
                requestId: message.requestId,
                releaseId: "release-a",
                count: clientCount,
              },
            }),
          ),
        );
      }
    });
    const waiting = Object.assign(new EventTarget(), {
      state: "installed",
      postMessage: waitingPostMessage,
    }) as unknown as ServiceWorker;
    container.controller = Object.assign(new EventTarget(), {
      state: "activated",
      postMessage: controllerPostMessage,
    }) as unknown as ServiceWorker;
    container.register = vi.fn(async () =>
      Object.assign(new EventTarget(), {
        waiting,
        installing: null,
      }),
    );
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: container,
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__ = true;
    return { waitingPostMessage };
  }

  function publishSafety(safety: Partial<PlannerSafetyDetail> = {}) {
    window.dispatchEvent(
      new CustomEvent(PLANNER_SAFETY_EVENT, {
        detail: {
          safeToRefresh: true,
          pendingWrite: false,
          conflict: false,
          meaningfulUse: true,
          ...safety,
        },
      }),
    );
  }

  it("announces offline and restored connectivity without blocking the page", () => {
    vi.useFakeTimers();
    render(<PwaController />);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(
      screen.getByText(
        "Offline — saved planners remain available on this device.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "You’re offline. Saved planners and cached features remain available.",
      ),
    ).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.getByText("Back online.")).toBeVisible();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByText("Back online.")).not.toBeInTheDocument();
  });

  it("shows a restrained install action only after meaningful use", async () => {
    const prompt = vi.fn(async () => undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: prompt },
      userChoice: { value: Promise.resolve({ outcome: "accepted" }) },
    });
    render(<PwaController />);
    act(() => window.dispatchEvent(event));
    expect(
      screen.queryByRole("button", { name: "Install Shift Calendar" }),
    ).not.toBeInTheDocument();

    act(() =>
      window.dispatchEvent(
        new CustomEvent(PLANNER_SAFETY_EVENT, {
          detail: {
            safeToRefresh: true,
            pendingWrite: false,
            conflict: false,
            meaningfulUse: true,
          },
        }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Install Shift Calendar" }),
    );
    expect(prompt).toHaveBeenCalledOnce();
  });

  it("remembers install dismissal as non-authoritative UI state", () => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: vi.fn(async () => undefined) },
      userChoice: { value: Promise.resolve({ outcome: "dismissed" }) },
    });
    render(<PwaController />);
    act(() => {
      window.dispatchEvent(event);
      window.dispatchEvent(
        new CustomEvent(PLANNER_SAFETY_EVENT, {
          detail: {
            safeToRefresh: true,
            pendingWrite: false,
            conflict: false,
            meaningfulUse: true,
          },
        }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(
      window.localStorage.getItem("shift-calendar-install-dismissed-at"),
    ).not.toBeNull();
  });

  it("offers a verified waiting update and allows postponement", async () => {
    installWorkerHarness();
    render(<PwaController />);
    expect(await screen.findByText("Update available")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.getByRole("status")).toHaveTextContent("Update postponed.");
  });

  it("blocks activation while the current planner is unsafe", async () => {
    const harness = installWorkerHarness();
    render(<PwaController />);
    expect(await screen.findByText("Update available")).toBeVisible();
    act(() => publishSafety({ safeToRefresh: false, pendingWrite: true }));
    fireEvent.click(screen.getByRole("button", { name: "Update now" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Wait until the planner is saved locally before updating.",
    );
    expect(harness.waitingPostMessage).not.toHaveBeenCalledWith({
      type: "ACTIVATE_UPDATE",
      releaseId: "release-b",
    });
  });

  it("activates a verified update only when the current tab is safe", async () => {
    const harness = installWorkerHarness();
    render(<PwaController />);
    expect(await screen.findByText("Update available")).toBeVisible();
    act(() => publishSafety());
    fireEvent.click(screen.getByRole("button", { name: "Update now" }));
    await waitFor(() =>
      expect(harness.waitingPostMessage).toHaveBeenCalledWith({
        type: "ACTIVATE_UPDATE",
        releaseId: "release-b",
      }),
    );
  });

  it("blocks activation when another controlled tab does not answer", async () => {
    const harness = installWorkerHarness(2);
    render(<PwaController />);
    expect(await screen.findByText("Update available")).toBeVisible();
    act(() => publishSafety());
    fireEvent.click(screen.getByRole("button", { name: "Update now" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Close other Shift Calendar tabs, or finish saving in them, before updating.",
      ),
    );
    expect(harness.waitingPostMessage).not.toHaveBeenCalledWith({
      type: "ACTIVATE_UPDATE",
      releaseId: "release-b",
    });
  });
});
