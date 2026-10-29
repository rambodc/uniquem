import { Minus, Plus, Star } from "lucide-react";
import type { Gender } from "../core/api";
import { GENDERS, GENDER_LABEL, MAX_PLUS_ONES } from "./logic";

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
/** Male / female, as a two-button segmented control. Required on every guest; new guests start on male. */
export function GenderPicker({ value, onChange, className = "" }: { value: Gender; onChange: (next: Gender) => void; className?: string }) {
  return <div className={`ws-gender-field ${className}`}><span className="ws-label">Gender</span><div className="ws-seg two" role="group" aria-label="Gender">{GENDERS.map((key) => <button key={key} type="button" className={value === key ? "on" : ""} aria-pressed={value === key} onClick={() => onChange(key)}>{GENDER_LABEL[key]}</button>)}</div></div>;
}
/** Small male/female chip on guest cards. */
export const GenderChip = ({ gender }: { gender: Gender }) => <span className={`ws-gender ${gender}`}><span aria-hidden="true">{gender === "male" ? "\u2642" : "\u2640"}</span> {GENDER_LABEL[gender]}</span>;
