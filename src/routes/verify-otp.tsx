import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { OtpInput } from "@/components/OtpInput";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/state/onboardingStore";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { maskPhone } from "@/lib/mask";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-otp")({
  component: VerifyOtpRoute,
  head: () => ({ meta: [{ title: "אימות טלפון | TruCare" }] }),
});

function VerifyOtpRoute() {
  const s = useOnboarding();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState<string | undefined>(s.challengeId);
  const otpRequested = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(seconds);
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!s.phone) {
      nav({ to: "/register" });
      return;
    }
    if (!challengeId && !otpRequested.current) {
      otpRequested.current = true;
      api.requestOtp(s.phone)
        .then((r) => {
          setChallengeId(r.challengeId);
          s.set({ challengeId: r.challengeId });
          toast.success("נשלח קוד אימות");
        })
        .catch((err: Error) => {
          otpRequested.current = false;
          toast.error(err.message);
        });
    }
    startCountdown(60);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doVerify = async () => {
    if (!challengeId || code.length !== 6) return;
    setSubmitting(true);
    try {
      const r = await api.verifyOtp(challengeId, code);
      if (r.sessionToken) {
        localStorage.setItem("trucare.session", r.sessionToken);
      }
      toast.success("אומת בהצלחה");
      nav({ to: "/consent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אימות נכשל");
    } finally {
      setSubmitting(false);
    }
  };

  const doResend = async () => {
    if (countdown > 0) return;
    try {
      const r = await api.resendOtp(s.phone);
      setChallengeId(r.challengeId);
      s.set({ challengeId: r.challengeId });
      startCountdown(60);
      toast.success("נשלח קוד חדש");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחה נכשלה");
    }
  };

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 pt-4 text-center">
        <h1 className="text-2xl font-extrabold">אימות טלפון</h1>
        <p className="text-sm text-muted-foreground">
          נשלח קוד בן 6 ספרות למספר
          <span className="mx-1 font-mono font-semibold text-foreground" dir="ltr">
            {s.phone ? maskPhone(s.phone) : ""}
          </span>
        </p>
        <div className="card-tint w-full rounded-2xl p-5">
          <OtpInput value={code} onChange={setCode} disabled={submitting} />
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
          disabled={countdown > 0}
        >
          {countdown > 0 ? `שליחה חוזרת בעוד ${countdown} שניות` : "שלח קוד חדש"}
        </button>
      </div>
    </PageShell>
  );
}
