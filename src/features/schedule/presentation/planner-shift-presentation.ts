import type { ShiftKind } from "@/features/schedule/domain";
import {
  calculateNominalShift,
  resolveShiftDefinition,
  type ShiftColorToken,
  type ShiftDefinition,
  type ShiftDefinitionRegistry,
} from "@/features/schedule/planner";

import { SHIFT_LABELS, SHIFT_SHORT_LABELS } from "./calendar-view";

export const SHIFT_COLOR_PRESENTATION = Object.freeze({
  amber: {
    label: "Amber",
    cellClassName: "border-amber-400/90 bg-amber-100",
    swatchClassName: "border-amber-500 bg-amber-200",
  },
  blue: {
    label: "Blue",
    cellClassName: "border-blue-400/90 bg-blue-100",
    swatchClassName: "border-blue-500 bg-blue-200",
  },
  indigo: {
    label: "Indigo",
    cellClassName: "border-indigo-400/90 bg-indigo-100",
    swatchClassName: "border-indigo-500 bg-indigo-200",
  },
  violet: {
    label: "Violet",
    cellClassName: "border-violet-400/90 bg-violet-100",
    swatchClassName: "border-violet-500 bg-violet-200",
  },
  teal: {
    label: "Teal",
    cellClassName: "border-teal-400/90 bg-teal-100",
    swatchClassName: "border-teal-500 bg-teal-200",
  },
  green: {
    label: "Green",
    cellClassName: "border-green-400/90 bg-green-100",
    swatchClassName: "border-green-500 bg-green-200",
  },
  rose: {
    label: "Rose",
    cellClassName: "border-rose-400/90 bg-rose-100",
    swatchClassName: "border-rose-500 bg-rose-200",
  },
  slate: {
    label: "Slate",
    cellClassName: "border-slate-400/90 bg-slate-100",
    swatchClassName: "border-slate-500 bg-slate-200",
  },
} satisfies Record<
  ShiftColorToken,
  {
    readonly label: string;
    readonly cellClassName: string;
    readonly swatchClassName: string;
  }
>);

export function formatNominalMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(
      `${remainingMinutes} ${remainingMinutes === 1 ? "minute" : "minutes"}`,
    );
  }

  return parts.join(" ");
}

export function formatShiftTimeSummary(
  definition: ShiftDefinition,
): string | null {
  if (definition.time === undefined) {
    return null;
  }

  const calculation = calculateNominalShift(definition.time);
  if (!calculation.ok) {
    throw new Error("A validated shift time must have a valid calculation.");
  }

  const endDescription = calculation.value.crossesMidnight
    ? ", ends next day"
    : "";

  return `${definition.time.startTime}–${definition.time.endTime}${endDescription}`;
}

export function getShiftDisplay(
  shift: ShiftKind,
  registry: ShiftDefinitionRegistry | null,
): {
  readonly name: string;
  readonly shortLabel: string;
  readonly definition: ShiftDefinition | null;
} {
  if (registry === null || shift === "off") {
    return Object.freeze({
      name: SHIFT_LABELS[shift],
      shortLabel: SHIFT_SHORT_LABELS[shift],
      definition: null,
    });
  }

  const definition = resolveShiftDefinition(registry, shift);
  if (definition === null) {
    throw new Error("A working occurrence must resolve a definition.");
  }

  return Object.freeze({
    name: definition.name,
    shortLabel: definition.shortLabel,
    definition,
  });
}
