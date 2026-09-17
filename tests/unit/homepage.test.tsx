import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("homepage", () => {
  it("renders the primary promise and functional generator", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /generate your rotating work calendar in seconds/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate schedule/i }),
    ).toBeEnabled();
    expect(
      screen.getByText(/your schedule is not saved remotely/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /compare all shift schedules/i }),
    ).toHaveAttribute("href", "/shift-schedules");
    expect(
      screen.getByRole("link", { name: /about the methodology/i }),
    ).toHaveAttribute("href", "/about");
  });
});
