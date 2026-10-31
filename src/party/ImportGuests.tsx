import { useMemo, useState } from "react";
import { importGuests, type Guest } from "../core/api";
import { IMPORT_LIMITS, parseGuestImport } from "./guestImport";
import { STATUS_LABEL } from "./logic";
import { messageOf } from "./Workspace";

const FILL_LABEL = { invitedBy: "invited by / type", company: "company", notes: "notes", plusOnes: "plus-ones" } as const;
const EXAMPLE = "Ada, Lovelace, Analytical Engines, Rambod, coming, Allergic to nuts\nGrace, Hopper, Navy, , pending, , 1\nAlan, Turing";

/** Paste many guests at once: one per line, "first, last, company, invited by / type, status, notes" (commas or tabs). */
export default function ImportGuests({ partyId, existing, onImported, onClose }: { partyId: string; existing: Guest[]; onImported: () => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState<{ added: number; updated: number; skipped: number } | null>(null);
  const preview = useMemo(() => parseGuestImport(text, existing), [text, existing]);
  const { rows, problems, toAdd, toUpdate } = preview, skipped = preview.skipped, toSend = useMemo(() => rows.filter((row) => !row.duplicate).map((row) => row.guest), [rows]);
  async function submit() {
    if (!toSend.length || busy) return;
    setBusy(true); setError(""); setDone(null);
    let added = 0, updated = 0, alreadyThere = skipped;
    try {
      for (let start = 0; start < toSend.length; start += IMPORT_LIMITS.perCall) {
        const result = await importGuests(partyId, toSend.slice(start, start + IMPORT_LIMITS.perCall));
        added += result.added; updated += result.updated; alreadyThere += result.skipped;
      }
      setDone({ added, updated, skipped: alreadyThere }); setText("");
    } catch (cause) {
      const before = [added && `${added} guest${added === 1 ? " was" : "s were"} added`, updated && `${updated} updated`].filter(Boolean).join(" and ");
      setError(`${before ? `${before} before the problem. ` : ""}${messageOf(cause, "The guests could not be imported. Try again.")}`);
    } finally { setBusy(false); try { await onImported(); } catch { /* the list reloads on the next action */ } }
  }
  return <div className="ws-panel ws-import">
    <h3>Import guests</h3>
    <p className="ws-meta">One guest per line. Separate the fields with commas, or paste rows straight from a spreadsheet (tabs). Order: <b>first name, last name, company, invited by / type, status, notes, plus-ones</b>. Everything after the names is optional. Commas split the fields, so a note with a comma in it needs a spreadsheet paste (tabs), where it can contain commas. Status is coming, pending or not coming (blank means pending). Names already on the list are never added twice. If a pasted name is already on the list and its <b>invited by / type</b>, company, <b>notes</b> or plus-ones (0) is blank there, it is filled in from your paste. Values already on the list are never changed, and neither is status or check-in.</p>
    {done && <div className="ws-status ok" role="status">Added {done.added}, updated {done.updated}, skipped {done.skipped}.</div>}
    {error && <div className="ws-status error" role="alert">{error}</div>}
    <label className="ws-import-field">Guest list<textarea value={text} onChange={(event) => { setText(event.target.value); setDone(null); }} placeholder={EXAMPLE} rows={8} spellCheck={false} autoComplete="off" autoCapitalize="off" disabled={busy} /></label>
    {text.trim() && <div className="ws-import-preview" aria-live="polite">
      <p><b>{toAdd.length}</b> to add{toUpdate.length > 0 && <> · <b>{toUpdate.length}</b> to update (invited by / type, company, notes, plus-ones)</>}{skipped > 0 && <> · <b>{skipped}</b> already on the list (skipped)</>}{problems.length > 0 && <> · <b className="danger-text">{problems.length}</b> with problems</>}</p>
      {problems.length > 0 && <div className="ws-status error" role="alert"><b>Fix these lines or they will not be added:</b><ul>{problems.map((problem) => <li key={problem.line}>Line {problem.line}: {problem.reason} <code>{problem.text.length > 80 ? `${problem.text.slice(0, 80)}…` : problem.text}</code></li>)}</ul></div>}
      {rows.length > 0 && <ul className="ws-import-rows">{rows.map((row) => <li key={row.line} className={row.duplicate ? "dup" : ""}><b>{row.guest.firstName} {row.guest.lastName}</b><small>{[row.guest.company, row.guest.invitedBy, STATUS_LABEL[row.guest.status]].filter(Boolean).join(" · ")}</small>{row.guest.notes && <small>Notes: {row.guest.notes}</small>}{row.guest.plusOnes > 0 && <small>Plus-ones: {row.guest.plusOnes}</small>}{row.duplicate && <span className="ws-badge">{row.duplicate === "list" ? "Already on the list" : "Repeated above"}</span>}{row.fills.length > 0 && <span className="ws-badge">{`Will update ${row.fills.map((field) => FILL_LABEL[field]).join(", ").replace(/, ([^,]*)$/, " and $1")}`}</span>}</li>)}</ul>}
    </div>}
    <div className="ws-row"><button className="ws-button" onClick={() => void submit()} disabled={busy || toSend.length === 0}>{busy ? "Importing…" : toSend.length ? `${toAdd.length ? `Add ${toAdd.length} guest${toAdd.length === 1 ? "" : "s"}` : "Update guests"}${toAdd.length && toUpdate.length ? ` and update ${toUpdate.length}` : ""}` : "Add guests"}</button><button className="ws-button ghost" onClick={onClose} disabled={busy}>{done ? "Done" : "Cancel"}</button></div>
  </div>;
}
