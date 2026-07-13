import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bell, AlertTriangle, Settings, MessageSquare, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard, end: true },
  { to: "/admin/notifications", label: "יומן הודעות", icon: Bell },
  { to: "/admin/incidents", label: "אירועים", icon: AlertTriangle },
  { to: "/admin/sms-templates", label: "תוכן הודעות SMS", icon: FileText },
  { to: "/admin/settings", label: "הגדרות API", icon: Settings },
  { to: "/admin/sms-settings", label: "הגדרות SMS", icon: MessageSquare },
];

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-full shrink-0 sm:w-60">
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-hair bg-card p-2 sm:flex-col sm:overflow-visible">
        {NAV.map((item) => {
          const active = item.end ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
