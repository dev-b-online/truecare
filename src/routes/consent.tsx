import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useOnboarding } from "@/state/onboardingStore";
import { api } from "@/lib/api";
import { maskPhone, maskEmail } from "@/lib/mask";
import { toast } from "sonner";

export const Route = createFileRoute("/consent")({
  component: ConsentRoute,
  head: () => ({ meta: [{ title: "הסכמות | TruCare" }] }),
});

const REQUIRED = [
  {
    id: "terms",
    label: "אני מסכים/ה לתנאי השימוש",
    text: "השימוש הוא לצורכי מעקב אישי בלבד ואינו תחליף לייעוץ רפואי.",
  },
  {
    id: "privacy",
    label: "אני מסכים/ה למדיניות הפרטיות",
    text: "הנתונים נשמרים במסד מוצפן, נגישים לצוות המורשה בלבד, וניתן למחקם בכל עת.",
  },
  {
    id: "disclaimer",
    label: "אני מבין/ה שהיומן אינו מהווה המלצה רפואית",
    text: "TruCare אינו מחליף רופא. במקרה של תופעה חריגה יש לפנות לצוות הרפואי.",
  },
] as const;

function ConsentRoute() {
  const nav = useNavigate();
  const s = useOnboarding();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  const allChecked = REQUIRED.every((r) => checked[r.id]);

  const submit = async () => {
    if (!allChecked) return;
    setBusy(true);
    try {
      const patient = await api.registerPatient({
        firstName: s.firstName,
        channel: s.channel,
        phoneMasked: s.channel === "sms" ? maskPhone(s.phone) : "",
        emailMasked: s.channel === "email" ? maskEmail(s.email) : undefined,
        startDate: s.startDate,
        reminders: s.reminders,
      });
      // Token is saved to localStorage by registerPatient — saveConsent will use it automatically
      await api.saveConsent({
        patientId: patient.id,
        termsVersion: "1.0",
        privacyPolicyVersion: "1.0",
        disclaimerVersion: "1.0",
        marketingOptIn: marketing,
      });
      s.clear();
      toast.success("הרישום הושלם");
      nav({ to: "/instructions" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col gap-5 pt-4">
        <h1 className="text-center text-2xl font-extrabold">הסכמות</h1>
        <div className="card-tint flex flex-col gap-4 rounded-2xl p-5">
          {REQUIRED.map((r) => (
            <label key={r.id} className="flex items-start gap-3 text-right">
              <Checkbox
                checked={!!checked[r.id]}
                onCheckedChange={(v) => setChecked((prev) => ({ ...prev, [r.id]: !!v }))}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-semibold text-foreground">{r.label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.text}</p>
              </div>
            </label>
          ))}
          <label className="flex items-start gap-3 border-t border-hair pt-3 text-right">
            <Checkbox
              checked={marketing}
              onCheckedChange={(v) => setMarketing(!!v)}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-foreground">
                אני מסכים/ה לקבל עדכונים שיווקיים (אופציונלי)
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ניתן לבטל בכל עת דרך הגדרות המשתמש.
              </p>
            </div>
          </label>
        </div>
        <Button
          className="h-12 rounded-full text-base"
          disabled={!allChecked || busy}
          onClick={submit}
        >
          {busy ? "שולח..." : "מאשר/ת וממשיך/ה"}
        </Button>
      </div>
    </PageShell>
  );
}
