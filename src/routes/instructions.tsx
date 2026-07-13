import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { StepNumber } from "@/components/StepNumber";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/instructions")({
  component: InstructionsRoute,
  head: () => ({ meta: [{ title: "הוראות שימוש | TruCare" }] }),
});

function InstructionsRoute() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col gap-6 pt-4">
        <h1 className="text-center text-2xl font-extrabold">הוראות שימוש</h1>
        <div className="card-tint flex flex-col gap-5 rounded-2xl p-5">
          <StepNumber n={1} title="עוקבים אחרי המחזור">
            כל מחזור טיפול הוא שבעה ימים: ארבעה ימי טיפול (בוקר וערב) ושלושה ימי הפסקה.
          </StepNumber>
          <StepNumber n={2} title="מקבלים תזכורות" tone="lilac">
            תזכורת ב-SMS לכל מנה. סימון "נלקח" עוזר לצוות לעקוב אחר ההיענות.
          </StepNumber>
          <StepNumber n={3} title="מדווחים על תופעות" tone="lilac">
            אם משהו מרגיש חריג – פונים לצוות מיד. TruCare אינו תחליף להתייעצות רפואית.
          </StepNumber>
        </div>
        <Button asChild className="h-12 rounded-full text-base">
          <Link to="/diary">כניסה ליומן</Link>
        </Button>
      </div>
    </PageShell>
  );
}
