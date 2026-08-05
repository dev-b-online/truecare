import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { OtpInput } from "@/components/OtpInput";
import { SafariOtpAutofill } from "@/components/SafariOtpAutofill";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/state/onboardingStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { maskPhone, maskEmail } from "@/lib/mask";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-otp")({
  component: VerifyOtpRoute,
  head: () => ({ meta: [{ title: "אימות | TruCare" }] }),
});

function VerifyOtpRoute() {
  const s = useOnboarding();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState<string | undefined>(s.challengeId);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; max: number } | null>(null);
  const otpRequested = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recipient = s.channel === "email" ? s.email : s.phone;

  const fetchRateLimit = async () => {
    try {
      if (!recipient) return;
      const r = await api.getRateLimit(recipient);
      setRateLimit({ remaining: r.remaining, max: r.max });
    } catch {
      setRateLimit(null);
    }
  };

  useEffect(() => {
    if (!recipient) {
      nav({ to: "/register" });
      return;
    }
    if (!challengeId && !otpRequested.current) {
      otpRequested.current = true;
      localStorage.removeItem("trucare.session");
      api
        .requestOtp(recipient)
        .then((r) => {
          setChallengeId(r.challengeId);
          s.set({ challengeId: r.challengeId });
          toast.success(s.channel === "email" ? "נשלח קוד אימות לאימייל" : "נשלח קוד אימות");
          void fetchRateLimit();
        })
        .catch((err: Error) => {
          otpRequested.current = false;
          toast.error(err.message);
        });
    }
    void fetchRateLimit();
    const cleanup = intervalRef.current;
    return () => {
      if (cleanup) clearInterval(cleanup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doVerify = useCallback(async (codeArg?: string) => {
    const codeToUse = codeArg ?? code;
    if (!challengeId || codeToUse.length !== 6) return;
    setSubmitting(true);
    try {
      const r = await api.verifyOtp(challengeId, codeToUse);
      if (r.sessionToken) {
        localStorage.setItem("trucare.session", r.sessionToken);
      } else {
        localStorage.removeItem("trucare.session");
      }
      toast.success("אומת בהצלחה");
      nav({ to: "/consent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אימות נכשל");
    } finally {
      setSubmitting(false);
    }
  }, [challengeId, code]);

  const doResend = async () => {
    try {
      localStorage.removeItem("trucare.session");
      if (!recipient) return;
      const r = await api.resendOtp(recipient);
      setChallengeId(r.challengeId);
      s.set({ challengeId: r.challengeId });
      await fetchRateLimit();
      toast.success(s.channel === "email" ? "נשלח קוד חדש לאימייל" : "נשלח קוד חדש");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחה נכשלה");
    }
  };

  // WebOTP API: auto-fill OTP from SMS on Android Chrome
  useEffect(() => {
    if (!challengeId) return;
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
          void doVerify();
        }, 600);
      })
      .catch(() => {
        // user cancelled or WebOTP not supported — ignore
      });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId]);

  const isEmail = s.channel === "email";
  const maskedRecipient =
    isEmail && recipient ? maskEmail(recipient) : recipient ? maskPhone(recipient) : "";

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-4 text-center">
        <h1 className="text-2xl font-extrabold">{isEmail ? "אימות אימייל" : "אימות טלפון"}</h1>
        <p className="text-sm text-muted-foreground">
          {isEmail ? "נשלח קוד בן 6 ספרות לכתובת" : "נשלח קוד בן 6 ספרות למספר"}
          <span className="mx-1 font-mono font-semibold text-foreground" dir="ltr">
            {maskedRecipient}
          </span>
        </p>
        <div className="card-tint w-full rounded-2xl p-5">
          <OtpInput value={code} onChange={setCode} onComplete={(c) => void doVerify(c)} disabled={submitting} />
        </div>
        <Button
          className="h-12 w-full rounded-full text-base"
          disabled={code.length !== 6 || submitting}
          onClick={doVerify}
        >
          אמת ←
        </Button>
        <button
          type="button"
          className="text-sm text-brand disabled:text-muted-foreground"
          onClick={doResend}
          disabled={submitting}
        >
          שלח קוד חדש
        </button>
        {rateLimit && (
          <p className="text-center text-xs text-muted-foreground">
            יש לך {rateLimit.remaining} מתוך {rateLimit.max} נסיונות לשעה
          </p>
        )}
        <SafariOtpAutofill onAutofill={(c) => { setCode(c); void doVerify(c); }} />
      </div>
    </PageShell>
  );
}
