import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/OtpInput";
import { api } from "@/lib/api";
import { maskPhone } from "@/lib/mask";
import { usePatientAuth, PATIENT_TOKEN_KEY } from "@/state/patientAuthStore";

function clearStalePatientToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(PATIENT_TOKEN_KEY);
  }
}

interface ExistingPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
}

type Step = "phone" | "code";

export function ExistingPatientDialog({ open, onOpenChange, phone }: ExistingPatientDialogProps) {
  const nav = useNavigate();
  const login = usePatientAuth((s) => s.login);

  const [step, setStep] = useState<Step>("phone");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; max: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetFlow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStep("phone");
    setCode("");
    setChallengeId(null);
    setBusy(false);
    setRateLimit(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetFlow();
    onOpenChange(next);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchRateLimit = async () => {
    try {
      const r = await api.getRateLimit(phone);
      setRateLimit({ remaining: r.remaining, max: r.max });
    } catch {
      setRateLimit(null);
    }
  };

  const requestCode = async () => {
    setBusy(true);
    try {
      clearStalePatientToken();
      const r = await api.requestOtp(phone);
      setChallengeId(r.challengeId);
      setStep("code");
      setCode("");
      await fetchRateLimit();
      toast.success("נשלח קוד אימות במסרון");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת הקוד נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!challengeId || code.length !== 6) return;
    setBusy(true);
    try {
      const r = await api.verifyOtp(challengeId, code);
      if (!r.registered || !r.sessionToken) {
        clearStalePatientToken();
        toast.error("לא נמצא מטופל עם מספר זה. יש להירשם תחילה.");
        handleOpenChange(false);
        return;
      }
      const patient = await login(r.sessionToken);
      handleOpenChange(false);
      toast.success(patient ? `ברוך הבא, ${patient.firstName}!` : "התחברת בהצלחה");
      nav({ to: "/diary" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "האימות נכשל");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      clearStalePatientToken();
      const r = await api.resendOtp(phone);
      setChallengeId(r.challengeId);
      setCode("");
      await fetchRateLimit();
      toast.success("נשלח קוד חדש");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl" dir="rtl">
        {step === "phone" ? (
          <>
            <DialogHeader className="text-right">
              <DialogTitle>מטופל קיים</DialogTitle>
              <DialogDescription>
                מספר זה כבר רשום במערכת. ניתן להתחבר באמצעות SMS.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="phone">מספר טלפון נייד</Label>
                <Input
                  id="phone"
                  dir="ltr"
                  inputMode="numeric"
                  value={phone}
                  readOnly
                  className="h-11 rounded-xl bg-background text-right"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="h-12 rounded-full text-base"
                  disabled={busy}
                  onClick={() => void requestCode()}
                >
                  {busy ? "שולח..." : "התחבר"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 rounded-full text-base"
                  disabled={busy}
                  onClick={() => handleOpenChange(false)}
                >
                  בטל
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-right">
              <DialogTitle>אימות טלפון</DialogTitle>
              <DialogDescription>
                נשלח קוד בן 6 ספרות למספר{" "}
                <span className="font-mono font-semibold text-foreground" dir="ltr">
                  {maskPhone(phone)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-5">
              <OtpInput value={code} onChange={setCode} disabled={busy} />
              <Button
                className="h-12 w-full rounded-full text-base"
                disabled={code.length !== 6 || busy}
                onClick={() => void verify()}
              >
                {busy ? "מאמת..." : "התחבר"}
              </Button>
              <div className="flex w-full items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setStep("phone")}
                  disabled={busy}
                >
                  שינוי מספר
                </button>
                <button
                  type="button"
                  className="text-brand disabled:text-muted-foreground"
                  onClick={() => void resend()}
                  disabled={busy}
                >
                  שלח קוד חדש
                </button>
              </div>
              {rateLimit && (
                <p className="text-center text-xs text-muted-foreground">
                  יש לך {rateLimit.remaining} מתוך {rateLimit.max} נסיונות לשעה
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
