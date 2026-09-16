import { CalendarRange, Check, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const shiftTypes = [
  { label: "Day shift", icon: Sun, color: "bg-day" },
  { label: "Night shift", icon: Moon, color: "bg-night" },
  { label: "Day off", icon: Check, color: "bg-off" },
];

export function GeneratorPlaceholder() {
  return (
    <section
      className="border-border bg-card rounded-3xl border p-5 shadow-[0_24px_70px_-38px_oklch(0.32_0.07_220/0.42)] sm:p-7"
      aria-labelledby="generator-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">Calendar setup</p>
          <h2
            id="generator-title"
            className="mt-1 text-xl font-bold tracking-tight"
          >
            Build your rotation
          </h2>
        </div>
        <span className="bg-accent text-accent-foreground grid size-11 shrink-0 place-items-center rounded-xl">
          <CalendarRange aria-hidden="true" className="size-5" />
        </span>
      </div>

      <div className="mt-6 space-y-3" aria-label="Planned shift types">
        {shiftTypes.map(({ label, icon: Icon, color }) => (
          <div
            className="border-border bg-muted/45 flex min-h-14 items-center gap-3 rounded-xl border px-4"
            key={label}
          >
            <span
              className={`grid size-8 place-items-center rounded-lg ${color}`}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </div>
        ))}
      </div>

      <Button className="mt-6 w-full" disabled type="button">
        Generator coming in Phase 2
      </Button>
      <p className="text-muted-foreground mt-3 text-center text-xs leading-5">
        This preview is intentionally non-interactive.
      </p>
    </section>
  );
}
