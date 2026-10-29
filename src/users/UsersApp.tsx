/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser, listUsers, sendUserInvite, type UserRecord } from "../core/api";
import { SUPER_ADMIN, USER_TYPE_LABELS, miniAppById } from "../auth/miniApps";
import Avatar from "../auth/Avatar";
import { Confirm, Page, messageOf } from "../party/Workspace";
import { formatPartyDateTime } from "../party/time";
import { UserSheet } from "./UserSheets";
import { inviteNotice, inviteState, isInviteProblem, type Notice } from "./invite";
import { useResume } from "../core/resilience";
import "./users.css";

const appNames = (user: UserRecord) => user.type === SUPER_ADMIN ? "Every mini app" : user.miniApps.length ? `${user.miniApps.map((id) => miniAppById(id).name).join(", ")} (and Profile)` : "Profile only";

function InviteLine({ user }: { user: UserRecord }) {
  const state = inviteState(user.invite, user.lastSignInAt);
  if (!state) return null;
  const problem = state.tone === "problem";
  return <div className={`ws-invite ${state.tone}`} role={problem ? "alert" : undefined}>
    {problem ? <AlertTriangle size={15} aria-hidden /> : <Mail size={15} aria-hidden />}
    <span><b>{state.label}</b>{state.detail && <small>{state.detail}</small>}{problem && <small>Press Resend invite to try again.</small>}</span>
  </div>;
}

export function UserCard({ user, busy, onEdit, onInvite, onDelete }: { user: UserRecord; busy: boolean; onEdit: () => void; onInvite: () => void; onDelete: () => void }) {
  return <article className={`ws-user-card${isInviteProblem(user.invite) ? " invite-problem" : ""}`}>
    <Avatar src={user.thumbDataUrl} firstName={user.firstName} lastName={user.lastName} size={52} />
    <div className="ws-user-main">
      <b className="ws-user-name">{user.firstName} {user.lastName}</b>
      <span className="ws-user-email">{user.email}</span>
      <span className="ws-user-tags"><span className={`ws-user-type${user.type === SUPER_ADMIN ? " strong" : ""}`}>{USER_TYPE_LABELS[user.type]}</span>{user.you && <span className="ws-badge ok">You</span>}</span>
      <small>{appNames(user)}</small>
      <small>{user.lastSignInAt ? `Last sign-in ${formatPartyDateTime(user.lastSignInAt)}` : "Has not signed in yet"}</small>
      <InviteLine user={user} />
    </div>
    <div className="ws-user-actions">
      <button className="ws-chip" disabled={busy} onClick={onEdit}><Pencil size={15} /> Edit</button>
      {!user.you && <button className={isInviteProblem(user.invite) ? "ws-button" : "ws-chip"} disabled={busy} onClick={onInvite}><Mail size={15} /> Resend invite</button>}
      {!user.you && <button className="ws-chip danger-text" disabled={busy} onClick={onDelete}><Trash2 size={15} /> Delete</button>}
    </div>
  </article>;
}

/** The Users mini app (super admins only): who can sign in and which mini apps each person can open. */
export default function UsersApp() {
  const [users, setUsers] = useState<UserRecord[] | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState<Notice | null>(null), [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<{ user: UserRecord | null } | null>(null), [deleting, setDeleting] = useState<UserRecord | null>(null);
  const load = useCallback(async () => { try { setUsers((await listUsers()).users); setError(""); } catch (cause) { setError(messageOf(cause, "The users could not be loaded. Try again.")); } }, []);
  useEffect(() => { void load(); }, [load]);
  useResume(load);
  async function run(task: () => Promise<Notice>, fallback: string) { setBusy(true); setError(""); setNotice(null); try { setNotice(await task()); await load(); } catch (cause) { setError(messageOf(cause, fallback)); } finally { setBusy(false); setDeleting(null); } }
  const invite = (user: UserRecord) => run(async () => inviteNotice(user.email, (await sendUserInvite(user.uid)).invite, false), "The invite email could not be sent. Try again.");
  const remove = (user: UserRecord) => run(async () => { await deleteUser(user.uid); return { tone: "ok", text: `${user.firstName} ${user.lastName} (${user.email}) was deleted.` }; }, "The user could not be deleted. Try again.");
  const problems = users?.filter((user) => isInviteProblem(user.invite)) ?? [];
  return <Page title="Users" subtitle="Add people, edit their name and email, and choose the mini apps each can open. Photos and passwords are theirs alone." back={{ to: "/dashboard", label: "Dashboard" }} actions={<button className="ws-button" onClick={() => setSheet({ user: null })}><Plus size={18} /> Add user</button>}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {notice && (notice.tone === "problem" ? <div className="ws-status error" role="alert"><AlertTriangle size={16} aria-hidden /> {notice.text}</div> : <div className="ws-status ok" role="status">{notice.text}</div>)}
    {problems.length > 0 && !notice && <div className="ws-status error" role="alert">{problems.length === 1 ? "1 invite email didn't reach" : `${problems.length} invite emails didn't reach`} {problems.map((user) => user.email).join(", ")}. Press Resend invite on {problems.length === 1 ? "their card" : "each card"} to try again.</div>}
    {!users && !error && <div className="ws-empty">Loading users…</div>}
    {users && <div className="ws-user-list">{users.map((user) => <UserCard key={user.uid} user={user} busy={busy} onEdit={() => setSheet({ user })} onInvite={() => void invite(user)} onDelete={() => setDeleting(user)} />)}</div>}
    {sheet && <UserSheet user={sheet.user} onClose={() => setSheet(null)} onDone={(next) => { setSheet(null); setNotice(next); void load(); }} />}
    {deleting && <Confirm title="Delete this user?" body={<>This permanently removes <b>{deleting.firstName} {deleting.lastName}</b> ({deleting.email}), their sign-in and their photo. It can't be undone.</>} confirmLabel="Delete user" busy={busy} onConfirm={() => void remove(deleting)} onCancel={() => setDeleting(null)} />}
  </Page>;
}
