import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AdminLoginModal } from "@/components/admin/AdminLoginModal";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "trucare.admin.session";

export function AdminAuthMenu() {
  const qc = useQueryClient();
  const [loginOpen, setLoginOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    setIsAuthed(!!token);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setIsAuthed(false);
      }
    };
    window.addEventListener("trucare:api:unauthorized", handler);
    return () => window.removeEventListener("trucare:api:unauthorized", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthed(false);
    qc.invalidateQueries();
    toast.success("התנתקת בהצלחה");
    nav({ to: "/" });
  };

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    setIsAuthed(true);
    qc.invalidateQueries();
  };

  if (isAuthed === false) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => setLoginOpen(true)}
        >
          כניסת מנהל
        </Button>
        <AdminLoginModal
          open={loginOpen}
          onOpenChange={setLoginOpen}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  if (isAuthed === null) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
            <span className="text-xs font-bold">A</span>
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">שלום אדמין</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">אדמין</DropdownMenuLabel>
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
