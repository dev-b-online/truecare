import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { OtpInput } from "@/components/OtpInput";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/state/onboardingStore";
import { useEffect, useState } from "react";
/*
import { useServerFn } from "@tanstack/react-start";
import { requestOtp, verifyOtp, resendOtp } from "@/lib/otp/otp.functions";
*/
import { maskPhone } from "@/lib/mask";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-otp")({
  component: VerifyOtpRoute,
  head: () => ({ meta: [{ title: "אימות טלפון | TruCare" }] }),
});

function VerifyOtpRoute() {
  const s = useOnboarding();
  const nav = useNavigate();
/*  const request = useServerFn(requestOtp);
  const verify = useServerFn(verifyOtp);
  const resend = useServerFn(resendOtp);*/
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState<string | undefined>(s.challengeId);

/*  useEffect(() => {
    if (!s.phone) {
      nav({ to: "/register" });
      return;
    }
    if (!challengeId) {
      request({ data: { phone: s.phone } })
        .then((r) => {
          setChallengeId(r.challengeId);
          s.set({ challengeId: r.challengeId });
          toast.success(r.smsOk ? "נשלח קוד אימות" : "לא ניתן היה לשלוח SMS. בדקו הגדרות ספק.");
        })
        .catch((err: Error) => toast.error(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);*/
  useEffect(() => {
    if (!s.phone) {
      nav({ to: "/register" });
    }
  }, []);


/*  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);*/

/*
  const doVerify = async () => {
    if (!challengeId || code.length !== 6) return;
    setSubmitting(true);
    try {
      await verify({ data: { challengeId, code } });
      toast.success("אומת בהצלחה");
      nav({ to: "/consent" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "אימות נכשל");
    } finally {
      setSubmitting(false);
    }
  };
*/
  const doVerify = async () => {
    if (code.length !== 6) return;
    nav({ to: "/consent" });
  };


/*  const doResend = async () => {
    if (!challengeId || countdown > 0) return;
    try {
      const r = await resend({ data: { challengeId, phone: s.phone } });
      setChallengeId(r.challengeId);
      s.set({ challengeId: r.challengeId });
      setCountdown(60);
      toast.success("נשלח קוד חדש");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחה נכשלה");
    }
  };*/
  const doResend = async () => {
    setCountdown(60);
    toast.success("(демо) קוד חדש נשלח");
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
