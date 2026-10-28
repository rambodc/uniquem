/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { createSignInLink, deleteUser, listUsers, setUserActive, type UserRecord } from "../core/api";
import { SUPER_ADMIN, USER_TYPE_LABELS, miniAppById } from "../auth/miniApps";
import { Confirm, Page, messageOf } from "../party/Workspace";
import { formatPartyDateTime } from "../party/time";
import { LinkSheet, UserSheet, type SharedLink } from "./UserSheets";
import "./users.css";

type Pending = { kind: "deactivate" | "delete"; user: UserRecord };
const appNames = (user: UserRecord) => user.type === SUPER_ADMIN ? "Every mini app" : user.miniApps.length ? user.miniApps.map((id) => miniAppById(id).name).join(", ") : "No mini apps yet";

function UserCard({ user, busy, onEdit, onLink, onToggle, onDelete }: { user: UserRecord; busy: boolean; onEdit: () => void; onLink: () => void; onToggle: () => void; onDelete: () => void }) {
  return <article className={`ws-user-card${user.active ? "" : " off"}`}>
    <div className="ws-user-main">
      <b className="ws-user-email">{user.email}</b>
      <span className="ws-user-tags"><span className={`ws-role${user.type === SUPER_ADMIN ? " strong" : ""}`}>{USER_TYPE_LABELS[user.type]}</span>{user.you && <span className="ws-badge ok">You</span>}{!user.active && <span className="ws-badge archived">Deactivated</span>}</span>
      <small>{appNames(user)}</small>
      <small>{user.lastSignInAt ? `Last sign-in ${formatPartyDateTime(user.lastSignInAt)}` : "Has not signed in yet"}</small>
    </div>
    {!user.you && <div className="ws-user-actions">
      {user.active && <button className="ws-chip" disabled={busy} onClick={onEdit}><Pencil size={15} /> Edit</button>}
      {user.active && <button className="ws-chip" disabled={busy} onClick={onLink}><KeyRound size={15} /> Sign-in link</button>}
      <button className="ws-chip" disabled={busy} onClick={onToggle}><Power size={15} /> {user.active ? "Deactivate" : "Reactivate"}</button>
      {!user.active && <button className="ws-chip danger-text" disabled={busy} onClick={onDelete}><Trash2 size={15} /> Delete</button>}
    </div>}
  </article>;
}

/** The Users mini app (super admins only): who can sign in and which mini apps each person can open. */
export default function UsersApp() {
  const [users, setUsers] = useState<UserRecord[] | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<{ user: UserRecord | null } | null>(null), [shared, setShared] = useState<SharedLink | null>(null), [pending, setPending] = useState<Pending | null>(null);
  const load = useCallback(async () => { try { setUsers((await listUsers()).users); setError(""); } catch (cause) { setError(messageOf(cause, "The users could not be loaded. Try again.")); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function run(task: () => Promise<void>, fallback: string) { setBusy(true); setError(""); try { await task(); await load(); } catch (cause) { setError(messageOf(cause, fallback)); } finally { setBusy(false); setPending(null); } }
  const link = (user: UserRecord) => run(async () => setShared({ email: user.email, link: (await createSignInLink(user.uid)).link, isNew: false }), "The sign-in link could not be created. Try again.");
  const confirmPending = () => pending && run(async () => { if (pending.kind === "delete") await deleteUser(pending.user.uid); else await setUserActive(pending.user.uid, false); }, pending.kind === "delete" ? "The user could not be deleted. Try again." : "The user could not be deactivated. Try again.");
  const active = users?.filter((user) => user.active) ?? [], inactive = users?.filter((user) => !user.active) ?? [];
  const card = (user: UserRecord) => <UserCard key={user.uid} user={user} busy={busy} onEdit={() => setSheet({ user })} onLink={() => void link(user)} onToggle={() => user.active ? setPending({ kind: "deactivate", user }) : void run(() => setUserActive(user.uid, true).then(() => undefined), "The user could not be reactivated. Try again.")} onDelete={() => setPending({ kind: "delete", user })} />;
  return <Page title="Users" subtitle="Create users, choose their type and pick the mini apps each person can open." back={{ to: "/dashboard", label: "Dashboard" }} actions={<button className="ws-button" onClick={() => setSheet({ user: null })}><Plus size={18} /> Add user</button>}>
    {error && <div className="ws-status error" role="alert">{error}</div>}
    {!users && !error && <div className="ws-empty">Loading users…</div>}
    {users && <section><h2 className="ws-h2">Active</h2><div className="ws-user-list">{active.map(card)}</div></section>}
    {inactive.length > 0 && <section><h2 className="ws-h2">Deactivated</h2><div className="ws-user-list">{inactive.map(card)}</div></section>}
    {sheet && <UserSheet user={sheet.user} onClose={() => setSheet(null)} onDone={(result) => { setSheet(null); if (result.shared) setShared(result.shared); void load(); }} />}
    {shared && <LinkSheet shared={shared} onClose={() => setShared(null)} />}
    {pending && <Confirm title={pending.kind === "delete" ? "Delete this user?" : "Deactivate this user?"} body={pending.kind === "delete" ? <>This permanently removes <b>{pending.user.email}</b> and their sign-in. It can't be undone.</> : <><b>{pending.user.email}</b> will be signed out and can't open anything until you reactivate them.</>} confirmLabel={pending.kind === "delete" ? "Delete user" : "Deactivate"} busy={busy} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />}
  </Page>;
}
