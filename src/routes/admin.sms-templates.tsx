import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type SmsTemplate, type SmsTemplateKey } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { sendSms } from "@/lib/sms/sms4free.functions";
import { IL_PHONE_REGEX } from "@/lib/validation";

export const Route = createFileRoute("/admin/sms-templates")({
  component: SmsTemplatesRoute,
  head: () => ({
    meta: [
      { title: "תוכן הודעות SMS | TruCare אדמין" },
      { name: "description", content: "ניהול תבניות הודעות ה-SMS שנשלחות למטופלים." },
    ],
  }),
});

const TEMPLATE_KEYS: { value: SmsTemplateKey; label: string }[] = [
  { value: "welcome", label: "ברוכים הבאים" },
  { value: "morning_reminder", label: "תזכורת בוקר" },
  { value: "evening_reminder", label: "תזכורת ערב" },
  { value: "missed_dose", label: "מנה שהוחמצה" },
  { value: "otp_code", label: "קוד אימות" },
  { value: "custom", label: "מותאם אישית" },
];

const VARIABLES: { token: string; description: string }[] = [
  { token: "{{firstName}}", description: "שם פרטי של המטופל" },
  { token: "{{code}}", description: "קוד אימות (OTP)" },
  { token: "{{time}}", description: "שעת הנטילה" },
];

const SAMPLE = { firstName: "יעל", code: "482913", time: "08:00" };

function render(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function SmsTemplatesRoute() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "sms-templates"],
    queryFn: api.listSmsTemplates,
  });
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "sms-templates"] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">תוכן הודעות SMS</h1>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({
              id: "",
              key: "custom",
              name: "",
              body: "",
              enabled: true,
              updatedAt: new Date().toISOString(),
            });
          }}
          className="rounded-full"
        >
          <Plus className="h-4 w-4" /> תבנית חדשה
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        התבניות משמשות לשליחת SMS למטופלים. השתמש/י במשתנים דוגמת{" "}
        <code className="rounded bg-muted px-1 text-xs" dir="ltr">{`{{firstName}}`}</code> כדי לשלב
        מידע דינמי. הטקסט נשמר בבקנד; שדות ה-PII מוזרמים בעת השליחה בלבד.
      </p>

      <div className="flex flex-col gap-3">
        {q.isLoading && <div className="text-sm text-muted-foreground">טוען...</div>}
        {q.data?.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => {
              setIsNew(false);
              setEditing(t);
            }}
            onDeleted={invalidate}
          />
        ))}
        {q.data && q.data.length === 0 && (
          <div className="card-tint rounded-2xl p-6 text-sm text-muted-foreground">
            אין תבניות עדיין. לחצ/י על "תבנית חדשה" כדי להתחיל.
          </div>
        )}
      </div>

      {editing && (
        <EditorPanel
          initial={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDeleted,
}: {
  template: SmsTemplate;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const preview = useMemo(() => render(template.body, SAMPLE), [template.body]);
  return (
    <div className="card-tint flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{template.name}</h3>
            {template.enabled ? (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                פעיל
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                כבוי
              </span>
            )}
          </div>
          <span className="mt-0.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
            {template.key}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> ערוך
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              if (!confirm(`למחוק את התבנית "${template.name}"?`)) return;
              await api.deleteSmsTemplate(template.id);
              toast.success("התבנית נמחקה");
              onDeleted();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="rounded-xl bg-background p-3 text-sm leading-relaxed">{template.body}</div>
      <div className="rounded-xl border border-dashed border-hair p-3 text-sm text-muted-foreground">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide">
          תצוגה מקדימה (עם ערכי דוגמה)
        </div>
        {preview}
      </div>
      <div className="text-[11px] text-muted-foreground">
        עודכן: {new Date(template.updatedAt).toLocaleString("he-IL")}
      </div>
    </div>
  );
}

function EditorPanel({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: SmsTemplate;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState<SmsTemplateKey>(initial.key);
  const [name, setName] = useState(initial.name);
  const [body, setBody] = useState(initial.body);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const sendFn = useServerFn(sendSms);

  const preview = useMemo(() => render(body, SAMPLE), [body]);
  const chars = body.length;
  const segments = Math.max(1, Math.ceil(chars / 70));

  const insertVar = (token: string) => setBody((b) => `${b}${token}`);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("נא למלא שם ותוכן");
      return;
    }
    setBusy(true);
    try {
      await api.upsertSmsTemplate({
        id: isNew ? undefined : initial.id,
        key,
        name: name.trim(),
        body,
        enabled,
      });
      toast.success(isNew ? "תבנית נוצרה" : "תבנית נשמרה");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!IL_PHONE_REGEX.test(testTo)) {
      toast.error("מספר טלפון לא תקין");
      return;
    }
    setBusy(true);
    try {
      const res = await sendFn({ data: { recipient: testTo, message: preview } });
      if (res.ok) toast.success(`נשלח (קוד ${res.providerCode})`);
      else toast.error(`נכשל (${res.providerCode}): ${res.error ?? ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "כשל בשליחה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl bg-background p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{isNew ? "תבנית חדשה" : `עריכה: ${initial.name}`}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
          >
            סגור
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="tpl-name">שם התבנית</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl bg-card text-right"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tpl-key">סוג</Label>
              <Select value={key} onValueChange={(v) => setKey(v as SmsTemplateKey)}>
                <SelectTrigger id="tpl-key" className="h-11 rounded-xl bg-card text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KEYS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-body">תוכן ההודעה</Label>
              <span className="text-[11px] text-muted-foreground">
                {chars} תווים · {segments} SMS
              </span>
            </div>
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="rounded-xl bg-card text-right"
              maxLength={480}
              dir="rtl"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVar(v.token)}
                  className="rounded-full border border-hair px-2.5 py-1 font-mono text-[11px] hover:bg-accent"
                  dir="ltr"
                  title={v.description}
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-hair bg-card/50 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              תצוגה מקדימה
            </div>
            <div className="text-sm leading-relaxed">{preview}</div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-card p-3">
            <span className="text-sm font-medium">פעיל — שלח את התבנית ללקוחות</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>

          <div className="rounded-xl bg-card p-3">
            <Label htmlFor="tpl-test" className="text-sm">
              שליחת בדיקה
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="tpl-test"
                dir="ltr"
                inputMode="numeric"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="h-11 rounded-xl bg-background text-right"
                placeholder="0501234567"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={sendTest}
                disabled={busy}
              >
                שלח
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              נשלח דרך server function; פרטי sms4free נשארים בצד השרת.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={busy} className="flex-1 rounded-full">
              <Check className="h-4 w-4" /> {isNew ? "צור תבנית" : "שמור שינויים"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={onClose}
              disabled={busy}
            >
              ביטול
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
