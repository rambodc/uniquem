import { PerformanceMonitor } from "@react-three/drei";
import { useCallback, useState } from "react";

/** Device pixel-ratio ceiling for 3D canvases: phones up to 2.5, everything else up to 2. */
export const PHONE_DPR = 2.5, DESKTOP_DPR = 2, MIN_DPR = 1;
/** MSAA samples for EffectComposer (WebGL2 render targets); keeps post-processed edges smooth. */
export const COMPOSER_SAMPLES = 4;

const isPhone = () => typeof window !== "undefined" && (window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches);
const deviceDpr = () => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
export const dprCap = (phone = isPhone()) => Math.max(MIN_DPR, Math.min(deviceDpr(), phone ? PHONE_DPR : DESKTOP_DPR));

/**
 * High-quality-by-default pixel ratio for a <Canvas>. Starts at the device's full ratio
 * (capped); `step down` lowers it only when <QualityMonitor> reports sustained low fps.
 */
export function useAdaptiveDpr() {
  const [dpr, setDpr] = useState(() => dprCap());
  const stepDown = useCallback(() => setDpr((d) => Math.max(MIN_DPR, Math.round(d * 0.8 * 100) / 100)), []);
  const floor = useCallback(() => setDpr(MIN_DPR), []);
  return { dpr, stepDown, floor };
}

/** Place inside a <Canvas>. Never raises quality, only steps it down if a device struggles. */
export function QualityMonitor({ stepDown, floor }: { stepDown: () => void; floor: () => void }) {
  return <PerformanceMonitor ms={500} iterations={6} threshold={0.75} bounds={(refresh) => [Math.min(45, refresh * 0.75), refresh + 1]} flipflops={4} onDecline={stepDown} onFallback={floor} />;
}
