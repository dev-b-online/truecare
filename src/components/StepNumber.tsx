import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StepNumberProps {
  n: number;
  title: string;
  children?: ReactNode;
  tone?: "brand" | "lilac";
}

export function StepNumber({ n, title, children, tone = "brand" }: StepNumberProps) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
          tone === "brand"
            ? "bg-brand text-brand-foreground"
            : "bg-[color:var(--color-lilac)] text-white",
        )}
      >
        {n}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
