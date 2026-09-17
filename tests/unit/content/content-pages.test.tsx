import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";
import ShiftSchedulesPage from "@/app/shift-schedules/page";
import TwoTwoThreePage from "@/app/shift-schedules/2-2-3/page";
import FourOnFourOffPage from "@/app/shift-schedules/4-on-4-off/page";
import { SiteHeader } from "@/components/layout/site-header";

describe("content pages", () => {
  it("renders a useful schedule hub with both detail links", () => {
    const { container } = render(<ShiftSchedulesPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        name: /rotating shift schedule patterns/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /4 on \/ 4 off/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /2-2-3/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeTruthy();
  });

  for (const [name, Page, expectedRows, relatedName] of [
    ["4 on / 4 off", FourOnFourOffPage, 8, /read the 2-2-3 guide/i],
    ["2-2-3", TwoTwoThreePage, 14, /read the 4 on \/ 4 off guide/i],
  ] as const) {
    it(`renders the ${name} cycle, example, links, and accessible breadcrumbs`, () => {
      render(<Page />);

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(
        screen.getByRole("navigation", { name: /breadcrumb/i }),
      ).toBeInTheDocument();
      const table = screen.getByRole("table", {
        name: new RegExp(`${name} example`, "i"),
      });
      expect(within(table).getAllByRole("row")).toHaveLength(expectedRows + 1);
      expect(
        screen.getByRole("link", { name: /create your/i }),
      ).toHaveAttribute("href", "/#generator");
      expect(
        screen.getByRole("link", { name: relatedName }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/verify|compare all fourteen/i).length,
      ).toBeGreaterThan(0);
    });
  }

  it("documents methodology, privacy, exports, and limitations on About", () => {
    render(<AboutPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: /calculation methodology/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /local and private/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /calendar files and printing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /current limitations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open the shift calendar generator/i }),
    ).toHaveAttribute("href", "/#generator");
  });

  it("uses root-relative header navigation that works from nested routes", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Generator" })).toHaveAttribute(
      "href",
      "/#generator",
    );
    expect(
      screen.getByRole("link", { name: "Shift schedules" }),
    ).toHaveAttribute("href", "/shift-schedules");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
  });
});
