import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScheduleGenerator } from "@/features/schedule";
import {
  SCHEDULE_ERROR_MESSAGES,
  getScheduleErrorMessage,
} from "@/features/schedule/presentation/schedule-error-messages";
import {
  PLANNER_ERROR_MESSAGES,
  getPlannerErrorMessage,
} from "@/features/schedule/presentation/planner-error-messages";

function setStartDate(value: string) {
  fireEvent.change(screen.getByLabelText(/pattern start date/i), {
    target: { value },
  });
}

function generate() {
  fireEvent.click(screen.getByRole("button", { name: /generate schedule/i }));
}

function openShiftDetails() {
  fireEvent.click(screen.getByText("Shift details (optional)"));
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generator form", () => {
  it("starts in preset mode without inventing a date or result", async () => {
    render(<ScheduleGenerator />);

    expect(screen.getByLabelText(/preset schedule/i)).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Shift pattern" })).toHaveValue(
      "4-on-4-off",
    );
    expect(screen.getByLabelText(/day shift/i)).toBeChecked();
    expect(screen.getByLabelText(/pattern start date/i)).toHaveValue("");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("switches to an editable custom cycle", () => {
    render(<ScheduleGenerator />);

    fireEvent.click(screen.getByLabelText(/custom cycle/i));

    expect(
      screen.getByRole("group", { name: /repeating cycle/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/shift for cycle day 1/i)).toHaveValue("day");
    expect(screen.getByLabelText(/shift for cycle day 3/i)).toHaveValue("off");
  });

  it("adds and removes cycle positions but preserves one editor row", () => {
    render(<ScheduleGenerator />);
    fireEvent.click(screen.getByLabelText(/custom cycle/i));

    fireEvent.click(screen.getByRole("button", { name: /add cycle day/i }));
    expect(screen.getByLabelText(/shift for cycle day 5/i)).toHaveValue("off");

    for (let count = 0; count < 4; count += 1) {
      fireEvent.click(
        screen.getByRole("button", { name: /remove cycle day 1/i }),
      );
    }

    expect(screen.getByLabelText(/shift for cycle day 1/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove cycle day 1/i }),
    ).toBeDisabled();
  });

  it("lets preset users choose a fixed night shift", () => {
    render(<ScheduleGenerator />);

    fireEvent.click(screen.getByLabelText(/night shift/i));

    expect(screen.getByLabelText(/night shift/i)).toBeChecked();
    expect(screen.getByLabelText(/day shift/i)).not.toBeChecked();
  });

  it("groups all six presets and shows a persistent domain-derived preview", () => {
    render(<ScheduleGenerator />);

    const select = screen.getByRole("combobox", { name: "Shift pattern" });
    expect(select.querySelectorAll("option")).toHaveLength(6);
    expect(
      Array.from(select.querySelectorAll("optgroup"), (group) => group.label),
    ).toEqual(["Fixed Day or Night", "Rotating Day and Night"]);
    expect(
      screen.getByRole("region", { name: "4 On / 4 Off" }),
    ).toHaveTextContent(/8-day cycle/i);
    expect(screen.getByText(/D = Day · N = Night · O = Off/i)).toBeVisible();
  });

  it("hides working shift for rotating presets and restores the fixed choice", () => {
    render(<ScheduleGenerator />);
    const select = screen.getByRole("combobox", { name: "Shift pattern" });

    fireEvent.click(screen.getByLabelText(/night shift/i));
    fireEvent.change(select, { target: { value: "dupont-28-day" } });

    expect(screen.queryByLabelText(/day shift/i)).not.toBeInTheDocument();
    const preview = screen.getByRole("region", {
      name: "DuPont 28-Day Rotation",
    });
    expect(preview).toHaveTextContent(/28-day cycle/i);
    expect(preview).toHaveTextContent(/position 28: Off/i);

    fireEvent.change(select, { target: { value: "7-on-7-off-fixed" } });
    expect(screen.getByLabelText(/night shift/i)).toBeChecked();
  });

  it("switches among preset and custom modes without changing the start date", () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    fireEvent.change(screen.getByRole("combobox", { name: "Shift pattern" }), {
      target: { value: "2-day-2-night-4-off" },
    });
    fireEvent.click(screen.getByLabelText(/custom cycle/i));
    fireEvent.click(screen.getByLabelText(/preset schedule/i));

    expect(screen.getByLabelText(/pattern start date/i)).toHaveValue(
      "2026-10-01",
    );
    expect(screen.getByRole("combobox", { name: "Shift pattern" })).toHaveValue(
      "2-day-2-night-4-off",
    );
  });

  it("shows a connected start-date error and focuses the summary", async () => {
    render(<ScheduleGenerator />);

    generate();

    const input = screen.getByLabelText(/pattern start date/i);
    const alert = screen.getByRole("alert", {
      name: /check your schedule details/i,
    });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("Enter a valid date.").length).toBeGreaterThan(
      0,
    );
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it("reports an all-off custom cycle without clearing the form", async () => {
    render(<ScheduleGenerator />);
    fireEvent.click(screen.getByLabelText(/custom cycle/i));

    for (const select of screen.getAllByRole("combobox")) {
      fireEvent.change(select, { target: { value: "off" } });
    }

    setStartDate("2026-10-01");
    generate();

    expect(
      screen.getAllByText(/must include at least one day or night shift/i)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText(/pattern start date/i)).toHaveValue(
      "2026-10-01",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("alert", { name: /check your schedule details/i }),
      ).toHaveFocus(),
    );
  });
});

describe("monthly generation", () => {
  it("generates the preset month, summary, cells, and canonical query", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();

    const table = await screen.findByRole("table", {
      name: /october 2026 work schedule/i,
    });
    const totals = screen.getByLabelText(/monthly shift totals/i);

    expect(table.querySelectorAll("time")).toHaveLength(31);
    expect(
      screen.getByRole("cell", {
        name: /thursday, october 1, 2026 — day shift/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: /monday, october 5, 2026 — off/i }),
    ).toBeInTheDocument();
    expect(within(totals).getByText("16")).toBeInTheDocument();
    expect(within(totals).getByText("15")).toBeInTheDocument();
    expect(window.location.search).toBe(
      "?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "October 2026" }),
      ).toHaveFocus(),
    );
  });

  it("generates a custom cycle with visible Day, Night, and Off labels", async () => {
    render(<ScheduleGenerator />);
    fireEvent.click(screen.getByLabelText(/custom cycle/i));
    fireEvent.change(screen.getByLabelText(/shift for cycle day 2/i), {
      target: { value: "night" },
    });
    setStartDate("2026-10-01");
    generate();

    const table = await screen.findByRole("table");

    expect(within(table).getAllByText("Day").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Night").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Off").length).toBeGreaterThan(0);
    expect(window.location.search).toContain("kind=custom");
    expect(window.location.search).toContain("cycle=d,n,o,o");
  });

  it.each([
    ["2-day-2-night-4-off", "day shift", "night shift"],
    ["dupont-28-day", "night shift", "off"],
    ["7-day-7-off-7-night-7-off", "day shift", "night shift"],
  ] as const)(
    "generates rotating preset %s without a shift parameter",
    async (presetId, firstLabel, laterLabel) => {
      render(<ScheduleGenerator />);
      fireEvent.change(
        screen.getByRole("combobox", { name: "Shift pattern" }),
        { target: { value: presetId } },
      );
      setStartDate("2026-10-01");
      generate();

      await screen.findByRole("table", { name: /october 2026/i });
      expect(window.location.search).toContain(`p=${presetId}`);
      expect(window.location.search).not.toContain("shift=");
      expect(
        screen.getByRole("cell", {
          name: new RegExp(`october 1, 2026 — ${firstLabel}`, "i"),
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("cell", { name: new RegExp(laterLabel, "i") })
          .length,
      ).toBeGreaterThan(0);
    },
  );

  it("generates fixed 7-on/7-off Night with a shift parameter", async () => {
    render(<ScheduleGenerator />);
    fireEvent.change(screen.getByRole("combobox", { name: "Shift pattern" }), {
      target: { value: "7-on-7-off-fixed" },
    });
    fireEvent.click(screen.getByLabelText(/night shift/i));
    setStartDate("2026-10-01");
    generate();

    expect(
      await screen.findByRole("cell", {
        name: /october 1, 2026 — night shift/i,
      }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain(
      "p=7-on-7-off-fixed&s=2026-10-01&shift=night",
    );
  });

  it("restores a rotating URL and keeps it canonical without shift", async () => {
    window.history.replaceState(
      null,
      "",
      "/?s=2026-10-01&p=2-day-2-night-4-off&kind=preset&v=1",
    );
    render(<ScheduleGenerator />);

    await screen.findByRole("table", { name: /october 2026/i });
    expect(screen.getByRole("combobox", { name: "Shift pattern" })).toHaveValue(
      "2-day-2-night-4-off",
    );
    expect(screen.queryByLabelText(/working shift/i)).not.toBeInTheDocument();
    expect(window.location.search).toBe(
      "?v=1&kind=preset&p=2-day-2-night-4-off&s=2026-10-01&m=2026-10",
    );
  });

  it("navigates across a year boundary and replaces the view month", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-12-01");
    generate();
    await screen.findByRole("table", { name: /december 2026/i });

    fireEvent.click(screen.getByRole("button", { name: /show next month/i }));

    expect(
      await screen.findByRole("table", { name: /january 2027/i }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("m=2027-01");
  });

  it("restores and canonicalizes a valid query", async () => {
    window.history.replaceState(
      null,
      "",
      "/?shift=night&s=2026-10-01&p=2-2-3&kind=preset&v=1",
    );

    render(<ScheduleGenerator />);

    expect(
      await screen.findByRole("table", { name: /october 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/pattern start date/i)).toHaveValue(
      "2026-10-01",
    );
    expect(screen.getByRole("radio", { name: /^night shift/i })).toBeChecked();
    expect(window.location.search).toBe(
      "?v=1&kind=preset&p=2-2-3&s=2026-10-01&shift=night&m=2026-10",
    );
  });

  it("defaults old links to Monday and replaces the URL for Sunday-first presentation", async () => {
    window.history.replaceState(
      null,
      "",
      "/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10",
    );
    render(<ScheduleGenerator />);

    const table = await screen.findByRole("table", { name: /october 2026/i });
    expect(screen.getByRole("radio", { name: "Monday" })).toBeChecked();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

    const replaceState = vi.spyOn(window.history, "replaceState");
    fireEvent.click(screen.getByRole("radio", { name: "Sunday" }));

    expect(screen.getByRole("radio", { name: "Sunday" })).toBeChecked();
    expect(window.location.search).toMatch(/&m=2026-10&ws=sun$/);
    expect(replaceState).toHaveBeenCalledOnce();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("restores Sunday-first state from a canonical link", async () => {
    window.history.replaceState(
      null,
      "",
      "/?v=1&kind=custom&s=2026-10-01&cycle=d,n,o&m=2026-10&ws=sun",
    );
    render(<ScheduleGenerator />);

    const table = await screen.findByRole("table", { name: /october 2026/i });
    expect(screen.getByRole("radio", { name: "Sunday" })).toBeChecked();
    expect(within(table).getAllByRole("columnheader")[0]).toHaveTextContent(
      "Sun",
    );
  });

  it("renders every date in leap February from a valid link", async () => {
    window.history.replaceState(
      null,
      "",
      "/?v=1&kind=preset&p=4-on-4-off&s=2028-02-01&shift=day&m=2028-02",
    );

    render(<ScheduleGenerator />);

    const table = await screen.findByRole("table", { name: /february 2028/i });
    expect(table.querySelectorAll("time")).toHaveLength(29);
    expect(
      screen.getByRole("cell", { name: /tuesday, february 29, 2028/i }),
    ).toBeInTheDocument();
  });

  it("handles an invalid shared query without crashing", async () => {
    window.history.replaceState(null, "", "/?v=2&kind=preset");

    render(<ScheduleGenerator />);

    expect(
      await screen.findByRole("alert", {
        name: /unable to open this schedule link/i,
      }),
    ).toHaveTextContent(/unsupported version/i);
    expect(
      screen.getByRole("button", { name: /generate schedule/i }),
    ).toBeEnabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows separate next-schedule and next-working-day information", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();

    const insights = await screen.findByRole("region", { name: /up next/i });
    expect(within(insights).getByText(/next schedule position/i)).toBeVisible();
    expect(within(insights).getByText(/next working day/i)).toBeVisible();
    expect(insights).toHaveTextContent(/shift|off/i);
    expect(screen.getByLabelText(/monthly shift totals/i)).toHaveTextContent(
      /weekend dates\d+ of 9 worked/i,
    );
  });
});

describe("optional personal shift details", () => {
  it("starts collapsed and shows only the working definition for fixed presets", () => {
    render(<ScheduleGenerator />);

    const summary = screen.getByText("Shift details (optional)");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    openShiftDetails();
    expect(screen.getByRole("group", { name: "Day details" })).toBeVisible();
    expect(
      screen.queryByRole("group", { name: "Night details" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/^night shift$/i));
    expect(
      screen.queryByRole("group", { name: "Day details" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Night details" })).toBeVisible();
  });

  it("shows both definitions for rotating and mixed custom schedules", () => {
    render(<ScheduleGenerator />);
    fireEvent.change(screen.getByRole("combobox", { name: "Shift pattern" }), {
      target: { value: "2-day-2-night-4-off" },
    });
    openShiftDetails();

    expect(screen.getByRole("group", { name: "Day details" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Night details" })).toBeVisible();

    fireEvent.click(screen.getByLabelText(/custom cycle/i));
    fireEvent.change(screen.getByLabelText(/shift for cycle day 2/i), {
      target: { value: "night" },
    });
    expect(screen.getByRole("group", { name: "Day details" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Night details" })).toBeVisible();
  });

  it("applies private names, labels, colors, and overnight hours without changing V1", async () => {
    render(<ScheduleGenerator />);
    fireEvent.change(screen.getByRole("combobox", { name: "Shift pattern" }), {
      target: { value: "2-day-2-night-4-off" },
    });
    setStartDate("2026-10-01");
    openShiftDetails();

    const day = screen.getByRole("group", { name: "Day details" });
    const night = screen.getByRole("group", { name: "Night details" });
    fireEvent.change(within(day).getByLabelText("Shift name"), {
      target: { value: "Morning duty" },
    });
    fireEvent.change(within(day).getByLabelText("Short label"), {
      target: { value: "AM" },
    });
    fireEvent.click(within(day).getByLabelText("Blue"));
    fireEvent.change(within(night).getByLabelText(/start time/i), {
      target: { value: "22:00" },
    });
    fireEvent.change(within(night).getByLabelText(/end time/i), {
      target: { value: "06:00" },
    });
    fireEvent.change(within(night).getByLabelText(/unpaid break/i), {
      target: { value: "30" },
    });

    expect(night).toHaveTextContent("Gross8 hours");
    expect(night).toHaveTextContent("Net7 hours 30 minutes");
    expect(night).toHaveTextContent("Ends next day");
    expect(screen.getByText(/actual elapsed time can differ/i)).toBeVisible();

    generate();

    expect(
      await screen.findByRole("cell", {
        name: /thursday, october 1, 2026 — morning duty/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Shift legend")).toHaveTextContent(
      "Morning duty (AM)",
    );
    expect(screen.getByLabelText("Shift legend")).toHaveTextContent(
      /22:00–06:00, ends next day · 7 hours 30 minutes net/i,
    );
    expect(
      screen.getByText(/shared links include the base rotation/i),
    ).toBeVisible();
    expect(window.location.search).toBe(
      "?v=1&kind=preset&p=2-day-2-night-4-off&s=2026-10-01&m=2026-10",
    );
    expect(window.location.search).not.toMatch(/morning|22%3A00|builtin/i);
    expect(
      screen.getByRole("button", { name: /update schedule/i }),
    ).toBeEnabled();
  });

  it("rejects equal times until the explicit 24-hour option is selected", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    openShiftDetails();
    const day = screen.getByRole("group", { name: "Day details" });

    fireEvent.change(within(day).getByLabelText(/start time/i), {
      target: { value: "08:00" },
    });
    fireEvent.change(within(day).getByLabelText(/end time/i), {
      target: { value: "08:00" },
    });
    expect(day).toHaveTextContent(/equal start and end times require/i);
    generate();

    const alert = screen.getByRole("alert", {
      name: /check your schedule details/i,
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await waitFor(() => expect(alert).toHaveFocus());

    fireEvent.click(within(day).getByLabelText(/explicit 24-hour shift/i));
    expect(day).toHaveTextContent("Gross24 hours");
    expect(day).toHaveTextContent("Explicit 24-hour shift · Ends next day");
    generate();
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("rejects an excessive break and preserves the last applied result", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    openShiftDetails();
    const day = screen.getByRole("group", { name: "Day details" });
    fireEvent.change(within(day).getByLabelText("Shift name"), {
      target: { value: "Early duty" },
    });
    fireEvent.change(within(day).getByLabelText(/start time/i), {
      target: { value: "07:00" },
    });
    fireEvent.change(within(day).getByLabelText(/end time/i), {
      target: { value: "15:00" },
    });
    generate();
    await screen.findAllByRole("cell", { name: /early duty/i });

    fireEvent.change(within(day).getByLabelText(/unpaid break/i), {
      target: { value: "480" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update schedule/i }));

    expect(
      screen.getAllByText(/break must be shorter than the shift/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("cell", { name: /early duty/i }).length,
    ).toBeGreaterThan(0);
  });

  it("resets edited details without changing the base form", () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    openShiftDetails();
    const day = screen.getByRole("group", { name: "Day details" });
    fireEvent.change(within(day).getByLabelText("Shift name"), {
      target: { value: "Early duty" },
    });
    fireEvent.change(within(day).getByLabelText(/start time/i), {
      target: { value: "07:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /reset shift details/i }),
    );

    expect(within(day).getByLabelText("Shift name")).toHaveValue("Day shift");
    expect(within(day).getByLabelText("Short label")).toHaveValue("D");
    expect(within(day).getByLabelText(/start time/i)).toHaveValue("");
    expect(screen.getByLabelText(/pattern start date/i)).toHaveValue(
      "2026-10-01",
    );
    expect(window.location.search).toBe("");
  });

  it("drops ephemeral details when the base URL is restored", async () => {
    const rendered = render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    openShiftDetails();
    const day = screen.getByRole("group", { name: "Day details" });
    fireEvent.change(within(day).getByLabelText("Shift name"), {
      target: { value: "Private duty" },
    });
    generate();
    await screen.findAllByRole("cell", { name: /private duty/i });
    const baseUrl = window.location.href;

    rendered.unmount();
    window.history.replaceState(null, "", baseUrl);
    render(<ScheduleGenerator />);

    await screen.findAllByRole("cell", { name: /day shift/i });
    openShiftDetails();
    expect(screen.getByLabelText("Shift name")).toHaveValue("Day shift");
    expect(
      screen.queryByText(/shared links include the base rotation/i),
    ).toBeNull();
  });
});

describe("yearly generation", () => {
  it("switches to twelve semantic month tables without changing the URL", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    await screen.findByRole("table", { name: /october 2026/i });
    const monthlyUrl = window.location.search;

    fireEvent.click(screen.getByRole("radio", { name: "Year" }));

    expect(
      await screen.findByRole("heading", { name: /2026 yearly schedule/i }),
    ).toHaveFocus();
    expect(screen.getAllByRole("table")).toHaveLength(12);
    expect(
      screen
        .getByRole("table", { name: /february 2026/i })
        .querySelectorAll("time"),
    ).toHaveLength(28);
    expect(document.querySelectorAll(".year-grid time")).toHaveLength(365);
    expect(screen.getByLabelText(/yearly shift totals/i)).toHaveTextContent(
      "Total dates365",
    );
    expect(screen.getByLabelText(/yearly shift totals/i)).toHaveTextContent(
      /weekend dates\d+ of 104 worked/i,
    );
    expect(screen.getAllByRole("region", { name: /up next/i })).toHaveLength(1);
    expect(window.location.search).toBe(monthlyUrl);
  });

  it("navigates years transiently and returns to the preserved month", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    await screen.findByRole("heading", { name: /2026 yearly schedule/i });

    fireEvent.click(screen.getByRole("button", { name: "Show 2027" }));
    expect(
      await screen.findByRole("heading", { name: /2027 yearly schedule/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(
      await screen.findByRole("table", { name: /october 2026/i }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("m=2026-10");
  });

  it("prints whichever view is active", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    const scheduleUrl = window.location.href;

    fireEvent.click(screen.getByRole("button", { name: /print month view/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    fireEvent.click(screen.getByRole("button", { name: /print year view/i }));

    expect(print).toHaveBeenCalledTimes(2);
    expect(window.location.href).toBe(scheduleUrl);
  });

  it("restores a monthly view after history navigation", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    await screen.findByRole("heading", { name: /yearly schedule/i });

    fireEvent(window, new PopStateEvent("popstate"));

    expect(
      await screen.findByRole("table", { name: /october 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
  });
});

describe("schedule sharing and export actions", () => {
  it("shows actions only after valid generation", () => {
    render(<ScheduleGenerator />);

    expect(
      screen.queryByRole("button", { name: /copy schedule link/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /export this month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Month" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /print month view/i }),
    ).not.toBeInTheDocument();

    setStartDate("2026-10-01");
    generate();

    expect(
      screen.getByRole("button", { name: /copy schedule link/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export this month/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /export this year/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Month" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: /print month view/i }),
    ).toBeInTheDocument();
  });

  it("copies the canonical URL with the navigated visible month", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("button", { name: /show next month/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));

    fireEvent.click(
      screen.getByRole("button", { name: /copy schedule link/i }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-11",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Schedule link copied.",
    );
  });

  it("copies the non-default Sunday preference", async () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("radio", { name: "Sunday" }));
    fireEvent.click(
      screen.getByRole("button", { name: /copy schedule link/i }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(writeText).toHaveBeenCalledWith(
      "http://localhost:3000/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10&ws=sun",
    );
  });

  it("shows a selected read-only canonical link when clipboard copying fails", async () => {
    writeText.mockRejectedValueOnce(new Error("Permission denied"));
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "October 2026" }),
      ).toHaveFocus(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /copy schedule link/i }),
    );

    const manualField = await screen.findByLabelText(
      /schedule link for manual copying/i,
    );
    expect(manualField).toHaveAttribute("readonly");
    expect(manualField).toHaveValue(
      "http://localhost:3000/?v=1&kind=preset&p=4-on-4-off&s=2026-10-01&shift=day&m=2026-10",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /copy this link manually/i,
    );
    await waitFor(() => {
      expect(manualField).toHaveProperty("selectionStart", 0);
      expect(manualField).toHaveProperty(
        "selectionEnd",
        (manualField as HTMLInputElement).value.length,
      );
    });
  });

  it("downloads the visible month with the correct MIME type and revokes its URL", async () => {
    let exportedBlob: Blob | undefined;
    let downloadedFilename = "";
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return "blob:visible-month";
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download;
    });

    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("button", { name: /show next month/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    fireEvent.click(screen.getByRole("button", { name: /export this month/i }));

    expect(downloadedFilename).toBe("shift-calendar-2026-11.ics");
    expect(exportedBlob?.type).toBe("text/calendar;charset=utf-8");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:visible-month");
    expect(screen.getByRole("status")).toHaveTextContent(
      /downloaded for november 2026/i,
    );
  });

  it("exports the active displayed year with a distinct action", () => {
    let exportedBlob: Blob | undefined;
    let downloadedFilename = "";
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return "blob:active-year";
    });
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilename = this.download;
    });

    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("radio", { name: "Year" }));
    fireEvent.click(screen.getByRole("button", { name: "Show 2027" }));
    fireEvent.click(screen.getByRole("button", { name: /export this year/i }));

    expect(downloadedFilename).toBe("shift-calendar-2027.ics");
    expect(exportedBlob?.type).toBe("text/calendar;charset=utf-8");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:active-year");
    expect(screen.getByRole("status")).toHaveTextContent(
      /downloaded for 2027/i,
    );
  });

  it("does not expose actions for an invalid shared URL", async () => {
    window.history.replaceState(null, "", "/?v=2&kind=preset");
    render(<ScheduleGenerator />);

    await screen.findByRole("alert", {
      name: /unable to open this schedule link/i,
    });
    expect(
      screen.queryByRole("button", { name: /copy schedule link/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /export this month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Year" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /print/i }),
    ).not.toBeInTheDocument();
  });
});

describe("private date changes", () => {
  it("combines Training, additional work, and a private note in the effective calendar", () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();

    fireEvent.click(screen.getByRole("button", { name: /add or edit date/i }));
    fireEvent.change(screen.getByLabelText("Primary change"), {
      target: { value: "training" },
    });
    fireEvent.click(
      screen.getByLabelText(/add one additional-work occurrence/i),
    );
    fireEvent.change(screen.getByLabelText(/private personal note/i), {
      target: { value: "Bring safety certificate" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save date change/i }));

    expect(
      screen.getByRole("cell", {
        name: /october 1, 2026 — training — day shift; additional work: day shift; private note attached/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Monthly personal statistics")).toBeInTheDocument();
    expect(
      screen.getByText(/shared links include the base rotation/i),
    ).toHaveTextContent(/date changes/i);
    expect(
      screen.queryByText("Bring safety certificate"),
    ).not.toBeInTheDocument();
  });

  it("rejects Leave on generated Off and keeps the generated cell", () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("button", { name: /add or edit date/i }));
    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-10-05" },
    });
    fireEvent.change(screen.getByLabelText("Primary change"), {
      target: { value: "leave" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save date change/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /leave can only replace a scheduled working shift/i,
    );
    expect(
      screen.getByRole("cell", { name: /monday, october 5, 2026 — off/i }),
    ).toBeInTheDocument();
  });

  it("removes one layer independently and restores the generated date", () => {
    render(<ScheduleGenerator />);
    setStartDate("2026-10-01");
    generate();
    fireEvent.click(screen.getByRole("button", { name: /add or edit date/i }));
    fireEvent.change(screen.getByLabelText("Primary change"), {
      target: { value: "leave" },
    });
    fireEvent.click(
      screen.getByLabelText(/add one additional-work occurrence/i),
    );
    fireEvent.change(screen.getByLabelText(/private personal note/i), {
      target: { value: "private" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save date change/i }));

    fireEvent.click(screen.getByRole("button", { name: /add or edit date/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /remove primary change/i }),
    );
    expect(screen.getByText(/effective:/i).parentElement).toHaveTextContent(
      /day shift/i,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /restore generated schedule/i }),
    );
    expect(
      screen.getByRole("cell", {
        name: /thursday, october 1, 2026 — day shift/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Monthly personal statistics"),
    ).not.toBeInTheDocument();
  });
});

describe("domain error presentation", () => {
  it("maps every current error code to user-facing copy", () => {
    expect(Object.keys(SCHEDULE_ERROR_MESSAGES)).toHaveLength(23);
    expect(getScheduleErrorMessage({ code: "INVALID_DATE_FORMAT" })).toBe(
      "Enter a valid date.",
    );
    expect(
      getScheduleErrorMessage({ code: "UNSUPPORTED_CONFIG_VERSION" }),
    ).toMatch(/unsupported version/i);
  });

  it("maps every planner error code to user-facing copy", () => {
    expect(Object.values(PLANNER_ERROR_MESSAGES).every(Boolean)).toBe(true);
    expect(getPlannerErrorMessage({ code: "EQUAL_SHIFT_TIMES" })).toMatch(
      /24-hour/i,
    );
    expect(getPlannerErrorMessage({ code: "INVALID_SHIFT_COLOR" })).toMatch(
      /available shift colors/i,
    );
  });
});
