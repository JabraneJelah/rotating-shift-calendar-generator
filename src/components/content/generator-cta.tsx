import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function GeneratorCta({ label }: { label: string }) {
  return (
    <aside className="border-primary/20 bg-primary/8 rounded-xl border p-5 sm:p-6">
      <h2 className="text-xl font-bold tracking-tight">Build your calendar</h2>
      <p className="text-muted-foreground mt-2 max-w-2xl leading-7">
        Choose this preset, enter the first working date from your confirmed
        rota, and select fixed Day or Night shifts.
      </p>
      <Link
        className="bg-primary text-primary-foreground focus-visible:ring-ring/45 mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold outline-none hover:opacity-90 focus-visible:ring-3"
        href="/#generator"
      >
        {label}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </aside>
  );
}
