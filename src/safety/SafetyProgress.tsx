import { useEffect, useState } from "react";
import { listSafetyProgress, type SafetyProgressBoard } from "../core/api";
import { Page, messageOf } from "../party/Workspace";
import { formatPartyDateTime } from "../party/time";
import { statusText } from "./safety";
import "./safety.css";

export function ProgressTable({ board }: { board: SafetyProgressBoard }) {
  if (!board.users.length) return <div className="ws-empty sf-gap">Nobody has the Safety mini app yet. Give it to people in the Users mini app.</div>;
  return <div className="sf-table-wrap"><table className="sf-table">
    <thead><tr><th scope="col">Person</th>{board.lessons.map((lesson) => <th key={lesson.id} scope="col"><small>{lesson.category}</small>{lesson.title}</th>)}</tr></thead>
    <tbody>{board.users.map((user) => <tr key={user.uid}>
      <th scope="row"><b>{user.firstName} {user.lastName}</b><small>{user.email}</small></th>
      {board.lessons.map((lesson) => { const cell = board.cells[`${user.uid}_${lesson.id}`]; return <td key={lesson.id}>
        <span className={`sf-badge ${cell.status}`}>{statusText(cell)}</span>
        <small>{cell.attempts ? `${cell.attempts} attempt${cell.attempts === 1 ? "" : "s"}` : cell.viewedAt ? "Opened, no quiz yet" : "Not opened"}</small>
        {cell.completedAt && <small>Passed {formatPartyDateTime(cell.completedAt)}</small>}
      </td>; })}
    </tr>)}</tbody>
  </table></div>;
}

/** Super admins: everyone who has Safety, against every lesson. */
export default function SafetyProgressPage() {
  const [board, setBoard] = useState<SafetyProgressBoard | null>(null), [error, setError] = useState("");
  useEffect(() => { listSafetyProgress().then(setBoard, (cause) => setError(messageOf(cause, "Progress could not be loaded. Try again."))); }, []);
  return <Page eyebrow="Safety training" title="Everyone's progress" subtitle="Each person's status on the current version of every lesson." back={{ to: "/safety", label: "Safety" }}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!board && !error && <div className="ws-empty sf-gap">Loading progress…</div>}
    {board && <ProgressTable board={board} />}
  </Page>;
}
