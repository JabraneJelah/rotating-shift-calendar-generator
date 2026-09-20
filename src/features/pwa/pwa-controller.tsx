"use client";

import { Download, RefreshCw, WifiOff } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { canRegisterServiceWorker } from "./pwa-client";
import {
  isPlannerSafetyDetail,
  isUpdateChannelMessage,
  isWorkerServerMessage,
  PLANNER_SAFETY_EVENT,
  UPDATE_CHANNEL_NAME,
  type PlannerSafetyDetail,
  type WorkerClientMessage,
  type WorkerServerMessage,
} from "./pwa-protocol";

const APPLICATION_VERSION = "0.1.0";
const INSTALL_DISMISSAL_KEY = "shift-calendar-install-dismissed-at";
const INSTALL_DISMISSAL_MS = 90 * 24 * 60 * 60 * 1_000;

type BeforeInstallPromptEvent = Event & {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __SHIFT_CALENDAR_ENABLE_PWA_TEST__?: boolean;
  }
}

const DEFAULT_SAFETY: PlannerSafetyDetail = Object.freeze({
  safeToRefresh: true,
  pendingWrite: false,
  conflict: false,
  meaningfulUse: false,
});

function id(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requestWorker(
  worker: ServiceWorker,
  message: WorkerClientMessage,
  expectedType: WorkerServerMessage["type"],
  timeoutMs = 1_000,
): Promise<WorkerServerMessage> {
  return new Promise((resolve, reject) => {
    const requestId = "requestId" in message ? message.requestId : null;
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      reject(new Error("The service worker did not answer in time."));
    }, timeoutMs);
    function onMessage(event: MessageEvent<unknown>) {
      if (!isWorkerServerMessage(event.data)) return;
      if (event.data.type !== expectedType) return;
      if (requestId !== null && event.data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      resolve(event.data);
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    worker.postMessage(message);
  });
}

function installWasRecentlyDismissed(): boolean {
  try {
    const value = Number(window.localStorage.getItem(INSTALL_DISMISSAL_KEY));
    return Number.isFinite(value) && Date.now() - value < INSTALL_DISMISSAL_MS;
  } catch {
    return false;
  }
}

export const PwaController = memo(function PwaController() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }
  const supported = "serviceWorker" in navigator;
  const enabled = canRegisterServiceWorker({
    production: process.env.NODE_ENV === "production",
    secureContext: window.isSecureContext,
    supported,
    hostname: window.location.hostname,
    explicitTestOptIn: window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__ === true,
  });
  return enabled ? <PwaRuntime /> : null;
});

function PwaRuntime() {
  const [connectivity, setConnectivity] = useState<"offline" | "online" | null>(
    null,
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [meaningfulUse, setMeaningfulUse] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [waitingRelease, setWaitingRelease] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [activationPending, setActivationPending] = useState(false);
  const safetyRef = useRef<PlannerSafetyDetail>(DEFAULT_SAFETY);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(id());
  const statusCollectorsRef = useRef(
    new Map<string, Map<string, PlannerSafetyDetail>>(),
  );
  const activationRequestedRef = useRef(false);

  const inspectWaitingWorker = useCallback(async (worker: ServiceWorker) => {
    if (navigator.serviceWorker.controller === null) return;
    try {
      const requestId = id();
      const response = await requestWorker(
        worker,
        { type: "GET_RELEASE", requestId },
        "RELEASE_INFO",
      );
      if (response.type !== "RELEASE_INFO") return;
      setWaitingWorker(worker);
      setWaitingRelease(response.releaseId);
      setUpdateMessage(null);
    } catch {
      setUpdateMessage(
        "An application update was found, but its release information could not be verified.",
      );
    }
  }, []);

  useEffect(() => {
    const onSafety = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isPlannerSafetyDetail(detail)) return;
      safetyRef.current = detail;
      setMeaningfulUse(detail.meaningfulUse);
    };
    window.addEventListener(PLANNER_SAFETY_EVENT, onSafety);
    return () => window.removeEventListener(PLANNER_SAFETY_EVENT, onSafety);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
    channelRef.current = channel;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (!isUpdateChannelMessage(event.data)) return;
      if (
        event.data.type === "REQUEST_STATUS" &&
        event.data.senderTabId !== tabIdRef.current
      ) {
        const safety = safetyRef.current;
        channel.postMessage({
          type: "TAB_STATUS",
          requestId: event.data.requestId,
          tabId: tabIdRef.current,
          applicationVersion: APPLICATION_VERSION,
          safeToRefresh: safety.safeToRefresh,
          pendingWrite: safety.pendingWrite,
          conflict: safety.conflict,
        });
        return;
      }
      if (
        event.data.type === "TAB_STATUS" &&
        event.data.tabId !== tabIdRef.current
      ) {
        statusCollectorsRef.current.get(event.data.requestId)?.set(
          event.data.tabId,
          Object.freeze({
            safeToRefresh: event.data.safeToRefresh,
            pendingWrite: event.data.pendingWrite,
            conflict: event.data.conflict,
            meaningfulUse: true,
          }),
        );
      }
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onOffline = () => setConnectivity("offline");
    const onOnline = () => {
      setConnectivity("online");
      window.setTimeout(
        () => setConnectivity((value) => (value === "online" ? null : value)),
        5_000,
      );
    };
    const initialStatusTimer = window.setTimeout(() => {
      if (!navigator.onLine) setConnectivity("offline");
    }, 0);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(initialStatusTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!installWasRecentlyDismissed()) {
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const supported = "serviceWorker" in navigator;
    if (
      !canRegisterServiceWorker({
        production: process.env.NODE_ENV === "production",
        secureContext: window.isSecureContext,
        supported,
        hostname: window.location.hostname,
        explicitTestOptIn: window.__SHIFT_CALENDAR_ENABLE_PWA_TEST__ === true,
      })
    ) {
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    const watchInstalling = (worker: ServiceWorker | null) => {
      if (worker === null) return;
      const onStateChange = () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller !== null &&
          !disposed
        ) {
          void inspectWaitingWorker(worker);
        }
      };
      worker.addEventListener("statechange", onStateChange);
    };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;
        if (registration.waiting !== null) {
          await inspectWaitingWorker(registration.waiting);
        }
        watchInstalling(registration.installing);
        registration.addEventListener("updatefound", () =>
          watchInstalling(registration?.installing ?? null),
        );
      } catch {
        if (!disposed) {
          setUpdateMessage(
            "Offline support could not start. The website remains available normally.",
          );
        }
      }
    };
    const begin = () => void register();
    if (document.readyState === "complete") {
      window.setTimeout(begin, 0);
    } else {
      window.addEventListener("load", begin, { once: true });
    }
    const onControllerChange = () => {
      if (activationRequestedRef.current && safetyRef.current.safeToRefresh) {
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    return () => {
      disposed = true;
      window.removeEventListener("load", begin);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, [inspectWaitingWorker]);

  const activateUpdate = useCallback(async () => {
    if (waitingWorker === null || waitingRelease === null) return;
    const safety = safetyRef.current;
    if (!safety.safeToRefresh || safety.pendingWrite || safety.conflict) {
      setUpdateMessage(
        safety.conflict
          ? "Resolve the local planner conflict before updating."
          : "Wait until the planner is saved locally before updating.",
      );
      return;
    }

    setActivationPending(true);
    setUpdateMessage("Checking other Shift Calendar tabs…");
    try {
      let clientCount = 1;
      const controller = navigator.serviceWorker.controller;
      if (controller !== null) {
        const requestId = id();
        const response = await requestWorker(
          controller,
          { type: "QUERY_CLIENTS", requestId },
          "CLIENT_COUNT",
        );
        if (response.type === "CLIENT_COUNT") clientCount = response.count;
      }

      if (clientCount > 1) {
        const requestId = id();
        const statuses = new Map<string, PlannerSafetyDetail>();
        statusCollectorsRef.current.set(requestId, statuses);
        channelRef.current?.postMessage({
          type: "REQUEST_STATUS",
          requestId,
          senderTabId: tabIdRef.current,
        });
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        statusCollectorsRef.current.delete(requestId);
        if (
          statuses.size < clientCount - 1 ||
          [...statuses.values()].some(
            (value) =>
              !value.safeToRefresh || value.pendingWrite || value.conflict,
          )
        ) {
          setUpdateMessage(
            "Close other Shift Calendar tabs, or finish saving in them, before updating.",
          );
          return;
        }
      }

      activationRequestedRef.current = true;
      setUpdateMessage("Updating after your saved planner is protected…");
      waitingWorker.postMessage({
        type: "ACTIVATE_UPDATE",
        releaseId: waitingRelease,
      } satisfies WorkerClientMessage);
    } catch {
      setUpdateMessage(
        "The update could not be verified safely. Close other Shift Calendar tabs and try again.",
      );
    } finally {
      setActivationPending(false);
    }
  }, [waitingRelease, waitingWorker]);

  const runInstallPrompt = useCallback(async () => {
    if (installPrompt === null) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "dismissed") {
      try {
        window.localStorage.setItem(INSTALL_DISMISSAL_KEY, String(Date.now()));
      } catch {
        // Dismissal is a non-authoritative preference.
      }
    }
  }, [installPrompt]);

  const showInstall = meaningfulUse && installPrompt !== null;
  const showUpdate = waitingWorker !== null || updateMessage !== null;
  if (connectivity === null && !showInstall && !showUpdate) return null;

  return (
    <aside
      aria-label="Application status"
      className="pwa-status-panel print-hidden mx-auto w-full max-w-6xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8"
    >
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {connectivity === "offline" ? (
            <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <WifiOff aria-hidden="true" className="text-primary size-4" />
              Offline — saved planners remain available on this device.
            </p>
          ) : null}
          {connectivity === "online" ? (
            <p className="text-foreground text-sm font-semibold">
              Back online.
            </p>
          ) : null}
          {waitingWorker !== null ? (
            <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <RefreshCw aria-hidden="true" className="text-primary size-4" />
              Update available
            </p>
          ) : null}
          {updateMessage !== null ? (
            <p className="text-muted-foreground mt-1 text-sm" role="status">
              {updateMessage}
            </p>
          ) : null}
          {showInstall ? (
            <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <Download aria-hidden="true" className="text-primary size-4" />
              Install Shift Calendar for quicker access where supported.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {waitingWorker !== null ? (
            <>
              <Button
                disabled={activationPending}
                onClick={() => void activateUpdate()}
                type="button"
              >
                Update now
              </Button>
              <Button
                onClick={() => setUpdateMessage("Update postponed.")}
                type="button"
                variant="outline"
              >
                Later
              </Button>
            </>
          ) : null}
          {showInstall ? (
            <>
              <Button onClick={() => void runInstallPrompt()} type="button">
                Install Shift Calendar
              </Button>
              <Button
                onClick={() => {
                  setInstallPrompt(null);
                  try {
                    window.localStorage.setItem(
                      INSTALL_DISMISSAL_KEY,
                      String(Date.now()),
                    );
                  } catch {
                    // Dismissal is a non-authoritative preference.
                  }
                }}
                type="button"
                variant="outline"
              >
                Not now
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {connectivity === "offline"
          ? "You’re offline. Saved planners and cached features remain available."
          : connectivity === "online"
            ? "Connection restored."
            : (updateMessage ?? "")}
      </p>
    </aside>
  );
}
