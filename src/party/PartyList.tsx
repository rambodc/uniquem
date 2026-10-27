/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, CalendarDays, MapPin, Plus } from "lucide-react";
import { listParties, restoreParty, type Party } from "../core/api";
import { Page, messageOf } from "./Workspace";
import { splitParties } from "./logic";
import { formatPartyDateTime } from "./time";

function PartyCard({ party, onRestore, busy }: { party: Party; onRestore?: (party: Party) => void; busy?: boolean }) {
  const card = <Link className={`ws-party${party.archived ? " archived" : ""}`} to={`/party/${party.id}`}>
    <span className="ws-thumb">{party.thumbDataUrl ? <img src={party.thumbDataUrl} alt="" /> : <CalendarDays size={26} />}</span>
    <span className="ws-party-text"><b>{party.name}</b><small><CalendarDays size={14} /> {formatPartyDateTime(party.startsAt)}</small><small><MapPin size={14} /> {party.location}</small></span>
  </Link>;
  return onRestore ? <div className="ws-party-wrap">{card}<button className="ws-chip" disabled={busy} onClick={() => onRestore(party)}><ArchiveRestore size={15} /> Restore</button></div> : card;
}
export default function PartyList() {
  const [showArchived, setShowArchived] = useState(false), [parties, setParties] = useState<Party[] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const load = useCallback(async (archived: boolean) => { try { const result = await listParties(archived); setParties(result.parties); setError(""); } catch (cause) { setError(messageOf(cause, "The parties could not be loaded. Try again.")); } }, []);
  useEffect(() => { setParties(null); void load(showArchived); }, [load, showArchived]);
  async function restore(party: Party) { setBusy(true); try { await restoreParty(party.id); await load(showArchived); } catch (cause) { setError(messageOf(cause, "The party could not be restored. Try again.")); } finally { setBusy(false); } }
  const { upcoming, past } = splitParties(parties ?? []);
  const toggle = <button className="ws-button ghost" onClick={() => setShowArchived((value) => !value)}>{showArchived ? <><ArrowLeft size={18} /> Back to parties</> : <><Archive size={18} /> Archived</>}</button>;
  return <Page title={showArchived ? "Archived parties" : "Party"} subtitle={showArchived ? "Hidden parties. Restore one to bring it back with all its guests." : "Create a party, build the guest list and check people in at the door."} back={{ to: "/dashboard", label: "Dashboard" }} actions={<>{!showArchived && <Link className="ws-button" to="/party/new"><Plus size={18} /> Create party</Link>}{toggle}</>}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!parties && !error && <div className="ws-empty">Loading parties…</div>}
    {parties && showArchived && (parties.length ? <div className="ws-grid">{[...upcoming, ...past].map((party) => <PartyCard key={party.id} party={party} onRestore={(item) => void restore(item)} busy={busy} />)}</div> : <div className="ws-empty">No archived parties.</div>)}
    {parties && !showArchived && <>
      <section><h2 className="ws-h2">Upcoming</h2>{upcoming.length ? <div className="ws-grid">{upcoming.map((party) => <PartyCard key={party.id} party={party} />)}</div> : <div className="ws-empty">No upcoming parties. Create one to get started.</div>}</section>
      <section><h2 className="ws-h2">Past</h2>{past.length ? <div className="ws-grid">{past.map((party) => <PartyCard key={party.id} party={party} />)}</div> : <div className="ws-empty">No past parties yet.</div>}</section>
    </>}
  </Page>;
}
