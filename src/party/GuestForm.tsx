import { useRef, useState, type FormEvent } from "react";
import type { GuestInput, GuestStatus } from "../core/api";
import { MAX_PLUS_ONES, STATUS_LABEL, clampPlusOnes } from "./logic";
export const emptyGuest: GuestInput = { firstName: "", lastName: "", company: "", invitedBy: "", notes: "", status: "pending", plusOnes: 0, vip: false };
/** One guest at a time. Used for both adding and editing. */
export default function GuestForm({ initial = emptyGuest, submitLabel, onSubmit, onCancel, clearAfterSave = false }: { initial?: GuestInput; submitLabel: string; clearAfterSave?: boolean; onSubmit: (guest: GuestInput) => Promise<void>; onCancel?: () => void }) {
  const first = useRef<HTMLInputElement>(null), [guest, setGuest] = useState(initial), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (key: "firstName" | "lastName" | "company" | "invitedBy" | "notes") => (event: { target: { value: string } }) => setGuest((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSubmit(guest); if (clearAfterSave) { setGuest(emptyGuest); first.current?.focus(); } } catch (cause) { setError(cause instanceof Error && cause.message.length < 160 ? cause.message : "The guest could not be saved."); } finally { setBusy(false); }
  }
  return <form className="ws-guest-form" onSubmit={submit}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <label>First name<input ref={first} value={guest.firstName} onChange={set("firstName")} maxLength={80} required autoComplete="off" /></label>
    <label>Last name<input value={guest.lastName} onChange={set("lastName")} maxLength={80} required autoComplete="off" /></label>
    <label>Company<input value={guest.company} onChange={set("company")} maxLength={120} autoComplete="off" /></label>
    <label>Invited by / Type<input value={guest.invitedBy} onChange={set("invitedBy")} maxLength={120} autoComplete="off" /></label>
    <label className="ws-guest-notes">Notes<textarea value={guest.notes} onChange={set("notes")} maxLength={500} rows={3} placeholder="Allergies, VIP, plus-one, anything to remember" /></label>
    <label>Status<select value={guest.status} onChange={(event) => setGuest((current) => ({ ...current, status: event.target.value as GuestStatus }))}>{(Object.keys(STATUS_LABEL) as GuestStatus[]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
    <label>Plus-ones<input type="number" inputMode="numeric" min={0} max={MAX_PLUS_ONES} step={1} value={guest.plusOnes} onChange={(event) => setGuest((current) => ({ ...current, plusOnes: clampPlusOnes(Number(event.target.value)) }))} /></label>
    <label className="ws-check"><span>VIP</span><span className="ws-check-row"><input type="checkbox" checked={guest.vip} onChange={(event) => setGuest((current) => ({ ...current, vip: event.target.checked }))} /> Mark as a VIP</span></label>
    <div className="ws-row"><button className="ws-button" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>{onCancel && <button type="button" className="ws-button ghost" onClick={onCancel} disabled={busy}>Cancel</button>}</div>
  </form>;
}
