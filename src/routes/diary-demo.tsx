import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { buildTwoWeekGrid } from "@/lib/calendar";
import { parseISO, addDays, format, startOfWeek as dateFnsStartOfWeek } from "date-fns";
import { useDiary } from "@/state/diaryStore";
import { WeekGrid } from "@/components/diary/WeekGrid";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Eye } from "lucide-react";
import { HEBREW_MONTHS } from "@/lib/calendar";
import { useState, useEffect } from "react";

const DEMO_PATIENT_ID = "pat-demo";

export const Route = createFileRoute("/diary-demo")({
  component: DiaryDemoRoute,
  head: () => ({ meta: [{ title: "יומן דגמה | TruCare" }] }),
});

function DiaryDemoRoute() {
  const { anchorDate, setAnchor } = useDiary();
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("trucare.session");
    if (token) {
      nav({ to: "/diary" });
    }
  }, [nav]);

  const planQuery = useQuery({
    queryKey: ["plan", DEMO_PATIENT_ID],
    queryFn: () => api.getPlanForPatient(DEMO_PATIENT_ID),
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

  return (
    <PageShell wide>
      <div className="mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => shift(-14)} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
            שבועות אחורה
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">יומן דגמה</h1>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => shift(14)} className="rounded-full">
            שבועות קדימה
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-brand bg-brand/5 px-4 py-2 text-xs text-brand">
          <Eye className="h-4 w-4" />
          <span>זוהי תצוגת דגמה — הירשמו/התחברו כדי לעקוב אחר הטיפול שלכם</span>
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

        <WeekGrid title="שבוע 1" cells={week1} />
        <WeekGrid title="שבוע 2" cells={week2} />

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="mt-2 rounded-full"
            onClick={() => setAnchor(format(dateFnsStartOfWeek(new Date()), "yyyy-MM-dd"))}
          >
            חזרה להיום
          </Button>
          <Button asChild className="mt-2 rounded-full text-base">
            <Link to="/register">התחלת רישום</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
