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

function setStartDate(value: string) {
  fireEvent.change(screen.getByLabelText(/pattern start date/i), {
    target: { value },
  });
}

function generate() {
  fireEvent.click(screen.getByRole("button", { name: /generate schedule/i }));
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

  it("stops a custom cycle at the documented 56-position maximum", () => {
    render(<ScheduleGenerator />);
    fireEvent.click(screen.getByLabelText(/custom cycle/i));

    const addButton = screen.getByRole("button", { name: /add cycle day/i });

    for (let count = 4; count < 56; count += 1) {
      fireEvent.click(addButton);
    }

    expect(
      screen.getByLabelText(/shift for cycle day 56/i),
    ).toBeInTheDocument();
    expect(addButton).toBeDisabled();
    expect(screen.queryByLabelText(/shift for cycle day 57/i)).toBeNull();
  }, 10_000);

  it("lets preset users choose a fixed night shift", () => {
    render(<ScheduleGenerator />);

    fireEvent.click(screen.getByLabelText(/night shift/i));

    expect(screen.getByLabelText(/night shift/i)).toBeChecked();
    expect(screen.getByLabelText(/day shift/i)).not.toBeChecked();
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
      screen.queryByRole("button", { name: /download calendar file/i }),
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
      screen.getByRole("button", { name: /download calendar file/i }),
    ).toBeInTheDocument();
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
    fireEvent.click(
      screen.getByRole("button", { name: /download calendar file/i }),
    );

    expect(downloadedFilename).toBe("shift-calendar-2026-11.ics");
    expect(exportedBlob?.type).toBe("text/calendar;charset=utf-8");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:visible-month");
    expect(screen.getByRole("status")).toHaveTextContent(
      /downloaded for november 2026/i,
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
      screen.queryByRole("button", { name: /download calendar file/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Year" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /print/i }),
    ).not.toBeInTheDocument();
  });
});

describe("domain error presentation", () => {
  it("maps every current error code to user-facing copy", () => {
    expect(Object.keys(SCHEDULE_ERROR_MESSAGES)).toHaveLength(22);
    expect(getScheduleErrorMessage({ code: "INVALID_DATE_FORMAT" })).toBe(
      "Enter a valid date.",
    );
    expect(
      getScheduleErrorMessage({ code: "UNSUPPORTED_CONFIG_VERSION" }),
    ).toMatch(/unsupported version/i);
  });
});
