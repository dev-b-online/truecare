import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { StepNumber } from "@/components/StepNumber";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingRoute,
  head: () => ({
    meta: [{ title: "ברוכים הבאים | TruCare" }],
  }),
});

function OnboardingRoute() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col gap-6 pt-4 text-right">
        <h1 className="text-center text-2xl font-extrabold">נעים להכיר</h1>
        <p className="text-center text-sm text-muted-foreground">
          נעבור יחד על שלושה שלבים קצרים לפני שנפתח את היומן שלך.
        </p>
        <div className="card-tint flex flex-col gap-5 rounded-2xl p-5">
          <StepNumber n={1} title="פרטים בסיסיים">
            שם פרטי, ערוץ תזכורות ותאריך התחלה
          </StepNumber>
          <StepNumber n={2} title="אימות זהות" tone="lilac">
            קוד חד-פעמי במסרון (אם בחרת SMS)
          </StepNumber>
          <StepNumber n={3} title="הסכמות וזה הכל" tone="lilac">
            הצהרות פרטיות, ואפשר להתחיל
          </StepNumber>
        </div>
        <Button asChild className="h-12 rounded-full text-base">
          <Link to="/register">קדימה, בואו נתחיל</Link>
        </Button>
      </div>
    </PageShell>
  );
}
