"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { CalendarRange, LockKeyhole } from "lucide-react";

import {
  parseScheduleQuery,
  serializeScheduleQuery,
  validateScheduleConfig,
  type ISOYearMonth,
  type PresetId,
  type ScheduleConfig,
  type ShiftKind,
  type WorkingShiftKind,
} from "@/features/schedule/domain";
import {
  createMonthlyCalendarView,
  getViewMonthFromDate,
  type MonthlyCalendarView,
} from "@/features/schedule/presentation/calendar-view";
import {
  createYearlyCalendarView,
  type YearlyCalendarView,
} from "@/features/schedule/presentation/yearly-calendar-view";
import {
  getScheduleErrorMessage,
  presentScheduleErrors,
  presentScheduleLinkErrors,
  type ScheduleFieldErrors,
} from "@/features/schedule/presentation/schedule-error-messages";

import { MonthlyCalendar } from "./monthly-calendar";
import { ScheduleActions } from "./schedule-actions";
import { ScheduleForm, type ScheduleMode } from "./schedule-form";
import {
  ScheduleViewControls,
  type ScheduleViewMode,
} from "./schedule-view-controls";
import { YearlyCalendar } from "./yearly-calendar";

type EditableScheduleState = {
  readonly mode: ScheduleMode;
  readonly presetId: PresetId;
  readonly workingShift: WorkingShiftKind;
  readonly startDate: string;
  readonly customCycle: readonly ShiftKind[];
};

type GeneratedScheduleState = {
  readonly config: ScheduleConfig;
  readonly view: MonthlyCalendarView;
};

type HistoryAction = "push" | "replace" | "none";
type ErrorTarget = "form" | "link";

function createDefaultFormState(): EditableScheduleState {
  return {
    mode: "preset",
    presetId: "4-on-4-off",
    workingShift: "day",
    startDate: "",
    customCycle: ["day", "day", "off", "off"],
  };
}

function formStateFromConfig(config: ScheduleConfig): EditableScheduleState {
  if (config.kind === "preset") {
    return {
      mode: "preset",
      presetId: config.presetId,
      workingShift: config.workingShift,
      startDate: config.startDate,
      customCycle: ["day", "day", "off", "off"],
    };
  }

  return {
    mode: "custom",
    presetId: "4-on-4-off",
    workingShift: "day",
    startDate: config.startDate,
    customCycle: config.cycle,
  };
}

function formErrorMessages(
  fields: ScheduleFieldErrors,
  general: readonly string[],
): readonly string[] {
  return [
    ...general,
    ...(fields.startDate ? [fields.startDate] : []),
    ...(fields.cycle ? [fields.cycle] : []),
  ];
}

export function ScheduleGenerator() {
  const [form, setForm] = useState<EditableScheduleState>(
    createDefaultFormState,
  );
  const [fieldErrors, setFieldErrors] = useState<ScheduleFieldErrors>({});
  const [generalErrors, setGeneralErrors] = useState<readonly string[]>([]);
  const [linkErrors, setLinkErrors] = useState<readonly string[]>([]);
  const [generated, setGenerated] = useState<GeneratedScheduleState | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("month");
  const [yearlyView, setYearlyView] = useState<YearlyCalendarView | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const focusErrorSummary = useCallback(() => {
    window.setTimeout(() => errorSummaryRef.current?.focus(), 0);
  }, []);

  const commitSchedule = useCallback(
    (
      config: ScheduleConfig,
      viewMonth: ISOYearMonth,
      historyAction: HistoryAction,
      message: string,
      focusResult: boolean,
      errorTarget: ErrorTarget = "form",
    ): boolean => {
      const viewResult = createMonthlyCalendarView(config, viewMonth);

      if (!viewResult.ok) {
        const messages = viewResult.errors.map(getScheduleErrorMessage);

        if (errorTarget === "link") {
          setLinkErrors([
            "This schedule link could not be displayed. Enter a new schedule below.",
            ...messages,
          ]);
        } else {
          setGeneralErrors(messages);
          focusErrorSummary();
        }

        setGenerated(null);
        setViewMode("month");
        setYearlyView(null);
        return false;
      }

      const queryResult = serializeScheduleQuery({ config, viewMonth });

      if (!queryResult.ok) {
        const messages = queryResult.errors.map(getScheduleErrorMessage);

        if (errorTarget === "link") {
          setLinkErrors(presentScheduleLinkErrors(queryResult.errors));
        } else {
          setGeneralErrors(messages);
          focusErrorSummary();
        }

        setGenerated(null);
        setViewMode("month");
        setYearlyView(null);
        return false;
      }

      setGenerated({ config, view: viewResult.value });
      setViewMode("month");
      setYearlyView(null);
      setFieldErrors({});
      setGeneralErrors([]);
      setLinkErrors([]);
      setStatusMessage(message);

      if (historyAction !== "none") {
        const nextUrl = `${window.location.pathname}?${queryResult.value}`;

        if (historyAction === "push") {
          window.history.pushState(null, "", nextUrl);
        } else {
          window.history.replaceState(null, "", nextUrl);
        }
      }

      if (focusResult) {
        window.setTimeout(() => resultHeadingRef.current?.focus(), 0);
      }

      return true;
    },
    [focusErrorSummary],
  );

  const restoreFromLocation = useCallback(() => {
    const search = window.location.search;

    if (search === "") {
      setForm(createDefaultFormState());
      setFieldErrors({});
      setGeneralErrors([]);
      setLinkErrors([]);
      setGenerated(null);
      setViewMode("month");
      setYearlyView(null);
      setStatusMessage("");
      return;
    }

    const parsedResult = parseScheduleQuery(search);

    if (!parsedResult.ok) {
      setForm(createDefaultFormState());
      setFieldErrors({});
      setGeneralErrors([]);
      setLinkErrors(presentScheduleLinkErrors(parsedResult.errors));
      setGenerated(null);
      setViewMode("month");
      setYearlyView(null);
      setStatusMessage("");
      return;
    }

    const { config, viewMonth } = parsedResult.value;
    const selectedMonth = viewMonth ?? getViewMonthFromDate(config.startDate);

    setForm(formStateFromConfig(config));
    commitSchedule(
      config,
      selectedMonth,
      "replace",
      "Shared schedule restored.",
      false,
      "link",
    );
  }, [commitSchedule]);

  useEffect(() => {
    // The URL is an external source of truth. Restore it before a user can
    // interact so the delayed hydration pass cannot overwrite form edits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    restoreFromLocation();
    setIsReady(true);
    window.addEventListener("popstate", restoreFromLocation);

    return () => {
      window.removeEventListener("popstate", restoreFromLocation);
    };
  }, [restoreFromLocation]);

  function clearFieldError(field: keyof ScheduleFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralErrors([]);
  }

  function handleModeChange(mode: ScheduleMode) {
    setForm((current) => ({ ...current, mode }));

    if (mode === "preset") {
      clearFieldError("cycle");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const rawConfig =
      form.mode === "preset"
        ? {
            kind: "preset",
            version: 1,
            presetId: form.presetId,
            startDate: form.startDate,
            workingShift: form.workingShift,
          }
        : {
            kind: "custom",
            version: 1,
            startDate: form.startDate,
            cycle: form.customCycle,
          };
    const validationResult = validateScheduleConfig(rawConfig);

    if (!validationResult.ok) {
      const presented = presentScheduleErrors(validationResult.errors);
      const fieldMessages = new Set(Object.values(presented.fields));

      setFieldErrors(presented.fields);
      setGeneralErrors(
        presented.summary.filter((message) => !fieldMessages.has(message)),
      );
      setStatusMessage("");
      focusErrorSummary();
      return;
    }

    const viewMonth = getViewMonthFromDate(validationResult.value.startDate);

    commitSchedule(
      validationResult.value,
      viewMonth,
      "push",
      `Schedule generated for ${viewMonth}.`,
      true,
    );
  }

  function handleMonthNavigation(viewMonth: ISOYearMonth) {
    if (generated === null) {
      return;
    }

    commitSchedule(
      generated.config,
      viewMonth,
      "replace",
      `Showing schedule for ${viewMonth}.`,
      false,
    );
  }

  function showYear(
    config: ScheduleConfig,
    year: number,
    focusResult: boolean,
  ) {
    const result = createYearlyCalendarView(config, year);

    if (!result.ok) {
      setGeneralErrors(result.errors.map(getScheduleErrorMessage));
      focusErrorSummary();
      return;
    }

    setYearlyView(result.value);
    setViewMode("year");
    setGeneralErrors([]);
    setStatusMessage(`Showing yearly schedule for ${year}.`);

    if (focusResult) {
      window.setTimeout(() => resultHeadingRef.current?.focus(), 0);
    }
  }

  function handleViewModeChange(mode: ScheduleViewMode) {
    if (generated === null || mode === viewMode) {
      return;
    }

    if (mode === "month") {
      setViewMode("month");
      setStatusMessage(
        `Showing monthly schedule for ${generated.view.viewMonth}.`,
      );
      window.setTimeout(() => resultHeadingRef.current?.focus(), 0);
      return;
    }

    showYear(
      generated.config,
      Number(generated.view.viewMonth.slice(0, 4)),
      true,
    );
  }

  function handleYearNavigation(year: number) {
    if (generated !== null) {
      showYear(generated.config, year, false);
    }
  }

  const submissionMessages = formErrorMessages(fieldErrors, generalErrors);

  return (
    <section
      aria-labelledby="generator-title"
      className="border-border bg-card rounded-3xl border p-4 shadow-[0_24px_70px_-44px_oklch(0.32_0.07_220/0.38)] sm:p-7 lg:p-9"
    >
      <div className="generator-intro flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold">
            Free schedule generator
          </p>
          <h2
            id="generator-title"
            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Build your monthly shift calendar
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
            Choose a fixed-shift preset or create a custom repeating cycle. No
            account is required.
          </p>
        </div>
        <span className="bg-accent text-accent-foreground grid size-11 shrink-0 place-items-center rounded-xl">
          <CalendarRange aria-hidden="true" className="size-5" />
        </span>
      </div>

      <p className="generator-intro text-muted-foreground mt-4 inline-flex items-center gap-2 text-xs font-medium">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        Generated on this device. Your schedule is not saved remotely.
      </p>

      {linkErrors.length > 0 ? (
        <div
          aria-labelledby="link-error-title"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950"
          role="alert"
        >
          <h3 className="font-bold" id="link-error-title">
            Unable to open this schedule link
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {linkErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {submissionMessages.length > 0 ? (
        <div
          aria-labelledby="submission-error-title"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 outline-none focus-visible:ring-3 focus-visible:ring-red-400/50"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          <h3 className="font-bold" id="submission-error-title">
            Check your schedule details
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {submissionMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="schedule-form-region mt-7">
        <ScheduleForm
          customCycle={form.customCycle}
          disabled={!isReady}
          errors={fieldErrors}
          mode={form.mode}
          onCustomCycleChange={(customCycle) => {
            setForm((current) => ({ ...current, customCycle }));
            clearFieldError("cycle");
          }}
          onModeChange={handleModeChange}
          onPresetChange={(presetId) => {
            setForm((current) => ({ ...current, presetId }));
            setGeneralErrors([]);
          }}
          onStartDateChange={(startDate) => {
            setForm((current) => ({ ...current, startDate }));
            clearFieldError("startDate");
          }}
          onSubmit={handleSubmit}
          onWorkingShiftChange={(workingShift) => {
            setForm((current) => ({ ...current, workingShift }));
            setGeneralErrors([]);
          }}
          presetId={form.presetId}
          startDate={form.startDate}
          workingShift={form.workingShift}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      {generated ? (
        <>
          <ScheduleViewControls
            onChange={handleViewModeChange}
            value={viewMode}
          />
          <ScheduleActions
            activeView={viewMode}
            config={generated.config}
            onPrint={() => window.print()}
            view={generated.view}
          />
          {viewMode === "month" ? (
            <MonthlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleMonthNavigation}
              view={generated.view}
            />
          ) : yearlyView ? (
            <YearlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleYearNavigation}
              view={yearlyView}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
