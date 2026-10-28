import { Minus, Plus, Star } from "lucide-react";
import { MAX_PLUS_ONES } from "./logic";

/** VIP badge: dark green with a star (never yellow). */
export const VipBadge = () => <span className="ws-vip"><Star size={13} fill="currentColor" aria-hidden="true" /> VIP</span>;
/** "+2" chip for guests who bring plus-ones. */
export const PlusChip = ({ count, title = "Plus-ones" }: { count: number; title?: string }) => count > 0 ? <span className="ws-plus" title={`${title}: ${count}`}>+{count}</span> : null;

/** Big − / + stepper for a small whole number (plus-ones). Every tap target is at least 48px. */
export function Stepper({ label, value, onChange, max = MAX_PLUS_ONES, disabled }: { label: string; value: number; onChange: (next: number) => void; max?: number; disabled?: boolean }) {
  return <div className="ws-stepper" role="group" aria-label={label}>
    <span className="ws-stepper-label">{label}</span>
    <div className="ws-stepper-controls">
      <button type="button" aria-label={`Fewer: ${label}`} disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}><Minus size={20} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`More: ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Plus size={20} /></button>
    </div>
  </div>;
}
