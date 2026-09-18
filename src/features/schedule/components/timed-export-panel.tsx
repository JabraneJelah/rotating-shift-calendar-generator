import { useEffect, useRef, useState } from "react";

import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ISOYearMonth, ScheduleConfig } from "@/features/schedule/domain";
import {
  downloadICSFile,
  formatICSUtcTimestamp,
} from "@/features/schedule/export";
import type { EffectiveScheduleDate } from "@/features/schedule/planner";
import type {
  TimedBoundaryIssue,
  TimedDisambiguation,
  TimedExportError,
  TimeZoneSupport,
} from "@/features/schedule/export/timed-export-types";

type TimedExportModule =
  typeof import("@/features/schedule/export/timed-export-runtime");

type TimedExportPanelProps = {
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
  readonly scope:
    | { readonly viewMonth: ISOYearMonth; readonly year?: never }
    | { readonly year: number; readonly viewMonth?: never };
  readonly onClose: () => void;
};

type PanelStatus = {
  readonly kind: "success" | "error";
  readonly message: string;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled timed export error: ${String(value)}`);
}

function errorMessage(error: TimedExportError): string {
  switch (error.code) {
    case "MISSING_TIME_ZONE":
      return "Choose and confirm an IANA time zone before exporting.";
    case "UNKNOWN_TIME_ZONE":
      return "Choose a time zone from the supported IANA identifier list.";
    case "UNSUPPORTED_TIMED_EXPORT_YEAR":
      return "Timed calendar export currently supports schedules from 1970 through 2037. You can still use the all-day calendar export for this date.";
    case "UNSUPPORTED_TIME_ZONE_RUNTIME":
      return "Timed export is not supported in this browser. The all-day export remains available.";
    case "NONEXISTENT_LOCAL_TIME":
      return "One or more shift times do not exist because the clocks move forward. Change the shift time or use the all-day export.";
    case "AMBIGUOUS_LOCAL_TIME":
      return "Choose the earlier or later occurrence for every repeated local time.";
    case "INVALID_TIMED_DEFINITION":
      return "One or more shift time definitions are invalid. Review Shift details and try again.";
    case "UNTIMED_WORK_OCCURRENCES":
      return `Timed export requires times for every included work occurrence. ${error.count ?? 0} occurrence${error.count === 1 ? " is" : "s are"} missing times. The all-day export remains available.`;
    case "DATE_OVERFLOW":
      return "A required end date could not be calculated for timed export.";
    case "TIME_ZONE_INITIALIZATION_FAILED":
      return "The verified timezone database could not be initialized. No calendar file was created.";
    case "TIME_ZONE_DATA_VERSION_MISMATCH":
      return "The embedded timezone database version did not match the verified release. No calendar file was created.";
    case "TIME_ZONE_CONVERSION_FAILED":
      return "A shift time could not be converted safely. No calendar file was created.";
    case "TIMED_ICS_SERIALIZATION_FAILED":
      return "The timed calendar file could not be created.";
    case "TIMED_ICS_DOWNLOAD_FAILED":
      return "The timed calendar file could not be downloaded. Try again.";
    default:
      return assertNever(error.code);
  }
}

function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const absolute = Math.abs(minutes);
  const hour = Math.floor(absolute / 60)
    .toString()
    .padStart(2, "0");
  const minute = (absolute % 60).toString().padStart(2, "0");
  return `UTC${sign}${hour}:${minute}`;
}

export function TimedExportPanel({
  config,
  dates,
  onClose,
  scope,
}: TimedExportPanelProps) {
  const [runtime, setRuntime] = useState<TimedExportModule | null>(null);
  const [support, setSupport] = useState<TimeZoneSupport | null>(null);
  const [timeZone, setTimeZone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PanelStatus | null>(null);
  const [error, setError] = useState<TimedExportError | null>(null);
  const [choices, setChoices] = useState<
    Readonly<Record<string, TimedDisambiguation | undefined>>
  >({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let current = true;

    async function load() {
      try {
        const loadedRuntime =
          await import("@/features/schedule/export/timed-export-runtime");
        const result = await loadedRuntime.loadTimeZoneSupport();
        if (!current) return;
        setRuntime(loadedRuntime);
        if (result.ok) {
          setSupport(result.value);
        } else {
          setError(result.error);
          setStatus({ kind: "error", message: errorMessage(result.error) });
        }
      } catch {
        if (!current) return;
        const loadError: TimedExportError = {
          code: "TIME_ZONE_INITIALIZATION_FAILED",
        };
        setError(loadError);
        setStatus({ kind: "error", message: errorMessage(loadError) });
      } finally {
        if (current) setLoading(false);
      }
    }

    void load();
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && support !== null) {
      inputRef.current?.focus();
    }
  }, [loading, support]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const ambiguityIssues =
    error?.code === "AMBIGUOUS_LOCAL_TIME" ? (error.boundaries ?? []) : [];
  const unresolvedAmbiguities = ambiguityIssues.filter(
    (issue) => choices[issue.key] === undefined,
  ).length;

  function changeTimeZone(value: string) {
    setTimeZone(value);
    setError(null);
    setChoices({});
    setStatus(null);
  }

  function choose(key: string, choice: TimedDisambiguation) {
    setChoices((current) => ({ ...current, [key]: choice }));
    setStatus(null);
  }

  function applyToAll(choice: TimedDisambiguation) {
    setChoices((current) => ({
      ...current,
      ...Object.fromEntries(
        ambiguityIssues.map((issue) => [issue.key, choice]),
      ),
    }));
    setStatus(null);
  }

  async function handleDownload() {
    if (runtime === null || support === null) return;
    setBusy(true);
    setStatus(null);

    const result = await runtime.createTimedExport({
      calendarName: "Shift Calendar — Timed Work",
      config,
      dates,
      generatedAt: formatICSUtcTimestamp(new Date()),
      timeZone,
      disambiguations: choices,
      ...(scope.year === undefined
        ? { viewMonth: scope.viewMonth }
        : { year: scope.year }),
    });

    if (!result.ok) {
      setError(result.error);
      setStatus({ kind: "error", message: errorMessage(result.error) });
      setBusy(false);
      return;
    }

    try {
      downloadICSFile(result.value);
      setError(null);
      setStatus({
        kind: "success",
        message: `Timed work calendar downloaded using ${timeZone}.`,
      });
    } catch {
      const downloadError: TimedExportError = {
        code: "TIMED_ICS_DOWNLOAD_FAILED",
      };
      setError(downloadError);
      setStatus({ kind: "error", message: errorMessage(downloadError) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-describedby="timed-export-description"
      aria-labelledby="timed-export-title"
      className="border-border bg-background mt-4 rounded-xl border p-4 shadow-sm"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="font-bold" id="timed-export-title">
            Export timed work calendar
          </h5>
          <p
            className="text-muted-foreground mt-1 text-sm leading-6"
            id="timed-export-description"
          >
            Choose the work timezone explicitly. Timed calendar files are
            created in your browser. Your schedule is not uploaded.
          </p>
        </div>
        <Button
          aria-label="Close timed export"
          onClick={onClose}
          className="size-11 px-0"
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm" role="status">
          Loading verified timezone data…
        </p>
      ) : support !== null ? (
        <>
          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="timed-timezone">
              Time zone
            </label>
            <p
              className="text-muted-foreground mt-1 text-xs"
              id="timezone-help"
            >
              Enter a supported IANA identifier, such as Africa/Casablanca.
              Nothing is selected automatically.
            </p>
            <input
              aria-describedby="timezone-help"
              aria-invalid={
                error?.code === "UNKNOWN_TIME_ZONE" ||
                error?.code === "MISSING_TIME_ZONE"
              }
              autoComplete="off"
              className="border-input bg-background focus-visible:ring-ring/45 mt-2 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
              id="timed-timezone"
              list="timed-timezone-options"
              onChange={(event) => changeTimeZone(event.currentTarget.value)}
              ref={inputRef}
              spellCheck={false}
              type="text"
              value={timeZone}
            />
            <datalist id="timed-timezone-options">
              {support.timeZones.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <p className="text-muted-foreground mt-2 text-xs">
              Verified embedded timezone data: IANA {support.activeIanaVersion}.
              Timed export supports occurrence dates from 1970 through 2037.
            </p>
          </div>

          {error?.code === "NONEXISTENT_LOCAL_TIME" ? (
            <BoundaryList issues={error.boundaries ?? []} />
          ) : null}

          {ambiguityIssues.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold">
                  {unresolvedAmbiguities} repeated time
                  {unresolvedAmbiguities === 1 ? " remains" : "s remain"}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => applyToAll("earlier")}
                    type="button"
                    variant="outline"
                  >
                    Use earlier for all
                  </Button>
                  <Button
                    onClick={() => applyToAll("later")}
                    type="button"
                    variant="outline"
                  >
                    Use later for all
                  </Button>
                </div>
              </div>
              {ambiguityIssues.map((issue, index) => (
                <AmbiguityChoice
                  choice={choices[issue.key]}
                  index={index}
                  issue={issue}
                  key={issue.key}
                  onChoose={(choice) => choose(issue.key, choice)}
                />
              ))}
            </div>
          ) : null}

          {error?.code === "UNTIMED_WORK_OCCURRENCES" && error.labels ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold">
                Review work without times
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {error.labels.slice(0, 20).map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={
                busy ||
                timeZone.trim() === "" ||
                (ambiguityIssues.length > 0 && unresolvedAmbiguities > 0)
              }
              onClick={() => void handleDownload()}
              type="button"
            >
              <Download aria-hidden="true" className="mr-2 size-4" />
              {busy ? "Preparing timed calendar…" : "Download timed calendar"}
            </Button>
            <Button onClick={onClose} type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </>
      ) : null}

      <div
        aria-live={status?.kind === "error" ? "assertive" : "polite"}
        className="mt-3 min-h-6 text-sm"
        role={status?.kind === "error" ? "alert" : "status"}
      >
        {status ? (
          <p
            className={
              status.kind === "error" ? "text-red-700" : "text-primary"
            }
          >
            {status.message}
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-2 text-xs leading-5">
        Off, Leave, Sick, and private notes are omitted. Use the existing
        all-day export when timed export is unavailable or incomplete.
      </p>
    </section>
  );
}

function BoundaryList({
  issues,
}: {
  readonly issues: readonly TimedBoundaryIssue[];
}) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {issues.map((issue) => (
        <li
          className="rounded-lg border border-red-200 bg-red-50 p-3"
          key={issue.key}
        >
          <strong>{issue.label}</strong> {issue.boundary} at {issue.time} on{" "}
          {issue.date} does not exist in {issue.timeZone} because the clocks
          move forward.
        </li>
      ))}
    </ul>
  );
}

function AmbiguityChoice({
  choice,
  index,
  issue,
  onChoose,
}: {
  readonly choice: TimedDisambiguation | undefined;
  readonly index: number;
  readonly issue: TimedBoundaryIssue;
  readonly onChoose: (choice: TimedDisambiguation) => void;
}) {
  const candidates = issue.candidates;
  if (candidates === undefined) return null;

  return (
    <fieldset className="border-border rounded-lg border p-3">
      <legend className="px-1 text-sm font-semibold">
        {issue.label} {issue.boundary}: {issue.date} at {issue.time} in{" "}
        {issue.timeZone}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {(["earlier", "later"] as const).map((value, candidateIndex) => {
          const candidate = candidates[candidateIndex];
          const id = `ambiguity-${index}-${value}`;
          return (
            <label
              className="border-border flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm"
              htmlFor={id}
              key={value}
            >
              <input
                checked={choice === value}
                id={id}
                name={`ambiguity-${index}`}
                onChange={() => onChoose(value)}
                type="radio"
                value={value}
              />
              <span>
                <strong className="capitalize">{value} occurrence</strong>
                <br />
                {offsetLabel(candidate.offsetMinutes)} · {candidate.utc}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
