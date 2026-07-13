import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import type { DoseEvent, DoseSlot, DoseStatus } from "./api/types";

export const HEBREW_WEEKDAYS_SHORT = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export interface DayCell {
  date: Date;
  iso: string;
  cycleDay: number; // 1..7
  isTreatmentDay: boolean;
  isBreakStart: boolean;
  dayIndexInCycle: number;
  weekIndex: number; // 0 or 1 for a 2-week view
  label: string; // e.g. "יום 1"
  doses: {
    morning?: DoseEvent;
    evening?: DoseEvent;
  };
}

export function computeCycleDay(startDateIso: string, target: Date): number {
  const start = startOfDay(parseISO(startDateIso));
  const diff = differenceInCalendarDays(startOfDay(target), start);
  return ((diff % 7) + 7) % 7 + 1; // 1..7
}

export function isTreatmentDay(cycleDay: number): boolean {
  return cycleDay >= 1 && cycleDay <= 4;
}

export function buildTwoWeekGrid(
  startDateIso: string,
  anchor: Date,
  doses: DoseEvent[],
): DayCell[] {
  const cells: DayCell[] = [];
  const first = startOfDay(anchor);
  for (let i = 0; i < 14; i += 1) {
    const date = addDays(first, i);
    const iso = format(date, "yyyy-MM-dd");
    const cycleDay = computeCycleDay(startDateIso, date);
    const dayDoses = doses.filter((d) => d.date === iso);
    cells.push({
      date,
      iso,
      cycleDay,
      isTreatmentDay: isTreatmentDay(cycleDay),
      isBreakStart: cycleDay === 5,
      dayIndexInCycle: cycleDay,
      weekIndex: Math.floor(i / 7),
      label: `יום ${cycleDay}`,
      doses: {
        morning: dayDoses.find((d) => d.slot === "morning"),
        evening: dayDoses.find((d) => d.slot === "evening"),
      },
    });
  }
  return cells;
}

export function seedDoseEvents(
  planId: string,
  startDateIso: string,
  days: number,
  today: Date = new Date(),
): DoseEvent[] {
  const events: DoseEvent[] = [];
  const start = parseISO(startDateIso);
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const cycleDay = computeCycleDay(startDateIso, date);
    if (!isTreatmentDay(cycleDay)) continue;
    for (const slot of ["morning", "evening"] as DoseSlot[]) {
      const scheduled = new Date(date);
      scheduled.setHours(slot === "morning" ? 8 : 20, 0, 0, 0);
      let status: DoseStatus = "planned";
      if (scheduled < today) {
        status = Math.random() < 0.15 ? "missed" : "taken";
      }
      events.push({
        id: `${planId}-${format(date, "yyyyMMdd")}-${slot}`,
        planId,
        date: format(date, "yyyy-MM-dd"),
        slot,
        status,
        scheduledFor: scheduled.toISOString(),
        takenAt: status === "taken" ? scheduled.toISOString() : undefined,
      });
    }
  }
  return events;
}

export function formatDoseTimestamp(iso: string): string {
  const d = parseISO(iso);
  return `${format(d, "dd/MM")} · ${format(d, "HH:mm")}`;
}
