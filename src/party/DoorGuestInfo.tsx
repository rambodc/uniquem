import type { Guest } from "../core/api";
import { GENDER_LABEL, STATUS_LABEL, guestName } from "./logic";
import { formatClock } from "./time";
import { PlusChip, VipBadge } from "./DoorBits";

/** Everything we know about a guest, labelled, always shown in full on the door screen (before and after check-in). */
export default function DoorGuestInfo({ guest, busy }: { guest: Guest; busy?: "in" | "out" | "edit" }) {
  const state = (flag: string) => <span className={`ws-flag ${flag}`}>{flag === "notComing" ? "Marked not coming" : "Marked pending"}</span>;
  return <>
    <div className="ws-door-name"><div className="ws-door-title"><b>{guestName(guest)}</b>{guest.vip && <VipBadge />}<PlusChip count={guest.plusOnes} /></div></div>
    <dl className="ws-door-info">
      <div><dt>Gender</dt><dd>{GENDER_LABEL[guest.gender]}</dd></div>
      {guest.company && <div><dt>Company</dt><dd>{guest.company}</dd></div>}
      {guest.invitedBy && <div><dt>Invited by / Type</dt><dd>{guest.invitedBy}</dd></div>}
      <div><dt>Status</dt><dd>{guest.status === "coming" ? <span className="ws-flag coming">{STATUS_LABEL.coming}</span> : state(guest.status)}</dd></div>
      {(guest.plusOnes > 0 || guest.plusOnesArrived > 0) && <div><dt>Plus-ones</dt><dd>{guest.plusOnes} planned{guest.checkedIn && busy !== "in" ? ` · ${guest.plusOnesArrived} arrived` : ""}</dd></div>}
      {guest.checkedIn && <div><dt>Checked in</dt><dd>{busy === "in" ? "Checking in…" : formatClock(guest.checkedInAt)}</dd></div>}
    </dl>
    {guest.notes && <p className="ws-door-note"><span>Notes</span>{guest.notes}</p>}
  </>;
}
