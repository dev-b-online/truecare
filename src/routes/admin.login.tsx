import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginRoute,
  head: () => ({
    meta: [{ title: "כניסת מנהל | TruCare" }],
  }),
});

const ADMIN_TOKEN_KEY = "trucare.admin.session";

function AdminLoginRoute() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect to admin dashboard
  useEffect(() => {
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

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
      navigate({ to: "/admin" });
    } catch {
      toast.error("שגיאת חיבור לשרת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">TruCare</h1>
          <p className="mt-1 text-sm text-muted-foreground">כניסת מנהל מערכת</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-tint flex flex-col gap-4 rounded-2xl p-6"
          dir="rtl"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
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
            <Label htmlFor="password">סיסמה</Label>
            <Input
              id="password"
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
      </div>
    </div>
  );
}
