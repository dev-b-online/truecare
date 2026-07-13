import { create } from "zustand";

interface DiaryState {
  patientId: string;
  planId: string;
  anchorDate: string; // yyyy-MM-dd, first day of visible 14-day window
  setAnchor: (iso: string) => void;
  setPatient: (patientId: string, planId: string) => void;
}

export const useDiary = create<DiaryState>((set) => ({
  patientId: "pat-demo",
  planId: "plan-demo",
  anchorDate: new Date().toISOString().slice(0, 10),
  setAnchor: (iso) => set({ anchorDate: iso }),
  setPatient: (patientId, planId) => set({ patientId, planId }),
}));
