import type { Guest } from "../core/api";
import { STATUS_LABEL, guestName } from "./logic";
import { formatClock } from "./time";

/** Everything we know about a guest, labelled, for the door screen (before and after check-in). */
export default function DoorGuestInfo({ guest }: { guest: Guest }) {
  return <div className="ws-door-name"><b>{guestName(guest)}</b>
    <dl className="ws-door-info">
      {guest.company && <div><dt>Company</dt><dd>{guest.company}</dd></div>}
      {guest.invitedBy && <div><dt>Invited by / Type</dt><dd>{guest.invitedBy}</dd></div>}
      <div><dt>Status</dt><dd>{guest.status === "coming" ? <span className="ws-flag coming">{STATUS_LABEL.coming}</span> : <span className={`ws-flag ${guest.status}`}>{guest.status === "notComing" ? "Marked not coming" : "Marked pending"}</span>}</dd></div>
      {guest.checkedIn && <div><dt>Checked in</dt><dd>{formatClock(guest.checkedInAt)}</dd></div>}
    </dl>
    {guest.notes && <p className="ws-door-note"><span>Notes</span>{guest.notes}</p>}
  </div>;
}
