import type { SceneId } from "./narration";

// Each narrated scene cuts between two scales: the well/formation view and the
// pore-scale macro view. `cut` is the fraction of the scene at which it cuts.
export type View = "well" | "pore" | "flow";
const PLAN: Record<SceneId, { first: View; second: View; cut: number }> = {
  // Cuts to the pore view as the narration says "Those particles disperse".
  problem: { first: "well", second: "pore", cut: 0.4 },
  // SandWeb: a long, slow well-scale descent (about 15 s) that cuts to the pore
  // view just as the narration says "Instead of dispersing, the particles are consolidated".
  sandweb: { first: "well", second: "pore", cut: 0.53 },
  result: { first: "flow", second: "well", cut: 0.46 },
};
export const FADE = 0.45;

export function viewAt(scene: SceneId, t: number, duration: number) {
  const plan = PLAN[scene], cutAt = plan.cut * duration;
  const first = t < cutAt;
  const start = first ? 0 : cutAt, end = first ? cutAt : duration;
  const progress = Math.min(1, Math.max(0, (t - start) / Math.max(0.001, end - start)));
  // Dip to black around the cut.
  const fade = Math.max(0, 1 - Math.abs(t - cutAt) / FADE);
  return { view: first ? plan.first : plan.second, progress, fade, start, end };
}
