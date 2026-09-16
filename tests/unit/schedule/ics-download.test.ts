import { describe, expect, it, vi } from "vitest";

import {
  downloadICSFile,
  formatICSUtcTimestamp,
  type ICSExportSuccess,
} from "@/features/schedule/export";

describe("ICS browser download", () => {
  it("formats an injected Date as a basic UTC timestamp", () => {
    expect(formatICSUtcTimestamp(new Date("2026-09-16T10:11:12.345Z"))).toBe(
      "20260916T101112Z",
    );
  });

  it("creates one typed Blob, clicks the safe filename, and revokes the URL", () => {
    const exportedCalendar: ICSExportSuccess = {
      success: true,
      content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n",
      filename: "shift-calendar-2026-09.ics",
      mimeType: "text/calendar;charset=utf-8",
    };
    let createdBlob: Blob | undefined;
    const createObjectURL = vi.fn((blob: Blob) => {
      createdBlob = blob;
      return "blob:shift-calendar-test";
    });
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadICSFile(exportedCalendar, {
      createObjectURL,
      revokeObjectURL,
      document,
    });

    const clickedAnchor = click.mock.instances[0] as HTMLAnchorElement;

    expect(createdBlob?.type).toBe("text/calendar;charset=utf-8");
    expect(clickedAnchor?.download).toBe("shift-calendar-2026-09.ics");
    expect(clickedAnchor?.href).toBe("blob:shift-calendar-test");
    expect(clickedAnchor?.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:shift-calendar-test");
    click.mockRestore();
  });
});
