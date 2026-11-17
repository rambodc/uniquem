import { useEffect, useState } from "react";
import { getSafetyReport, listSafetyProgress, resetSafetyProgress, type SafetyProgressBoard } from "../core/api";
import { Page, messageOf } from "../party/Workspace";
import { formatPartyDateTime } from "../party/time";
import { statusText } from "./safety";
import { useResume } from "../core/resilience";
import "./safety.css";

type Person = SafetyProgressBoard["users"][number];
type Lesson = SafetyProgressBoard["lessons"][number];
export type ResetAsk = { uid: string; name: string; lessonId: string | null; lesson: string; step: 1 | 2; typed: string };
const armed = (ask: ResetAsk) => { const typed = ask.typed.trim(); return typed === "RESET" || typed.toLowerCase() === ask.name.trim().toLowerCase(); };

export function ProgressTable({ board, onDownload, downloading, onReset }: { board: SafetyProgressBoard; onDownload?: (uid: string) => void; downloading?: string; onReset?: (user: Person, lesson: Lesson | null) => void }) {
  if (!board.users.length) return <div className="ws-empty sf-gap">Nobody has the Safety mini app yet. Give it to people in the Users mini app.</div>;
  return <div className="sf-table-wrap"><table className="sf-table">
    <thead><tr><th scope="col">Person</th>{board.lessons.map((lesson) => <th key={lesson.id} scope="col"><small>{lesson.category}</small>{lesson.title}</th>)}</tr></thead>
    <tbody>{board.users.map((user) => {
      const passed = board.lessons.filter((lesson) => board.cells[`${user.uid}_${lesson.id}`]?.status === "passed");
      return <tr key={user.uid}>
        <th scope="row"><b>{user.firstName} {user.lastName}</b><small>{user.email}</small>
          {onDownload && <button type="button" className="sf-pdf" disabled={downloading === user.uid} onClick={() => onDownload(user.uid)}>{downloading === user.uid ? "Preparing…" : "Download PDF"}</button>}
          {onReset && passed.length > 0 && <button type="button" className="sf-reset" onClick={() => onReset(user, null)}>Reset all lessons</button>}
        </th>
        {board.lessons.map((lesson) => { const cell = board.cells[`${user.uid}_${lesson.id}`]; return <td key={lesson.id}>
          <span className={`sf-badge ${cell.status}`}>{statusText(cell)}</span>
          <small>{cell.attempts ? `${cell.attempts} attempt${cell.attempts === 1 ? "" : "s"}` : cell.viewedAt ? "Opened, no quiz yet" : "Not opened"}</small>
          {cell.completedAt && <small>Passed {formatPartyDateTime(cell.completedAt)}</small>}
          {cell.review && cell.status !== "passed" && <small>Earlier pass kept, lesson reopened</small>}
          {onReset && cell.status === "passed" && <button type="button" className="sf-reset" onClick={() => onReset(user, lesson)}>Reset</button>}
        </td>; })}
      </tr>;
    })}</tbody>
  </table></div>;
}

/** Two steps. Continue is green. Reset stays off until the field is RESET or the employee's name, then it is the red button. */
export function ResetConfirm({ ask, busy, onCancel, onContinue, onTyped, onReset }: { ask: ResetAsk; busy: boolean; onCancel: () => void; onContinue: () => void; onTyped: (value: string) => void; onReset: () => void }) {
  const ready = armed(ask);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onCancel]);
  return <div className="ws-modal" role="dialog" aria-modal="true" aria-label={ask.step === 1 ? `Reset ${ask.lesson} for ${ask.name}?` : "Confirm reset"} onClick={onCancel}>
    <div className="ws-modal-card" onClick={(event) => event.stopPropagation()}>
      {ask.step === 1 ? <>
        <h2>Reset {ask.lesson} for {ask.name}?</h2>
        <p>{ask.lessonId ? "They will need to take the lesson and quiz again." : "They will need to take each completed lesson and quiz again."}</p>
        <div className="ws-modal-buttons"><button type="button" className="ws-button ghost" onClick={onCancel}>Cancel</button><button type="button" className="ws-button" onClick={onContinue}>Continue</button></div>
      </> : <>
        <h2>Reset {ask.lesson} for {ask.name}?</h2>
        <p>Type RESET or {ask.name}. Their earlier passes stay on the record.</p>
        <label className="sf-reset-type">Type RESET or {ask.name}<input value={ask.typed} onChange={(event) => onTyped(event.target.value)} autoComplete="off" autoFocus /></label>
        <div className="ws-modal-buttons"><button type="button" className="ws-button ghost" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="ws-button danger" onClick={onReset} disabled={!ready || busy}>{busy ? "Resetting…" : "Reset"}</button></div>
      </>}
    </div>
  </div>;
}

function savePdf(filename: string, pdf: string) {
  const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

/** Super admins: everyone who has Safety, against every lesson, with a printable record per person. */
export default function SafetyProgressPage() {
  const [board, setBoard] = useState<SafetyProgressBoard | null>(null), [error, setError] = useState(""), [downloading, setDownloading] = useState(""), [ask, setAsk] = useState<ResetAsk | null>(null), [resetting, setResetting] = useState(false);
  const load = () => listSafetyProgress().then((next) => { setBoard(next); setError(""); }, (cause) => setError(messageOf(cause, "Progress could not be loaded. Try again.")));
  const download = (uid: string) => { setDownloading(uid); getSafetyReport(uid).then(({ filename, pdf }) => { savePdf(filename, pdf); setError(""); }, (cause) => setError(messageOf(cause, "The record could not be downloaded. Try again."))).finally(() => setDownloading("")); };
  const begin = (user: Person, lesson: Lesson | null) => setAsk({ uid: user.uid, name: `${user.firstName} ${user.lastName}`, lessonId: lesson?.id ?? null, lesson: lesson?.title ?? "all lessons", step: 1, typed: "" });
  const confirm = () => { if (!ask || resetting || !armed(ask)) return; setResetting(true); resetSafetyProgress(ask.uid, ask.lessonId ?? undefined).then(() => { setAsk(null); setError(""); return load(); }, (cause) => setError(messageOf(cause, "The lesson could not be reset. Try again."))).finally(() => setResetting(false)); };
  useEffect(() => { void load(); }, []);
  useResume(load);
  return <Page eyebrow="Safety training" title="Everyone's progress" subtitle="Each person's status on the current version of every lesson. Download a record, or reopen a passed lesson." back={{ to: "/safety", label: "Safety" }}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!board && !error && <div className="ws-empty sf-gap">Loading progress…</div>}
    {board && <ProgressTable board={board} onDownload={download} downloading={downloading} onReset={begin} />}
    {ask && <ResetConfirm ask={ask} busy={resetting} onCancel={() => { if (!resetting) setAsk(null); }} onContinue={() => setAsk({ ...ask, step: 2 })} onTyped={(typed) => setAsk({ ...ask, typed })} onReset={confirm} />}
  </Page>;
}
