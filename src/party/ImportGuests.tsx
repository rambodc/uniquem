import { useMemo, useState } from "react";
import { importGuests, type Guest } from "../core/api";
import { IMPORT_LIMITS, parseGuestImport } from "./importGuests";
import { STATUS_LABEL } from "./logic";
import { messageOf } from "./Workspace";

const EXAMPLE = "Ada, Lovelace, Analytical Engines, Rambod, coming\nGrace, Hopper, Navy, , pending\nAlan, Turing";

/** Paste many guests at once: one per line, "first, last, company, invited by, status" (commas or tabs). */
export default function ImportGuests({ partyId, existing, onImported, onClose }: { partyId: string; existing: Guest[]; onImported: () => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState<{ added: number; skipped: number } | null>(null);
  const preview = useMemo(() => parseGuestImport(text, existing), [text, existing]);
  const { rows, problems, toAdd } = preview, skipped = rows.length - toAdd.length;
  async function submit() {
    if (!toAdd.length || busy) return;
    setBusy(true); setError(""); setDone(null);
    let added = 0, alreadyThere = skipped;
    try {
      for (let start = 0; start < toAdd.length; start += IMPORT_LIMITS.perCall) {
        const result = await importGuests(partyId, toAdd.slice(start, start + IMPORT_LIMITS.perCall));
        added += result.added; alreadyThere += result.skipped;
      }
      setDone({ added, skipped: alreadyThere }); setText("");
    } catch (cause) {
      setError(`${added ? `${added} guest${added === 1 ? " was" : "s were"} added before the problem. ` : ""}${messageOf(cause, "The guests could not be imported. Try again.")}`);
    } finally { setBusy(false); try { await onImported(); } catch { /* the list reloads on the next action */ } }
  }
  return <div className="ws-panel ws-import">
    <h3>Import guests</h3>
    <p className="ws-meta">One guest per line. Separate the fields with commas, or paste rows straight from a spreadsheet (tabs). Order: <b>first name, last name, company, invited by, status</b>. Company, invited by and status are optional. Status is coming, pending or not coming (blank means pending). Names already on the list are skipped.</p>
    {done && <div className="ws-status ok" role="status">Added {done.added} guest{done.added === 1 ? "" : "s"}{done.skipped ? `, skipped ${done.skipped} already on the list` : ""}.</div>}
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <label className="ws-import-field">Guest list<textarea value={text} onChange={(event) => { setText(event.target.value); setDone(null); }} placeholder={EXAMPLE} rows={8} spellCheck={false} autoComplete="off" autoCapitalize="off" disabled={busy} /></label>
    {text.trim() && <div className="ws-import-preview" aria-live="polite">
      <p><b>{toAdd.length}</b> to add{skipped > 0 && <> · <b>{skipped}</b> already on the list (skipped)</>}{problems.length > 0 && <> · <b className="danger-text">{problems.length}</b> with problems</>}</p>
      {problems.length > 0 && <div className="ws-status error" role="alert"><b>Fix these lines or they will not be added:</b><ul>{problems.map((problem) => <li key={problem.line}>Line {problem.line}: {problem.reason} <code>{problem.text.length > 80 ? `${problem.text.slice(0, 80)}…` : problem.text}</code></li>)}</ul></div>}
      {rows.length > 0 && <ul className="ws-import-rows">{rows.map((row) => <li key={row.line} className={row.duplicate ? "dup" : ""}><b>{row.guest.firstName} {row.guest.lastName}</b><small>{[row.guest.company, row.guest.invitedBy && `Invited by ${row.guest.invitedBy}`, STATUS_LABEL[row.guest.status]].filter(Boolean).join(" · ")}</small>{row.duplicate && <span className="ws-badge">{row.duplicate === "list" ? "Already on the list" : "Repeated above"}</span>}</li>)}</ul>}
    </div>}
    <div className="ws-row"><button className="ws-button" onClick={() => void submit()} disabled={busy || toAdd.length === 0}>{busy ? "Importing…" : toAdd.length ? `Add ${toAdd.length} guest${toAdd.length === 1 ? "" : "s"}` : "Add guests"}</button><button className="ws-button ghost" onClick={onClose} disabled={busy}>{done ? "Done" : "Cancel"}</button></div>
  </div>;
}
