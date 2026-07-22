// Production data lives in secure MySQL, encrypted at rest and in transit.
// Never persist PII in browser/Supabase.

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
  SmsConfigView,
  SmsTemplate,
  SmsTemplateKey,
  TreatmentPlan,
} from "./types";
import { seedDoseEvents } from "../calendar";
import { addDays, format, subDays } from "date-fns";

const now = () => new Date();
const uid = () => Math.random().toString(36).slice(2, 10);

const defaultStart = format(subDays(now(), 6), "yyyy-MM-dd");
const seededPlanId = "plan-demo";

const patients: Patient[] = [
  {
    id: "pat-demo",
    firstName: "יעל",
    channel: "sms",
    phoneMasked: "050****321",
    startDate: defaultStart,
    reminders: "on",
    language: "he",
    createdAt: subDays(now(), 6).toISOString(),
  },
];

const plans: TreatmentPlan[] = [
  {
    id: seededPlanId,
    patientId: "pat-demo",
    startDate: defaultStart,
    cycleLengthDays: 7,
    treatmentDays: 4,
    breakDays: 3,
    createdAt: subDays(now(), 6).toISOString(),
  },
];

const doses: DoseEvent[] = seedDoseEvents(seededPlanId, defaultStart, 21, now());

const consents: ConsentRecord[] = [];

const notifications: NotificationLog[] = [
  {
    id: uid(),
    channel: "sms",
    recipientMasked: "050****321",
    template: "morning_reminder",
    status: "sent",
    providerCode: 1,
    createdAt: subDays(now(), 1).toISOString(),
  },
  {
    id: uid(),
    channel: "sms",
    recipientMasked: "052****880",
    template: "otp_code",
    status: "failed",
    providerCode: -3,
    error: "invalid recipient",
    createdAt: subDays(now(), 2).toISOString(),
  },
];

const incidents: IncidentLog[] = [
  {
    id: uid(),
    severity: "warning",
    code: "SMS_RATE_LIMIT",
    message: "חריגה זמנית בקצב שליחת SMS",
    createdAt: subDays(now(), 3).toISOString(),
    resolvedAt: subDays(now(), 2).toISOString(),
  },
  {
    id: uid(),
    severity: "info",
    code: "PATIENT_REGISTERED",
    message: "מטופל חדש נרשם בהצלחה",
    createdAt: subDays(now(), 1).toISOString(),
  },
];

let apiSettings: ApiSettings = {
  baseUrl: "/api/v1",
  useMock: true,
};

let smsConfigOverride: { key?: string; user?: string; pass?: string; sender?: string } = {};

const latency = (min = 120, max = 260) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

const smsTemplates: SmsTemplate[] = [
  {
    id: uid(),
    key: "welcome",
    name: "ברוכים הבאים",
    body: "שלום {{firstName}}, ברוך/ה הבא/ה ל-TruCare. נלווה אותך לאורך הטיפול.",
    enabled: true,
    updatedAt: subDays(now(), 10).toISOString(),
  },
  {
    id: uid(),
    key: "morning_reminder",
    name: "תזכורת בוקר",
    body: "בוקר טוב {{firstName}}, זו תזכורת ליטול את מנת הבוקר בשעה {{time}}.",
    enabled: true,
    updatedAt: subDays(now(), 5).toISOString(),
  },
  {
    id: uid(),
    key: "evening_reminder",
    name: "תזכורת ערב",
    body: "ערב טוב {{firstName}}, נא ליטול את מנת הערב בשעה {{time}}.",
    enabled: true,
    updatedAt: subDays(now(), 5).toISOString(),
  },
  {
    id: uid(),
    key: "missed_dose",
    name: "מנה שהוחמצה",
    body: "{{firstName}}, שמנו לב שטרם סימנת נטילת מנה היום. אנא עדכן/י היומן.",
    enabled: true,
    updatedAt: subDays(now(), 3).toISOString(),
  },
  {
    id: uid(),
    key: "start_treatment",
    name: "התחלת טיפול",
    body: "שלום {{firstName}}, זה היום שלך להתחיל את הטיפול בטרוקאפ. יש לפעול לפי הוראות הרופא המטפל והעלון לצרכן.",
    enabled: true,
    updatedAt: subDays(now(), 2).toISOString(),
  },
  {
    id: uid(),
    key: "day_off",
    name: "יום הפסקה",
    body: "שלום {{firstName}}, היום יום הפסקה ואין ליטול את הטיפול. יש לפעול לפי הוראות הרופא.",
    enabled: true,
    updatedAt: subDays(now(), 2).toISOString(),
  },
  {
    id: uid(),
    key: "otp_code",
    name: "קוד אימות",
    body: "קוד האימות שלך ל-TruCare: {{code}}. הקוד תקף ל-5 דקות.",
    enabled: true,
    updatedAt: subDays(now(), 1).toISOString(),
  },
  {
    id: uid(),
    key: "custom",
    name: "מותאם אישית",
    body: "",
    enabled: true,
    updatedAt: subDays(now(), 0).toISOString(),
  },
];

const emailTemplates: EmailTemplate[] = [
  {
    id: uid(),
    key: "welcome",
    name: "ברוכים הבאים",
    subject: "ברוכים הבאים ל-TruCare",
    body: "<p>שלום {{firstName}},</p><p>ברוך/ה הבא/ה ל-TruCare. נלווה אותך לאורך הטיפול.</p>",
    enabled: true,
    updatedAt: subDays(now(), 10).toISOString(),
  },
  {
    id: uid(),
    key: "morning_reminder",
    name: "תזכורת בוקר",
    subject: "תזכורת בוקר — TruCare",
    body: "<p>בוקר טוב {{firstName}},</p><p>זו תזכורת ליטול את מנת הבוקר בשעה {{time}}.</p>",
    enabled: true,
    updatedAt: subDays(now(), 5).toISOString(),
  },
  {
    id: uid(),
    key: "evening_reminder",
    name: "תזכורת ערב",
    subject: "תזכורת ערב — TruCare",
    body: "<p>ערב טוב {{firstName}},</p><p>נא ליטול את מנת הערב בשעה {{time}}.</p>",
    enabled: true,
    updatedAt: subDays(now(), 5).toISOString(),
  },
  {
    id: uid(),
    key: "missed_dose",
    name: "מנה שהוחמצה",
    subject: "תזכורת: מנה שהוחמצה",
    body: "<p>{{firstName}}, שמנו לב שטרם סימנת נטילת מנה היום. אנא עדכן/י ביומן.</p>",
    enabled: true,
    updatedAt: subDays(now(), 3).toISOString(),
  },
  {
    id: uid(),
    key: "start_treatment",
    name: "התחלת טיפול",
    subject: "התחלת טיפול בטרוקאפ",
    body: "<p>שלום {{firstName}},</p><p>זה היום שלך להתחיל את הטיפול בטרוקאפ. יש לפעול לפי הוראות הרופא המטפל והעלון לצרכן.</p>",
    enabled: true,
    updatedAt: subDays(now(), 2).toISOString(),
  },
  {
    id: uid(),
    key: "day_off",
    name: "יום הפסקה",
    subject: "יום הפסקה — TruCare",
    body: "<p>שלום {{firstName}},</p><p>היום יום הפסקה ואין ליטול את הטיפול. יש לפעול לפי הוראות הרופא.</p>",
    enabled: true,
    updatedAt: subDays(now(), 2).toISOString(),
  },
  {
    id: uid(),
    key: "otp_code",
    name: "קוד אימות",
    subject: "קוד האימות שלך ל-TruCare",
    body: "<p>קוד האימות שלך ל-TruCare: <strong>{{code}}</strong>.</p><p>הקוד תקף ל-5 דקות.</p>",
    enabled: true,
    updatedAt: subDays(now(), 1).toISOString(),
  },
  {
    id: uid(),
    key: "custom",
    name: "מותאם אישית",
    subject: "",
    body: "",
    enabled: true,
    updatedAt: subDays(now(), 0).toISOString(),
  },
];

export const mockDb = {
  patients,
  plans,
  doses,
  consents,
  notifications,
  incidents,
  apiSettings,
  smsConfigOverride,
  smsTemplates,
  emailTemplates,
};

export const mockApi = {
  async getStats(): Promise<AdminStats> {
    await latency();
    const taken = doses.filter((d) => d.status === "taken").length;
    const missed = doses.filter((d) => d.status === "missed").length;
    const total = taken + missed;
    return {
      patientsTotal: patients.length,
      activePlans: plans.length,
      dosesTaken: taken,
      dosesMissed: missed,
      adherenceRate: total ? taken / total : 0,
      smsSent: notifications.filter((n) => n.status === "sent").length,
      smsFailed: notifications.filter((n) => n.status === "failed").length,
    };
  },
  async listNotifications(): Promise<NotificationLog[]> {
    await latency();
    return [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async listIncidents(): Promise<IncidentLog[]> {
    await latency();
    return [...incidents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async getPlanForPatient(patientId: string): Promise<TreatmentPlan | undefined> {
    await latency();
    return plans.find((p) => p.patientId === patientId);
  },
  async listDoses(planId: string): Promise<DoseEvent[]> {
    await latency();
    return doses.filter((d) => d.planId === planId);
  },
  async markDose(id: string, status: "taken" | "missed"): Promise<DoseEvent | undefined> {
    await latency(80, 160);
    const d = doses.find((x) => x.id === id);
    if (!d) return undefined;
    d.status = status;
    d.takenAt = status === "taken" ? new Date().toISOString() : undefined;
    return d;
  },
  async registerPatient(input: {
    firstName: string;
    channel: "sms" | "email";
    phoneMasked: string;
    emailMasked?: string;
    startDate: string;
    reminders: "on" | "off";
  }): Promise<Patient> {
    await latency();
    const p: Patient = {
      id: `pat-${uid()}`,
      language: "he",
      createdAt: new Date().toISOString(),
      ...input,
    };
    patients.push(p);
    const plan: TreatmentPlan = {
      id: `plan-${uid()}`,
      patientId: p.id,
      startDate: input.startDate,
      cycleLengthDays: 7,
      treatmentDays: 4,
      breakDays: 3,
      createdAt: new Date().toISOString(),
    };
    plans.push(plan);
    doses.push(...seedDoseEvents(plan.id, input.startDate, 21, new Date()));
    incidents.unshift({
      id: uid(),
      severity: "info",
      code: "PATIENT_REGISTERED",
      message: `מטופל חדש: ${input.firstName}`,
      createdAt: new Date().toISOString(),
    });
    return p;
  },
  async saveConsent(
    record: Omit<ConsentRecord, "id" | "signatureHmac" | "acceptedAt">,
  ): Promise<ConsentRecord> {
    await latency();
    const r: ConsentRecord = {
      ...record,
      id: uid(),
      acceptedAt: new Date().toISOString(),
      signatureHmac: "hmac_" + uid(),
    };
    consents.push(r);
    return r;
  },
  async getSmsConfigView(): Promise<SmsConfigView> {
    await latency();
    // Server function is authoritative; UI-only mock preview.
    const source = smsConfigOverride.key ? "db" : "env";
    return {
      keyMasked: smsConfigOverride.key ? mask(smsConfigOverride.key) : "env***set",
      userMasked: smsConfigOverride.user ? mask(smsConfigOverride.user) : "env***set",
      passMasked: "••••••••",
      sender: smsConfigOverride.sender || "TruCare",
      source,
    };
  },
  async setSmsConfig(input: { key?: string; user?: string; pass?: string; sender?: string }) {
    await latency();
    smsConfigOverride = { ...smsConfigOverride, ...input };
    return { ok: true };
  },
  async getApiSettings(): Promise<ApiSettings> {
    await latency(40, 80);
    return { ...apiSettings };
  },
  async setApiSettings(next: Partial<ApiSettings>) {
    await latency(40, 80);
    apiSettings = { ...apiSettings, ...next };
    return apiSettings;
  },
  async listSmsTemplates(): Promise<SmsTemplate[]> {
    await latency();
    return [...smsTemplates].sort((a, b) => a.name.localeCompare(b.name, "he"));
  },
  async getSmsTemplate(key: SmsTemplateKey): Promise<SmsTemplate | undefined> {
    await latency(40, 80);
    return smsTemplates.find((t) => t.key === key);
  },
  async upsertSmsTemplate(input: {
    id?: string;
    key: SmsTemplateKey;
    name: string;
    body: string;
    enabled: boolean;
  }): Promise<SmsTemplate> {
    await latency();
    const existing = input.id
      ? smsTemplates.find((t) => t.id === input.id)
      : smsTemplates.find((t) => t.key === input.key);
    if (existing) {
      existing.name = input.name;
      existing.body = input.body;
      existing.enabled = input.enabled;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const created: SmsTemplate = {
      id: uid(),
      key: input.key,
      name: input.name,
      body: input.body,
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
    };
    smsTemplates.push(created);
    return created;
  },
  async deleteSmsTemplate(id: string): Promise<{ ok: boolean }> {
    await latency(60, 120);
    const i = smsTemplates.findIndex((t) => t.id === id);
    if (i >= 0) smsTemplates.splice(i, 1);
    return { ok: true };
  },
  async listEmailTemplates(): Promise<EmailTemplate[]> {
    await latency();
    return [...emailTemplates].sort((a, b) => a.name.localeCompare(b.name, "he"));
  },
  async getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplate | undefined> {
    await latency(40, 80);
    return emailTemplates.find((t) => t.key === key);
  },
  async upsertEmailTemplate(input: {
    id?: string;
    key: EmailTemplateKey;
    name: string;
    subject: string;
    body: string;
    enabled: boolean;
  }): Promise<EmailTemplate> {
    await latency();
    const existing = input.id
      ? emailTemplates.find((t) => t.id === input.id)
      : emailTemplates.find((t) => t.key === input.key);
    if (existing) {
      existing.name = input.name;
      existing.subject = input.subject;
      existing.body = input.body;
      existing.enabled = input.enabled;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const created: EmailTemplate = {
      id: uid(),
      key: input.key,
      name: input.name,
      subject: input.subject,
      body: input.body,
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
    };
    emailTemplates.push(created);
    return created;
  },
  async deleteEmailTemplate(id: string): Promise<{ ok: boolean }> {
    await latency(60, 120);
    const i = emailTemplates.findIndex((t) => t.id === id);
    if (i >= 0) emailTemplates.splice(i, 1);
    return { ok: true };
  },
  // small helpers
  addNotification(entry: Omit<NotificationLog, "id" | "createdAt">) {
    notifications.unshift({ ...entry, id: uid(), createdAt: new Date().toISOString() });
  },
  addIncident(entry: Omit<IncidentLog, "id" | "createdAt">) {
    incidents.unshift({ ...entry, id: uid(), createdAt: new Date().toISOString() });
  },
  wipeAll() {
    patients.length = 0;
    plans.length = 0;
    doses.length = 0;
    consents.length = 0;
  },
};

function mask(value: string) {
  if (value.length <= 6) return "•".repeat(value.length);
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

// touch to avoid unused warning in ISO comparisons
void addDays;
