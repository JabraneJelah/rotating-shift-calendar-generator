import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OfflinePage, { metadata } from "@/app/offline/page";

describe("offline fallback page", () => {
  it("offers accessible no-JavaScript recovery actions", () => {
    render(<OfflinePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This page is not available offline.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open Shift Calendar" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("button", { name: "Try again" })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("is explicitly non-indexable", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
    });
  });
});
