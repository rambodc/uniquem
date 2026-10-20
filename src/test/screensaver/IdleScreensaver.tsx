import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./screensaver.css";

/** Seconds of inactivity before the screensaver appears (change to 60 later). */
export const SCREENSAVER_IDLE_MS = 5_000;
// Never on the narrated SandWeb presentation (it plays audio) or the standalone test page.
const EXCLUDED = (path: string) => path === "/chemicals/sandweb" || path.startsWith("/test/");
const ACTIVITY = ["pointermove", "pointerdown", "mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart", "touchmove"] as const;
const load = () => import("./ScreensaverScene");
const Scene = lazy(load);
const typing = () => { const el = document.activeElement as HTMLElement | null; return Boolean(el && (el.matches("input, textarea, select") || el.isContentEditable)); };

/** App-wide idle screensaver. Client only (App is never server-rendered), and
 * the 3D scene is a lazy chunk fetched shortly before it is first needed. */
export default function IdleScreensaver() {
  const { pathname } = useLocation();
  const [state, setState] = useState<"off" | "on" | "leaving">("off");
  const disabled = EXCLUDED(pathname);

  useEffect(() => {
    if (disabled) return;
    let timer = 0, prefetch = 0, shownAt = 0;
    const arm = () => {
      window.clearTimeout(timer); window.clearTimeout(prefetch);
      prefetch = window.setTimeout(() => void load(), SCREENSAVER_IDLE_MS * 0.6);
      timer = window.setTimeout(() => {
        if (document.hidden || typing()) { arm(); return; }
        shownAt = performance.now(); setState("on");
      }, SCREENSAVER_IDLE_MS);
    };
    const onActivity = (e: Event) => {
      // Ignore the synthetic pointer move some browsers fire when the overlay appears.
      if ((e.type === "mousemove" || e.type === "pointermove") && performance.now() - shownAt < 400) return;
      setState((s) => (s === "on" ? "leaving" : s));
      arm();
    };
    ACTIVITY.forEach((type) => window.addEventListener(type, onActivity, { capture: true, passive: true }));
    arm();
    return () => { window.clearTimeout(timer); window.clearTimeout(prefetch); ACTIVITY.forEach((type) => window.removeEventListener(type, onActivity, { capture: true })); setState("off"); };
  }, [disabled]);

  useEffect(() => { if (state !== "leaving") return; const id = window.setTimeout(() => setState("off"), 320); return () => window.clearTimeout(id); }, [state]);

  if (state === "off" || disabled) return null;
  // The overlay stays mounted while fading so the dismissing click never reaches the page.
  return <div className={`ss-overlay${state === "leaving" ? " is-leaving" : ""}`} aria-hidden="true" onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}>
    <Suspense fallback={<div className="ss-fallback" />}><Scene /></Suspense>
  </div>;
}
