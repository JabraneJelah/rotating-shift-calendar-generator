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
  calculateMonthlyEffectiveStatistics,
  calculateYearlyEffectiveStatistics,
  DEFAULT_SHIFT_DEFINITION_REGISTRY,
  isDefaultShiftDefinitionRegistry,
  projectEffectiveSchedule,
  removeDateExceptionLayer,
  upsertDateException,
  validateShiftDefinitionRegistry,
  type DateException,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import {
  createImportReview,
  createPlannerBackup,
  downloadPlannerBackup,
  IndexedDBPlannerRepository,
  parsePlannerBackup,
  persistenceErrorMessage,
  plannerBackupFilename,
  PlannerPersistenceError,
  serializePlannerBackup,
  validateBackupFile,
  type ImportReview,
  type PersistedPlannerV1,
  type PlannerContent,
  type PlannerSummary,
  type SaveState,
  type StorageEventMessage,
} from "@/features/schedule/persistence";
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
import { createEffectiveScheduleInsights } from "@/features/schedule/presentation/schedule-insights";
import {
  presentPlannerErrors,
  type PlannerFieldErrors,
} from "@/features/schedule/presentation/planner-error-messages";
import { publishPlannerSafety, PwaController } from "@/features/pwa";

import { MonthlyCalendar } from "./monthly-calendar";
import { DateExceptionEditor } from "./date-exception-editor";
import { LocalPlannerPanel } from "./local-planner-panel";
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

function editableShiftDetailsFromRegistry(
  registry: ShiftDefinitionRegistry,
): EditableShiftDetails {
  const day = registry.definitions.find(
    ({ id }) => id === registry.dayDefinitionId,
  );
  const night = registry.definitions.find(
    ({ id }) => id === registry.nightDefinitionId,
  );
  if (day === undefined || night === undefined) {
    throw new Error("A validated registry must contain Day and Night shifts.");
  }
  return {
    day: {
      id: day.id,
      name: day.name,
      shortLabel: day.shortLabel,
      category: "day",
      color: day.color,
      startTime: day.time?.startTime ?? "",
      endTime: day.time?.endTime ?? "",
      is24Hours: day.time?.is24Hours ?? false,
      breakMinutes: String(day.time?.breakMinutes ?? 0),
    },
    night: {
      id: night.id,
      name: night.name,
      shortLabel: night.shortLabel,
      category: "night",
      color: night.color,
      startTime: night.time?.startTime ?? "",
      endTime: night.time?.endTime ?? "",
      is24Hours: night.time?.is24Hours ?? false,
      breakMinutes: String(night.time?.breakMinutes ?? 0),
    },
  };
}

function plannerContent(
  generated: GeneratedScheduleState,
  weekStart: WeekStart,
  exceptions: readonly DateException[],
  timeZone: string,
): PlannerContent {
  return {
    schedule: generated.config,
    weekStart,
    shiftDefinitions: generated.planner ?? DEFAULT_SHIFT_DEFINITION_REGISTRY,
    exceptions,
    ...(timeZone === "" ? {} : { timeZone }),
  };
}

function contentFingerprint(
  value: PlannerContent | PersistedPlannerV1,
): string {
  return JSON.stringify({
    schedule: value.schedule,
    weekStart: value.weekStart,
    shiftDefinitions: value.shiftDefinitions,
    exceptions: value.exceptions,
    ...(value.timeZone === undefined ? {} : { timeZone: value.timeZone }),
  });
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
  const [dateExceptions, setDateExceptions] = useState<
    readonly DateException[]
  >([]);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("month");
  const [weekStart, setWeekStart] = useState<WeekStart>("monday");
  const [yearlyView, setYearlyView] = useState<YearlyCalendarView | null>(null);
  const [today, setToday] = useState<ISODate | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [plannerTimeZone, setPlannerTimeZone] = useState("");
  const [activePlanner, setActivePlanner] = useState<PersistedPlannerV1 | null>(
    null,
  );
  const [savedPlanners, setSavedPlanners] = useState<readonly PlannerSummary[]>(
    [],
  );
  const [saveState, setSaveState] = useState<SaveState>("unsaved");
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [hasUnappliedEdits, setHasUnappliedEdits] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const repositoryRef = useRef<IndexedDBPlannerRepository | null>(null);
  const activePlannerRef = useRef<PersistedPlannerV1 | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveStateRef = useRef<SaveState>("unsaved");

  useEffect(() => {
    activePlannerRef.current = activePlanner;
  }, [activePlanner]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    const pendingWrite = saveState === "unsaved" || saveState === "saving";
    const conflict = saveState === "conflict" || saveState === "failed";
    const safeSavedPlanner =
      activePlanner !== null && saveState === "saved" && !hasUnappliedEdits;
    const safeEmptyGenerator =
      activePlanner === null && generated === null && !hasUnappliedEdits;
    publishPlannerSafety({
      safeToRefresh: safeSavedPlanner || safeEmptyGenerator,
      pendingWrite,
      conflict,
      meaningfulUse: generated !== null || savedPlanners.length > 0,
    });
  }, [
    activePlanner,
    generated,
    hasUnappliedEdits,
    savedPlanners.length,
    saveState,
  ]);

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
      setHasUnappliedEdits(false);
      setForm(createDefaultFormState());
      setFieldErrors({});
      setGeneralErrors([]);
      setPlannerErrors({});
      setShiftDetails(createDefaultEditableShiftDetails());
      setLinkErrors([]);
      setGenerated(null);
      setDateExceptions([]);
      setViewMode("month");
      setWeekStart("monday");
      setYearlyView(null);
      setStatusMessage("");
      return;
    }

    const parsedResult = parseScheduleQuery(search);

    if (!parsedResult.ok) {
      setHasUnappliedEdits(false);
      setForm(createDefaultFormState());
      setFieldErrors({});
      setGeneralErrors([]);
      setPlannerErrors({});
      setShiftDetails(createDefaultEditableShiftDetails());
      setLinkErrors(presentScheduleLinkErrors(parsedResult.errors));
      setGenerated(null);
      setDateExceptions([]);
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
    setDateExceptions([]);
    setHasUnappliedEdits(false);
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

  const applySavedPlanner = useCallback(
    (planner: PersistedPlannerV1, message: string): boolean => {
      const viewMonth = getViewMonthFromDate(planner.schedule.startDate);
      const personalRegistry = isDefaultShiftDefinitionRegistry(
        planner.shiftDefinitions,
      )
        ? null
        : planner.shiftDefinitions;
      const committed = commitSchedule(
        planner.schedule,
        viewMonth,
        planner.weekStart,
        personalRegistry,
        "none",
        message,
        false,
      );
      if (!committed) return false;
      setForm(formStateFromConfig(planner.schedule));
      setShiftDetails(
        editableShiftDetailsFromRegistry(planner.shiftDefinitions),
      );
      setDateExceptions(planner.exceptions);
      setPlannerTimeZone(planner.timeZone ?? "");
      setActivePlanner(planner);
      setSaveState("saved");
      setHasUnappliedEdits(false);
      return true;
    },
    [commitSchedule],
  );

  const refreshPlannerList = useCallback(async () => {
    const repository = repositoryRef.current;
    if (repository === null) return;
    setSavedPlanners(await repository.list());
  }, []);

  const handleExternalStorageChange = useCallback(
    (message: StorageEventMessage) => {
      void refreshPlannerList().catch(() => undefined);
      const current = activePlannerRef.current;
      if (current === null || current.id !== message.plannerId) return;
      if (message.action === "deleted") {
        setSaveState("conflict");
        setStorageMessage(
          "This planner's local saved copy was deleted in another tab. Your current planner remains open.",
        );
      } else if (message.revision > current.revision) {
        setSaveState("conflict");
        setStorageMessage(
          "A newer saved version exists in another tab. Open it from the saved-planner list or duplicate your current planner.",
        );
      }
    },
    [refreshPlannerList],
  );

  useEffect(() => {
    // The URL is an external source of truth. Restore it before a user can
    // interact so the delayed hydration pass cannot overwrite form edits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(getLocalToday());
    restoreFromLocation();
    setIsReady(true);

    let current = true;
    const repository = new IndexedDBPlannerRepository({
      onBlocked: () => {
        if (current) {
          setStorageMessage(
            "Close other Shift Calendar tabs to finish updating local storage.",
          );
        }
      },
      onVersionChange: () => {
        if (current) {
          setSaveState("unavailable");
          setStorageMessage(
            "Local storage was updated in another tab. Reload before saving again.",
          );
        }
      },
      onConnectionClose: () => {
        if (current) {
          setSaveState("unavailable");
          setStorageMessage(
            "Local saving became unavailable. Your current planner remains open.",
          );
        }
      },
      onExternalChange: handleExternalStorageChange,
    });
    repositoryRef.current = repository;

    async function loadCleanRoot() {
      try {
        await repository.initialize();
        if (!current) return;
        await refreshPlannerList();
        if (window.location.search !== "") return;
        const lastOpened = await repository.getLastOpened();
        if (lastOpened === null || !current) return;
        try {
          const planner = await repository.get(lastOpened);
          if (!current) return;
          if (
            applySavedPlanner(
              planner,
              `Saved planner ${planner.name} restored.`,
            )
          ) {
            await repository.setLastOpened(planner.id);
          }
        } catch (error) {
          if (
            error instanceof PlannerPersistenceError &&
            (error.code === "PLANNER_NOT_FOUND" ||
              error.code === "CORRUPT_RECORD" ||
              error.code === "UNSUPPORTED_PLANNER_VERSION" ||
              error.code === "UNSUPPORTED_DOMAIN_VERSION")
          ) {
            await repository.setLastOpened(null);
            setStorageMessage(persistenceErrorMessage(error));
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (!current) return;
        const mapped =
          error instanceof PlannerPersistenceError
            ? error
            : new PlannerPersistenceError("STORAGE_UNAVAILABLE");
        setSaveState("unavailable");
        setStorageMessage(persistenceErrorMessage(mapped));
      } finally {
        if (current) setIsReady(true);
      }
    }

    void loadCleanRoot();

    function handlePopState() {
      setActivePlanner(null);
      setPlannerTimeZone("");
      setSaveState("unsaved");
      setStorageMessage(null);
      restoreFromLocation();
      if (window.location.search === "") {
        void (async () => {
          try {
            const id = await repository.getLastOpened();
            if (id === null || !current) return;
            const planner = await repository.get(id);
            if (current)
              applySavedPlanner(
                planner,
                `Saved planner ${planner.name} restored.`,
              );
          } catch {
            // Preserve the normal unsaved clean-root fallback.
          }
        })();
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      current = false;
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      window.removeEventListener("popstate", handlePopState);
      repository.close();
      repositoryRef.current = null;
    };
  }, [
    applySavedPlanner,
    handleExternalStorageChange,
    refreshPlannerList,
    restoreFromLocation,
  ]);

  function clearFieldError(field: keyof ScheduleFieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralErrors([]);
  }

  function handleModeChange(mode: ScheduleMode) {
    setHasUnappliedEdits(true);
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

    const baseChanged =
      generated !== null &&
      JSON.stringify(generated.config) !==
        JSON.stringify(validationResult.value);
    const committed = commitSchedule(
      validationResult.value,
      viewMonth,
      weekStart,
      appliedPlanner,
      activePlanner === null ? "push" : "none",
      `Schedule generated for ${viewMonth}.`,
      true,
    );
    if (committed && baseChanged) {
      setDateExceptions([]);
    }
    if (committed) setHasUnappliedEdits(false);
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
      activePlanner === null ? "replace" : "none",
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
    if (activePlanner === null) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?${queryResult.value}`,
      );
    }
  }

  useEffect(() => {
    const repository = repositoryRef.current;
    if (
      repository === null ||
      activePlanner === null ||
      generated === null ||
      saveStateRef.current === "conflict" ||
      saveStateRef.current === "unavailable"
    ) {
      return;
    }
    const content = plannerContent(
      generated,
      weekStart,
      dateExceptions,
      plannerTimeZone,
    );
    if (contentFingerprint(content) === contentFingerprint(activePlanner)) {
      return;
    }

    const captured = activePlanner;
    // This effect owns the committed-state debounce, so it also exposes the
    // dirty interval before the asynchronous IndexedDB write begins.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("unsaved");
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      setSaveState("saving");
      void repository
        .update(captured.id, captured.revision, content)
        .then(async (updated) => {
          if (
            activePlannerRef.current?.id === captured.id &&
            activePlannerRef.current.revision === captured.revision
          ) {
            setActivePlanner(updated);
            setSaveState("saved");
            setStorageMessage(null);
          }
          await refreshPlannerList();
        })
        .catch((error: unknown) => {
          if (activePlannerRef.current?.id !== captured.id) return;
          const mapped =
            error instanceof PlannerPersistenceError
              ? error
              : new PlannerPersistenceError("TRANSACTION_ABORTED");
          setSaveState(
            mapped.code === "PLANNER_REVISION_CONFLICT" ? "conflict" : "failed",
          );
          setStorageMessage(persistenceErrorMessage(mapped));
        });
    }, 750);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    activePlanner,
    dateExceptions,
    generated,
    plannerTimeZone,
    refreshPlannerList,
    weekStart,
  ]);

  function requireRepository(): IndexedDBPlannerRepository {
    const repository = repositoryRef.current;
    if (repository === null || saveStateRef.current === "unavailable") {
      throw new PlannerPersistenceError("STORAGE_UNAVAILABLE");
    }
    return repository;
  }

  async function saveCurrentPlanner(name: string): Promise<void> {
    if (generated === null) {
      throw new PlannerPersistenceError("INVALID_PLANNER");
    }
    const repository = requireRepository();
    const planner = await repository.create(
      name,
      plannerContent(generated, weekStart, dateExceptions, plannerTimeZone),
    );
    setActivePlanner(planner);
    setSaveState("saved");
    setStorageMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
    await refreshPlannerList();
  }

  async function openPlanner(id: string): Promise<void> {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const repository = requireRepository();
    const planner = await repository.get(id);
    if (!applySavedPlanner(planner, `Saved planner ${planner.name} opened.`)) {
      throw new PlannerPersistenceError("CORRUPT_RECORD");
    }
    window.history.replaceState(null, "", window.location.pathname);
    await repository.setLastOpened(planner.id);
  }

  async function renamePlanner(id: string, name: string): Promise<void> {
    const repository = requireRepository();
    const source =
      activePlannerRef.current?.id === id
        ? activePlannerRef.current
        : await repository.get(id);
    if (source === null) throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
    const updated = await repository.rename(id, name, source.revision);
    if (activePlannerRef.current?.id === id) {
      setActivePlanner(updated);
      setSaveState("saved");
    }
    await refreshPlannerList();
  }

  async function duplicatePlanner(id: string, name: string): Promise<void> {
    const repository = requireRepository();
    await repository.duplicate(id, name);
    await refreshPlannerList();
  }

  async function deletePlanner(id: string): Promise<void> {
    const repository = requireRepository();
    const source =
      activePlannerRef.current?.id === id
        ? activePlannerRef.current
        : await repository.get(id);
    if (source === null) throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
    await repository.delete(id, source.revision);
    if (activePlannerRef.current?.id === id) {
      setActivePlanner(null);
      setSaveState("unsaved");
      setStorageMessage(
        "Local saved copy deleted; this planner remains open unsaved.",
      );
    }
    await refreshPlannerList();
  }

  async function newUnsavedPlanner(): Promise<void> {
    const repository = repositoryRef.current;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (repository !== null) {
      try {
        await repository.setLastOpened(null);
      } catch {
        // Returning to the unsaved generator must remain available.
      }
    }
    window.history.replaceState(null, "", window.location.pathname);
    setActivePlanner(null);
    setPlannerTimeZone("");
    setSaveState("unsaved");
    setStorageMessage(null);
    restoreFromLocation();
  }

  async function exportOnePlanner(id: string): Promise<void> {
    const repository = requireRepository();
    const planner = await repository.get(id);
    const zones =
      planner.timeZone === undefined
        ? new Set<string>()
        : await repository.timeZoneSet();
    const now = new Date();
    const backup = createPlannerBackup(
      [planner],
      "single",
      now.toISOString(),
      (zone) => zones.has(zone),
    );
    downloadPlannerBackup(
      serializePlannerBackup(backup),
      plannerBackupFilename(
        "single",
        now.toISOString().slice(0, 10),
        planner.name,
      ),
    );
  }

  async function exportAllPlanners(): Promise<void> {
    const repository = requireRepository();
    const summaries = await repository.list();
    const planners = await Promise.all(
      summaries.map(({ id }) => repository.get(id)),
    );
    const zones = planners.some(({ timeZone }) => timeZone !== undefined)
      ? await repository.timeZoneSet()
      : new Set<string>();
    const now = new Date();
    const backup = createPlannerBackup(
      planners,
      "all",
      now.toISOString(),
      (zone) => zones.has(zone),
    );
    downloadPlannerBackup(
      serializePlannerBackup(backup),
      plannerBackupFilename("all", now.toISOString().slice(0, 10)),
    );
  }

  async function prepareImport(file: File): Promise<ImportReview> {
    validateBackupFile(file);
    let text: string;
    try {
      text = await file.text();
    } catch {
      throw new PlannerPersistenceError("FILE_READ_FAILED");
    }
    const repository = requireRepository();
    let backup = parsePlannerBackup(text, () => true);
    if (backup.planners.some(({ timeZone }) => timeZone !== undefined)) {
      const zones = await repository.timeZoneSet();
      backup = parsePlannerBackup(text, (zone) => zones.has(zone));
    }
    return createImportReview(
      backup,
      (await repository.list()).map(({ name }) => name),
    );
  }

  async function confirmImport(review: ImportReview): Promise<number> {
    const repository = requireRepository();
    const imported = await repository.importAsNew(review);
    await refreshPlannerList();
    return imported.length;
  }

  async function retryActiveSave(): Promise<void> {
    const repository = requireRepository();
    const current = activePlannerRef.current;
    if (current === null || generated === null) {
      throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
    }
    setSaveState("saving");
    const updated = await repository.update(
      current.id,
      current.revision,
      plannerContent(generated, weekStart, dateExceptions, plannerTimeZone),
    );
    setActivePlanner(updated);
    setSaveState("saved");
    setStorageMessage(null);
    await refreshPlannerList();
  }

  async function reloadActivePlanner(): Promise<void> {
    const repository = requireRepository();
    const current = activePlannerRef.current;
    if (current === null) {
      throw new PlannerPersistenceError("PLANNER_NOT_FOUND");
    }
    const updated = await repository.get(current.id);
    if (
      !applySavedPlanner(updated, `Newer saved planner ${updated.name} loaded.`)
    ) {
      throw new PlannerPersistenceError("CORRUPT_RECORD");
    }
    setStorageMessage(null);
    await repository.setLastOpened(updated.id);
  }

  const submissionMessages = formErrorMessages(fieldErrors, generalErrors);
  const effectiveRegistry =
    generated?.planner ?? DEFAULT_SHIFT_DEFINITION_REGISTRY;
  const effectiveMonthResult =
    generated === null
      ? null
      : projectEffectiveSchedule(
          generated.view.occurrences,
          effectiveRegistry,
          dateExceptions,
        );
  const effectiveYearResult =
    yearlyView === null
      ? null
      : projectEffectiveSchedule(
          yearlyView.occurrences,
          effectiveRegistry,
          dateExceptions,
        );
  const hasPrivatePlannerState =
    generated !== null &&
    (generated.planner !== null || dateExceptions.length > 0);
  const insightResult =
    generated !== null && today !== null
      ? createEffectiveScheduleInsights(
          generated.config,
          today,
          effectiveRegistry,
          dateExceptions,
        )
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
            setHasUnappliedEdits(true);
            setForm((current) => ({ ...current, customCycle }));
            clearFieldError("cycle");
          }}
          onModeChange={handleModeChange}
          onShiftDetailsChange={(value) => {
            setHasUnappliedEdits(true);
            setShiftDetails(value);
            setPlannerErrors({});
            setGeneralErrors([]);
          }}
          onShiftDetailsReset={() => {
            setHasUnappliedEdits(true);
            setShiftDetails(createDefaultEditableShiftDetails());
            setPlannerErrors({});
            setGeneralErrors([]);
          }}
          onPresetChange={(presetId) => {
            setHasUnappliedEdits(true);
            setForm((current) => ({ ...current, presetId }));
            setGeneralErrors([]);
          }}
          onStartDateChange={(startDate) => {
            setHasUnappliedEdits(true);
            setForm((current) => ({ ...current, startDate }));
            clearFieldError("startDate");
          }}
          onSubmit={handleSubmit}
          onWorkingShiftChange={(workingShift) => {
            setHasUnappliedEdits(true);
            setForm((current) => ({ ...current, workingShift }));
            setGeneralErrors([]);
          }}
          presetId={form.presetId}
          startDate={form.startDate}
          workingShift={form.workingShift}
        />
      </div>

      <LocalPlannerPanel
        activePlanner={activePlanner}
        canSave={generated !== null}
        onConfirmImport={confirmImport}
        onDelete={deletePlanner}
        onDuplicate={duplicatePlanner}
        onExportAll={exportAllPlanners}
        onExportOne={exportOnePlanner}
        onNewUnsaved={newUnsavedPlanner}
        onOpen={openPlanner}
        onPrepareImport={prepareImport}
        onReloadActive={reloadActivePlanner}
        onRename={renamePlanner}
        onRetrySave={retryActiveSave}
        onSave={saveCurrentPlanner}
        planners={savedPlanners}
        saveState={saveState}
        storageMessage={storageMessage}
      />

      <PwaController />

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
          <DateExceptionEditor
            config={generated.config}
            exceptions={dateExceptions}
            initialDate={generated.view.from}
            onApply={(value) => {
              setDateExceptions((current) =>
                upsertDateException(current, value),
              );
              setStatusMessage(`Private date change saved for ${value.date}.`);
            }}
            onRemove={(date, layer) => {
              setDateExceptions((current) =>
                removeDateExceptionLayer(current, date, layer),
              );
              setStatusMessage(
                layer === "all"
                  ? `Generated schedule restored for ${date}.`
                  : `Private ${layer === "additionalWork" ? "additional work" : layer} removed for ${date}.`,
              );
            }}
            registry={effectiveRegistry}
          />
          <ScheduleActions
            activeView={viewMode}
            config={generated.config}
            effectiveMonth={
              effectiveMonthResult?.ok ? effectiveMonthResult.value : undefined
            }
            effectiveYear={
              effectiveYearResult?.ok ? effectiveYearResult.value : undefined
            }
            hasPrivateDateChanges={dateExceptions.length > 0}
            hasPrivateShiftDetails={generated.planner !== null}
            onPrint={() => window.print()}
            onTimeZoneConfirmed={setPlannerTimeZone}
            timeZone={plannerTimeZone}
            view={generated.view}
            weekStart={weekStart}
            yearlyView={yearlyView}
          />
          {insightResult ? <ScheduleInsights result={insightResult} /> : null}
          {viewMode === "month" ? (
            <MonthlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleMonthNavigation}
              planner={generated.planner}
              effectiveDates={
                hasPrivatePlannerState && effectiveMonthResult?.ok
                  ? effectiveMonthResult.value
                  : undefined
              }
              statistics={
                hasPrivatePlannerState && effectiveMonthResult?.ok
                  ? calculateMonthlyEffectiveStatistics(
                      effectiveMonthResult.value,
                      generated.view.viewMonth,
                    )
                  : null
              }
              view={generated.view}
            />
          ) : yearlyView ? (
            <YearlyCalendar
              config={generated.config}
              headingRef={resultHeadingRef}
              onNavigate={handleYearNavigation}
              planner={generated.planner}
              effectiveDates={
                hasPrivatePlannerState && effectiveYearResult?.ok
                  ? effectiveYearResult.value
                  : undefined
              }
              statistics={
                hasPrivatePlannerState && effectiveYearResult?.ok
                  ? calculateYearlyEffectiveStatistics(
                      effectiveYearResult.value,
                      yearlyView.year,
                    )
                  : null
              }
              view={yearlyView}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
