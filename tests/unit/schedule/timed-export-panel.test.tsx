import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  expandSchedule,
  parseISODate,
  parseISOYearMonth,
  validateScheduleConfig,
  type ScheduleConfig,
} from "@/features/schedule/domain";
import { TimedExportPanel } from "@/features/schedule/components/timed-export-panel";
import {
  projectEffectiveSchedule,
  validateShiftDefinitionRegistry,
  type EffectiveScheduleDate,
} from "@/features/schedule/planner";

function fixture(
  day = "2026-06-01",
  startTime?: string,
  endTime?: string,
): {
  readonly config: ScheduleConfig;
  readonly dates: readonly EffectiveScheduleDate[];
} {
  const config = validateScheduleConfig({
    kind: "custom",
    version: 1,
    startDate: day,
    cycle: ["day"],
  });
  const registry = validateShiftDefinitionRegistry({
    definitions: [
      {
        id: "builtin-day",
        name: "Day shift",
        shortLabel: "D",
        category: "day",
        color: "amber",
        ...(startTime === undefined ? {} : { startTime, endTime }),
      },
      {
        id: "builtin-night",
        name: "Night shift",
        shortLabel: "N",
        category: "night",
        color: "indigo",
        ...(startTime === undefined ? {} : { startTime, endTime }),
      },
    ],
    dayDefinitionId: "builtin-day",
    nightDefinitionId: "builtin-night",
  });
  const date = parseISODate(day);
  if (!config.ok || !registry.ok || !date.ok) throw new Error("fixture");
  const expanded = expandSchedule(config.value, date.value, date.value);
  if (!expanded.ok) throw new Error("fixture");
  const effective = projectEffectiveSchedule(
    expanded.value,
    registry.value,
    [],
  );
  if (!effective.ok) throw new Error("fixture");
  return { config: config.value, dates: effective.value };
}

function month(value = "2026-06") {
  const result = parseISOYearMonth(value);
  if (!result.ok) throw new Error("month fixture");
  return result.value;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("timed export panel", () => {
  it("loads verified zones without selecting one automatically", async () => {
    const value = fixture("2026-06-01", "08:00", "16:00");
    render(
      <TimedExportPanel
        {...value}
        onClose={() => undefined}
        scope={{ viewMonth: month() }}
      />,
    );
    expect(
      screen.getByText("Loading verified timezone data…"),
    ).toBeInTheDocument();
    const input = await screen.findByLabelText("Time zone");
    expect(input).toHaveValue("");
    expect(screen.getByText(/IANA 2026d/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download timed calendar" }),
    ).toBeDisabled();
  });

  it("reports untimed work and preserves the all-day fallback", async () => {
    const value = fixture();
    render(
      <TimedExportPanel
        {...value}
        onClose={() => undefined}
        scope={{ viewMonth: month() }}
      />,
    );
    const input = await screen.findByLabelText("Time zone");
    fireEvent.change(input, { target: { value: "UTC" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Download timed calendar" }),
    );
    expect(
      await screen.findByText(/1 occurrence is missing times/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/all-day export remains available/i),
    ).toBeInTheDocument();
  });

  it("explains the timed-only supported range without hiding all-day export", async () => {
    const value = fixture("2038-01-01", "08:00", "16:00");
    render(
      <TimedExportPanel
        {...value}
        onClose={() => undefined}
        scope={{ viewMonth: month("2038-01") }}
      />,
    );
    const input = await screen.findByLabelText("Time zone");
    fireEvent.change(input, { target: { value: "UTC" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Download timed calendar" }),
    );
    expect(
      await screen.findByText(
        "Timed calendar export currently supports schedules from 1970 through 2037. You can still use the all-day calendar export for this date.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a DST gap instead of shifting it", async () => {
    const value = fixture("2026-03-08", "02:30", "10:30");
    render(
      <TimedExportPanel
        {...value}
        onClose={() => undefined}
        scope={{ viewMonth: month("2026-03") }}
      />,
    );
    const input = await screen.findByLabelText("Time zone");
    fireEvent.change(input, { target: { value: "America/New_York" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Download timed calendar" }),
    );
    expect(
      await screen.findByText(/does not exist in America\/New_York/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/clocks move forward/i).length).toBeGreaterThan(
      0,
    );
  });

  it("requires an explicit overlap choice before downloading", async () => {
    const value = fixture("2026-11-01", "01:30", "09:30");
    render(
      <TimedExportPanel
        {...value}
        onClose={() => undefined}
        scope={{ viewMonth: month("2026-11") }}
      />,
    );
    const input = await screen.findByLabelText("Time zone");
    fireEvent.change(input, { target: { value: "America/New_York" } });
    const download = screen.getByRole("button", {
      name: "Download timed calendar",
    });
    fireEvent.click(download);
    const later = await screen.findByLabelText(/later occurrence/i);
    expect(download).toBeDisabled();
    expect(later).not.toBeChecked();
    fireEvent.click(later);
    await waitFor(() => expect(download).toBeEnabled());
  });
});
