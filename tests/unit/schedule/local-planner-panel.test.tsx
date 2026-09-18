import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LocalPlannerPanel } from "@/features/schedule/components/local-planner-panel";
import type {
  ImportReview,
  PersistedPlannerV1,
  PlannerSummary,
} from "@/features/schedule/persistence";

const summary: PlannerSummary = {
  id: "6ac1a6a8-1bf2-4a57-9a85-7e29c43e64c1",
  name: "Primary rotation",
  revision: 2,
  createdAt: "2026-09-01T09:00:00.000Z",
  updatedAt: "2026-09-18T11:45:00.000Z",
};

function props(overrides: Record<string, unknown> = {}) {
  return {
    activePlanner: null,
    canSave: true,
    planners: [] as readonly PlannerSummary[],
    saveState: "unsaved" as const,
    storageMessage: null,
    onSave: vi.fn(async () => undefined),
    onOpen: vi.fn(async () => undefined),
    onRename: vi.fn(async () => undefined),
    onDuplicate: vi.fn(async () => undefined),
    onDelete: vi.fn(async () => undefined),
    onNewUnsaved: vi.fn(async () => undefined),
    onExportOne: vi.fn(async () => undefined),
    onExportAll: vi.fn(async () => undefined),
    onPrepareImport: vi.fn(async () => {
      throw new Error("not configured");
    }),
    onConfirmImport: vi.fn(async () => 0),
    onRetrySave: vi.fn(async () => undefined),
    onReloadActive: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("local planner panel", () => {
  it("requires an explicit name and invokes first save", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<LocalPlannerPanel {...props({ onSave })} />);
    expect(screen.getByText("Unsaved planner")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Planner name"), {
      target: { value: "My rotation" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save planner" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("My rotation"));
    expect(await screen.findByText("Planner saved locally.")).toHaveClass(
      "sr-only",
    );
  });

  it("supports keyboard-reachable management and confirmed deletion", async () => {
    const onOpen = vi.fn(async () => undefined);
    const onDelete = vi.fn(async () => undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <LocalPlannerPanel
        {...props({ planners: [summary], onOpen, onDelete })}
      />,
    );
    fireEvent.click(screen.getByText("Manage saved planners (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(summary.id));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Primary rotation" }),
    );
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(summary.id));
  });

  it("shows an import review before the explicit atomic import action", async () => {
    const source = {
      ...summary,
      schemaVersion: 1,
      domainVersion: 1,
    } as unknown as PersistedPlannerV1;
    const review: ImportReview = {
      exportedAt: "2026-09-18T12:00:00.000Z",
      backupVersion: 1,
      planners: [
        {
          source,
          proposedName: "Primary rotation (imported)",
          nameAdjusted: true,
        },
      ],
    };
    const onPrepareImport = vi.fn(async () => review);
    const onConfirmImport = vi.fn(async () => 1);
    render(
      <LocalPlannerPanel {...props({ onPrepareImport, onConfirmImport })} />,
    );
    fireEvent.click(screen.getByText("Manage saved planners (0)"));
    const file = new File(["{}"], "backup.json", {
      type: "application/json",
    });
    fireEvent.change(screen.getByLabelText("Import JSON backup"), {
      target: { files: [file] },
    });
    expect(
      await screen.findByRole("heading", { name: "Review import" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Existing planners will not be overwritten/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import as new" }));
    await waitFor(() => expect(onConfirmImport).toHaveBeenCalledWith(review));
  });
});
