import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type AdminPatient, type AdminPatientDetail } from "@/lib/api";
import { adminBeforeLoad } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Calendar, MessageSquare, CheckCircle2, XCircle, Clock } from "lucide-react";
import { buildTwoWeekGrid, computeCycleDay, isTreatmentDay } from "@/lib/calendar";
import { parseISO, format, startOfWeek, addDays } from "date-fns";

export const Route = createFileRoute("/admin/patients")({
  beforeLoad: adminBeforeLoad,
  component: AdminPatientsRoute,
  head: () => ({
    meta: [{ title: "מטופלים | TruCare אדמין" }],
  }),
});

type NotificationStatus = "sent" | "failed" | "pending";

function getNotificationStatus(
  notifications: AdminPatientDetail["notifications"],
  dateIso: string,
  cycleDay: number,
): { status: NotificationStatus; template?: string; error?: string } {
  const relevantTemplates: Record<number, string> = {
    1: "start_treatment",
    4: "pre_break",
  };

  const templateKey = relevantTemplates[cycleDay];
  if (!templateKey) {
    return { status: "pending" };
  }

  const log = notifications.find((n) => n.date === dateIso && n.template === templateKey);
  if (!log) {
    return { status: "pending" };
  }

  return {
    status: log.status === "sent" ? "sent" : log.status === "failed" ? "failed" : "pending",
    template: log.template,
    error: log.status === "failed" ? undefined : undefined,
  };
}

function CalendarView({
  plan,
  notifications,
}: {
  plan: AdminPatientDetail["plan"];
  notifications: AdminPatientDetail["notifications"];
}) {
  if (!plan) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        אין תכנון טיפול פעיל
      </div>
    );
  }

  const anchor = startOfWeek(new Date());
  const cells = buildTwoWeekGrid(plan.startDate, anchor, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-hair bg-card p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">יומן שבועי</h3>
          <span className="text-[11px] text-muted-foreground">
            {format(cells[0]?.date ?? new Date(), "dd/MM")} –{" "}
            {format(cells[6]?.date ?? new Date(), "dd/MM")}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const notifStatus = getNotificationStatus(notifications, cell.iso, cell.cycleDay);
            const isRelevantDay = [1, 4].includes(cell.cycleDay) && !cell.isBeforeStart;

            return (
              <div
                key={cell.iso}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center",
                  cell.isBeforeStart
                    ? "bg-muted/40 border-hair"
                    : cell.isTreatmentDay
                      ? "card-tint border-brand/40"
                      : "bg-turquoise-soft border-[color:var(--color-turquoise)]/40",
                )}
              >
                <span className="text-[10px] text-muted-foreground">
                  {format(cell.date, "dd/MM")}
                </span>
                <span className="text-[11px] font-semibold">יום {cell.cycleDay}</span>
                <span
                  className={cn(
                    "text-[10px]",
                    cell.isBeforeStart
                      ? "text-muted-foreground"
                      : cell.isTreatmentDay
                        ? "text-brand"
                        : "text-[color:var(--color-turquoise)]",
                  )}
                >
                  {cell.isBeforeStart ? "טרם" : cell.isTreatmentDay ? "טיפול" : "הפסקה"}
                </span>
                {isRelevantDay && (
                  <span className="mt-0.5">
                    {notifStatus.status === "sent" && (
                      <span title="נשלח">
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                      </span>
                    )}
                    {notifStatus.status === "failed" && (
                      <span title="נכשל">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </span>
                    )}
                    {notifStatus.status === "pending" && (
                      <span title="ממתין">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-hair bg-card p-3 text-xs">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> נשלח
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5 text-destructive" /> נכשל
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> ממתין
        </span>
      </div>
    </div>
  );
}

function AdminPatientsRoute() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<AdminPatient | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const patientsQuery = useQuery({
    queryKey: ["admin", "patients"],
    queryFn: api.listPatients,
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "patients", selectedPatient?.id],
    enabled: !!selectedPatient?.id && detailOpen,
    queryFn: () => api.getPatientNotifications(selectedPatient!.id),
  });

  const filteredPatients = (patientsQuery.data ?? []).filter((p) => {
    const term = search.trim().toLowerCase();
    if (term === "") return true;
    return (
      p.firstName.toLowerCase().includes(term) ||
      p.phoneMasked.includes(term) ||
      p.emailMasked.includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  const openDetail = (patient: AdminPatient) => {
    setSelectedPatient(patient);
    setDetailOpen(true);
  };

  const detail = detailQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">מטופלים</h1>

      <div className="card-tint flex flex-col gap-3 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            dir="rtl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון או אימייל..."
            className="h-10 rounded-xl bg-background pr-9 text-right"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {patientsQuery.isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">טוען...</div>
          )}

          {!patientsQuery.isLoading && (!filteredPatients || filteredPatients.length === 0) && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? "לא נמצאו תוצאות" : "אין מטופלים עדיין"}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">ערוץ</TableHead>
                <TableHead className="text-right">תאריך התחלה</TableHead>
                <TableHead className="text-right">תזכורות</TableHead>
                <TableHead className="text-right">פעולה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.firstName}</TableCell>
                  <TableCell dir="ltr" className="text-xs">
                    {p.phoneMasked}
                  </TableCell>
                  <TableCell dir="ltr" className="text-xs">
                    {p.emailMasked}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                      {p.channel === "sms" ? "SMS" : "Email"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{p.startDate}</TableCell>
                  <TableCell>
                    <span className={p.reminders === "on" ? "text-brand" : "text-muted-foreground"}>
                      {p.reminders === "on" ? "פעיל" : "כבוי"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => openDetail(p)}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      לוח שנה
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>
              {detail?.patient.firstName ?? selectedPatient?.firstName} — תוכנית טיפול
            </DialogTitle>
            <DialogDescription>
              {detail?.plan ? (
                <>
                  תאריך התחלה: {detail.plan.startDate} · מחזור: {detail.plan.treatmentDays} ימי
                  טיפול / {detail.plan.breakDays} ימי הפסקה
                </>
              ) : (
                "אין תכנון טיפול פעיל"
              )}
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">טוען...</div>
          )}

          {detail && <CalendarView plan={detail.plan} notifications={detail.notifications} />}

          {detail && (
            <div className="mt-4 max-h-60 overflow-y-auto rounded-2xl border border-hair">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">תבנית</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">נשלח</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="text-xs">{n.date}</TableCell>
                      <TableCell className="text-xs font-mono">{n.template}</TableCell>
                      <TableCell>
                        <span
                          className={
                            n.status === "sent"
                              ? "text-brand"
                              : n.status === "failed"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {n.status === "sent" ? "נשלח" : n.status === "failed" ? "נכשל" : "ממתין"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {n.sentAt ? format(parseISO(n.sentAt), "dd/MM HH:mm") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {detail.notifications.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        אין הודעות Marquis עדיין
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
