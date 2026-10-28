import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Undo2 } from "lucide-react";
import { checkInGuest, listGuests, undoCheckIn, type Guest, type GuestList } from "../core/api";
import { messageOf } from "./Workspace";
import { filterGuests, guestName, mergePolled, optimisticGuest, sortGuests } from "./logic";
import { formatClock } from "./time";
import DoorGuestInfo from "./DoorGuestInfo";
import "./party.css";

const POLL_MS = 10_000, MAX_RESULTS = 30;
/** Phone-first door screen: search, tap Check in. Works for every status; flags guests who were not marked coming. */
export default function CheckIn() {
  const { partyId = "" } = useParams();
  const [data, setData] = useState<GuestList | null>(null), [error, setError] = useState(""), [note, setNote] = useState(""), [query, setQuery] = useState(""), [pending, setPending] = useState<ReadonlyMap<string, "in" | "out">>(new Map()), [armed, setArmed] = useState<string | null>(null), pollRef = useRef(0), busyRef = useRef(new Set<string>()), seqRef = useRef(0);
  useEffect(() => { document.title = "Door check-in | Uniquem private"; }, []);
  const load = useCallback(async () => { try { const seq = seqRef.current, next = await listGuests(partyId); if (seq !== seqRef.current) return; setData((current) => ({ ...next, guests: mergePolled(current?.guests ?? [], next.guests, busyRef.current) })); setError(""); } catch (cause) { setError(messageOf(cause, "Can't reach the server. Check your connection.")); } }, [partyId]);
  useEffect(() => { void load(); const tick = () => { if (!document.hidden) void load(); }; pollRef.current = window.setInterval(tick, POLL_MS); return () => window.clearInterval(pollRef.current); }, [load]);
  useEffect(() => { if (!armed) return; const timer = window.setTimeout(() => setArmed(null), 4000); return () => window.clearTimeout(timer); }, [armed]);

  const replace = (guest: Guest) => setData((current) => current && { ...current, guests: current.guests.map((item) => item.id === guest.id ? guest : item) });
  /** Shows the new state at once, then confirms with the server. A failure puts the row back exactly as it was. */
  async function run(guest: Guest, kind: "in" | "out", work: () => Promise<void>) {
    if (busyRef.current.has(guest.id)) return;
    busyRef.current.add(guest.id); seqRef.current += 1;
    setPending((current) => new Map(current).set(guest.id, kind)); setError(""); setNote("");
    replace(optimisticGuest(guest, kind === "in", new Date().toISOString()));
    try { await work(); } catch (cause) { replace(guest); setError(messageOf(cause, "That didn't go through. Check your connection and try again.")); }
    finally { busyRef.current.delete(guest.id); seqRef.current += 1; setPending((current) => { const next = new Map(current); next.delete(guest.id); return next; }); }
  }
  const checkIn = (guest: Guest) => run(guest, "in", async () => { const result = await checkInGuest(partyId, guest.id); replace(result.guest); if (result.alreadyCheckedIn) setNote(`${guestName(result.guest)} was already checked in at ${formatClock(result.guest.checkedInAt)}.`); });
  const undo = (guest: Guest) => { if (armed !== guest.id) { setArmed(guest.id); return; } setArmed(null); void run(guest, "out", async () => { replace((await undoCheckIn(partyId, guest.id)).guest); setNote(`Undid check-in for ${guestName(guest)}.`); }); };

  const guests = data?.guests ?? [], arrived = guests.filter((guest) => guest.checkedIn).length, term = query.trim();
  const results = term ? filterGuests(sortGuests(guests), term, "all", true) : [];
  const recent = guests.filter((guest) => guest.checkedIn && guest.checkedInAt).sort((a, b) => Date.parse(b.checkedInAt!) - Date.parse(a.checkedInAt!)).slice(0, 5);
  const row = (guest: Guest) => { const busy = pending.get(guest.id); return <li key={guest.id} className={`ws-door-row${guest.checkedIn ? " done" : ""}${busy ? " busy" : ""}`} aria-busy={Boolean(busy)}>
    <DoorGuestInfo guest={guest} busy={busy} />
    {guest.checkedIn
      ? <div className="ws-door-done"><span className="ws-checked"><Check size={20} /> {busy === "in" ? "Checking in…" : `Checked in ${formatClock(guest.checkedInAt)}`}</span><button className={`ws-undo${armed === guest.id ? " armed" : ""}`} disabled={Boolean(busy)} onClick={() => undo(guest)}><Undo2 size={16} /> {armed === guest.id ? "Tap again to undo" : "Undo"}</button></div>
      : <button className="ws-checkin" disabled={Boolean(busy)} onClick={() => void checkIn(guest)}>{busy === "out" ? "Undoing…" : "Check in"}</button>}
    {busy && <span className="ws-progress" role="status">{busy === "in" ? "Checking in…" : "Undoing…"}</span>}
  </li>; };
  return <main className="ws-door">
    <header className="ws-door-head"><Link to={`/party/${partyId}`} className="ws-back">← {data?.party.name ?? "Party"}</Link>
      <div className="ws-count" aria-live="polite"><b>{arrived}</b> / {guests.length}<small>checked in</small></div></header>
    <div className="ws-door-search"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, group or notes" aria-label="Search guests" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} /></div>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {note && <div className="ws-status ok" role="status">{note}</div>}
    {!data && !error && <div className="ws-empty">Loading guest list…</div>}
    {data && !term && <><p className="ws-hint">Type a name to find a guest.</p>{recent.length > 0 && <><h2 className="ws-h2">Latest check-ins</h2><ul className="ws-door-list">{recent.map(row)}</ul></>}</>}
    {data && term && (results.length === 0 ? <div className="ws-empty">No guest found for “{term}”. Check the spelling or try the company, group or notes.</div> : <ul className="ws-door-list">{results.slice(0, MAX_RESULTS).map(row)}{results.length > MAX_RESULTS && <li className="ws-hint">Showing {MAX_RESULTS} of {results.length}. Type more to narrow it down.</li>}</ul>)}
  </main>;
}
