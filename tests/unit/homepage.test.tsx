import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("homepage", () => {
  it("renders the primary heading and honest generator placeholder", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /your shift pattern, made easier to see/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generator coming in phase 2/i }),
    ).toBeDisabled();
  });
});
