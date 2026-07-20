// Patient authentication state for the app header / login flow.
//
// The session JWT is stored in localStorage under `trucare.session` — the same
// key the API client (`lib/api/client.ts`) reads to attach the Authorization
// header. This store keeps a light in-memory mirror plus the patient's display
// name so the header can greet the user without an extra round-trip on every
// render.
//
// NOTE: This app is server-rendered (TanStack Start). Never touch localStorage
// during render. Call `hydrate()` inside a useEffect after mount instead, so the
// server and first client render agree (no hydration mismatch).
import { create } from "zustand";
import { api, type Patient } from "@/lib/api";

export const PATIENT_TOKEN_KEY = "trucare.session";

interface PatientAuthState {
  status: "loading" | "authenticated" | "guest";
  patient: Patient | null;
  /** Read the token from storage and, if present, fetch the patient profile. */
  hydrate: () => Promise<void>;
  /** Called after a successful OTP verification that returned a session token. */
  login: (token: string) => Promise<Patient | null>;
  /** Revoke the session server-side and clear local state. */
  logout: () => Promise<void>;
}

function readToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(PATIENT_TOKEN_KEY);
}

// Monotonic token so a slow in-flight auth resolution can't clobber a newer
// one (e.g. a lagging hydrate() overwriting a completed login()).
let authSeq = 0;

export const usePatientAuth = create<PatientAuthState>((set) => ({
  status: "loading",
  patient: null,

  hydrate: async () => {
    const seq = ++authSeq;
    const token = readToken();
    if (!token) {
      if (seq === authSeq) set({ status: "guest", patient: null });
      return;
    }
    try {
      const patient = await api.getMe();
      if (seq === authSeq) set({ status: "authenticated", patient });
    } catch {
      // Token invalid/expired — drop it and fall back to guest.
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
      }
      if (seq === authSeq) set({ status: "guest", patient: null });
    }
  },

  login: async (token: string) => {
    const seq = ++authSeq;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PATIENT_TOKEN_KEY, token);
    }
    try {
      const patient = await api.getMe();
      if (seq === authSeq) set({ status: "authenticated", patient });
      return patient;
    } catch {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
      }
      if (seq === authSeq) set({ status: "guest", patient: null });
      return null;
    }
  },

  logout: async () => {
    // Invalidate any in-flight hydrate()/login() so their late resolution
    // cannot revive the session after we log out.
    ++authSeq;
    try {
      await api.logout();
    } catch {
      // ignore — api.logout() clears the token regardless
    }
    set({ status: "guest", patient: null });
  },
}));
