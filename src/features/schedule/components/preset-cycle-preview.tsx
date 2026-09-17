import {
  getPresetDefinition,
  resolvePresetPattern,
  type PresetId,
  type ShiftKind,
  type WorkingShiftKind,
} from "@/features/schedule/domain";
import { cn } from "@/lib/utils";

type PresetCyclePreviewProps = {
  readonly presetId: PresetId;
  readonly workingShift: WorkingShiftKind;
};

const TOKEN_LABELS = {
  day: { short: "D", full: "Day", className: "border-amber-300/80 bg-day/70" },
  night: {
    short: "N",
    full: "Night",
    className: "border-indigo-300/80 bg-night/70",
  },
  off: {
    short: "O",
    full: "Off",
    className: "border-emerald-300/80 bg-off/70",
  },
} as const satisfies Record<
  ShiftKind,
  { readonly short: string; readonly full: string; readonly className: string }
>;

export function PresetCyclePreview({
  presetId,
  workingShift,
}: PresetCyclePreviewProps) {
  const definition = getPresetDefinition(presetId);
  const patternResult = resolvePresetPattern(
    presetId,
    definition.type === "fixed" ? workingShift : undefined,
  );

  if (!patternResult.ok) {
    throw new Error("A selected preset must resolve to a preview pattern.");
  }

  const cycle = patternResult.value.cycle;
  const counts = {
    day: cycle.filter((shift) => shift === "day").length,
    night: cycle.filter((shift) => shift === "night").length,
    off: cycle.filter((shift) => shift === "off").length,
  };
  const fullSequence = cycle
    .map((shift, index) => `position ${index + 1}: ${TOKEN_LABELS[shift].full}`)
    .join(", ");

  return (
    <section
      aria-labelledby="preset-preview-title"
      className="border-border bg-muted/35 rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold" id="preset-preview-title">
            {definition.name}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs font-semibold tracking-wide uppercase">
            {definition.type === "fixed" ? "Fixed shift" : "Rotating Day/Night"}
            {` · ${definition.cycleLength}-day cycle`}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          {counts.day} Day · {counts.night} Night · {counts.off} Off ·{" "}
          {counts.day + counts.night} working
        </p>
      </div>

      <p className="mt-3 text-sm leading-6" id="preset-preview-description">
        {definition.description}
      </p>

      <div className="mt-3" aria-label="Complete ordered cycle preview">
        <p className="sr-only">Complete cycle: {fullSequence}.</p>
        <ol aria-hidden="true" className="flex flex-wrap gap-1.5">
          {cycle.map((shift, index) => {
            const token = TOKEN_LABELS[shift];
            return (
              <li
                className={cn(
                  "grid size-8 place-items-center rounded-lg border text-xs font-bold",
                  token.className,
                )}
                key={`${index}-${shift}`}
                title={`${index + 1}. ${token.full}`}
              >
                {token.short}
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground mt-2 text-xs">
          D = Day · N = Night · O = Off
        </p>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {definition.anchor}
      </p>
      {definition.type === "rotating" ? (
        <p className="text-muted-foreground mt-2 text-xs leading-5">
          Day and Night positions are already defined by this pattern. Pattern
          names and starting points can vary by employer; confirm the sequence
          and anchor against your official rota.
        </p>
      ) : null}
      {definition.variationNote ? (
        <p
          className="text-muted-foreground mt-2 text-xs leading-5"
          id="preset-variation-note"
        >
          {definition.variationNote}
        </p>
      ) : null}
    </section>
  );
}
