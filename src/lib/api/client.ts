// Real API client for TruCare PHP backend.
// Mirrors mockApi interface exactly — swap in index.ts without touching UI.

import type {
    AdminStats,
    ApiSettings,
    ConsentRecord,
    DoseEvent,
    IncidentLog,
    NotificationLog,
    Patient,
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

function getAuthToken(): string | null {
    return (
        localStorage.getItem(ADMIN_TOKEN_KEY) ??
        localStorage.getItem(PATIENT_TOKEN_KEY) ??
        sessionStorage.getItem("trucare_token")
    );
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
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
                new CustomEvent("trucare:api:unauthorized", { detail: { status: 401 } })
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
        const res = await req<{ items: NotificationLog[]; nextCursor: string | null }>("/admin/notifications?limit=100");
        return res.items ?? [];
    },
    async listIncidents(): Promise<IncidentLog[]> {
        const res = await req<{ items: IncidentLog[]; nextCursor: string | null }>("/admin/incidents?limit=100");
        return res.items ?? [];
    },

    // ── Treatment plan & doses ───────────────────────────────────
    async getPlanForPatient(patientId: string): Promise<TreatmentPlan | undefined> {
        return req(`/patients/${patientId}/plan`);
    },
    async listDoses(planId: string): Promise<DoseEvent[]> {
        return req(`/plans/${planId}/doses`);
    },
    async markDose(id: string, status: "taken" | "missed"): Promise<DoseEvent | undefined> {
        return req(`/doses/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
        });
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

        const result = await req<{ sessionToken: string; token?: string; patient: Patient }>("/patients", {
            method: "POST",
            body: JSON.stringify({
                firstName: input.firstName,
                channel: input.channel,
                phone: input.phone,
                email: input.email,
                startDate: input.startDate,
                reminders: input.reminders,
            }),
        });
        // Save patient JWT to localStorage so subsequent requests include it
        const token = result.sessionToken ?? result.token;
        if (token) {
            localStorage.setItem(PATIENT_TOKEN_KEY, token);
        }
        return result.patient;
    },

    // ── Consent ──────────────────────────────────────────────────
    async saveConsent(
    record: Omit<ConsentRecord, "id" | "signatureHmac" | "acceptedAt">
): Promise<ConsentRecord> {
    return req(`/patients/me/consent`, {
        method: "POST",
        body: JSON.stringify({
            termsVersion: record.termsVersion,
            privacyPolicyVersion: record.privacyPolicyVersion,
            disclaimerVersion: record.disclaimerVersion,
            marketingOptIn: record.marketingOptIn,
        }),
    });
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
            body: JSON.stringify({ key: input.key, name: input.name, body: input.body, enabled: input.enabled }),
        });
        return res.template;
    },
    async deleteSmsTemplate(id: string): Promise<{ ok: boolean }> {
        return req(`/admin/sms/templates/${id}`, { method: "DELETE" });
    },

    // ── SMS test send ────────────────────────────────────────────
    async sendSmsTest(recipient: string): Promise<{ ok: boolean; providerCode: number }> {
        return req("/admin/sms/test", {
            method: "POST",
            body: JSON.stringify({ recipient }),
        });
    },

    // ── OTP auth ─────────────────────────────────────────────────
    async requestOtp(phone: string): Promise<{ challengeId: string; expiresAt: string; resendAvailableIn: number; _devCode?: string }> {
        return req("/auth/otp/request", {
            method: "POST",
            body: JSON.stringify({ recipient: phone }),
        });
    },
    async verifyOtp(challengeId: string, code: string): Promise<{ sessionToken: string; patientId: string | null }> {
        return req("/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify({ challengeId, code }),
        });
    },
    async resendOtp(phone: string): Promise<{ challengeId: string; expiresAt: string; resendAvailableIn: number }> {
        return req("/auth/otp/resend", {
            method: "POST",
            body: JSON.stringify({ recipient: phone }),
        });
    },

    // ── Helpers (no-op stubs, server handles these) ──────────────
    addNotification() {},
    addIncident() {},
    wipeAll() {},
};