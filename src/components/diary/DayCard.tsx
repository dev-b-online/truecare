import { format } from "date-fns";
import type { DayCell } from "@/lib/calendar";
import { cn } from "@/lib/utils";

interface DayCardProps {
  cell: DayCell;
}

export function DayCard({ cell }: DayCardProps) {
  const isBreak = !cell.isTreatmentDay;
  const isPreStart = cell.isBeforeStart;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-3 text-right",
        isPreStart ? "bg-muted/40" : isBreak ? "bg-turquoise-soft" : "card-tint",
        cell.isToday ? "border-brand ring-2 ring-brand/60" : "border-hair",
      )}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{format(cell.date, "dd/MM")}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isPreStart
              ? "bg-muted text-muted-foreground"
              : isBreak
                ? "bg-[color:var(--color-turquoise)] text-white"
                : "bg-brand text-brand-foreground",
            cell.isToday && "ring-2 ring-offset-1 ring-foreground/30",
          )}
        >
          {isPreStart ? "טרם" : cell.label}
        </span>
      </div>
      {isPreStart ? (
        <div className="flex flex-1 items-center justify-center py-6 text-sm font-medium text-muted-foreground">
          טרם טיפול
        </div>
      ) : isBreak ? (
        <div className="flex flex-1 items-center justify-center py-6 text-sm font-medium text-[color:var(--color-turquoise)]">
          יום הפסקה
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-6 text-sm font-medium">
          <span className="text-brand">יום נטילת תרופה</span>
        </div>
      )}
    </div>
  );
}
