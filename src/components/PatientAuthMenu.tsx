import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { User, LogOut, LayoutDashboard } from "lucide-react";

import { usePatientAuth } from "@/state/patientAuthStore";
import { LoginDialog } from "@/components/LoginDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function PatientAuthMenu() {
  const status = usePatientAuth((s) => s.status);
  const patient = usePatientAuth((s) => s.patient);
  const hydrate = usePatientAuth((s) => s.hydrate);
  const logout = usePatientAuth((s) => s.logout);
  const nav = useNavigate();

  const [loginOpen, setLoginOpen] = useState(false);

  // Never read localStorage during SSR/render — hydrate once after mount so the
  // server render (always "guest"-shaped) and first client render match.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleLogout = async () => {
    await logout();
    toast.success("התנתקת בהצלחה");
    nav({ to: "/" });
  };

  // Loading (before hydration) and guest both render the login affordance so
  // there is no layout shift / hydration mismatch.
  if (status !== "authenticated" || !patient) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          aria-label="כניסת מטופל"
        >
          <User className="h-5 w-5" />
          <span className="hidden sm:inline">כניסה</span>
        </button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
            <User className="h-5 w-5" />
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">שלום, {patient.firstName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{patient.firstName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/diary" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            היומן שלי
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          התנתקות
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
