import { DayCard } from "@/components/diary/DayCard";
import { buildTwoWeekGrid } from "@/lib/calendar";
import { format } from "date-fns";

type WeekGridProps = {
  title: string;
  cells: ReturnType<typeof buildTwoWeekGrid>;
  onMark?: (id: string, s: "taken" | "missed") => void;
  startDate?: string;
};

export function WeekGrid({ title, cells, onMark, startDate }: WeekGridProps) {
  void startDate;
  return (
    <section className="rounded-2xl border border-hair bg-card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="text-[11px] text-muted-foreground">
          {cells[0] && `${format(cells[0].date, "dd/MM")} – ${format(cells[6].date, "dd/MM")}`}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {cells.map((c) => (
          <DayCard key={c.iso} cell={c} onMark={onMark} />
        ))}
      </div>
    </section>
  );
}
