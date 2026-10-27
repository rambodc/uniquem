import { GA_MEASUREMENT_ID_DEFAULT } from "./analyticsConfig";

// Lightweight GA4 (gtag.js) wrapper.
// - Inactive until a measurement ID is configured (see analyticsConfig.ts).
// - gtag.js is injected after the page has loaded and the browser is idle, so it
//   never competes with the page's own critical resources.
// - Private pages (/signin, /contact-inbox, /dashboard, /party) are never tracked and never load GA.
// - Only whitelisted, non-personal event parameters are sent: no names,
//   emails, phone numbers or messages.

type Params = Record<string, string | number | boolean>;
type Gtag = (...args: unknown[]) => void;
declare global { interface Window { dataLayer?: unknown[]; gtag?: Gtag } }

const ID_PATTERN = /^G-[A-Z0-9]{4,16}$/;
export function measurementId(): string {
  const value = String(import.meta.env.VITE_GA_MEASUREMENT_ID || GA_MEASUREMENT_ID_DEFAULT || "").trim().toUpperCase();
  return ID_PATTERN.test(value) ? value : "";
}
// Only the live site reports to GA, so local builds, previews and tests never pollute the data.
const LIVE_HOSTS = new Set(["uniquem.ca", "www.uniquem.ca"]);
export const isLiveHost = (host: string) => LIVE_HOSTS.has(host);
export const isPrivatePath = (path: string) => /^\/(signin|contact-inbox|dashboard|party)(\/|$)/.test(path);

export type AnalyticsEvent =
  | "sandweb_presentation_start"
  | "sandweb_scene_view"
  | "sandweb_presentation_complete"
  | "contact_option_select"
  | "lead_form_submit";

// Parameters allowed per event. Anything else is dropped before it reaches GA.
const allowed: Record<AnalyticsEvent, readonly string[]> = {
  sandweb_presentation_start: ["replay"],
  sandweb_scene_view: ["scene_number", "scene_title"],
  sandweb_presentation_complete: ["skipped"],
  contact_option_select: ["option"],
  lead_form_submit: ["form", "method", "product_name"],
};
const PERSONAL = /@|\d{6,}|https?:/i;
export function cleanParams(event: AnalyticsEvent, params: Params = {}): Params {
  const out: Params = {};
  for (const key of allowed[event]) {
    const value = params[key];
    if (typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string" && value.length <= 60 && !PERSONAL.test(value)) out[key] = value;
  }
  return out;
}

let configured = "", loading = false;
function currentPath() { return typeof window === "undefined" ? "/" : window.location.pathname; }
const disableKey = (id: string) => `ga-disable-${id}`;

function ensureGtag(id: string) {
  if (configured === id) return;
  window.dataLayer = window.dataLayer || [];
  // gtag must push the real `arguments` object.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function gtag() { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  // The config call sends the landing page_view. Later client-side route changes are
  // counted by GA4 enhanced measurement ("page changes based on browser history
  // events", on by default), so we do not send them again here (that would double count).
  window.gtag("config", id);
  configured = id;
  if (!loading) {
    loading = true;
    const inject = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    };
    const idle = () => { if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(inject, { timeout: 4000 }); else setTimeout(inject, 1500); };
    if (document.readyState === "complete") idle(); else window.addEventListener("load", idle, { once: true });
  }
}

/** Call on every route change. Starts GA on the first public page (sending its
 * page_view) and switches all GA hits off while a private page is open. */
export function trackPageView(path: string) {
  const id = measurementId();
  if (!id || typeof window === "undefined" || !isLiveHost(window.location.hostname)) return false;
  const flags = window as unknown as Record<string, boolean>;
  flags[disableKey(id)] = isPrivatePath(path);
  if (isPrivatePath(path)) return false;
  ensureGtag(id);
  return true;
}

export function trackEvent(event: AnalyticsEvent, params?: Params) {
  const id = measurementId();
  if (!id || typeof window === "undefined" || !isLiveHost(window.location.hostname) || isPrivatePath(currentPath())) return false;
  ensureGtag(id);
  window.gtag!("event", event, cleanParams(event, params));
  return true;
}

/** Test helper: reset module state between tests. */
export function resetAnalyticsForTests() { configured = ""; loading = false; }
