import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PatientAuthMenu } from "@/components/PatientAuthMenu";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_COOKIE = "trucare_consent";

function getConsent(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + CONSENT_COOKIE + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setConsent(value: string) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; expires=${expires}; samesite=lax`;
}

function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    setVisible(consent === null);
  }, []);

  const accept = () => {
    setConsent("granted");
    setVisible(false);
  };

  const decline = () => {
    setConsent("denied");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="הסכמה לעוגיות"
      className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-hair bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-right text-sm leading-relaxed text-muted-foreground">
          אנו משתמשים בעוגיות לניתוח שימוש באתר ולשיפור החוויה. לא ייאסף מידע רפואי.
        </p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={decline} className="rounded-full">
            לדחות
          </Button>
          <Button size="sm" onClick={accept} className="rounded-full">
            אישור
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PageShellProps {
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
  wide?: boolean;
}

export function PageShell({ children, className, hideHeader, wide }: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!hideHeader && <TruCareHeader />}
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-16 pt-6 sm:px-6",
          wide ? "max-w-6xl" : "max-w-xl",
          className,
        )}
      >
        {children}
      </main>
      <footer className="border-t border-hair bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <img
            src="/AstraZeneca-Logo.png"
            alt="AstraZeneca"
            className="h-12 w-auto object-contain"
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms-of-use" className="hover:text-foreground">
              תנאי שימוש
            </Link>
            <Link to="/privacy-policy" className="hover:text-foreground">
              מדיניות פרטיות
            </Link>
            <span>POWERED BY B-ONLINE</span>
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
}

export function TruCareHeader() {
  return (
    <header className="border-b border-hair bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-4">
        {/* Leading slot (right side in RTL) — kept for balance */}
        <div className="flex items-center justify-start" />
        <Link to="/" className="flex items-center justify-center gap-2 text-brand">
          <span className="text-2xl font-extrabold tracking-tight">TruCare</span>
        </Link>
        <div className="flex items-center justify-end">
          <PatientAuthMenu />
        </div>
      </div>
    </header>
  );
}
