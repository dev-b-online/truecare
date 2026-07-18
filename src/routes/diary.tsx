import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { buildTwoWeekGrid, startOfWeek } from "@/lib/calendar";
import { parseISO, addDays, format, startOfMonth } from "date-fns";
import { useDiary } from "@/state/diaryStore";
import { DayCard } from "@/components/diary/DayCard";
import { ResetCycleModal } from "@/components/ResetCycleModal";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { HEBREW_MONTHS } from "@/lib/calendar";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PATIENT_TOKEN_KEY = "trucare.session";

export const Route = createFileRoute("/diary")({
  component: DiaryRoute,
  head: () => ({ meta: [{ title: "היומן שלי | TruCare" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem(PATIENT_TOKEN_KEY)) {
      throw redirect({ to: "/" });
    }
  },
});

function DiaryRoute() {
  const { planId, anchorDate, setAnchor } = useDiary();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status === 401) {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
        nav({ to: "/" });
      }
    };
    window.addEventListener("trucare:api:unauthorized", handler);
    return () => window.removeEventListener("trucare:api:unauthorized", handler);
  }, [nav]);
  // API returns { plan: {...} } — unwrap .plan.
  const planQuery = useQuery({
    queryKey: ["plan"],
    queryFn: () => api.getPlanForPatient("me"),
  });
  const plan = planQuery.data?.plan;
  const dosesQuery = useQuery({
    queryKey: ["doses", plan?.id],
    enabled: !!plan?.id,
    queryFn: () => api.listDoses(plan!.id),
  });

  const startDate = plan?.startDate ?? anchorDate;
  const anchor = parseISO(anchorDate);
  const cells = buildTwoWeekGrid(startDate, anchor, dosesQuery.data ?? []);
  const week1 = cells.slice(0, 7);
  const week2 = cells.slice(7, 14);

  const shift = (days: number) => setAnchor(format(addDays(anchor, days), "yyyy-MM-dd"));
  const monthLabel = `${HEBREW_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const mark = async (id: string, status: "taken" | "missed") => {
    await api.markDose(id, status);
    qc.invalidateQueries({ queryKey: ["doses", planId] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const onReset = async (newStartDate: string) => {
    try {
      await api.resetCycle(newStartDate);
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["doses", plan?.id] });
      setAnchor(format(startOfWeek(parseISO(newStartDate)), "yyyy-MM-dd"));
      toast.success("המחזור התחיל");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה באיפוס");
    } finally {
      setResetOpen(false);
    }
  };

  return (
    <PageShell wide>
      <div className="mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => shift(-14)} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
            שבועות אחורה
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">היומן שלי</h1>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => shift(14)} className="rounded-full">
            שבועות קדימה
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-hair bg-card px-4 py-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" /> ימי טיפול
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[color:var(--color-turquoise)]" />
            ימי הפסקה
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" /> מנה שהוחמצה
          </span>
        </div>

        <WeekGrid title="שבוע 1" cells={week1} onMark={mark} startDate={startDate} />
        <WeekGrid title="שבוע 2" cells={week2} onMark={mark} startDate={startDate} />

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="mt-2 rounded-full"
            onClick={() => setAnchor(format(startOfWeek(new Date()), "yyyy-MM-dd"))}
          >
            חזרה להיום
          </Button>
          <Button
            variant="ghost"
            className="mt-2 rounded-full text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            איפוס מחזור טיפול
          </Button>
        </div>
      </div>

      <ResetCycleModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        defaultStartDate={plan?.startDate}
        onConfirm={onReset}
      />
    </PageShell>
  );
}

function WeekGrid({
  title,
  cells,
  onMark,
  startDate,
}: {
  title: string;
  cells: ReturnType<typeof buildTwoWeekGrid>;
  onMark: (id: string, s: "taken" | "missed") => void;
  startDate: string;
}) {
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
