import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { ConfirmResetModal } from "@/components/ConfirmResetModal";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useOnboarding } from "@/state/onboardingStore";

export const Route = createFileRoute("/")({
  component: WelcomeRoute,
  head: () => ({
    meta: [
      { title: "TruCare – יומן טיפול דיגיטלי" },
      {
        name: "description",
        content: "יומן טיפול דיגיטלי בעברית למטופלי Truqap עם תזכורות SMS.",
      },
    ],
  }),
});

function WelcomeRoute() {
  const [resetOpen, setResetOpen] = useState(false);
  const clearOnboarding = useOnboarding((s) => s.clear);
  return (
    <PageShell>
      <div className="mt-4 flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-extrabold text-foreground">ברוכים הבאים ל-TruCare</h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          יומן דיגיטלי אישי למעקב אחר מנות הבוקר והערב, קבלת תזכורות ב-SMS ודיווח על תופעות. התכנון
          מבוסס על הפרוטוקול של Truqap – ארבעה ימי טיפול ושלושה ימי הפסקה.
        </p>
        <div className="card-tint w-full max-w-md rounded-2xl p-5 text-right">
          <h2 className="text-lg font-semibold">מה חדש כאן?</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• יומן שבועיים בפריסה נוחה במובייל ובדסקטופ</li>
            <li>• אימות טלפון ב-OTP לפני התחלת הרישום</li>
            <li>• מסך אדמין מלא לניהול הודעות, אירועים והגדרות</li>
          </ul>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <Button asChild className="h-12 rounded-full text-base">
            <Link to="/onboarding">התחלת רישום</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full text-base">
            <Link to="/diary">כניסה ליומן הדגמה</Link>
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-full text-sm text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            איפוס הנתונים המקומיים
          </Button>
        </div>
      </div>
      <ConfirmResetModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={() => {
          clearOnboarding();
          api.wipeAll();
          if (typeof sessionStorage !== "undefined") sessionStorage.clear();
          toast.success("הנתונים נמחקו");
        }}
      />
    </PageShell>
  );
}
