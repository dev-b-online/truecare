import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, type EmailTemplate, type EmailTemplateKey } from "@/lib/api";
import { adminBeforeLoad } from "@/lib/adminAuth";
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
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/email-templates")({
  beforeLoad: adminBeforeLoad,
  component: EmailTemplatesRoute,
  head: () => ({
    meta: [
      { title: "תוכן הודעות אימייל | TruCare אדמין" },
      { name: "description", content: "ניהול תבניות הודעות האימייל שנשלחות למטופלים." },
    ],
  }),
});

const TEMPLATE_KEYS: { value: EmailTemplateKey; label: string }[] = [
  { value: "welcome", label: "ברוכים הבאים" },
  { value: "morning_reminder", label: "תזכורת בוקר" },
  { value: "evening_reminder", label: "תזכורת ערב" },
  { value: "day_off", label: "יום הפסקה" },
  { value: "start_treatment", label: "התחלת טיפול" },
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

function EmailTemplatesRoute() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "email-templates"],
    queryFn: api.listEmailTemplates,
  });
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">תוכן הודעות אימייל</h1>
        <Button
          onClick={() => {
            setIsNew(true);
            setEditing({
              id: "",
              key: "custom",
              name: "",
              subject: "",
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
        התבניות משמשות לשליחת אימייל למטופלים. השתמש/י במשתנים דוגמת{" "}
        <code className="rounded bg-muted px-1 text-xs" dir="ltr">{`{{firstName}}`}</code> כדי לשלב
        מידע דינמי. תמיכה ב-HTML.
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
  template: EmailTemplate;
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
  initial: EmailTemplate;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState<EmailTemplateKey>(initial.key);
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => render(body, SAMPLE), [body]);
  const chars = body.length;

  const insertVar = (token: string) => setBody((b) => `${b}${token}`);

  const save = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      toast.error("נא למלא שם, נושא ותוכן");
      return;
    }
    setBusy(true);
    try {
      await api.upsertEmailTemplate({
        id: isNew ? undefined : initial.id,
        key,
        name: name.trim(),
        subject: subject.trim(),
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
              <Select value={key} onValueChange={(v) => setKey(v as EmailTemplateKey)}>
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
            <Label htmlFor="tpl-subject">נושא האימייל</Label>
            <Input
              id="tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 rounded-xl bg-card text-right"
              maxLength={180}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="tpl-body">תוכן האימייל (HTML)</Label>
              <span className="text-[11px] text-muted-foreground">{chars} תווים</span>
            </div>
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="rounded-xl bg-card text-right font-mono text-xs"
              maxLength={5000}
              dir="ltr"
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
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl bg-card p-3">
            <span className="text-sm font-medium">פעיל — שלח את התבנית ללקוחות</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>

          <div className="rounded-xl bg-card p-3">
            <p className="text-sm text-muted-foreground">תבניות האימייל נשלחות אוטומטית במערכת.</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={busy} className="flex-1 rounded-full">
              {isNew ? "צור תבנית" : "שמור שינויים"}
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
