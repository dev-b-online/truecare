// Cookie/analytics consent state.
// Best-practice defaults: no consent until the user decides.
// Stored in localStorage with a long TTL (≈1 year) so returning
// visitors are not re-prompted. A DB sync hook is provided for
// long-term / cross-device persistence (see lib/api client).
import { create } from "zustand";
import { api } from "@/lib/api";

export type ConsentStatus = "granted" | "denied" | null;

const STORAGE_KEY = "trucare.consent";
const TTL_DAYS = 365;

interface StoredConsent {
  status: Exclude<ConsentStatus, null>;
  version: number;
  at: string; // ISO timestamp
}

// Bump when the consent copy / scope changes so we can re-prompt.
export const CONSENT_VERSION = 1;

function load(): ConsentStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null; // changed terms → ask again
    return parsed.status;
  } catch {
    return null;
  }
}

function persist(status: Exclude<ConsentStatus, null>): void {
  const payload: StoredConsent = {
    status,
    version: CONSENT_VERSION,
    at: new Date().toISOString(),
  };
  // Persist for ~1 year (long-term browser storage).
  const expires = new Date(Date.now() + TTL_DAYS * 86400_000).toUTCString();
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(
    JSON.stringify(payload),
  )}; path=/; max-age=${TTL_DAYS * 86400}; expires=${expires}; samesite=lax`;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

interface ConsentState {
  status: ConsentStatus;
  set: (status: Exclude<ConsentStatus, null>) => void;
  reset: () => void;
  hydrateFromServer: () => Promise<void>;
}

export const useConsent = create<ConsentState>((set) => ({
  status: typeof localStorage !== "undefined" ? load() : null,
  set: (status) => {
    persist(status);
    set({ status });
  },
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ status: null });
  },
  hydrateFromServer: async () => {
    try {
      const r = await api.getCookieConsent();
      if (r.status === "granted" || r.status === "denied") {
        persist(r.status);
        set({ status: r.status });
      }
    } catch {
      // Not authenticated or network error — keep local status (null → banner shows).
    }
  },
}));
