import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms-of-use")({
  component: TermsOfUseRoute,
  head: () => ({ meta: [{ title: "תנאי שימוש | TruCare" }] }),
});

function TermsOfUseRoute() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-4">
        <h1 className="text-center text-2xl font-extrabold">תנאי שימוש</h1>
        <div className="card-tint rounded-2xl p-6 text-sm leading-relaxed text-foreground">
          <p className="mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p className="mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <p className="mb-4">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
            totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/">חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
