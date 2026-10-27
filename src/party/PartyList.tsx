import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { listParties, type Party } from "../core/api";
import { Page, messageOf } from "./Workspace";
import { splitParties } from "./logic";
import { formatPartyDateTime } from "./time";

function PartyCard({ party }: { party: Party }) {
  return <Link className="ws-party" to={`/party/${party.id}`}>
    <span className="ws-thumb">{party.thumbDataUrl ? <img src={party.thumbDataUrl} alt="" /> : <CalendarDays size={26} />}</span>
    <span className="ws-party-text"><b>{party.name}</b><small><CalendarDays size={14} /> {formatPartyDateTime(party.startsAt)}</small><small><MapPin size={14} /> {party.location}</small></span>
  </Link>;
}
export default function PartyList() {
  const [parties, setParties] = useState<Party[] | null>(null), [error, setError] = useState("");
  useEffect(() => { let active = true; listParties().then((result) => { if (active) setParties(result.parties); }, (cause) => { if (active) setError(messageOf(cause, "The parties could not be loaded. Try again.")); }); return () => { active = false; }; }, []);
  const { upcoming, past } = splitParties(parties ?? []);
  return <Page title="Party" subtitle="Create a party, build the guest list and check people in at the door." back={{ to: "/dashboard", label: "Dashboard" }} actions={<Link className="ws-button" to="/party/new"><Plus size={18} /> Create party</Link>}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!parties && !error && <div className="ws-empty">Loading parties…</div>}
    {parties && <>
      <section><h2 className="ws-h2">Upcoming</h2>{upcoming.length ? <div className="ws-grid">{upcoming.map((party) => <PartyCard key={party.id} party={party} />)}</div> : <div className="ws-empty">No upcoming parties. Create one to get started.</div>}</section>
      <section><h2 className="ws-h2">Past</h2>{past.length ? <div className="ws-grid">{past.map((party) => <PartyCard key={party.id} party={party} />)}</div> : <div className="ws-empty">No past parties yet.</div>}</section>
    </>}
  </Page>;
}
