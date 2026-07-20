import {
  createFileRoute,
  Outlet,
  useRouterState,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";

const ADMIN_TOKEN_KEY = "trucare.admin.session";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      throw redirect({ to: "/admin/login" });
    }

    try {
      await api.getStats();
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminRoute,
});

function AdminRoute() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = path === "/admin";

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        navigate({ to: "/admin/login" });
      }
    };
    window.addEventListener("trucare:api:unauthorized", handler);
    return () => window.removeEventListener("trucare:api:unauthorized", handler);
  }, [navigate]);

  return (
    <PageShell wide>
      <div className="flex flex-col gap-4 sm:flex-row-reverse">
        <AdminSidebar />
        <div className="flex-1">{isRoot ? <AdminDashboard /> : <Outlet />}</div>
      </div>
    </PageShell>
  );
}

function AdminDashboard() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: api.getStats });
  const s = stats.data;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">לוח בקרה</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="מטופלים" value={s?.patientsTotal ?? "—"} />
        <StatCard label="תוכניות פעילות" value={s?.activePlans ?? "—"} />
        <StatCard
          label="שיעור היענות"
          value={s ? `${Math.round(s.adherenceRate * 100)}%` : "—"}
          tone="brand"
        />
        <StatCard label="מנות שנלקחו" value={s?.dosesTaken ?? "—"} />
        <StatCard label="מנות שהוחמצו" value={s?.dosesMissed ?? "—"} tone="danger" />
        <StatCard label="SMS שנשלחו" value={s?.smsSent ?? "—"} tone="turquoise" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "brand" | "danger" | "turquoise";
}) {
  return (
    <div className="card-tint rounded-2xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 text-2xl font-extrabold " +
          (tone === "brand"
            ? "text-brand"
            : tone === "danger"
              ? "text-destructive"
              : tone === "turquoise"
                ? "text-[color:var(--color-turquoise)]"
                : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
