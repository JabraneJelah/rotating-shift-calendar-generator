import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-visible:ring-ring/45 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" &&
          "border-border bg-background text-foreground hover:bg-muted border",
        className,
      )}
      {...props}
    />
  );
}

export { Button };
