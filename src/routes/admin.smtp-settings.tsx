import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { adminBeforeLoad } from "@/lib/adminAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/smtp-settings")({
  beforeLoad: adminBeforeLoad,
  component: SmtpSettingsRoute,
  head: () => ({
    meta: [{ title: "הגדרות SMTP | TruCare אדמין" }],
  }),
});

function SmtpSettingsRoute() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "smtp-config"], queryFn: api.getSmtpConfig });

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState("tls");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    await api.setSmtpConfig({
      host: host || undefined,
      port: port ? parseInt(port) : undefined,
      secure: secure || undefined,
      user: user || undefined,
      pass: pass || undefined,
    });
    setHost("");
    setPort("587");
    setSecure("tls");
    setUser("");
    setPass("");
    qc.invalidateQueries({ queryKey: ["admin", "smtp-config"] });
    toast.success("הגדרות SMTP נשמרו");
  };

  const runTest = async () => {
    if (!testTo || !testTo.includes("@")) {
      toast.error("כתובת אימייל לא תקינה");
      return;
    }
    setBusy(true);
    try {
      const res = await api.sendSmtpTest(testTo);
      toast.success(`נשלח (קוד ${res.providerCode})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "כשל בבדיקה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">הגדרות SMTP</h1>
      <div className="card-tint rounded-2xl p-5">
        <h2 className="text-sm font-semibold">תצוגה נוכחית (ממוסך)</h2>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">מקור:</dt>
          <dd className="font-mono text-xs">{q.data?.source ?? "—"}</dd>
          <dt className="text-muted-foreground">Host:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.host ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Port:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.port ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Secure:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.secure ?? "—"}
          </dd>
          <dt className="text-muted-foreground">User:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.user ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Pass:</dt>
          <dd className="font-mono text-xs" dir="ltr">
            {q.data?.passMasked ?? "—"}
          </dd>
          <dt className="text-muted-foreground">מותאם:</dt>
          <dd className="font-mono text-xs">{q.data?.providerConfigured ? "כן" : "לא"}</dd>
        </dl>
      </div>

      <div className="card-tint flex flex-col gap-3 rounded-2xl p-5">
        <h2 className="text-sm font-semibold">דריסת הגדרות (נשמר בבקנד בלבד)</h2>
        <div className="flex flex-col gap-1">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            dir="ltr"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="smtp.mailtrap.io"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            dir="ltr"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="587"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="secure">Secure</Label>
          <Input
            id="secure"
            dir="ltr"
            value={secure}
            onChange={(e) => setSecure(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="tls"
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
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="h-11 rounded-xl bg-background text-right"
            placeholder="dev@b-online.co.il"
          />
        </div>
        <Button onClick={runTest} disabled={busy} variant="secondary" className="rounded-full">
          {busy ? "שולח..." : "שלח בדיקה"}
        </Button>
      </div>
    </div>
  );
}
