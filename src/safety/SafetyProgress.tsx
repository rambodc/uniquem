import { useEffect, useState } from "react";
import { getSafetyReport, listSafetyProgress, type SafetyProgressBoard } from "../core/api";
import { Page, messageOf } from "../party/Workspace";
import { formatPartyDateTime } from "../party/time";
import { statusText } from "./safety";
import { useResume } from "../core/resilience";
import "./safety.css";

export function ProgressTable({ board, onDownload, downloading }: { board: SafetyProgressBoard; onDownload?: (uid: string) => void; downloading?: string }) {
  if (!board.users.length) return <div className="ws-empty sf-gap">Nobody has the Safety mini app yet. Give it to people in the Users mini app.</div>;
  return <div className="sf-table-wrap"><table className="sf-table">
    <thead><tr><th scope="col">Person</th>{board.lessons.map((lesson) => <th key={lesson.id} scope="col"><small>{lesson.category}</small>{lesson.title}</th>)}</tr></thead>
    <tbody>{board.users.map((user) => <tr key={user.uid}>
      <th scope="row"><b>{user.firstName} {user.lastName}</b><small>{user.email}</small>{onDownload && <button type="button" className="sf-pdf" disabled={downloading === user.uid} onClick={() => onDownload(user.uid)}>{downloading === user.uid ? "Preparing…" : "Download PDF"}</button>}</th>
      {board.lessons.map((lesson) => { const cell = board.cells[`${user.uid}_${lesson.id}`]; return <td key={lesson.id}>
        <span className={`sf-badge ${cell.status}`}>{statusText(cell)}</span>
        <small>{cell.attempts ? `${cell.attempts} attempt${cell.attempts === 1 ? "" : "s"}` : cell.viewedAt ? "Opened, no quiz yet" : "Not opened"}</small>
        {cell.completedAt && <small>Passed {formatPartyDateTime(cell.completedAt)}</small>}
      </td>; })}
    </tr>)}</tbody>
  </table></div>;
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
  const [board, setBoard] = useState<SafetyProgressBoard | null>(null), [error, setError] = useState(""), [downloading, setDownloading] = useState("");
  const load = () => listSafetyProgress().then((next) => { setBoard(next); setError(""); }, (cause) => setError(messageOf(cause, "Progress could not be loaded. Try again.")));
  const download = (uid: string) => { setDownloading(uid); getSafetyReport(uid).then(({ filename, pdf }) => { savePdf(filename, pdf); setError(""); }, (cause) => setError(messageOf(cause, "The record could not be downloaded. Try again."))).finally(() => setDownloading("")); };
  useEffect(() => { void load(); }, []);
  useResume(load);
  return <Page eyebrow="Safety training" title="Everyone's progress" subtitle="Each person's status on the current version of every lesson. Download a printable record for one person." back={{ to: "/safety", label: "Safety" }}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!board && !error && <div className="ws-empty sf-gap">Loading progress…</div>}
    {board && <ProgressTable board={board} onDownload={download} downloading={downloading} />}
  </Page>;
}
