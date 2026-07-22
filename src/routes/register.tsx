import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useOnboarding } from "@/state/onboardingStore";
import { registerSchema } from "@/lib/validation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ExistingPatientDialog } from "@/components/ExistingPatientDialog";

export const Route = createFileRoute("/register")({
  component: RegisterRoute,
  head: () => ({ meta: [{ title: "רישום | TruCare" }] }),
});

function RegisterRoute() {
  const nav = useNavigate();
  const s = useOnboarding();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingDialogOpen, setExistingDialogOpen] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse({
      firstName: s.firstName,
      channel: s.channel,
      phone: s.phone,
      email: s.email,
      startDate: s.startDate,
      reminders: s.reminders,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        map[String(issue.path[0] ?? "form")] = issue.message;
      }
      setErrors(map);
      return;
    }
    setErrors({});

    if (s.channel === "sms" && s.phone) {
      try {
        const r = await api.checkPhone(s.phone);
        if (r.exists) {
          setExistingDialogOpen(true);
          return;
        }
      } catch {
        // Fall through to normal registration flow if the check fails
      }
    }

    nav({ to: "/verify-otp" });
  };

  return (
    <PageShell>
      <form onSubmit={submit} className="mx-auto flex max-w-md flex-col gap-5 pt-4">
        <h1 className="text-center text-2xl font-extrabold">פרטי רישום</h1>
        <div className="card-tint flex flex-col gap-4 rounded-2xl p-5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="firstName">שם פרטי</Label>
            <Input
              id="firstName"
              value={s.firstName}
              onChange={(e) => s.set({ firstName: e.target.value })}
              placeholder="למשל: יעל"
              className="h-11 rounded-xl bg-background"
            />
            {errors.firstName && <FieldError msg={errors.firstName} />}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="startDate">תאריך התחלת טיפול</Label>
            <Input
              id="startDate"
              type="date"
              value={s.startDate}
              onChange={(e) => s.set({ startDate: e.target.value })}
              className="h-11 rounded-xl bg-background"
            />
            {errors.startDate && <FieldError msg={errors.startDate} />}
          </div>

          <div className="flex flex-col gap-2">
            <Label>ערוץ תזכורות</Label>
            <RadioGroup
              value={s.channel}
              onValueChange={(v) => s.set({ channel: v as "sms" | "email" })}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="sms" id="ch-sms" />
                <span>SMS</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="email" id="ch-email" />
                <span>אימייל</span>
              </label>
            </RadioGroup>
          </div>

          {s.channel === "sms" ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor="phone">מספר טלפון נייד</Label>
              <Input
                id="phone"
                dir="ltr"
                inputMode="numeric"
                value={s.phone}
                onChange={(e) => s.set({ phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="0501234567"
                className="h-11 rounded-xl bg-background text-right"
              />
              {errors.phone && <FieldError msg={errors.phone} />}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">כתובת אימייל</Label>
              <Input
                id="email"
                dir="ltr"
                type="email"
                value={s.email}
                onChange={(e) => s.set({ email: e.target.value })}
                placeholder="you@example.com"
                className="h-11 rounded-xl bg-background text-right"
              />
              {errors.email && <FieldError msg={errors.email} />}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>העדפת תזכורות</Label>
            <RadioGroup
              value={s.reminders}
              onValueChange={(v) => s.set({ reminders: v as "on" | "off" })}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="on" id="rem-on" />
                <span>מופעל</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="off" id="rem-off" />
                <span>כבוי</span>
              </label>
            </RadioGroup>
          </div>
        </div>
        <Button type="submit" className="h-12 rounded-full text-base">
          המשך
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {s.channel === "sms"
            ? "נשלח לך קוד אימות בן 6 ספרות במסרון."
            : "נעבור להסכמות. אימות אימייל יתווסף בהמשך."}
        </p>
      </form>
      <ExistingPatientDialog
        open={existingDialogOpen}
        onOpenChange={setExistingDialogOpen}
        phone={s.phone}
      />
    </PageShell>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-xs text-destructive">{msg}</p>;
}
