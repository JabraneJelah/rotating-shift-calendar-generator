import { useRef, useState } from "react";

import { CalendarDays, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  parseISODate,
  resolveScheduleOccurrence,
  type ISODate,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import {
  projectEffectiveSchedule,
  validateDateException,
  type DateException,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";
import { formatFullDate } from "@/features/schedule/presentation/calendar-view";
import { getPlannerErrorMessage } from "@/features/schedule/presentation/planner-error-messages";
import { presentEffectiveDate } from "@/features/schedule/presentation/effective-schedule-presentation";

type PrimaryChoice = "none" | "replacement" | "leave" | "sick" | "training";

type DateExceptionEditorProps = {
  readonly config: ScheduleConfig;
  readonly registry: ShiftDefinitionRegistry;
  readonly exceptions: readonly DateException[];
  readonly initialDate: ISODate;
  readonly onApply: (value: DateException) => void;
  readonly onRemove: (
    date: ISODate,
    layer: "primary" | "additionalWork" | "note" | "all",
  ) => void;
};

export function DateExceptionEditor({
  config,
  registry,
  exceptions,
  initialDate,
  onApply,
  onRemove,
}: DateExceptionEditorProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(initialDate);
  const [primary, setPrimary] = useState<PrimaryChoice>("none");
  const [primaryDefinitionId, setPrimaryDefinitionId] = useState<string>(
    registry.dayDefinitionId,
  );
  const [hasAdditional, setHasAdditional] = useState(false);
  const [additionalDefinitionId, setAdditionalDefinitionId] = useState<string>(
    registry.dayDefinitionId,
  );
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<readonly string[]>([]);
  const dateRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  function loadDraft(nextDate: string) {
    const existing = exceptions.find((item) => item.date === nextDate);
    setDate(nextDate);
    setPrimary(existing?.primary?.type ?? "none");
    setPrimaryDefinitionId(
      existing?.primary !== undefined && "definitionId" in existing.primary
        ? existing.primary.definitionId
        : registry.dayDefinitionId,
    );
    setHasAdditional(existing?.additionalWork !== undefined);
    setAdditionalDefinitionId(
      existing?.additionalWork?.definitionId ?? registry.dayDefinitionId,
    );
    setNote(existing?.note ?? "");
    setErrors([]);
  }

  function openEditor() {
    loadDraft(initialDate);
    setOpen(true);
    window.setTimeout(() => dateRef.current?.focus(), 0);
  }

  function closeEditor() {
    setOpen(false);
    setErrors([]);
    window.setTimeout(
      () => document.getElementById("open-date-exception-editor")?.focus(),
      0,
    );
  }

  const parsedDate = parseISODate(date);
  const base = parsedDate.ok
    ? resolveScheduleOccurrence(config, parsedDate.value)
    : null;
  const currentException = parsedDate.ok
    ? exceptions.find((item) => item.date === parsedDate.value)
    : undefined;
  const effective =
    base === null
      ? null
      : projectEffectiveSchedule(
          [base],
          registry,
          currentException === undefined ? [] : [currentException],
        );

  function save() {
    if (!parsedDate.ok || base === null) {
      setErrors(["Enter a valid supported calendar date."]);
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    const raw = {
      id: `exception-${parsedDate.value}`,
      date: parsedDate.value,
      ...(primary === "none"
        ? {}
        : primary === "leave" || primary === "sick"
          ? { primary: { type: primary } }
          : { primary: { type: primary, definitionId: primaryDefinitionId } }),
      ...(hasAdditional
        ? { additionalWork: { definitionId: additionalDefinitionId } }
        : {}),
      ...(note === "" ? {} : { note }),
    };
    const result = validateDateException(raw, registry, base);
    if (!result.ok) {
      setErrors([...new Set(result.errors.map(getPlannerErrorMessage))]);
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }
    onApply(result.value);
    closeEditor();
  }

  const selectedEffective =
    effective?.ok && effective.value[0] !== undefined
      ? presentEffectiveDate(effective.value[0])
      : null;
  const hasExisting = currentException !== undefined;

  return (
    <section className="date-exception-region print-hidden mt-5">
      {!open ? (
        <Button
          id="open-date-exception-editor"
          onClick={openEditor}
          type="button"
          variant="outline"
        >
          <CalendarDays aria-hidden="true" className="mr-2 size-4" />
          Add or edit date
        </Button>
      ) : (
        <div className="border-border bg-muted/35 rounded-xl border p-4 sm:p-5">
          <h4 className="font-bold">Private date change</h4>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Changes affect one date only and are temporary until local saving is
            added.
          </p>
          {errors.length > 0 ? (
            <div
              className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950 outline-none"
              ref={errorRef}
              role="alert"
              tabIndex={-1}
            >
              <p className="font-bold">Check this date change</p>
              <ul className="mt-1 list-disc pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold" htmlFor="exception-date">
                Date
              </label>
              <input
                aria-invalid={!parsedDate.ok || undefined}
                className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3"
                id="exception-date"
                max="9999-12-31"
                min="0001-01-01"
                onChange={(event) => loadDraft(event.target.value)}
                ref={dateRef}
                type="date"
                value={date}
              />
            </div>
            <div className="bg-background rounded-lg border p-3 text-sm">
              <p>
                <span className="font-semibold">Generated:</span>{" "}
                {base === null
                  ? "Choose a valid date"
                  : base.shift === "day"
                    ? "Day shift"
                    : base.shift === "night"
                      ? "Night shift"
                      : "Off"}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Effective:</span>{" "}
                {selectedEffective?.description ?? "No valid effective state"}
              </p>
              {parsedDate.ok ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatFullDate(parsedDate.value)}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="text-sm font-semibold"
                htmlFor="primary-exception"
              >
                Primary change
              </label>
              <select
                className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3"
                id="primary-exception"
                onChange={(event) =>
                  setPrimary(event.target.value as PrimaryChoice)
                }
                value={primary}
              >
                <option value="none">Keep generated shift</option>
                <option value="replacement">Replace with working shift</option>
                <option value="leave">Leave</option>
                <option value="sick">Sick</option>
                <option value="training">Training</option>
              </select>
            </div>
            {primary === "replacement" || primary === "training" ? (
              <div>
                <label
                  className="text-sm font-semibold"
                  htmlFor="primary-definition"
                >
                  Working shift
                </label>
                <select
                  className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3"
                  id="primary-definition"
                  onChange={(event) =>
                    setPrimaryDefinitionId(event.target.value)
                  }
                  value={primaryDefinitionId}
                >
                  {registry.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border p-3">
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input
                checked={hasAdditional}
                onChange={(event) => setHasAdditional(event.target.checked)}
                type="checkbox"
              />
              Add one additional-work occurrence
            </label>
            {hasAdditional ? (
              <div className="mt-2">
                <label
                  className="text-sm font-semibold"
                  htmlFor="additional-definition"
                >
                  Additional working shift
                </label>
                <select
                  className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 outline-none focus-visible:ring-3 sm:max-w-sm"
                  id="additional-definition"
                  onChange={(event) =>
                    setAdditionalDefinitionId(event.target.value)
                  }
                  value={additionalDefinitionId}
                >
                  {registry.definitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="personal-note">
              Private personal note
            </label>
            <p
              className="text-muted-foreground mt-1 text-xs"
              id="personal-note-help"
            >
              Plain text, up to 500 characters. Notes are not shared, exported,
              or printed. Do not record diagnoses or sensitive medical details.
            </p>
            <textarea
              aria-describedby="personal-note-help"
              className="border-input bg-background focus-visible:ring-ring/45 mt-2 min-h-24 w-full rounded-lg border p-3 outline-none focus-visible:ring-3"
              id="personal-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={save} type="button">
              Save date change
            </Button>
            <Button onClick={closeEditor} type="button" variant="outline">
              Cancel
            </Button>
            {hasExisting && currentException?.primary !== undefined ? (
              <Button
                onClick={() => {
                  onRemove(currentException.date, "primary");
                  setPrimary("none");
                }}
                type="button"
                variant="outline"
              >
                Remove primary change
              </Button>
            ) : null}
            {hasExisting && currentException?.additionalWork !== undefined ? (
              <Button
                onClick={() => {
                  onRemove(currentException.date, "additionalWork");
                  setHasAdditional(false);
                }}
                type="button"
                variant="outline"
              >
                Remove additional work
              </Button>
            ) : null}
            {hasExisting && currentException?.note !== undefined ? (
              <Button
                onClick={() => {
                  onRemove(currentException.date, "note");
                  setNote("");
                }}
                type="button"
                variant="outline"
              >
                Remove note
              </Button>
            ) : null}
            {hasExisting ? (
              <Button
                onClick={() => {
                  onRemove(currentException.date, "all");
                  closeEditor();
                }}
                type="button"
                variant="outline"
              >
                <RotateCcw aria-hidden="true" className="mr-2 size-4" /> Restore
                generated schedule
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
