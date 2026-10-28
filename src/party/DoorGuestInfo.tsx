import { StickyNote } from "lucide-react";
import type { Guest } from "../core/api";
import { STATUS_LABEL, guestName } from "./logic";
import { formatClock } from "./time";
import { PlusChip, VipBadge } from "./DoorBits";

/** Everything we know about a guest, labelled, for the door screen (before and after check-in).
 *  `expanded=false` is the collapsed row: name, badges (VIP, +N, note icon) and one line of company / type. */
export default function DoorGuestInfo({ guest, busy, expanded = true }: { guest: Guest; busy?: "in" | "out" | "edit"; expanded?: boolean }) {
  const title = <div className="ws-door-title"><b>{guestName(guest)}</b>{guest.vip && <VipBadge />}<PlusChip count={guest.plusOnes} />{!expanded && guest.notes && <span className="ws-note-icon" role="img" aria-label="Has a note"><StickyNote size={16} /></span>}</div>;
  const state = (flag: string) => <span className={`ws-flag ${flag}`}>{flag === "notComing" ? "Marked not coming" : "Marked pending"}</span>;
  if (!expanded) return <div className="ws-door-name">{title}<small>{[guest.company, guest.invitedBy].filter(Boolean).join(" · ") || "—"}</small>{guest.status !== "coming" && state(guest.status)}</div>;
  return <>
    <div className="ws-door-name">{title}</div>
    <dl className="ws-door-info">
      {guest.company && <div><dt>Company</dt><dd>{guest.company}</dd></div>}
      {guest.invitedBy && <div><dt>Invited by / Type</dt><dd>{guest.invitedBy}</dd></div>}
      <div><dt>Status</dt><dd>{guest.status === "coming" ? <span className="ws-flag coming">{STATUS_LABEL.coming}</span> : state(guest.status)}</dd></div>
      {(guest.plusOnes > 0 || guest.plusOnesArrived > 0) && <div><dt>Plus-ones</dt><dd>{guest.plusOnes} planned{guest.checkedIn && busy !== "in" ? ` · ${guest.plusOnesArrived} arrived` : ""}</dd></div>}
      {guest.checkedIn && <div><dt>Checked in</dt><dd>{busy === "in" ? "Checking in…" : formatClock(guest.checkedInAt)}</dd></div>}
    </dl>
    {guest.notes && <p className="ws-door-note"><span>Notes</span>{guest.notes}</p>}
  </>;
}
