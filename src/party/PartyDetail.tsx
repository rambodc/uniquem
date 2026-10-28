/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, DoorOpen, MapPin, Pencil, Search, StickyNote, Trash2, Upload, UserPlus } from "lucide-react";
import { addGuest, archiveParty, deleteGuest, restoreParty, getPartyPhoto, listGuests, setGuestStatus, updateGuest, type Guest, type GuestInput, type GuestList, type GuestStatus } from "../core/api";
import { Confirm, Page, messageOf } from "./Workspace";
import GuestForm from "./GuestForm";
import { PlusChip, VipBadge } from "./DoorBits";
import ImportGuests from "./ImportGuests";
import { STATUS_LABEL, filterGuests, guestName, sortGuests } from "./logic";
import { summarize } from "./summary";
import { formatClock, formatPartyDateTime } from "./time";

export default function PartyDetail() {
  const { partyId = "" } = useParams(), navigate = useNavigate(), notice = (useLocation().state as { notice?: string } | null)?.notice;
  const [data, setData] = useState<GuestList | null>(null), [photo, setPhoto] = useState<string | null>(null), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [filter, setFilter] = useState<GuestStatus | "all">("all"), [adding, setAdding] = useState(false), [importing, setImporting] = useState(false), [editing, setEditing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "party" } | { kind: "guest"; guest: Guest } | null>(null), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setData(await listGuests(partyId)); setError(""); } catch (cause) { setError(messageOf(cause, "This party could not be loaded. Try again.")); } }, [partyId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!data?.party.hasPhoto) { setPhoto(null); return; } let active = true; getPartyPhoto(partyId).then((result) => { if (active) setPhoto(result.dataUrl); }, () => undefined); return () => { active = false; }; }, [partyId, data?.party.hasPhoto, data?.party.updatedAt]);

  const party = data?.party, summary = data && summarize(data.guests, data.party.capacity), visible = data ? filterGuests(sortGuests(data.guests), query, filter) : [];
  async function act(work: () => Promise<unknown>, fallback: string) { setError(""); try { await work(); await load(); } catch (cause) { setError(messageOf(cause, fallback)); } }
  async function confirmed() {
    if (!confirm) return; setBusy(true);
    try { if (confirm.kind === "party") { await archiveParty(partyId); navigate("/party", { replace: true }); return; } await deleteGuest(partyId, confirm.guest.id); setConfirm(null); await load(); }
    catch (cause) { setError(messageOf(cause, confirm.kind === "party" ? "The party could not be archived. Try again." : "That could not be deleted. Try again.")); setConfirm(null); } finally { setBusy(false); }
  }
  const people = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;
  const left = summary?.capacityLeft;
  const stats: [string, string | number, string?, string?][] = summary ? [["Invited", summary.invited], ["Coming", summary.coming], ["Pending", summary.pending], ["Not coming", summary.notComing],
    ["Checked in", summary.checkedIn, undefined, summary.arrivedPeople !== summary.checkedIn ? `${people(summary.arrivedPeople)} with plus-ones` : undefined],
    ...(left == null ? [] : [["Capacity left", left < 0 ? `Over by ${-left}` : left, left < 0 ? "warn" : undefined, left < 0 ? `Over capacity: ${summary.arrivedPeople} arrived, capacity ${summary.capacity}` : `${summary.arrivedPeople} arrived of ${summary.capacity}`] as [string, string | number, string?, string?]])] : [];
  if (!data) return <Page title="Party" back={{ to: "/party", label: "Parties" }}>{error ? <div className="ws-status error" role="alert">{error}</div> : <div className="ws-empty">Loading…</div>}</Page>;
  return <Page title={party!.name} subtitle={<><span>{formatPartyDateTime(party!.startsAt)}</span> · <span><MapPin size={14} /> {party!.location}</span></>} back={{ to: "/party", label: "Parties" }}
    actions={<><Link className="ws-button" to={`/party/${partyId}/check-in`}><DoorOpen size={18} /> Door check-in</Link><Link className="ws-button ghost" to={`/party/${partyId}/edit`}><Pencil size={18} /> Edit</Link>{party!.archived ? <button className="ws-button ghost" onClick={() => void act(() => restoreParty(partyId), "The party could not be restored. Try again.")}><ArchiveRestore size={18} /> Restore party</button> : <button className="ws-button ghost danger-text" onClick={() => setConfirm({ kind: "party" })}><Archive size={18} /> Archive party</button>}</>}>
    {party!.archived && <div className="ws-status error" role="status">This party is archived, so it is hidden from the party list. Use Restore party to bring it back.</div>}
    {notice && <div className="ws-status error" role="status">{notice}</div>}
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <section className="ws-stats" aria-label="Party summary">{stats.map(([label, value, tone, sub]) => <div key={label} className={`ws-stat ${tone ?? ""}`}><b>{value}</b><span>{label}</span>{sub && <small>{sub}</small>}</div>)}</section>
    <p className="ws-meta ws-expected">Expected headcount: {summary!.capacity == null ? summary!.expectedHeadcount : `${summary!.expectedHeadcount} of ${summary!.capacity}`} ({summary!.coming} coming {summary!.coming === 1 ? "guest" : "guests"} + {summary!.comingPlusOnes} {summary!.comingPlusOnes === 1 ? "plus-one" : "plus-ones"}). {summary!.capacity == null ? "No capacity set, so there is no capacity left to show." : "Planning only: capacity left counts only people who have arrived."}</p>
    {(summary!.checkedInNotComing > 0 || summary!.checkedInPending > 0) && <p className="ws-meta">Of those checked in, {summary!.checkedInPending} were marked pending and {summary!.checkedInNotComing} were marked not coming.</p>}
    <section className="ws-info">
      {photo && <img className="ws-photo" src={photo} alt={`Theme for ${party!.name}`} />}
      <div>
        {party!.description && <><h2 className="ws-h2">About</h2><p className="ws-pre">{party!.description}</p></>}
        {party!.hostNotes && <><h2 className="ws-h2">Host notes <em>(private)</em></h2><p className="ws-pre">{party!.hostNotes}</p></>}
        <p className="ws-meta">Capacity: {party!.capacity == null ? "No capacity set" : `${party!.capacity} people`}</p>
      </div>
    </section>
    <section>
      <div className="ws-section-head"><h2 className="ws-h2">Guest list</h2><div className="ws-row">{!adding && <button className="ws-button" onClick={() => { setAdding(true); setImporting(false); setEditing(null); }}><UserPlus size={18} /> Add guest</button>}{!importing && <button className="ws-button ghost" onClick={() => { setImporting(true); setAdding(false); setEditing(null); }}><Upload size={18} /> Import guests</button>}</div></div>
      {importing && <ImportGuests partyId={partyId} existing={data.guests} onImported={load} onClose={() => setImporting(false)} />}
      {adding && <div className="ws-panel"><h3>Add a guest</h3><GuestForm submitLabel="Add guest" clearAfterSave onSubmit={async (guest) => { await addGuest(partyId, guest); await load(); }} onCancel={() => setAdding(false)} /></div>}
      <div className="ws-toolbar">
        <label className="ws-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or company" aria-label="Search guests" /></label>
        <div className="ws-tabs" role="group" aria-label="Filter by status">{(["all", "coming", "pending", "notComing"] as const).map((key) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{key === "all" ? "All" : STATUS_LABEL[key]}</button>)}</div>
      </div>
      {data.guests.length === 0 ? <div className="ws-empty">No guests yet. Add the first one.</div> : visible.length === 0 ? <div className="ws-empty">No guests match.</div> : <ul className="ws-guests">{visible.map((guest) => <li key={guest.id}>
        {editing === guest.id
          ? <GuestForm initial={{ firstName: guest.firstName, lastName: guest.lastName, company: guest.company, invitedBy: guest.invitedBy, notes: guest.notes, status: guest.status, plusOnes: guest.plusOnes, vip: guest.vip }} submitLabel="Save" onSubmit={async (next: GuestInput) => { await updateGuest(partyId, guest.id, next); setEditing(null); await load(); }} onCancel={() => setEditing(null)} />
          : <><div className="ws-guest-main"><b className="ws-guest-name">{guestName(guest)}{guest.vip && <VipBadge />}<PlusChip count={guest.plusOnes} />{guest.notes && <span className="ws-note-icon" role="img" aria-label="Has a note"><StickyNote size={15} /></span>}</b><small>{[guest.company, guest.invitedBy].filter(Boolean).join(" · ") || "—"}</small>{guest.notes && <p className="ws-guest-note">{guest.notes}</p>}{guest.checkedIn && <span className="ws-badge ok">Checked in {formatClock(guest.checkedInAt)}</span>}</div>
            <select aria-label={`Status for ${guestName(guest)}`} className={`ws-status-select ${guest.status}`} value={guest.status} onChange={(event) => void act(() => setGuestStatus(partyId, guest.id, event.target.value as GuestStatus), "The status could not be changed.")}>{(Object.keys(STATUS_LABEL) as GuestStatus[]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select>
            <div className="ws-guest-actions"><button className="ws-chip" onClick={() => { setEditing(guest.id); setAdding(false); }}><Pencil size={15} /> Edit</button><button className="ws-chip danger-text" onClick={() => setConfirm({ kind: "guest", guest })}><Trash2 size={15} /> Delete</button></div></>}
      </li>)}</ul>}
    </section>
    {confirm && <Confirm busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void confirmed()}
      title={confirm.kind === "party" ? "Archive this party?" : "Delete this guest?"} confirmLabel={confirm.kind === "party" ? "Archive party" : "Delete guest"}
      body={confirm.kind === "party" ? <>This hides “{party!.name}” from the party list. Its guests, check-in times and photo are kept, and you can restore it later.</> : <>{guestName(confirm.guest)} will be removed from the guest list{confirm.guest.checkedIn ? " along with their check-in time" : ""}.</>} />}
  </Page>;
}
