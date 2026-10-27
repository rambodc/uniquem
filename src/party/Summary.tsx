/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { listGuests, type GuestList } from "../core/api";
import { Page, messageOf } from "./Workspace";
import { arrivals, guestName, STATUS_LABEL } from "./logic";
import { formatClock, formatPartyDateTime } from "./time";

export default function Summary() {
  const { partyId = "" } = useParams(), [data, setData] = useState<GuestList | null>(null), [error, setError] = useState(""), [newestFirst, setNewestFirst] = useState(false);
  const load = useCallback(async () => { try { setData(await listGuests(partyId)); setError(""); } catch (cause) { setError(messageOf(cause, "The summary could not be loaded. Try again.")); } }, [partyId]);
  useEffect(() => { void load(); }, [load]);
  const back = { to: `/party/${partyId}`, label: "Party" };
  if (!data) return <Page title="Summary" back={back}>{error ? <div className="ws-status error" role="alert">{error}</div> : <div className="ws-empty">Loading…</div>}</Page>;
  const { party, summary, guests } = data, rows = arrivals(guests, newestFirst);
  const left = summary.capacityLeft;
  const stats: [string, string | number, string?][] = [["Invited", summary.invited], ["Coming", summary.coming], ["Pending", summary.pending], ["Not coming", summary.notComing], ["Checked in", summary.checkedIn], ["Capacity left", left == null ? "No limit" : left < 0 ? `Over by ${-left}` : left, left != null && left < 0 ? "warn" : undefined]];
  return <Page title={`${party.name}: summary`} subtitle={<>{formatPartyDateTime(party.startsAt)} · {party.location}</>} back={back} actions={<button className="ws-button ghost" onClick={() => void load()}><RefreshCw size={18} /> Refresh</button>}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <section className="ws-stats">{stats.map(([label, value, tone]) => <div key={label} className={`ws-stat ${tone ?? ""}`}><b>{value}</b><span>{label}</span></div>)}</section>
    {(summary.checkedInNotComing > 0 || summary.checkedInPending > 0) && <p className="ws-meta">Of those checked in, {summary.checkedInPending} were marked pending and {summary.checkedInNotComing} were marked not coming.</p>}
    <section>
      <div className="ws-section-head"><h2 className="ws-h2">Who arrived ({rows.length})</h2><button className="ws-chip" onClick={() => setNewestFirst((value) => !value)}>{newestFirst ? "Newest first" : "Oldest first"}</button></div>
      {rows.length === 0 ? <div className="ws-empty">Nobody has checked in yet.</div> : <table className="ws-table"><thead><tr><th>Time</th><th>Guest</th><th>Company</th><th>Listed as</th></tr></thead><tbody>{rows.map((guest) => <tr key={guest.id}><td>{formatClock(guest.checkedInAt)}</td><td>{guestName(guest)}</td><td>{guest.company || "—"}</td><td>{STATUS_LABEL[guest.status]}</td></tr>)}</tbody></table>}
      <p className="ws-meta">Times are Calgary time.</p>
    </section>
  </Page>;
}
