// Keeps the app alive when a tab or phone comes back after sitting idle, and after a deploy.
//
// 1. Deploys replace the hashed JS chunks. A page opened before a deploy still points at the old chunk names, so the next lazy page
//    (Profile, Safety lesson, …) fails to load ("Failed to fetch dynamically imported module") and, with no error boundary, React
//    unmounts everything: a blank page. Fix: on a chunk-load failure, reload the page once to pick up the new build.
// 2. When the tab comes back after a while, refresh the sign-in and App Check tokens and tell open pages to reload their data
//    (onResume / useResume), instead of waiting for stale requests to time out.
import { lazy, useEffect, useRef, type ComponentType } from "react";

const RELOAD_KEY = "uq-chunk-reload-at";
/** A tab hidden at least this long refreshes tokens and data when it comes back. */
export const RESUME_AFTER_MS = 60_000;

/** True for the errors browsers and Vite raise when a JS/CSS chunk can't be loaded (usually: it was replaced by a newer deploy). */
export function isChunkLoadError(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk .* failed|is not a valid JavaScript MIME type/i.test(text);
}
/** Reloads the page to pick up the latest deploy, at most once a minute (so a real outage never loops). Returns whether it reloaded. */
export function reloadOnce(now = Date.now(), storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage, reload = () => window.location.reload()) {
  const last = Number(storage.getItem(RELOAD_KEY) || 0);
  if (now - last < 60_000) return false;
  storage.setItem(RELOAD_KEY, String(now));
  reload();
  return true;
}
/** React.lazy that reloads once if the chunk is gone after a deploy (instead of throwing and blanking the page). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => factory().catch((error: unknown) => {
    if (isChunkLoadError(error) && reloadOnce()) return new Promise<{ default: T }>(() => undefined); // the page is reloading
    throw error;
  }));
}
/** Vite fires "vite:preloadError" when a chunk's preload fails; reload once instead of letting the import throw. Call once at start-up. */
export function installChunkRecovery() {
  window.addEventListener("vite:preloadError", (event) => { if (reloadOnce()) event.preventDefault(); });
}

// ---- Coming back to a tab ----
type Listener = () => void;
const listeners = new Set<Listener>();
export function onResume(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function emitResume() { for (const listener of [...listeners]) listener(); }
/** Re-runs `reload` whenever the app resumes (tab back after RESUME_AFTER_MS, back/forward cache restore, or back online). */
export function useResume(reload: () => unknown) {
  const latest = useRef(reload);
  useEffect(() => { latest.current = reload; });
  useEffect(() => onResume(() => { void latest.current(); }), []);
}
/** Whether a tab that was hidden at `hiddenAt` should refresh when shown at `now`. */
export const shouldResume = (hiddenAt: number | null, now: number) => hiddenAt != null && now - hiddenAt >= RESUME_AFTER_MS;
/** Watches visibility, bfcache restores and the network; calls `resume` when the page comes back. Returns a cleanup. */
export function watchResume(resume: () => void, win: Window = window, doc: Document = document, now = () => Date.now()) {
  let hiddenAt: number | null = doc.hidden ? now() : null;
  const visibility = () => { if (doc.hidden) { hiddenAt = now(); return; } if (shouldResume(hiddenAt, now())) resume(); hiddenAt = null; };
  const pageshow = (event: Event) => { if ((event as PageTransitionEvent).persisted) resume(); };
  const online = () => resume();
  doc.addEventListener("visibilitychange", visibility); win.addEventListener("pageshow", pageshow); win.addEventListener("online", online);
  return () => { doc.removeEventListener("visibilitychange", visibility); win.removeEventListener("pageshow", pageshow); win.removeEventListener("online", online); };
}
