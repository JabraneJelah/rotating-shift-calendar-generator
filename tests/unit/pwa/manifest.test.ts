// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

function pngSize(value: Buffer): readonly [number, number] {
  expect(value.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return [value.readUInt32BE(16), value.readUInt32BE(20)];
}

describe("PWA manifest and icons", () => {
  it("uses the approved clean identity and install metadata", () => {
    const value = manifest();
    expect(value).toMatchObject({
      id: "/",
      name: "Shift Calendar — Rotating Shift Planner",
      short_name: "Shift Calendar",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      lang: "en",
      dir: "ltr",
    });
    expect(value.icons).toHaveLength(4);
    expect(JSON.stringify(value)).not.toMatch(/plannerId|\?v=|tracking/iu);
  });

  it.each([
    ["apple-touch-icon.png", 180],
    ["shift-calendar-192.png", 192],
    ["shift-calendar-512.png", 512],
    ["shift-calendar-maskable-192.png", 192],
    ["shift-calendar-maskable-512.png", 512],
  ])("validates %s pixel dimensions", async (name, size) => {
    const value = await readFile(
      path.join(process.cwd(), "public", "icons", name),
    );
    expect(pngSize(value)).toEqual([size, size]);
  });

  it("contains 16, 32 and 48 pixel favicon frames", async () => {
    const value = await readFile(
      path.join(process.cwd(), "src", "app", "favicon.ico"),
    );
    expect(value.readUInt16LE(0)).toBe(0);
    expect(value.readUInt16LE(2)).toBe(1);
    expect(value.readUInt16LE(4)).toBe(3);
    expect([value[6], value[22], value[38]]).toEqual([16, 32, 48]);
  });
});
