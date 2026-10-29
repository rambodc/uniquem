import type { SafetyProgress, SafetySlideType, SafetyStatus } from "../core/api";

export const STATUS_LABELS: Record<SafetyStatus, string> = { not_started: "Not started", passed: "Passed", failed: "Failed" };
export const KIND_LABELS: Record<SafetySlideType, string> = { image: "Images", video: "Video", "3d": "3D model" };
/** The badge text for a lesson: the status, plus the best score once there is one. */
export function statusText(progress: SafetyProgress) {
  if (progress.status === "not_started") return STATUS_LABELS.not_started;
  return `${STATUS_LABELS[progress.status]} · ${progress.status === "passed" ? progress.bestScore : progress.lastScore}%`;
}
/** The main button on a lesson card. */
export const startLabel = (progress: SafetyProgress) => progress.status === "not_started" ? "Start lesson" : progress.status === "failed" ? "Retake" : "Review";
