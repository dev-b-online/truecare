import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { IL_PHONE_REGEX } from "@/lib/validation";

export const Route = createFileRoute("/admin/sms-settings")({
  component: SmsSettingsRoute,
  head: () => ({ meta: [{ title: "הגדרות SMS | TruCare אדמין" }] }),
});

function SmsSettingsRoute() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "sms-config"], queryFn: api.getSmsConfigView });

  const [key, setKey] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [sender, setSender] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    await api.setSmsConfig({
      key: key || undefined,
      user: user || undefined,
      pass: pass || undefined,
      sender: sender || undefined,
    });
    setKey("");
    setUser("");
    setPass("");
    qc.invalidateQueries({ queryKey: ["admin", "sms-config"] });
    toast.success("הוגדר. הסודות בצד השרת בלבד.");
  };

  const runTest = async () => {
    if (!IL_PHONE_REGEX.test(testTo)) {
      toast.error("מספר טלפון לא תקין");
      return;
    }
    setBusy(true);
    try {
      const res = await api.sendSmsTest(testTo);
      toast.success(`נשלח (קוד ${res.providerCode})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "כשל בבדיקה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">הגדרות SMS (sms4free)</h1>
      <div className="card-tint rounded-2xl p-5">
        <h2 className="text-sm font-semibold">תצוגה נוכחית (ממוסך)</h2>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">מקור:</dt>
          <dd className="font-mono text-xs">{q.data?.source ?? "—"}</dd>
          <dt className="text-muted-foreground">Key:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.keyMasked ?? "—"}
          </dd>
          <dt className="text-muted-foreground">User:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.userMasked ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Pass:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.passMasked ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Sender:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.sender ?? "—"}
          </dd>
        </dl>
      </div>

      <div className="card-tint flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="text-sm font-semibold">דריסת הגדרות (נשמר בבקנד בלבד)</h2>
        <div className="flex flex-col gap-1">
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            dir="ltr"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="השאר ריק כדי לשמור את הקיים"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="user">User</Label>
          <Input
            id="user"
            dir="ltr"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pass">Password</Label>
          <Input
            id="pass"
            dir="ltr"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="sender">Sender</Label>
          <Input
            id="sender"
            dir="ltr"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="TruCare"
          />
        </div>
        <Button onClick={save} className="rounded-full">
          שמור
        </Button>
      </div>

      <div className="card-tint flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="text-sm font-semibold">בדיקת שליחה</h2>
        <div className="flex flex-col gap-1">
          <Label htmlFor="testTo">נמען לבדיקה</Label>
          <Input
            id="testTo"
            dir="ltr"
            inputMode="numeric"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="0501234567"
          />
        </div>
        <Button onClick={runTest} disabled={busy} variant="secondary" className="rounded-full">
          {busy ? "שולח..." : "שלח בדיקה"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          הפעולה קוראת ל-server function שרצה בצד השרת בלבד; פרטי ההזדהות לעולם לא נשלחים לדפדפן.
        </p>
      </div>
    </div>
  );
}
