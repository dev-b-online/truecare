import { useState, useEffect, forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "trucare.admin.session";

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AdminLoginDialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
AdminLoginDialogContent.displayName = "AdminLoginDialogContent";

export function AdminLoginModal({ open, onOpenChange, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setBusy(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("יש למלא אימייל וסיסמה");
      return;
    }

    setBusy(true);
    try {
      const baseUrl =
        localStorage.getItem("trucare.api.baseUrl") ??
        import.meta.env.VITE_API_URL ??
        "http://localhost:8000/api/v1";

      const res = await fetch(`${baseUrl}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error?.message ?? "פרטי הכניסה שגויים");
        return;
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.sessionToken);
      toast.success("התחברת בהצלחה");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("שגיאת חיבור לשרת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) return;
        onOpenChange(isOpen);
      }}
    >
      <AdminLoginDialogContent dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold">TruCare</h1>
          <p className="mt-1 text-sm text-muted-foreground">כניסת מנהל מערכת</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-login-email">אימייל</Label>
            <Input
              id="admin-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl text-right"
              placeholder="admin@trucare.local"
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-login-password">סיסמה</Label>
            <Input
              id="admin-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl text-right"
              placeholder="••••••••"
              disabled={busy}
            />
          </div>

          <Button type="submit" className="mt-2 h-11 w-full rounded-full" disabled={busy}>
            {busy ? "מתחבר..." : "כניסה"}
          </Button>
        </form>
      </AdminLoginDialogContent>
    </DialogPrimitive.Root>
  );
}
