import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useMemo } from "react";
import type { SceneId } from "./narration";
import FlowWorld from "./FlowWorld";
import PoreWorld, { type Mode } from "./PoreWorld";
import { viewAt, type View } from "./timeline";
import WellWorld from "./WellWorld";

export type ClockRef = { current: number };
type Props = { scene: SceneId; view: View; clock: ClockRef; duration: number; compact: boolean; active: boolean };
const MODES: Record<SceneId, Mode> = { problem: "sand", sandweb: "treat", result: "clean" };

export default function Stage3({ scene, view, clock, duration, compact, active }: Props) {
  // Read-only progress (0..1) within the current view, derived from narration time.
  const progress = useMemo(() => ({ get current() { return viewAt(scene, clock.current, duration).progress; } }), [scene, clock, duration]);
  const mode = MODES[scene];
  return <Canvas frameloop={active ? "always" : "never"} dpr={[1, compact ? 1.3 : 1.75]} camera={{ fov: compact ? 60 : 42, near: 0.1, far: 600, position: [0, 0, 20] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
    {view === "flow" ? <FlowWorld key={`flow-${scene}`} progress={progress} compact={compact} /> : view === "pore" ? <PoreWorld key={`pore-${scene}`} mode={mode} progress={progress} compact={compact} /> : <WellWorld key={`well-${scene}`} mode={mode} progress={progress} compact={compact} />}
    <EffectComposer multisampling={0} enabled={!compact}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} />
      <Vignette offset={0.3} darkness={0.7} />
    </EffectComposer>
  </Canvas>;
}
