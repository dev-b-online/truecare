import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsRoute,
  head: () => ({ meta: [{ title: "יומן הודעות | TruCare אדמין" }] }),
});

function NotificationsRoute() {
  const q = useQuery({ queryKey: ["admin", "notifications"], queryFn: api.listNotifications });
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold">יומן הודעות</h1>
      <div className="overflow-hidden rounded-2xl border border-hair bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-right text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">תאריך</th>
              <th className="px-3 py-2">ערוץ</th>
              <th className="px-3 py-2">נמען (ממוסך)</th>
              <th className="px-3 py-2">תבנית</th>
              <th className="px-3 py-2">סטטוס</th>
              <th className="px-3 py-2">קוד</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((n) => (
              <tr key={n.id} className="border-t border-hair">
                <td className="px-3 py-2 font-mono text-xs">
                  {format(parseISO(n.createdAt), "dd/MM HH:mm")}
                </td>
                <td className="px-3 py-2">{n.channel.toUpperCase()}</td>
                <td className="px-3 py-2 font-mono text-xs" dir="ltr">
                  {n.recipientMasked}
                </td>
                <td className="px-3 py-2 text-xs">{n.template}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (n.status === "sent"
                        ? "bg-brand/10 text-brand"
                        : "bg-destructive/10 text-destructive")
                    }
                  >
                    {n.status === "sent" ? "נשלח" : "נכשל"}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{n.providerCode ?? "—"}</td>
              </tr>
            ))}
            {q.data && q.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  אין הודעות עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
