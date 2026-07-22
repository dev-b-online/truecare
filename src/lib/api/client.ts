// Real API client for TruCare PHP backend.
// Mirrors mockApi interface exactly — swap in index.ts without touching UI.

import type {
  AdminStats,
  ApiSettings,
  ConsentRecord,
  DoseEvent,
  EmailTemplate,
  EmailTemplateKey,
  IncidentLog,
  NotificationLog,
  Patient,
  PlanResponse,
  SmsConfigView,
  SmsTemplate,
  SmsTemplateKey,
  TreatmentPlan,
} from "./types";

let _settings: ApiSettings = {
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  useMock: false,
};

const ADMIN_TOKEN_KEY = "trucare.admin.session";
const PATIENT_TOKEN_KEY = "trucare.session";

// Which credential a request should present.
//   "auto"    → legacy behaviour (admin token wins, then patient, then session)
//   "patient" → patient session only (never falls back to an admin token)
//   "admin"   → admin session only
//   "none"    → send no Authorization header
type AuthScope = "auto" | "patient" | "admin" | "none";

function getAuthToken(scope: AuthScope = "auto"): string | null {
  if (typeof localStorage === "undefined") return null;
  switch (scope) {
    case "none":
      return null;
    case "patient":
      return localStorage.getItem(PATIENT_TOKEN_KEY);
    case "admin":
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    case "auto":
    default:
      return (
        localStorage.getItem(ADMIN_TOKEN_KEY) ??
        localStorage.getItem(PATIENT_TOKEN_KEY) ??
        sessionStorage.getItem("trucare_token")
      );
  }
}

async function req<T>(
  path: string,
  options: RequestInit = {},
  scope: AuthScope = "auto",
): Promise<T> {
  const token = getAuthToken(scope);
  const response = await fetch(`${_settings.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("trucare:api:unauthorized", { detail: { status: 401 } }),
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Unauthorized");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const realApi = {
  // ── Admin stats ──────────────────────────────────────────────
  async getStats(): Promise<AdminStats> {
    return req("/admin/stats");
  },

  // ── Notifications & Incidents ────────────────────────────────
  async listNotifications(): Promise<NotificationLog[]> {
    const res = await req<{ items: NotificationLog[]; nextCursor: string | null }>(
      "/admin/notifications?limit=100",
    );
    return res.items ?? [];
  },
  async listIncidents(): Promise<IncidentLog[]> {
    const res = await req<{ items: IncidentLog[]; nextCursor: string | null }>(
      "/admin/incidents?limit=100",
    );
    return res.items ?? [];
  },

  // ── Treatment plan & doses ───────────────────────────────────
  async getPlanForPatient(patientId: string): Promise<PlanResponse | undefined> {
    return req(`/patients/${patientId}/plan`, {}, "patient");
  },
  async listDoses(planId: string): Promise<DoseEvent[]> {
    const res = await req<{ doses: DoseEvent[] }>(`/plans/${planId}/doses`, {}, "patient");
    return res.doses ?? [];
  },
  async resetCycle(startDate: string): Promise<PlanResponse> {
    return req(
      `/plans/reset`,
      {
        method: "POST",
        body: JSON.stringify({ startDate }),
      },
      "patient",
    );
  },
  async markDose(id: string, status: "taken" | "missed"): Promise<DoseEvent | undefined> {
    return req(
      `/doses/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      "patient",
    );
  },

  // ── Patient registration ─────────────────────────────────────
  async registerPatient(input: {
    firstName: string;
    channel: "sms" | "email";
    phone: string;
    email?: string;
    startDate: string;
    reminders: "on" | "off";
  }): Promise<Patient> {
    // Drop any stale patient token (e.g. a leftover anonymous OTP token
    // from a previous test) so the freshly issued token below is the
    // only one presented to subsequent calls like /patients/me/consent.
    localStorage.removeItem(PATIENT_TOKEN_KEY);

    const result = await req<{ sessionToken: string; token?: string; patient: Patient }>(
      "/patients",
      {
        method: "POST",
        body: JSON.stringify({
          firstName: input.firstName,
          channel: input.channel,
          phone: input.phone,
          email: input.email,
          startDate: input.startDate,
          reminders: input.reminders,
        }),
      },
    );
    // Save patient JWT to localStorage so subsequent requests include it
    const token = result.sessionToken ?? result.token;
    if (token) {
      localStorage.setItem(PATIENT_TOKEN_KEY, token);
    }
    return result.patient;
  },

  // ── Consent ──────────────────────────────────────────────────
  async saveConsent(
    record: Omit<ConsentRecord, "id" | "signatureHmac" | "acceptedAt">,
  ): Promise<ConsentRecord> {
    return req(
      `/patients/me/consent`,
      {
        method: "POST",
        body: JSON.stringify({
          termsVersion: record.termsVersion,
          privacyPolicyVersion: record.privacyPolicyVersion,
          disclaimerVersion: record.disclaimerVersion,
          marketingOptIn: record.marketingOptIn,
        }),
      },
      "patient",
    );
  },

  // ── SMS config ───────────────────────────────────────────────
  async getSmsConfigView(): Promise<SmsConfigView> {
    return req("/admin/sms/health");
  },
  async setSmsConfig(input: { key?: string; user?: string; pass?: string; sender?: string }) {
    return req("/admin/sms/config", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  // ── API settings (persisted in sessionStorage only) ──────────
  async getApiSettings(): Promise<ApiSettings> {
    return { ..._settings };
  },
  async setApiSettings(next: Partial<ApiSettings>): Promise<ApiSettings> {
    _settings = { ..._settings, ...next };
    return { ..._settings };
  },

  // ── SMS templates ────────────────────────────────────────────
  async listSmsTemplates(): Promise<SmsTemplate[]> {
    const res = await req<{ items: SmsTemplate[] }>("/admin/sms/templates");
    return res.items ?? [];
  },
  async getSmsTemplate(key: SmsTemplateKey): Promise<SmsTemplate | undefined> {
    return req(`/admin/sms/templates/${key}`);
  },
  async upsertSmsTemplate(input: {
    id?: string;
    key: SmsTemplateKey;
    name: string;
    body: string;
    enabled: boolean;
  }): Promise<SmsTemplate> {
    if (input.id) {
      // update existing
      const res = await req<{ template: SmsTemplate }>(`/admin/sms/templates/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: input.name, body: input.body, enabled: input.enabled }),
      });
      return res.template;
    }
    // create new
    const res = await req<{ template: SmsTemplate }>("/admin/sms/templates", {
      method: "POST",
      body: JSON.stringify({
        key: input.key,
        name: input.name,
        body: input.body,
        enabled: input.enabled,
      }),
    });
    return res.template;
  },
  async deleteSmsTemplate(id: string): Promise<{ ok: boolean }> {
    return req(`/admin/sms/templates/${id}`, { method: "DELETE" });
  },

  // ── Email templates ───────────────────────────────────────────
  async listEmailTemplates(): Promise<EmailTemplate[]> {
    const res = await req<{ items: EmailTemplate[] }>("/admin/email/templates");
    return res.items ?? [];
  },
  async getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplate | undefined> {
    return req(`/admin/email/templates/${key}`);
  },
  async upsertEmailTemplate(input: {
    id?: string;
    key: EmailTemplateKey;
    name: string;
    subject: string;
    body: string;
    enabled: boolean;
  }): Promise<EmailTemplate> {
    if (input.id) {
      const res = await req<{ template: EmailTemplate }>(`/admin/email/templates/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: input.name,
          subject: input.subject,
          body: input.body,
          enabled: input.enabled,
        }),
      });
      return res.template;
    }
    const res = await req<{ template: EmailTemplate }>("/admin/email/templates", {
      method: "POST",
      body: JSON.stringify({
        key: input.key,
        name: input.name,
        subject: input.subject,
        body: input.body,
        enabled: input.enabled,
      }),
    });
    return res.template;
  },
  async deleteEmailTemplate(id: string): Promise<{ ok: boolean }> {
    return req(`/admin/email/templates/${id}`, { method: "DELETE" });
  },

  // ── SMS test send ────────────────────────────────────────────
  async sendSmsTest(recipient: string): Promise<{ ok: boolean; providerCode: number }> {
    return req("/admin/sms/test", {
      method: "POST",
      body: JSON.stringify({ recipient }),
    });
  },

  // ── OTP auth ─────────────────────────────────────────────────
  // OTP endpoints are unauthenticated. Send no token so a stale/admin token
  // can never leak into the login flow.
  async requestOtp(recipient: string): Promise<{
    challengeId: string;
    expiresAt: string;
    resendAvailableIn: number;
    _devCode?: string;
  }> {
    return req(
      "/auth/otp/request",
      {
        method: "POST",
        body: JSON.stringify({ recipient }),
      },
      "none",
    );
  },
  async verifyOtp(
    challengeId: string,
    code: string,
  ): Promise<{ sessionToken: string | null; patientId: string | null; registered: boolean }> {
    return req(
      "/auth/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({ challengeId, code }),
      },
      "none",
    );
  },
  async resendOtp(
    recipient: string,
  ): Promise<{ challengeId: string; expiresAt: string; resendAvailableIn: number }> {
    return req(
      "/auth/otp/resend",
      {
        method: "POST",
        body: JSON.stringify({ recipient }),
      },
      "none",
    );
  },
  async checkPhone(phone: string): Promise<{ exists: boolean }> {
    return req(
      "/auth/otp/check-phone",
      {
        method: "POST",
        body: JSON.stringify({ recipient: phone }),
      },
      "none",
    );
  },
  async getRateLimit(
    recipient: string,
  ): Promise<{ remaining: number; max: number; windowSec: number }> {
    return req<{ remaining: number; max: number; windowSec: number }>(
      `/auth/otp/rate-limit?recipient=${encodeURIComponent(recipient)}`,
      {},
      "none",
    );
  },

  // ── Current patient / session ────────────────────────────────
  async getMe(): Promise<Patient> {
    // Patient scope only: never fall back to an admin token, otherwise a
    // coexisting admin session would authenticate this call as the admin.
    return req("/patients/me", {}, "patient");
  },
  async logout(): Promise<{ ok: boolean }> {
    try {
      // Send the patient token explicitly so we revoke the patient
      // session — not a coexisting admin session.
      return await req("/auth/logout", { method: "POST" }, "patient");
    } finally {
      // Always drop the local patient token, even if the server call
      // fails (e.g. token already expired / revoked).
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
      }
    }
  },

  // ── Helpers (no-op stubs, server handles these) ──────────────
  addNotification() {},
  addIncident() {},
  wipeAll() {},
};
