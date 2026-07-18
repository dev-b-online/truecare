import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/admin/incidents")({
  component: IncidentsRoute,
  head: () => ({ meta: [{ title: "אירועים | TruCare אדמין" }] }),
});

function IncidentsRoute() {
  const q = useQuery({ queryKey: ["admin", "incidents"], queryFn: api.listIncidents });
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">אירועים</h1>
      <div className="flex flex-col gap-2">
        {(q.data ?? []).map((i) => (
          <div key={i.id} className="rounded-2xl border border-hair bg-card p-3">
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  "rounded-full px-2 py-0.5 font-semibold " +
                  (i.severity === "error"
                    ? "bg-destructive/10 text-destructive"
                    : i.severity === "warning"
                      ? "bg-[color:var(--color-lilac)]/20 text-brand"
                      : "bg-[color:var(--color-turquoise)]/20 text-[color:var(--color-turquoise)]")
                }
              >
                {i.severity.toUpperCase()}
              </span>
              <span className="font-mono text-muted-foreground">
                {format(parseISO(i.createdAt), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground">{i.code}</span>
              <span className="text-sm font-medium text-foreground">{i.message}</span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {i.resolvedAt ? `נסגר ${format(parseISO(i.resolvedAt), "dd/MM HH:mm")}` : "פתוח"}
            </div>
          </div>
        ))}
        {q.data && q.data.length === 0 && (
          <div className="rounded-2xl border border-hair bg-card p-8 text-center text-sm text-muted-foreground">
            אין אירועים
          </div>
        )}
      </div>
    </div>
  );
}
