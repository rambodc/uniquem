import { useState } from "react";
import { Check, ChevronDown, Pencil, Undo2 } from "lucide-react";
import type { Guest } from "../core/api";
import { formatClockShort } from "./time";
import DoorGuestInfo from "./DoorGuestInfo";
import { Stepper } from "./DoorBits";

export type RowBusy = "in" | "out" | "edit";
export type DoorRowProps = {
  guest: Guest; busy?: RowBusy; armed: boolean; arriving: number;
  /** Collapsed rows (browse and Arrived) show a one-line summary with a Details toggle; search results are always expanded. */
  compact?: boolean;
  onArriving: (count: number) => void; onCheckIn: () => void; onUndo: () => void; onEdit: () => void;
};

/** One guest on the door screen: info, plus-ones stepper, Check in / Undo (two taps) and the Edit pencil. */
export default function DoorRow({ guest, busy, armed, arriving, compact = false, onArriving, onCheckIn, onUndo, onEdit }: DoorRowProps) {
  const [open, setOpen] = useState(false), expanded = !compact || open;
  return <li className={`ws-door-row${guest.checkedIn ? " done" : ""}${guest.vip ? " vip" : ""}${busy ? " busy" : ""}`} aria-busy={Boolean(busy)}>
    <div className="ws-door-main">
      <DoorGuestInfo guest={guest} busy={busy} expanded={expanded} />
      <div className="ws-door-tools">
        <button className="ws-icon-btn" onClick={onEdit} disabled={Boolean(busy)} aria-label={`Edit ${guest.firstName} ${guest.lastName}`} title="Edit notes, status, VIP, plus-ones"><Pencil size={18} /><span>Edit</span></button>
        {compact && <button className="ws-icon-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for ${guest.firstName} ${guest.lastName}`}><ChevronDown size={18} className={open ? "flip" : ""} /><span>Details</span></button>}
      </div>
    </div>
    {guest.checkedIn
      ? <div className="ws-door-done">
          <span className="ws-checked"><Check size={22} /> {busy === "in" ? "Checking in…" : `Checked in ${formatClockShort(guest.checkedInAt)}`}{guest.plusOnesArrived > 0 && busy !== "in" && <em>+{guest.plusOnesArrived} arrived</em>}</span>
          <button className={`ws-undo${armed ? " armed" : ""}`} disabled={Boolean(busy)} onClick={onUndo}><Undo2 size={16} /> {armed ? "Tap again to undo" : "Undo"}</button>
        </div>
      : <div className="ws-door-act">
          {guest.plusOnes > 0 && <Stepper label="Guests arriving with them" value={arriving} onChange={onArriving} disabled={Boolean(busy)} />}
          <button className="ws-checkin" disabled={Boolean(busy)} onClick={onCheckIn}>{busy === "out" ? "Undoing…" : busy === "edit" ? "Saving…" : guest.plusOnes > 0 && arriving > 0 ? `Check in +${arriving}` : "Check in"}</button>
        </div>}
    {busy && <span className="ws-progress" role="status">{busy === "in" ? "Checking in…" : busy === "out" ? "Undoing…" : "Saving…"}</span>}
  </li>;
}
