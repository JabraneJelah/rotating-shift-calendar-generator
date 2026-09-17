import { useEffect, useRef, useState } from "react";

import { Copy, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  serializeScheduleQuery,
  type ScheduleConfig,
  type WeekStart,
} from "@/features/schedule/domain";
import {
  downloadICSFile,
  formatICSUtcTimestamp,
  generateICS,
} from "@/features/schedule/export";
import type { MonthlyCalendarView } from "@/features/schedule/presentation/calendar-view";
import type { YearlyCalendarView } from "@/features/schedule/presentation/yearly-calendar-view";

type ScheduleActionsProps = {
  readonly config: ScheduleConfig;
  readonly view: MonthlyCalendarView;
  readonly yearlyView: YearlyCalendarView | null;
  readonly weekStart: WeekStart;
  readonly activeView: "month" | "year";
  readonly onPrint: () => void;
};

type ActionStatus = {
  readonly kind: "success" | "error";
  readonly message: string;
};

export function ScheduleActions({
  activeView,
  config,
  onPrint,
  view,
  yearlyView,
  weekStart,
}: ScheduleActionsProps) {
  const [status, setStatus] = useState<ActionStatus | null>(null);
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const statusTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (manualCopyUrl !== null) {
      fallbackInputRef.current?.select();
    }
  }, [manualCopyUrl]);

  function showTemporaryStatus(nextStatus: ActionStatus) {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }

    setStatus(nextStatus);
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, 5_000);
  }

  function canonicalScheduleUrl(): string | null {
    const queryResult = serializeScheduleQuery({
      config,
      viewMonth: view.viewMonth,
      weekStart,
    });

    if (!queryResult.ok) {
      return null;
    }

    return `${window.location.origin}${window.location.pathname}?${queryResult.value}`;
  }

  async function handleCopy() {
    const url = canonicalScheduleUrl();

    if (url === null) {
      showTemporaryStatus({
        kind: "error",
        message: "The schedule link could not be prepared.",
      });
      return;
    }

    try {
      if (navigator.clipboard?.writeText === undefined) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(url);
      setManualCopyUrl(null);
      showTemporaryStatus({
        kind: "success",
        message: "Schedule link copied.",
      });
    } catch {
      setManualCopyUrl(url);
      showTemporaryStatus({
        kind: "error",
        message: "Automatic copying was unavailable. Copy this link manually.",
      });
    }
  }

  function handleMonthDownload() {
    const result = generateICS({
      calendarName: "Shift Calendar",
      config,
      occurrences: view.occurrences,
      viewMonth: view.viewMonth,
      generatedAt: formatICSUtcTimestamp(new Date()),
    });

    if (!result.success) {
      showTemporaryStatus({
        kind: "error",
        message: "The calendar file could not be created. Try again.",
      });
      return;
    }

    try {
      downloadICSFile(result);
      showTemporaryStatus({
        kind: "success",
        message: `Calendar file downloaded for ${view.label}.`,
      });
    } catch {
      showTemporaryStatus({
        kind: "error",
        message: "The calendar file could not be downloaded. Try again.",
      });
    }
  }

  function handleYearDownload() {
    if (yearlyView === null) {
      showTemporaryStatus({
        kind: "error",
        message: "Open the year view before exporting a full year.",
      });
      return;
    }

    const result = generateICS({
      calendarName: "Shift Calendar",
      config,
      occurrences: yearlyView.occurrences,
      year: yearlyView.year,
      generatedAt: formatICSUtcTimestamp(new Date()),
    });

    if (!result.success) {
      showTemporaryStatus({
        kind: "error",
        message:
          "The full-year calendar file could not be created. Choose another supported year and try again.",
      });
      return;
    }

    try {
      downloadICSFile(result);
      showTemporaryStatus({
        kind: "success",
        message: `Calendar file downloaded for ${yearlyView.year}.`,
      });
    } catch {
      showTemporaryStatus({
        kind: "error",
        message: "The calendar file could not be downloaded. Try again.",
      });
    }
  }

  return (
    <section
      aria-labelledby="schedule-actions-heading"
      className="print-hidden border-border bg-muted/35 mt-5 rounded-xl border p-4"
    >
      <h4 className="text-sm font-bold" id="schedule-actions-heading">
        Share, export, or print
      </h4>
      <p className="text-muted-foreground mt-1 text-sm leading-6">
        Copy a restorable schedule link or export an all-day calendar file.
        Printing uses the active {activeView} view.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={handleCopy} type="button" variant="outline">
          <Copy aria-hidden="true" className="mr-2 size-4" />
          Copy schedule link
        </Button>
        <Button onClick={handleMonthDownload} type="button" variant="outline">
          <Download aria-hidden="true" className="mr-2 size-4" />
          Export this month (.ics)
        </Button>
        {activeView === "year" && yearlyView !== null ? (
          <Button onClick={handleYearDownload} type="button" variant="outline">
            <Download aria-hidden="true" className="mr-2 size-4" />
            Export this year (.ics)
          </Button>
        ) : null}
        <Button onClick={onPrint} type="button" variant="outline">
          <Printer aria-hidden="true" className="mr-2 size-4" />
          Print {activeView} view
        </Button>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-5">
        Importing the same file more than once may create duplicate events in
        some calendar applications.
      </p>

      <div className="mt-3 min-h-6 text-sm" aria-live="polite" role="status">
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

      {manualCopyUrl ? (
        <div className="mt-3">
          <label
            className="text-sm font-semibold"
            htmlFor="manual-schedule-link"
          >
            Schedule link for manual copying
          </label>
          <p className="text-muted-foreground mt-1 text-sm">
            Select and copy this link manually.
          </p>
          <input
            className="border-input bg-background focus-visible:ring-ring/45 mt-2 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
            id="manual-schedule-link"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            ref={fallbackInputRef}
            type="text"
            value={manualCopyUrl}
          />
        </div>
      ) : null}
    </section>
  );
}
