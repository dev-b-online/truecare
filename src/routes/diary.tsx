import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { buildTwoWeekGrid, startOfWeek } from "@/lib/calendar";
import { parseISO, addDays, format } from "date-fns";
import { useDiary } from "@/state/diaryStore";
import { DayCard } from "@/components/diary/DayCard";
import { ResetCycleModal } from "@/components/ResetCycleModal";
import { WeekGrid } from "@/components/diary/WeekGrid";
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
      throw redirect({ to: "/diary-demo" });
    }
  },
});

function DiaryRoute() {
  const { anchorDate, setAnchor } = useDiary();
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
            אחורה
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">היומן שלי</h1>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => shift(14)} className="rounded-full">
            קדימה
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <WeekGrid title="שבוע 1" cells={week1} startDate={startDate} />
        <WeekGrid title="שבוע 2" cells={week2} startDate={startDate} />

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
