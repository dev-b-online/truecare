import { format } from "date-fns";
import { Check, X, Sun, Moon } from "lucide-react";
import type { DayCell } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DayCardProps {
  cell: DayCell;
  onMark?: (doseId: string, status: "taken" | "missed") => void;
}

export function DayCard({ cell, onMark }: DayCardProps) {
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
          לא טיפול
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <DoseChip
            slot="morning"
            time="08:00"
            status={cell.doses.morning?.status ?? "planned"}
            onMark={
              cell.doses.morning && onMark ? (s) => onMark(cell.doses.morning!.id, s) : undefined
            }
          />
          <div className="border-t border-dashed border-destructive/70" aria-hidden />
          <DoseChip
            slot="evening"
            time="20:00"
            status={cell.doses.evening?.status ?? "planned"}
            onMark={
              cell.doses.evening && onMark ? (s) => onMark(cell.doses.evening!.id, s) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}

function DoseChip({
  slot,
  time,
  status,
  onMark,
}: {
  slot: "morning" | "evening";
  time: string;
  status: "taken" | "planned" | "missed" | "not_required";
  onMark?: (s: "taken" | "missed") => void;
}) {
  const Icon = slot === "morning" ? Sun : Moon;
  const label = slot === "morning" ? "בוקר" : "ערב";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-background/80 px-2 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        <span className="text-[10px]">{time}</span>
      </div>
      <div className="flex items-center gap-1">
        {status === "taken" && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
        {status === "missed" && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        {status === "planned" && onMark && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 rounded-full p-0 text-brand hover:bg-brand/10"
              onClick={() => onMark("taken")}
              aria-label="סמן כמנה שנלקחה"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 rounded-full p-0 text-destructive hover:bg-destructive/10"
              onClick={() => onMark("missed")}
              aria-label="סמן כמנה שהוחמצה"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {status === "planned" && !onMark && (
          <span className="text-[10px] text-muted-foreground">מתוכנן</span>
        )}
      </div>
    </div>
  );
}
