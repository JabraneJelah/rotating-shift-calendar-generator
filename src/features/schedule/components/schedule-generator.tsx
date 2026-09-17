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
  parseISODate,
  isFixedPresetId,
  resolvePresetPattern,
  serializeScheduleQuery,
  validateScheduleConfig,
  type ISODate,
  type ISOYearMonth,
  type PresetId,
  type ScheduleConfig,
  type ShiftKind,
  type WeekStart,
  type WorkingShiftKind,
} from "@/features/schedule/domain";
import {
  isDefaultShiftDefinitionRegistry,
  validateShiftDefinitionRegistry,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
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
import { createScheduleInsights } from "@/features/schedule/presentation/schedule-insights";
import {
  presentPlannerErrors,
  type PlannerFieldErrors,
} from "@/features/schedule/presentation/planner-error-messages";

import { MonthlyCalendar } from "./monthly-calendar";
import { ScheduleActions } from "./schedule-actions";
import { ScheduleForm, type ScheduleMode } from "./schedule-form";
import { ScheduleInsights } from "./schedule-insights";
import {
  createDefaultEditableShiftDetails,
  shiftDetailsToRegistryInput,
  type EditableShiftDetails,
} from "./shift-details-panel";
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
  readonly planner: ShiftDefinitionRegistry | null;
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
      workingShift: "workingShift" in config ? config.workingShift : "day",
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

function configUsesShift(
  config: ScheduleConfig,
  shift: WorkingShiftKind,
): boolean {
  if (config.kind === "custom") {
    return config.cycle.includes(shift);
  }

  const pattern = resolvePresetPattern(
    config.presetId,
    "workingShift" in config ? config.workingShift : undefined,
  );

  if (!pattern.ok) {
    throw new Error("A validated preset must resolve its cycle.");
  }

  return pattern.value.cycle.includes(shift);
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

function getLocalToday(): ISODate | null {
  const now = new Date();
  const value = `${now.getFullYear().toString().padStart(4, "0")}-${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  const result = parseISODate(value);

  return result.ok ? result.value : null;
}

export function ScheduleGenerator() {
  const [form, setForm] = useState<EditableScheduleState>(
    createDefaultFormState,
  );
  const [fieldErrors, setFieldErrors] = useState<ScheduleFieldErrors>({});
  const [generalErrors, setGeneralErrors] = useState<readonly string[]>([]);
  const [plannerErrors, setPlannerErrors] = useState<PlannerFieldErrors>({});
  const [shiftDetails, setShiftDetails] = useState<EditableShiftDetails>(
    createDefaultEditableShiftDetails,
  );
  const [linkErrors, setLinkErrors] = useState<readonly string[]>([]);
  const [generated, setGenerated] = useState<GeneratedScheduleState | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("month");
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  const [yearlyView, setYearlyView] = useState<YearlyCalendarView | null>(null);
  const [today, setToday] = useState<ISODate | null>(null);
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
      selectedWeekStart: WeekStart,
      planner: ShiftDefinitionRegistry | null,
      historyAction: HistoryAction,
      message: string,
      focusResult: boolean,
      errorTarget: ErrorTarget = "form",
    ): boolean => {
      const viewResult = createMonthlyCalendarView(
        config,
        viewMonth,
        selectedWeekStart,
      );

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

      const queryResult = serializeScheduleQuery({
        config,
        viewMonth,
        weekStart: selectedWeekStart,
      });

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

      setGenerated({ config, view: viewResult.value, planner });
      setWeekStart(selectedWeekStart);
      setViewMode("month");
      setYearlyView(null);
      setFieldErrors({});
      setGeneralErrors([]);
      setPlannerErrors({});
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
      setPlannerErrors({});
      setShiftDetails(createDefaultEditableShiftDetails());
      setLinkErrors([]);
      setGenerated(null);
      setViewMode("month");
      setWeekStart("monday");
      setYearlyView(null);
      setStatusMessage("");
      return;
    }

    const parsedResult = parseScheduleQuery(search);

    if (!parsedResult.ok) {
      setForm(createDefaultFormState());
      setFieldErrors({});
      setGeneralErrors([]);
      setPlannerErrors({});
      setShiftDetails(createDefaultEditableShiftDetails());
      setLinkErrors(presentScheduleLinkErrors(parsedResult.errors));
      setGenerated(null);
      setViewMode("month");
      setWeekStart("monday");
      setYearlyView(null);
      setStatusMessage("");
      return;
    }

    const {
      config,
      viewMonth,
      weekStart: restoredWeekStart,
    } = parsedResult.value;
    const selectedMonth = viewMonth ?? getViewMonthFromDate(config.startDate);
    const selectedWeekStart = restoredWeekStart ?? "monday";

    setForm(formStateFromConfig(config));
    setShiftDetails(createDefaultEditableShiftDetails());
    setPlannerErrors({});
    commitSchedule(
      config,
      selectedMonth,
      selectedWeekStart,
      null,
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
    setToday(getLocalToday());
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
        ? isFixedPresetId(form.presetId)
          ? {
              kind: "preset",
              version: 1,
              presetId: form.presetId,
              startDate: form.startDate,
              workingShift: form.workingShift,
            }
          : {
              kind: "preset",
              version: 1,
              presetId: form.presetId,
              startDate: form.startDate,
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

    const defaults = createDefaultEditableShiftDetails();
    const applicableShiftDetails = {
      day: configUsesShift(validationResult.value, "day")
        ? shiftDetails.day
        : defaults.day,
      night: configUsesShift(validationResult.value, "night")
        ? shiftDetails.night
        : defaults.night,
    };
    const plannerResult = validateShiftDefinitionRegistry(
      shiftDetailsToRegistryInput(applicableShiftDetails),
    );

    if (!plannerResult.ok) {
      const presented = presentPlannerErrors(plannerResult.errors);
      setPlannerErrors(presented.fields);
      setGeneralErrors(presented.summary);
      setStatusMessage("");
      focusErrorSummary();
      return;
    }

    const viewMonth = getViewMonthFromDate(validationResult.value.startDate);
    const appliedPlanner = isDefaultShiftDefinitionRegistry(plannerResult.value)
      ? null
      : plannerResult.value;

    commitSchedule(
      validationResult.value,
      viewMonth,
      weekStart,
      appliedPlanner,
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
      weekStart,
      generated.planner,
      "replace",
      `Showing schedule for ${viewMonth}.`,
      false,
    );
  }

  function showYear(
    config: ScheduleConfig,
    year: number,
    selectedWeekStart: WeekStart,
    focusResult: boolean,
  ) {
    const result = createYearlyCalendarView(config, year, selectedWeekStart);

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
      weekStart,
      true,
    );
  }

  function handleYearNavigation(year: number) {
    if (generated !== null) {
      showYear(generated.config, year, weekStart, false);
    }
  }

  function handleWeekStartChange(nextWeekStart: WeekStart) {
    if (generated === null || nextWeekStart === weekStart) {
      return;
    }

    const monthlyResult = createMonthlyCalendarView(
      generated.config,
      generated.view.viewMonth,
      nextWeekStart,
    );

    if (!monthlyResult.ok) {
      setGeneralErrors(monthlyResult.errors.map(getScheduleErrorMessage));
      focusErrorSummary();
      return;
    }

    let nextYearlyView = yearlyView;

    if (viewMode === "year" && yearlyView !== null) {
      const yearlyResult = createYearlyCalendarView(
        generated.config,
        yearlyView.year,
        nextWeekStart,
      );

      if (!yearlyResult.ok) {
        setGeneralErrors(yearlyResult.errors.map(getScheduleErrorMessage));
        focusErrorSummary();
        return;
      }

      nextYearlyView = yearlyResult.value;
    }

    const queryResult = serializeScheduleQuery({
      config: generated.config,
      viewMonth: generated.view.viewMonth,
      weekStart: nextWeekStart,
    });

    if (!queryResult.ok) {
      setGeneralErrors(queryResult.errors.map(getScheduleErrorMessage));
      focusErrorSummary();
      return;
    }

    setWeekStart(nextWeekStart);
    setGenerated({
      config: generated.config,
      view: monthlyResult.value,
      planner: generated.planner,
    });
    setYearlyView(nextYearlyView);
    setGeneralErrors([]);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${queryResult.value}`,
    );
  }

  const submissionMessages = formErrorMessages(fieldErrors, generalErrors);
  const insightResult =
    generated !== null && today !== null
      ? createScheduleInsights(generated.config, today)
      : null;

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
            Choose a verified fixed or rotating preset, or create a custom
            repeating cycle. No account is required.
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
          plannerErrors={plannerErrors}
          shiftDetails={shiftDetails}
          hasGenerated={generated !== null}
          mode={form.mode}
          onCustomCycleChange={(customCycle) => {
            setForm((current) => ({ ...current, customCycle }));
            clearFieldError("cycle");
          }}
          onModeChange={handleModeChange}
          onShiftDetailsChange={(value) => {
            setShiftDetails(value);
            setPlannerErrors({});
            setGeneralErrors([]);
          }}
          onShiftDetailsReset={() => {
            setShiftDetails(createDefaultEditableShiftDetails());
            setPlannerErrors({});
            setGeneralErrors([]);
          }}
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
            onWeekStartChange={handleWeekStartChange}
            value={viewMode}
            weekStart={weekStart}
          />
          <ScheduleActions
            activeView={viewMode}
            config={generated.config}
            hasPrivateShiftDetails={generated.planner !== null}
            onPrint={() => window.print()}
            view={generated.view}
            weekStart={weekStart}
            yearlyView={yearlyView}
          />
          {insightResult ? (
            <ScheduleInsights
              planner={generated.planner}
              result={insightResult}
            />
          ) : null}
          {viewMode === "month" ? (
            <MonthlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleMonthNavigation}
              planner={generated.planner}
              view={generated.view}
            />
          ) : yearlyView ? (
            <YearlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleYearNavigation}
              planner={generated.planner}
              view={yearlyView}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
