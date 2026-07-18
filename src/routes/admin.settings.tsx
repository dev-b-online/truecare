import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsRoute,
  head: () => ({ meta: [{ title: "הגדרות API | TruCare אדמין" }] }),
});

function SettingsRoute() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: api.getApiSettings });
  const [baseUrl, setBaseUrl] = useState("");
  const [useMock, setUseMock] = useState(true);

  useEffect(() => {
    if (q.data) {
      setBaseUrl(q.data.baseUrl);
      setUseMock(q.data.useMock);
    }
  }, [q.data]);

  const save = async () => {
    try {
      if (
        !/^https:\/\//.test(baseUrl) &&
        !/^http:\/\/localhost/.test(baseUrl) &&
        !baseUrl.startsWith("/")
      ) {
        toast.error("URL חייב להיות HTTPS או localhost");
        return;
      }
      await api.setApiSettings({ baseUrl, useMock });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">הגדרות API</h1>
      <div className="card-tint flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-col gap-1">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            dir="ltr"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.trucare.example.com/v1"
            className="h-11 rounded-xl bg-background text-right"
          />
          <p className="text-xs text-muted-foreground">
            רק HTTPS או localhost. הבקנד AES-256-GCM על עמודות PII.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>שימוש בשרת מוק</Label>
            <p className="text-xs text-muted-foreground">
              כשמכובה – הפרונט פונה ל-MySQL אמיתי דרך apiFetch.
            </p>
          </div>
          <Switch checked={useMock} onCheckedChange={setUseMock} />
        </div>
        <Button onClick={save} className="rounded-full">
          שמור
        </Button>
      </div>

      <div className="card-tint flex flex-col gap-2 rounded-2xl p-5">
        <h2 className="text-base font-bold">חבילת מסירה למפתח PHP + MySQL</h2>
        <p className="text-xs text-muted-foreground">
          כל התיעוד הטכני נמצא בפרויקט תחת <code dir="ltr">docs/api/</code>. הקבצים המרכזיים:
        </p>
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          <li>
            <code dir="ltr">README.md</code> — סקירה, אימות, שגיאות, CORS, PII
          </li>
          <li>
            <code dir="ltr">openapi.yaml</code> — חוזה מלא בפורמט OpenAPI 3.1
          </li>
          <li>
            <code dir="ltr">endpoints.md</code> — כל ה-endpoints בעברית עם דוגמאות
          </li>
          <li>
            <code dir="ltr">schema.sql</code> — 11 טבלאות MySQL 8 (CREATE TABLE + FKs)
          </li>
          <li>
            <code dir="ltr">seed.sql</code> — תבניות SMS ראשוניות + משתמש אדמין
          </li>
          <li>
            <code dir="ltr">php-notes.md</code> — הנחיות מימוש: JWT, OTP, sms4free, rate-limit
          </li>
          <li>
            <code dir="ltr">postman.json</code> — Collection לבדיקה
          </li>
        </ul>
      </div>
    </div>
  );
}
