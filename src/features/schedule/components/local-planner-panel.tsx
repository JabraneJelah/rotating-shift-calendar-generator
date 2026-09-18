import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
  CopyPlus,
  Database,
  Download,
  FileUp,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PlannerPersistenceError,
  persistenceErrorMessage,
  type ImportReview,
  type PersistedPlannerV1,
  type PlannerSummary,
  type SaveState,
} from "@/features/schedule/persistence";

type LocalPlannerPanelProps = {
  readonly activePlanner: PersistedPlannerV1 | null;
  readonly canSave: boolean;
  readonly planners: readonly PlannerSummary[];
  readonly saveState: SaveState;
  readonly storageMessage: string | null;
  readonly onSave: (name: string) => Promise<void>;
  readonly onOpen: (id: string) => Promise<void>;
  readonly onRename: (id: string, name: string) => Promise<void>;
  readonly onDuplicate: (id: string, name: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onNewUnsaved: () => Promise<void>;
  readonly onExportOne: (id: string) => Promise<void>;
  readonly onExportAll: () => Promise<void>;
  readonly onPrepareImport: (file: File) => Promise<ImportReview>;
  readonly onConfirmImport: (review: ImportReview) => Promise<number>;
  readonly onRetrySave: () => Promise<void>;
  readonly onReloadActive: () => Promise<void>;
};

type NameAction = {
  readonly kind: "rename" | "duplicate";
  readonly id: string;
  readonly value: string;
};

function saveStateLabel(state: SaveState): string {
  switch (state) {
    case "unsaved":
      return "Unsaved planner";
    case "saving":
      return "Saving locally…";
    case "saved":
      return "Saved locally";
    case "failed":
      return "Local save failed";
    case "conflict":
      return "Conflict detected";
    case "unavailable":
      return "Local saving unavailable";
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function messageFor(error: unknown): string {
  return error instanceof PlannerPersistenceError
    ? persistenceErrorMessage(error)
    : "The local planner action could not be completed. Try again.";
}

export function LocalPlannerPanel({
  activePlanner,
  canSave,
  planners,
  saveState,
  storageMessage,
  onSave,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onNewUnsaved,
  onExportOne,
  onExportAll,
  onPrepareImport,
  onConfirmImport,
  onRetrySave,
  onReloadActive,
}: LocalPlannerPanelProps) {
  const [saveName, setSaveName] = useState("");
  const [nameAction, setNameAction] = useState<NameAction | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (success !== undefined) setResult(success);
    } catch (caught) {
      setError(messageFor(caught));
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setBusy(false);
    }
  }

  async function submitSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      await onSave(saveName);
      setSaveName("");
    }, "Planner saved locally.");
  }

  async function submitNameAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nameAction === null) return;
    await run(
      async () => {
        if (nameAction.kind === "rename") {
          await onRename(nameAction.id, nameAction.value);
        } else {
          await onDuplicate(nameAction.id, nameAction.value);
        }
        setNameAction(null);
      },
      nameAction.kind === "rename" ? "Planner renamed." : "Planner duplicated.",
    );
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;
    await run(async () => {
      setReview(await onPrepareImport(file));
    });
  }

  return (
    <section
      aria-labelledby="local-planners-title"
      className="border-border bg-muted/30 mt-6 rounded-2xl border p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            className="flex items-center gap-2 font-bold"
            id="local-planners-title"
          >
            <Database aria-hidden="true" className="size-4" />
            Local planners
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Saved only in this browser. No account or cloud synchronization.
            Clearing site data can remove saved planners.
          </p>
        </div>
        <p className="bg-background rounded-full border px-3 py-1 text-xs font-semibold">
          {saveStateLabel(saveState)}
        </p>
      </div>

      {storageMessage !== null ? (
        <p
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
          role="alert"
        >
          {storageMessage}
        </p>
      ) : null}

      {saveState === "failed" || saveState === "conflict" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {saveState === "failed" ? (
            <Button
              disabled={busy}
              onClick={() => void run(onRetrySave)}
              type="button"
              variant="outline"
            >
              Retry save
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() => void run(onReloadActive)}
              type="button"
              variant="outline"
            >
              Reload newer saved copy
            </Button>
          )}
        </div>
      ) : null}

      {error !== null ? (
        <div
          className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950 outline-none"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          {error}
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {result}
      </p>

      {activePlanner === null ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => void submitSave(event)}
        >
          <div className="min-w-0 flex-1">
            <label
              className="text-sm font-semibold"
              htmlFor="planner-save-name"
            >
              Planner name
            </label>
            <input
              className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
              disabled={!canSave || saveState === "unavailable" || busy}
              id="planner-save-name"
              maxLength={60}
              onChange={(event) => setSaveName(event.currentTarget.value)}
              required
              value={saveName}
            />
          </div>
          <Button
            disabled={!canSave || saveState === "unavailable" || busy}
            type="submit"
          >
            Save planner
          </Button>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm">
            Current:{" "}
            <strong className="break-words">{activePlanner.name}</strong>
          </p>
          <Button
            disabled={busy || saveState === "saving"}
            onClick={() => void run(onNewUnsaved)}
            type="button"
            variant="outline"
          >
            New unsaved planner
          </Button>
        </div>
      )}

      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
          Manage saved planners ({planners.length})
        </summary>

        {planners.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">
            No planners saved on this browser yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {planners.map((planner) => (
              <li
                className="bg-background rounded-xl border p-3"
                key={planner.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold break-words">
                      {planner.name}
                      {activePlanner?.id === planner.id ? (
                        <span className="text-primary ml-2 text-xs">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Updated {new Date(planner.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={
                        busy ||
                        saveState === "saving" ||
                        activePlanner?.id === planner.id
                      }
                      onClick={() => void run(() => onOpen(planner.id))}
                      type="button"
                      variant="outline"
                    >
                      Open
                    </Button>
                    <Button
                      aria-label={`Rename ${planner.name}`}
                      className="px-3"
                      disabled={busy}
                      onClick={() =>
                        setNameAction({
                          kind: "rename",
                          id: planner.id,
                          value: planner.name,
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      aria-label={`Duplicate ${planner.name}`}
                      className="px-3"
                      disabled={busy}
                      onClick={() =>
                        setNameAction({
                          kind: "duplicate",
                          id: planner.id,
                          value: `${planner.name} copy`,
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      <CopyPlus aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => onExportOne(planner.id),
                          "Private JSON backup downloaded.",
                        )
                      }
                      type="button"
                      variant="outline"
                    >
                      <Download aria-hidden="true" className="mr-2 size-4" />
                      JSON
                    </Button>
                    <Button
                      aria-label={`Delete ${planner.name}`}
                      className="px-3"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete the local saved copy of “${planner.name}”?`,
                          )
                        ) {
                          void run(
                            () => onDelete(planner.id),
                            "Local saved copy deleted.",
                          );
                        }
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>

                {nameAction?.id === planner.id ? (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(event) => void submitNameAction(event)}
                  >
                    <div className="min-w-0 flex-1">
                      <label
                        className="text-sm font-semibold"
                        htmlFor={`planner-action-name-${planner.id}`}
                      >
                        {nameAction.kind === "rename"
                          ? "New planner name"
                          : "Duplicate name"}
                      </label>
                      <input
                        autoFocus
                        className="border-input bg-background focus-visible:ring-ring/45 mt-1 min-h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
                        id={`planner-action-name-${planner.id}`}
                        maxLength={60}
                        onChange={(event) =>
                          setNameAction({
                            ...nameAction,
                            value: event.currentTarget.value,
                          })
                        }
                        required
                        value={nameAction.value}
                      />
                    </div>
                    <Button disabled={busy} type="submit">
                      {nameAction.kind === "rename" ? "Rename" : "Duplicate"}
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => setNameAction(null)}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              className="text-sm font-semibold"
              htmlFor="planner-backup-file"
            >
              Import JSON backup
            </label>
            <input
              accept=".json,application/json"
              className="file:bg-primary file:text-primary-foreground mt-1 block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:font-semibold"
              disabled={saveState === "unavailable" || busy}
              id="planner-backup-file"
              onChange={(event) => void selectBackup(event)}
              type="file"
            />
          </div>
          <Button
            disabled={planners.length === 0 || busy}
            onClick={() =>
              void run(onExportAll, "Private all-planner backup downloaded.")
            }
            type="button"
            variant="outline"
          >
            Export all JSON
          </Button>
        </div>

        {review !== null ? (
          <section
            aria-labelledby="import-review-title"
            className="bg-background mt-4 rounded-xl border p-4"
          >
            <h4 className="font-bold" id="import-review-title">
              Review import
            </h4>
            <p className="text-muted-foreground mt-1 text-sm">
              {review.planners.length} planner
              {review.planners.length === 1 ? "" : "s"}; backup version{" "}
              {review.backupVersion}; exported{" "}
              {new Date(review.exportedAt).toLocaleString()}.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {review.planners.map(({ source, proposedName, nameAdjusted }) => (
                <li key={source.id}>
                  {proposedName}
                  {nameAdjusted ? ` (renamed from ${source.name})` : ""} ·
                  schema {source.schemaVersion}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              These become new local planners. Existing planners will not be
              overwritten.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const count = await onConfirmImport(review);
                    setReview(null);
                    setResult(
                      `${count} planner${count === 1 ? "" : "s"} imported as new.`,
                    );
                  })
                }
                type="button"
              >
                <FileUp aria-hidden="true" className="mr-2 size-4" />
                Import as new
              </Button>
              <Button
                disabled={busy}
                onClick={() => setReview(null)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </section>
        ) : null}

        <p className="text-muted-foreground mt-4 text-xs leading-5">
          JSON backups may contain private shift times, absences, notes, and
          timezone details. Treat them as private documents. Browser storage is
          not encrypted secure storage. Copy link continues to share only the
          base schedule.
        </p>
      </details>
    </section>
  );
}
