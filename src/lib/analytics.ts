// Google Analytics 4 loader, gated behind explicit cookie consent.
//
// GA must NOT load or set _ga cookies until the user has granted consent.
// Once granted, we load gtag and replay a page_view. If denied, nothing is
// ever injected and no analytics cookies are set.
//
// The Measurement ID comes from VITE_GA_MEASUREMENT_ID. Until you provide a
// real G-XXXXXXXXXX value, analytics stays disabled (no network calls).

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? "";
export const IS_GA_ENABLED = /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function injectScript(): void {
  if (document.getElementById("ga-gtag")) return;

  // 1. gtag.js loader
  const gtagScript = document.createElement("script");
  gtagScript.id = "ga-gtag";
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(gtagScript);

  // 2. gtag bootstrap
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as (...args: unknown[]) => void;
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
}

let loaded = false;

/** Call once consent is granted. Idempotent. */
export function enableAnalytics(): void {
  if (!IS_GA_ENABLED || loaded) return;
  loaded = true;
  injectScript();
  trackPageView();
}

/** SPA navigation tracking (call from the router on each route change). */
export function trackPageView(path?: string): void {
  if (!IS_GA_ENABLED || !loaded || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path ?? window.location.pathname,
    send_page_view: true,
  });
}

/** Arbitrary GA4 event. No-op until consent is granted and GA is enabled. */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (!IS_GA_ENABLED || !loaded || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
