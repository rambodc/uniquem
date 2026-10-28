/* eslint-disable react-hooks/refs -- busyRef, seqRef and the input refs are only read inside event handlers and effects, never to render; the rule cannot see that through the handlers passed to DoorRow. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, UserPlus, X } from "lucide-react";
import { addWalkIn, checkInGuest, listGuests, undoCheckIn, updateGuestAtDoor, type Guest, type GuestDoorPatch, type GuestList, type WalkInInput } from "../core/api";
import { messageOf } from "./Workspace";
import { arrivedGuests, checkedInMessage, guestName, mergePolled, optimisticGuest, searchResults, splitName } from "./logic";
import { summarize } from "./summary";
import { formatClockShort } from "./time";
import DoorRow, { type RowBusy } from "./DoorRow";
import DoorBrowse from "./DoorBrowse";
import { EditSheet, WalkInSheet } from "./DoorSheets";
import "./party.css";

const POLL_MS = 10_000, MAX_RESULTS = 40, TOAST_MS = 3000;
type Toast = { id: string | null; text: string };
/** Door screen for phones, tablets and laptops. Find (search + browse all) and Arrived are tabs on narrow screens and sit side by side on wide ones. */
export default function CheckIn() {
  const { partyId = "" } = useParams();
  const [data, setData] = useState<GuestList | null>(null), [error, setError] = useState(""), [note, setNote] = useState(""), [query, setQuery] = useState(""), [tab, setTab] = useState<"find" | "arrived">("find"), [group, setGroup] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlyMap<string, RowBusy>>(new Map()), [armed, setArmed] = useState<string | null>(null), [arriving, setArriving] = useState<ReadonlyMap<string, number>>(new Map());
  const [toast, setToast] = useState<Toast | null>(null), [walkIn, setWalkIn] = useState<{ firstName: string; lastName: string } | null>(null), [editing, setEditing] = useState<string | null>(null);
  const pollRef = useRef(0), busyRef = useRef(new Set<string>()), seqRef = useRef(0), searchRef = useRef<HTMLInputElement>(null), resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.title = "Door check-in | Uniquem private"; if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus(); }, []);
  const load = useCallback(async () => { try { const seq = seqRef.current, next = await listGuests(partyId); if (seq !== seqRef.current) return; setData((current) => ({ ...next, guests: mergePolled(current?.guests ?? [], next.guests, busyRef.current) })); setError(""); } catch (cause) { setError(messageOf(cause, "Can't reach the server. Check your connection.")); } }, [partyId]);
  useEffect(() => { void load(); const tick = () => { if (!document.hidden) void load(); }; pollRef.current = window.setInterval(tick, POLL_MS); return () => window.clearInterval(pollRef.current); }, [load]);
  useEffect(() => { if (!armed) return; const timer = window.setTimeout(() => setArmed(null), 4000); return () => window.clearTimeout(timer); }, [armed]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), TOAST_MS); return () => window.clearTimeout(timer); }, [toast]);

  const showToast = (next: Toast) => setToast(next); // a new object restarts the 3 s timer above
  const hideToast = () => setToast(null);
  const replace = (guest: Guest) => setData((current) => current && { ...current, guests: current.guests.map((item) => item.id === guest.id ? guest : item) });
  /** Shows `next` at once, then confirms with the server. A failure puts the row back exactly as it was. Returns whether it worked. */
  async function run(guest: Guest, kind: RowBusy, next: Guest, work: () => Promise<void>, onFail?: () => void) {
    if (busyRef.current.has(guest.id)) return;
    busyRef.current.add(guest.id); seqRef.current += 1;
    setPending((current) => new Map(current).set(guest.id, kind)); setError(""); setNote("");
    replace(next);
    try { await work(); } catch (cause) { replace(guest); onFail?.(); setError(messageOf(cause, "That didn't go through. Check your connection and try again."))}
    finally { busyRef.current.delete(guest.id); seqRef.current += 1; setPending((current) => { const copy = new Map(current); copy.delete(guest.id); return copy; }); }
  }
  const arrivingFor = (guest: Guest) => arriving.get(guest.id) ?? guest.plusOnes;
  const focusSearch = () => window.setTimeout(() => searchRef.current?.focus(), 0);
  async function checkIn(guest: Guest, fromSearch: boolean) {
    const count = arrivingFor(guest), at = new Date().toISOString(), next = optimisticGuest(guest, true, at, count);
    if (fromSearch) { setQuery(""); focusSearch(); }
    showToast({ id: guest.id, text: checkedInMessage(next, formatClockShort(at)) });
    await run(guest, "in", next, async () => { const result = await checkInGuest(partyId, guest.id, count); replace(result.guest); if (result.alreadyCheckedIn) setNote(`${guestName(result.guest)} was already checked in at ${formatClockShort(result.guest.checkedInAt)}.`); }, hideToast);
  }
  const undoNow = (guest: Guest) => { hideToast(); void run(guest, "out", optimisticGuest(guest, false, ""), async () => { replace((await undoCheckIn(partyId, guest.id)).guest); setNote(`Undid check-in for ${guestName(guest)}.`); }); };
  const undo = (guest: Guest) => { if (armed !== guest.id) { setArmed(guest.id); return; } setArmed(null); undoNow(guest); };
  function saveEdit(guest: Guest, patch: GuestDoorPatch) {
    setEditing(null);
    const next: Guest = { ...guest, ...patch, plusOnesArrived: guest.checkedIn ? patch.plusOnesArrived ?? guest.plusOnesArrived : 0 } as Guest;
    void run(guest, "edit", next, async () => { replace((await updateGuestAtDoor(partyId, guest.id, patch)).guest); });
  }
  async function addWalkInGuest(input: WalkInInput) {
    seqRef.current += 1;
    try {
      const { guest } = await addWalkIn(partyId, input);
      setData((current) => current && { ...current, guests: [...current.guests.filter((item) => item.id !== guest.id), guest] });
      setWalkIn(null); setQuery(""); setError(""); focusSearch();
      showToast({ id: guest.id, text: `${checkedInMessage(guest, formatClockShort(guest.checkedInAt))} (walk-in)` });
    } finally { seqRef.current += 1; }
  }
  const openFirst = () => (resultsRef.current?.querySelector<HTMLButtonElement>(".ws-checkin:not(:disabled)") ?? resultsRef.current?.querySelector<HTMLButtonElement>(".ws-undo:not(:disabled)"))?.focus();

  const guests = data?.guests ?? [], term = query.trim(), summary = summarize(guests, data?.party.capacity ?? null), arrived = arrivedGuests(guests), results = term ? searchResults(guests, term) : [];
  const editingGuest = editing ? guests.find((guest) => guest.id === editing) ?? null : null;
  const rowFor = (fromSearch = false) => (guest: Guest) => <DoorRow key={guest.id} guest={guest} busy={pending.get(guest.id)} armed={armed === guest.id} arriving={arrivingFor(guest)}
    onArriving={(count) => setArriving((current) => new Map(current).set(guest.id, count))} onCheckIn={() => void checkIn(guest, fromSearch)} onUndo={() => undo(guest)} onEdit={() => setEditing(guest.id)} />;

  return <main className="ws-door">
    <header className="ws-door-head"><Link to={`/party/${partyId}`} className="ws-back">← {data?.party.name ?? "Party"}</Link>
      <div className="ws-count" aria-live="polite" aria-label={`${summary.arrivedPeople} people arrived of ${summary.expectedHeadcount} expected`}><b>{summary.arrivedPeople}</b> / {summary.expectedHeadcount}<small>people arrived · {summary.checkedIn} of {summary.invited} guests</small></div></header>
    <div className="ws-door-body">
      {error && <div className="ws-status error" role="alert">{error}</div>}
      {note && <div className="ws-status ok" role="status">{note}</div>}
      {!data && !error && <div className="ws-empty">Loading guest list…</div>}
      {data && <>
        <div className="ws-door-tabs" role="tablist" aria-label="Door views">
          <button role="tab" aria-selected={tab === "find"} className={tab === "find" ? "on" : ""} onClick={() => setTab("find")}>Find</button>
          <button role="tab" aria-selected={tab === "arrived"} className={tab === "arrived" ? "on" : ""} onClick={() => setTab("arrived")}>Arrived <span className="ws-badge-count">{summary.checkedIn}</span></button>
        </div>
        <div className="ws-door-grid">
          <section className={`ws-door-panel find${tab === "find" ? " active" : ""}`} aria-label="Find a guest">
            <div className="ws-door-searchbar">
              <div className="ws-searchbox"><Search size={22} aria-hidden="true" />
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, group, notes" aria-label="Search guests" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go"
                  onKeyDown={(event) => { if (event.key === "Escape") { setQuery(""); } else if (event.key === "Enter" || event.key === "ArrowDown") { event.preventDefault(); openFirst(); } }} />
                {query && <button className="ws-clear" onClick={() => { setQuery(""); focusSearch(); }} aria-label="Clear search"><X size={20} /><span>Clear</span></button>}
              </div>
              <button className="ws-walkin-btn" onClick={() => setWalkIn(splitName(query))}><UserPlus size={20} /> <span>Add walk-in</span></button>
            </div>
            <div ref={resultsRef}>
              {term
                ? results.length === 0
                  ? <div className="ws-empty ws-nomatch">No guest found for “{term}”. Check the spelling, or add them as a walk-in.<div className="ws-row"><button className="ws-button big" onClick={() => setWalkIn(splitName(query))}><UserPlus size={20} /> Add “{term}” as a walk-in</button><button className="ws-button ghost big" onClick={() => { setQuery(""); focusSearch(); }}>Clear search</button></div></div>
                  : <><p className="ws-results-meta">{results.length} {results.length === 1 ? "match" : "matches"}{results.some((guest) => guest.checkedIn) && " · already arrived are at the bottom"}</p>
                    <ul className="ws-door-list">{results.slice(0, MAX_RESULTS).map(rowFor(true))}{results.length > MAX_RESULTS && <li className="ws-hint">Showing {MAX_RESULTS} of {results.length}. Type more to narrow it down.</li>}</ul></>
                : guests.length === 0 ? <div className="ws-empty">No guests on this list yet. Use Add walk-in for people who turn up.</div> : <DoorBrowse guests={guests} group={group} onGroup={setGroup} renderRow={rowFor()} />}
            </div>
          </section>
          <section className={`ws-door-panel arrived${tab === "arrived" ? " active" : ""}`} aria-label="Arrived guests">
            <h2 className="ws-panel-title">Arrived <span className="ws-badge-count">{summary.checkedIn}</span></h2>
            <p className="ws-results-meta">{summary.checkedIn} {summary.checkedIn === 1 ? "guest" : "guests"} · {summary.arrivedPeople} {summary.arrivedPeople === 1 ? "person" : "people"} including plus-ones · latest first</p>
            {summary.checkedIn === 0 ? <div className="ws-empty">Nobody has checked in yet.</div> : <ul className="ws-door-list">{arrived.map(rowFor())}</ul>}
          </section>
        </div>
      </>}
    </div>
    {toast && <div className="ws-toast" role="status" aria-live="polite"><span>{toast.text}</span>{toast.id && (() => { const guest = guests.find((item) => item.id === toast.id); return guest?.checkedIn ? <button onClick={() => undoNow(guest)} disabled={pending.has(guest.id)}>Undo</button> : null; })()}</div>}
    {walkIn && <WalkInSheet initial={walkIn} onSubmit={addWalkInGuest} onClose={() => setWalkIn(null)} />}
    {editingGuest && <EditSheet guest={editingGuest} onSave={(patch) => saveEdit(editingGuest, patch)} onClose={() => setEditing(null)} />}
  </main>;
}
