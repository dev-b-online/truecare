import { useConsent } from "@/state/consentStore";
import { enableAnalytics, trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { CONSENT_VERSION } from "@/state/consentStore";

/**
 * Cookie / analytics consent banner.
 * - Shown to every visitor until they grant or deny.
 * - Full-width, pinned to the bottom of the viewport.
 * - On grant: enables GA (deferred until now) + fires a consent event.
 * - On deny: stores the choice, loads nothing, sets no analytics cookies.
 * Re-offering later (e.g. from settings) is possible via useConsent().reset().
 */
export function CookieConsentBanner() {
  const status = useConsent((s) => s.status);
  const setConsent = useConsent((s) => s.set);

  if (status !== null) return null;

  // Mirror the choice to the DB (best-effort, only when authenticated).
  const syncToServer = (choice: "granted" | "denied") => {
    api.saveCookieConsent({ status: choice, version: CONSENT_VERSION }).catch(() => {});
  };

  const grant = () => {
    setConsent("granted");
    enableAnalytics();
    trackEvent("consent_granted", { scope: "analytics" });
    syncToServer("granted");
  };

  const deny = () => {
    setConsent("denied");
    trackEvent("consent_denied", { scope: "analytics" });
    syncToServer("denied");
  };

  return (
    <div
      role="dialog"
      aria-label="הסכמה לעוגיות"
      className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-hair bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-right text-sm leading-relaxed text-muted-foreground">
          אנו משתמשים בעוגיות לניתוח שימוש באתר (Google Analytics) ולשיפור החוויה. לא ייאסף מידע
          רפואי. באפשרותך לאשר או לדחות.
        </p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={deny} className="rounded-full">
            לדחות
          </Button>
          <Button size="sm" onClick={grant} className="rounded-full">
            אישור
          </Button>
        </div>
      </div>
    </div>
  );
}
