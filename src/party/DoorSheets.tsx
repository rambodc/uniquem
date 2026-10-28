import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Star, X } from "lucide-react";
import type { Guest, GuestDoorPatch, GuestStatus, WalkInInput } from "../core/api";
import { STATUS_LABEL, clampPlusOnes, guestName } from "./logic";
import { messageOf } from "./Workspace";
import { Stepper } from "./DoorBits";

/** Bottom sheet on phones, centred card on tablets and laptops. Esc and the backdrop close it. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onClose]);
  return <div className="ws-sheet-wrap" onClick={onClose}>
    <div className="ws-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <div className="ws-sheet-head"><h2>{title}</h2><button className="ws-icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}
const VipToggle = ({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) => <button type="button" className={`ws-vip-toggle${value ? " on" : ""}`} aria-pressed={value} onClick={() => onChange(!value)}><Star size={18} fill={value ? "currentColor" : "none"} /> VIP{value ? " (on)" : ""}</button>;

/** Walk-in: someone not on the list. One button creates them as "coming" and checks them in. */
export function WalkInSheet({ initial, onSubmit, onClose }: { initial: { firstName: string; lastName: string }; onSubmit: (input: WalkInInput) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<WalkInInput>({ ...initial, company: "", invitedBy: "Walk-in", notes: "", plusOnes: 0, vip: false }), [busy, setBusy] = useState(false), [error, setError] = useState(""), first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  const set = (key: "firstName" | "lastName" | "company" | "invitedBy" | "notes") => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { await onSubmit({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim() }); } catch (cause) { setError(messageOf(cause, "The walk-in could not be added. Check your connection and try again.")); setBusy(false); }
  }
  return <Sheet title="Add walk-in" onClose={busy ? () => undefined : onClose}>
    <form className="ws-sheet-form" onSubmit={submit}>
      {error && <div className="ws-status error" role="alert">{error}</div>}
      <label>First name<input ref={first} value={form.firstName} onChange={set("firstName")} maxLength={80} required autoComplete="off" /></label>
      <label>Last name<input value={form.lastName} onChange={set("lastName")} maxLength={80} required autoComplete="off" /></label>
      <label>Company<input value={form.company} onChange={set("company")} maxLength={120} autoComplete="off" /></label>
      <label>Invited by / Type<input value={form.invitedBy} onChange={set("invitedBy")} maxLength={120} autoComplete="off" /></label>
      <div className="ws-sheet-pair"><Stepper label="Plus-ones arriving with them" value={form.plusOnes} onChange={(plusOnes) => setForm((current) => ({ ...current, plusOnes }))} /><VipToggle value={Boolean(form.vip)} onChange={(vip) => setForm((current) => ({ ...current, vip }))} /></div>
      <label className="ws-sheet-wide">Notes<textarea value={form.notes} onChange={set("notes")} maxLength={500} rows={3} placeholder="Allergies, who they came with, anything to remember" /></label>
      <div className="ws-sheet-buttons"><button type="button" className="ws-button ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ws-button big" disabled={busy || !form.firstName.trim() || !form.lastName.trim()}>{busy ? "Adding…" : "Add and check in"}</button></div>
    </form>
  </Sheet>;
}

/** Door edit: notes, status, VIP and plus-ones only. Names and company stay on the party page. */
export function EditSheet({ guest, onSave, onClose }: { guest: Guest; onSave: (patch: GuestDoorPatch) => void; onClose: () => void }) {
  const [notes, setNotes] = useState(guest.notes), [status, setStatus] = useState<GuestStatus>(guest.status), [vip, setVip] = useState(guest.vip), [plusOnes, setPlusOnes] = useState(guest.plusOnes), [arrived, setArrived] = useState(guest.plusOnesArrived);
  function submit(event: FormEvent) {
    event.preventDefault();
    const patch: GuestDoorPatch = {};
    if (notes.trim() !== guest.notes) patch.notes = notes;
    if (status !== guest.status) patch.status = status;
    if (vip !== guest.vip) patch.vip = vip;
    if (plusOnes !== guest.plusOnes) patch.plusOnes = plusOnes;
    if (guest.checkedIn && arrived !== guest.plusOnesArrived) patch.plusOnesArrived = arrived;
    if (Object.keys(patch).length) onSave(patch); else onClose();
  }
  return <Sheet title={`Edit ${guestName(guest)}`} onClose={onClose}>
    <form className="ws-sheet-form" onSubmit={submit}>
      <p className="ws-sheet-sub ws-sheet-wide">{[guest.company, guest.invitedBy].filter(Boolean).join(" · ") || "No company or group"}. Names and company are changed on the party page.</p>
      <div className="ws-sheet-wide"><span className="ws-label">Status</span><div className="ws-seg" role="group" aria-label="Status">{(Object.keys(STATUS_LABEL) as GuestStatus[]).map((key) => <button key={key} type="button" className={status === key ? "on" : ""} aria-pressed={status === key} onClick={() => setStatus(key)}>{STATUS_LABEL[key]}</button>)}</div></div>
      <div className="ws-sheet-pair"><Stepper label="Plus-ones (planned)" value={plusOnes} onChange={(next) => setPlusOnes(clampPlusOnes(next))} /><VipToggle value={vip} onChange={setVip} /></div>
      {guest.checkedIn && <div className="ws-sheet-wide"><Stepper label="Plus-ones who arrived" value={arrived} onChange={(next) => setArrived(clampPlusOnes(next))} /></div>}
      <label className="ws-sheet-wide">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={4} placeholder="Allergies, VIP, plus-one, anything to remember" /></label>
      <div className="ws-sheet-buttons"><button type="button" className="ws-button ghost" onClick={onClose}>Cancel</button><button className="ws-button big">Save</button></div>
    </form>
  </Sheet>;
}
