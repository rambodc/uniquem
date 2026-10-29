import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createUser, updateUser, type UserAccessInput, type UserRecord } from "../core/api";
import { ASSIGNABLE_MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES, USER_TYPE_LABELS, miniAppById, type MiniAppId, type UserType } from "../auth/miniApps";
import { Sheet, messageOf } from "../party/Workspace";
import { inviteNotice, type Notice } from "./invite";
import "./users.css";

function AccessFields({ value, onChange, locked }: { value: UserAccessInput; onChange: (next: UserAccessInput) => void; locked: boolean }) {
  const setType = (type: UserType) => onChange({ type, miniApps: type === SUPER_ADMIN ? [] : value.miniApps });
  const toggle = (id: MiniAppId) => onChange({ ...value, miniApps: value.miniApps.includes(id) ? value.miniApps.filter((item) => item !== id) : [...value.miniApps, id] });
  return <>
    <div className="ws-sheet-wide"><span className="ws-label">User type</span><div className="ws-seg two" role="group" aria-label="User type">{USER_TYPES.map((type) => <button key={type} type="button" disabled={locked} className={value.type === type ? "on" : ""} aria-pressed={value.type === type} onClick={() => setType(type)}>{USER_TYPE_LABELS[type]}</button>)}</div></div>
    {value.type === SUPER_ADMIN
      ? <p className="ws-sheet-sub ws-sheet-wide">Super admins can open every mini app, including ones added later, and manage users.</p>
      : <div className="ws-sheet-wide"><span className="ws-label">Mini apps this user can open</span><p className="ws-sheet-sub">Everyone can always open their own Profile.</p>{ASSIGNABLE_MINI_APP_IDS.map((id) => { const app = miniAppById(id); return <label key={id} className="ws-check-row ws-app-pick"><input type="checkbox" checked={value.miniApps.includes(id)} disabled={locked} onChange={() => toggle(id)} /><span><b>{app.name}</b><small>{app.description}</small></span></label>; })}</div>}
  </>;
}

/** Create a user (names, email, type, mini apps) or edit one's names, email, type and mini apps. There is no password or photo field: only the person sets those. */
export function UserSheet({ user, onDone, onClose }: { user: UserRecord | null; onDone: (notice: Notice) => void; onClose: () => void }) {
  const [form, setForm] = useState({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "" }), [access, setAccess] = useState<UserAccessInput>(user ? { type: user.type, miniApps: user.miniApps } : { type: STAFF, miniApps: [] }), [busy, setBusy] = useState(false), [error, setError] = useState(""), first = useRef<HTMLInputElement>(null);
  const yourself = user?.you === true, set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
  useEffect(() => { first.current?.focus(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const input = { ...form, email: form.email.trim(), ...access };
    try {
      if (user) { await updateUser(user.uid, input); onDone({ tone: "ok", text: `Saved changes for ${form.firstName.trim()} ${form.lastName.trim()}.${input.email.toLowerCase() !== user.email ? " They'll need to sign in again with the new email." : ""}` }); }
      else { const created = await createUser(input); onDone(inviteNotice(created.email, created.invite, true)); }
    } catch (cause) { setError(messageOf(cause, user ? "The changes could not be saved. Try again." : "The user could not be created. Try again.")); setBusy(false); }
  }
  return <Sheet title={user ? "Edit user" : "Add user"} onClose={busy ? () => undefined : onClose}>
    <form className="ws-sheet-form" onSubmit={submit}>
      {error && <div className="ws-status error" role="alert">{error}</div>}
      <label>First name<input ref={first} value={form.firstName} onChange={set("firstName")} maxLength={60} required autoComplete="off" /></label>
      <label>Last name<input value={form.lastName} onChange={set("lastName")} maxLength={60} required autoComplete="off" /></label>
      <label className="ws-sheet-wide">Email address<input type="email" value={form.email} onChange={set("email")} maxLength={200} required autoComplete="off" readOnly={yourself} /></label>
      {yourself && <p className="ws-sheet-sub ws-sheet-wide">You can fix your own name here. Another super admin has to change your email or access.</p>}
      {user && !yourself && <p className="ws-sheet-sub ws-sheet-wide">If you change the email, they sign in with the new one from now on.</p>}
      <AccessFields value={access} onChange={setAccess} locked={yourself} />
      <div className="ws-sheet-buttons"><button type="button" className="ws-button ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ws-button big" disabled={busy || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim()}>{busy ? (user ? "Saving…" : "Creating and sending invite…") : user ? "Save changes" : "Create user"}</button></div>
    </form>
  </Sheet>;
}
