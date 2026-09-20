import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ScheduleGenerator } from "@/features/schedule";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("generator custom-cycle limit", () => {
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
});
