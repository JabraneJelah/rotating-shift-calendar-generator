import { PLANNER_SAFETY_EVENT, type PlannerSafetyDetail } from "./pwa-protocol";

export function publishPlannerSafety(detail: PlannerSafetyDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PlannerSafetyDetail>(PLANNER_SAFETY_EVENT, { detail }),
  );
}

export function canRegisterServiceWorker(input: {
  readonly production: boolean;
  readonly secureContext: boolean;
  readonly supported: boolean;
  readonly hostname: string;
  readonly explicitTestOptIn: boolean;
}): boolean {
  if (!input.secureContext || !input.supported) return false;
  if (input.production) return true;
  return (
    input.explicitTestOptIn &&
    (input.hostname === "localhost" || input.hostname === "127.0.0.1")
  );
}
