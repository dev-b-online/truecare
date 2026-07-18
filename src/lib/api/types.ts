// TruCare API types.
// Production data lives in secure MySQL, encrypted at rest and in transit.
// Never persist PII in browser/Supabase.

export type Channel = "sms" | "email";
export type ReminderPref = "on" | "off";
export type DoseSlot = "morning" | "evening";
export type DoseStatus = "taken" | "planned" | "missed" | "not_required";

export interface Patient {
  id: string;
  firstName: string;
  channel: Channel;
  phoneMasked: string;
  emailMasked?: string;
  startDate: string; // ISO yyyy-MM-dd
  reminders: ReminderPref;
  language: "he";
  createdAt: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  startDate: string;
  cycleLengthDays: 7;
  treatmentDays: number; // 4
  breakDays: number; // 3
  createdAt: string;
}

// The /patients/me/plan endpoint wraps the plan in { plan: TreatmentPlan }.
export interface PlanResponse {
  plan: TreatmentPlan;
}

export interface DoseEvent {
  id: string;
  planId: string;
  date: string; // yyyy-MM-dd
  slot: DoseSlot;
  status: DoseStatus;
  scheduledFor: string; // ISO
  takenAt?: string;
  notes?: string;
}

export interface ConsentRecord {
  id: string;
  patientId: string;
  termsVersion: string;
  privacyPolicyVersion: string;
  disclaimerVersion: string;
  marketingOptIn: boolean;
  acceptedAt: string;
  signatureHmac: string;
}

export interface NotificationLog {
  id: string;
  channel: Channel;
  recipientMasked: string;
  template: string;
  status: "sent" | "failed";
  providerCode?: number;
  error?: string;
  createdAt: string;
}

export interface IncidentLog {
  id: string;
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AdminStats {
  patientsTotal: number;
  activePlans: number;
  dosesTaken: number;
  dosesMissed: number;
  adherenceRate: number; // 0..1
  smsSent: number;
  smsFailed: number;
}

export interface SmsConfigView {
  keyMasked: string;
  userMasked: string;
  passMasked: string;
  sender: string;
  source: "env" | "db";
}

export interface SmsConfigInput {
  key?: string;
  user?: string;
  pass?: string;
  sender?: string;
}

export interface OtpRequestResult {
  challengeId: string;
  expiresAt: string;
  resendAvailableIn: number; // seconds
}

export interface OtpVerifyResult {
  sessionToken: string;
  patientId?: string;
}

export type SmsTemplateKey =
  "welcome" | "morning_reminder" | "evening_reminder" | "missed_dose" | "otp_code" | "custom";

export interface SmsTemplate {
  id: string;
  key: SmsTemplateKey;
  name: string;
  body: string; // supports {{firstName}}, {{code}}, {{time}}
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface ApiSettings {
  baseUrl: string;
  useMock: boolean;
  authTokenLastRotated?: string;
}
