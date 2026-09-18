// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { parseISODate } from "@/features/schedule/domain";
import { parseLocalTime } from "@/features/schedule/planner";
import {
  findLocalDateTimeCandidates,
  getActiveIanaVersion,
  initializeTimeZoneAdapter,
  resolveLocalDateTime,
  validateTimeZone,
  verifyIanaVersion,
} from "@/features/schedule/export/timezone-adapter";

function date(value: string) {
  const result = parseISODate(value);
  if (!result.ok) throw new Error("date fixture");
  return result.value;
}

function time(value: string) {
  const result = parseLocalTime(value);
  if (!result.ok) throw new Error("time fixture");
  return result.value;
}

async function zone(value: string) {
  await initializeTimeZoneAdapter();
  const result = validateTimeZone(value);
  if (!result.ok) throw new Error(`zone fixture: ${result.error.code}`);
  return result.value;
}

describe("pinned timezone adapter", () => {
  it("initializes idempotently and concurrently with direct IANA 2026d data", async () => {
    const first = initializeTimeZoneAdapter();
    const second = initializeTimeZoneAdapter();
    expect(first).toBe(second);
    const [left, right] = await Promise.all([first, second]);
    expect(left).toBe(right);
    expect(left.activeIanaVersion).toBe("2026d");
    expect(left.timeZones).toContain("Africa/Casablanca");
    expect(getActiveIanaVersion()).toBe("2026d");
  });

  it("fails closed when the embedded IANA version does not match", () => {
    expect(verifyIanaVersion("2026d")).toEqual({ ok: true, value: "2026d" });
    expect(verifyIanaVersion("2026b")).toMatchObject({
      ok: false,
      error: {
        code: "TIME_ZONE_DATA_VERSION_MISMATCH",
        activeIanaVersion: "2026b",
      },
    });
  });

  it("rejects empty, unknown, and abbreviation identifiers", async () => {
    await initializeTimeZoneAdapter();
    expect(validateTimeZone("")).toMatchObject({
      ok: false,
      error: { code: "MISSING_TIME_ZONE" },
    });
    expect(validateTimeZone("Mars/Olympus_Mons")).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_TIME_ZONE" },
    });
    expect(validateTimeZone("EST")).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_TIME_ZONE" },
    });
  });

  it("uses current Casablanca rules rather than host or nested data", async () => {
    const casablanca = await zone("Africa/Casablanca");
    expect(
      findLocalDateTimeCandidates(
        date("2026-09-21"),
        time("12:00"),
        casablanca,
      ),
    ).toMatchObject({
      ok: true,
      value: {
        kind: "unique",
        candidate: { utc: "2026-09-21T12:00:00Z", offsetMinutes: 0 },
      },
    });
    expect(
      findLocalDateTimeCandidates(
        date("2026-09-20"),
        time("02:30"),
        casablanca,
      ),
    ).toMatchObject({
      ok: true,
      value: {
        kind: "overlap",
        candidates: [
          { utc: "2026-09-20T01:30:00Z", offsetMinutes: 60 },
          { utc: "2026-09-20T02:30:00Z", offsetMinutes: 0 },
        ],
      },
    });
    expect(
      findLocalDateTimeCandidates(
        date("2026-03-22"),
        time("02:30"),
        casablanca,
      ),
    ).toMatchObject({ ok: true, value: { kind: "gap" } });
  });

  it.each([
    ["Europe/London", "2026-03-29", "01:30"],
    ["Europe/Paris", "2026-03-29", "02:30"],
    ["America/New_York", "2026-03-08", "02:30"],
  ])("detects a %s spring gap", async (name, day, localTime) => {
    expect(
      findLocalDateTimeCandidates(date(day), time(localTime), await zone(name)),
    ).toMatchObject({ ok: true, value: { kind: "gap" } });
  });

  it("returns explicit earlier and later New York overlap candidates", async () => {
    const newYork = await zone("America/New_York");
    const request = [date("2026-11-01"), time("01:30"), newYork] as const;
    expect(resolveLocalDateTime(...request)).toMatchObject({
      ok: true,
      value: { kind: "overlap" },
    });
    expect(resolveLocalDateTime(...request, "earlier")).toMatchObject({
      ok: true,
      value: { utc: "2026-11-01T05:30:00Z", offsetMinutes: -240 },
    });
    expect(resolveLocalDateTime(...request, "later")).toMatchObject({
      ok: true,
      value: { utc: "2026-11-01T06:30:00Z", offsetMinutes: -300 },
    });
  });

  it.each([
    ["Europe/London", "2026-10-25", "01:30"],
    ["Europe/Paris", "2026-10-25", "02:30"],
  ])("detects a %s autumn overlap", async (name, day, localTime) => {
    expect(
      findLocalDateTimeCandidates(date(day), time(localTime), await zone(name)),
    ).toMatchObject({ ok: true, value: { kind: "overlap" } });
  });

  it.each([
    ["UTC", "2026-06-01T12:00:00Z", 0],
    ["Asia/Kolkata", "2026-06-01T06:30:00Z", 330],
    ["Pacific/Chatham", "2026-05-31T23:15:00Z", 765],
  ])("resolves normal and non-hour zone %s", async (name, utc, offset) => {
    expect(
      findLocalDateTimeCandidates(
        date("2026-06-01"),
        time("12:00"),
        await zone(name),
      ),
    ).toMatchObject({
      ok: true,
      value: { kind: "unique", candidate: { utc, offsetMinutes: offset } },
    });
  });

  it("does not call Intl or fetch while resolving", async () => {
    const intl = vi.spyOn(Intl, "DateTimeFormat");
    const originalFetch = globalThis.fetch;
    const fetch = vi.fn();
    globalThis.fetch = fetch as typeof globalThis.fetch;
    try {
      findLocalDateTimeCandidates(
        date("2026-06-01"),
        time("12:00"),
        await zone("UTC"),
      );
      expect(intl).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      intl.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });
});
