import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

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
import { IL_PHONE_REGEX } from "@/lib/validation";
import { maskPhone, maskEmail } from "@/lib/mask";
import { usePatientAuth, PATIENT_TOKEN_KEY } from "@/state/patientAuthStore";

/** Drop any leftover patient session so a stale token never leaks into a fresh
 *  login/registration flow (mirrors the verify-otp route behaviour). */
function clearStalePatientToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(PATIENT_TOKEN_KEY);
  }
}

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "identifier" | "code";

type LoginMode = "phone" | "email";

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const nav = useNavigate();
  const login = usePatientAuth((s) => s.login);

  const [mode, setMode] = useState<LoginMode>("phone");
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
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
    setStep("identifier");
    setIdentifier("");
    setCode("");
    setChallengeId(null);
    setBusy(false);
    setRateLimit(null);
  };

  // Reset synchronously whenever the dialog transitions to closed, so a quick
  // close+reopen can never resurface a stale step / code / challengeId.
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
      const r = await api.getRateLimit(identifier);
      setRateLimit({ remaining: r.remaining, max: r.max });
    } catch {
      setRateLimit(null);
    }
  };

  const isEmail = mode === "email";

  const requestCode = async () => {
    if (isEmail) {
      const emailSchema = z.string().trim().email("כתובת אימייל לא תקינה").max(255);
      const parsed = emailSchema.safeParse(identifier);
      if (!parsed.success) {
        toast.error("כתובת אימייל לא תקינה");
        return;
      }
    } else if (!IL_PHONE_REGEX.test(identifier)) {
      toast.error("מספר טלפון ישראלי לא תקין (05XXXXXXXX)");
      return;
    }

    setBusy(true);
    setRateLimit(null);

    try {
      clearStalePatientToken();
      const r = await api.requestOtp(identifier);
      setChallengeId(r.challengeId);
      setStep("code");
      setCode("");
      await fetchRateLimit();
      toast.success(isEmail ? "נשלח קוד אימות לאימייל" : "נשלח קוד אימות במסרון");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת הקוד נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const verify = useCallback(
    async (codeToVerify: string) => {
      if (!challengeId || codeToVerify.length !== 6) return;
      setBusy(true);
      try {
        const r = await api.verifyOtp(challengeId, codeToVerify);
        if (!r.registered || !r.sessionToken) {
          clearStalePatientToken();
          toast.error("לא נמצא מטופל עם פרטי זה. יש להירשם תחילה.");
          handleOpenChange(false);
          nav({ to: "/register" });
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
    },
    [challengeId, handleOpenChange, login, nav],
  );

  // WebOTP: listen for code arrival and auto-submit when ready
  useEffect(() => {
    if (!challengeId || step !== "code") return;
    if (!("OTPCredential" in window)) return;

    const abortController = new AbortController();

    navigator.credentials
      .get({
        // @ts-expect-error WebOTP not in TS types yet
        otp: { transport: ["sms"] },
        signal: abortController.signal,
      })
      .then((credential) => {
        // @ts-expect-error WebOTP not in TS types yet
        const otp = credential as { code: string };
        setCode(otp.code);
        setTimeout(() => {
          void verify(otp.code);
        }, 600);
      })
      .catch(() => {
        // user cancelled or WebOTP not supported — ignore
      });

    return () => {
      abortController.abort();
    };
  }, [challengeId, step, verify]);

  const resend = async () => {
    setBusy(true);
    try {
      clearStalePatientToken();
      const r = await api.resendOtp(identifier);
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
        {step === "identifier" ? (
          <>
            <DialogHeader className="text-right">
              <DialogTitle>כניסת מטופל</DialogTitle>
              <DialogDescription>
                הזן את מספר הטלפון הנייד או כתובת האימייל שלך. נשלח קוד אימות חד-פעמי.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                      mode === "phone" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setMode("phone")}
                  >
                    טלפון
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                      mode === "email" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setMode("email")}
                  >
                    אימייל
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="login-identifier">
                  {mode === "phone" ? "מספר טלפון נייד" : "כתובת אימייל"}
                </Label>
                <Input
                  id="login-identifier"
                  dir={mode === "phone" ? "ltr" : "ltr"}
                  inputMode={mode === "phone" ? "numeric" : "email"}
                  autoFocus
                  value={identifier}
                  onChange={(e) =>
                    mode === "phone"
                      ? setIdentifier(e.target.value.replace(/\D/g, "").slice(0, 10))
                      : setIdentifier(e.target.value)
                  }
                  placeholder={mode === "phone" ? "0501234567" : "you@example.com"}
                  className="h-11 rounded-xl bg-background text-right"
                />
              </div>
              <Button
                type="submit"
                className="h-12 rounded-full text-base"
                disabled={busy || identifier.trim() === ""}
              >
                {busy ? "שולח..." : "שלח קוד אימות"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="text-right">
              <DialogTitle>אימות {isEmail ? "אימייל" : "טלפון"}</DialogTitle>
              <DialogDescription>
                נשלח קוד בן 6 ספרות ל{isEmail ? "כתובת" : "מספר"}{" "}
                <span className="font-mono font-semibold text-foreground" dir="ltr">
                  {isEmail ? maskEmail(identifier) : maskPhone(identifier)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-5">
              <OtpInput value={code} onChange={setCode} onComplete={(c) => void verify(c)} disabled={busy} />
              <Button
                className="h-12 w-full rounded-full text-base"
                disabled={code.length !== 6 || busy}
                onClick={() => void verify(code)}
              >
                {busy ? "מאמת..." : "התחבר"}
              </Button>
              <div className="flex w-full items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setStep("identifier")}
                  disabled={busy}
                >
                  שינוי פרטי התקשרות
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
