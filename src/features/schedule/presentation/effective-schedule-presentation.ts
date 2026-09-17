import type { EffectiveScheduleDate } from "@/features/schedule/planner";

import {
  formatShiftTimeSummary,
  SHIFT_COLOR_PRESENTATION,
} from "./planner-shift-presentation";

export type EffectiveDatePresentation = {
  readonly name: string;
  readonly shortLabel: string;
  readonly cellClassName: string;
  readonly description: string;
  readonly additionalLabel: string | null;
  readonly hasNote: boolean;
};

export function presentEffectiveDate(
  value: EffectiveScheduleDate,
): EffectiveDatePresentation {
  let name: string;
  let shortLabel: string;
  let cellClassName: string;
  let detail = "";

  if (value.primary.kind === "work") {
    name =
      value.primary.origin === "training"
        ? `Training — ${value.primary.definition.name}`
        : value.primary.definition.name;
    shortLabel =
      value.primary.origin === "training"
        ? "TR"
        : value.primary.definition.shortLabel;
    cellClassName =
      SHIFT_COLOR_PRESENTATION[value.primary.definition.color].cellClassName;
    const time = formatShiftTimeSummary(value.primary.definition);
    detail = time === null ? "" : `, ${time}`;
    if (value.primary.origin === "replacement") detail += ", replacement";
  } else if (value.primary.kind === "off") {
    name = "Off";
    shortLabel = "Off";
    cellClassName = "border-emerald-300/80 bg-off/70";
  } else if (value.primary.kind === "leave") {
    name = "Leave";
    shortLabel = "LV";
    cellClassName = "border-rose-400/90 bg-rose-100";
  } else {
    name = "Sick";
    shortLabel = "S";
    cellClassName = "border-violet-400/90 bg-violet-100";
  }

  const additionalLabel = value.additionalWork?.definition.name ?? null;
  const additionalDescription =
    additionalLabel === null ? "" : `; additional work: ${additionalLabel}`;
  const noteDescription = value.note === null ? "" : "; private note attached";

  return Object.freeze({
    name,
    shortLabel,
    cellClassName,
    description: `${name}${detail}${additionalDescription}${noteDescription}`,
    additionalLabel,
    hasNote: value.note !== null,
  });
}

export function formatStatisticsMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}
