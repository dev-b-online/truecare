// In-memory onboarding state. Sensitive fields cleared after successful register.
import { create } from "zustand";

export type Channel = "sms" | "email";

interface OnboardingState {
  firstName: string;
  channel: Channel;
  phone: string;
  email: string;
  startDate: string;
  reminders: "on" | "off";
  challengeId?: string;
  set: (patch: Partial<Omit<OnboardingState, "set" | "clear">>) => void;
  clear: () => void;
}

const today = new Date().toISOString().slice(0, 10);

export const useOnboarding = create<OnboardingState>((set) => ({
  firstName: "",
  channel: "sms",
  phone: "",
  email: "",
  startDate: today,
  reminders: "on",
  challengeId: undefined,
  set: (patch) => set(patch),
  clear: () =>
    set({
      firstName: "",
      channel: "sms",
      phone: "",
      email: "",
      startDate: today,
      reminders: "on",
      challengeId: undefined,
    }),
}));
