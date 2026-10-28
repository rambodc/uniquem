import { useEffect, useRef, useState, type FormEvent } from "react";
import { createUser, updateUser, type UserAccessInput, type UserRecord } from "../core/api";
import { ASSIGNABLE_MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES, USER_TYPE_LABELS, miniAppById, type MiniAppId, type UserType } from "../auth/miniApps";
import { Sheet, messageOf } from "../party/Workspace";
import "./users.css";

function AccessFields({ value, onChange }: { value: UserAccessInput; onChange: (next: UserAccessInput) => void }) {
  const setType = (type: UserType) => onChange({ type, miniApps: type === SUPER_ADMIN ? [] : value.miniApps });
  const toggle = (id: MiniAppId) => onChange({ ...value, miniApps: value.miniApps.includes(id) ? value.miniApps.filter((item) => item !== id) : [...value.miniApps, id] });
  return <>
    <div className="ws-sheet-wide"><span className="ws-label">User type</span><div className="ws-seg two" role="group" aria-label="User type">{USER_TYPES.map((type) => <button key={type} type="button" className={value.type === type ? "on" : ""} aria-pressed={value.type === type} onClick={() => setType(type)}>{USER_TYPE_LABELS[type]}</button>)}</div></div>
    {value.type === SUPER_ADMIN
      ? <p className="ws-sheet-sub ws-sheet-wide">Super admins can open every mini app, including ones added later, and manage users.</p>
      : <div className="ws-sheet-wide"><span className="ws-label">Mini apps this user can open</span>{ASSIGNABLE_MINI_APP_IDS.map((id) => { const app = miniAppById(id); return <label key={id} className="ws-check-row ws-app-pick"><input type="checkbox" checked={value.miniApps.includes(id)} onChange={() => toggle(id)} /><span><b>{app.name}</b><small>{app.description}</small></span></label>; })}</div>}
  </>;
}

/** Create a user (email + type + mini apps) or edit one's type and mini apps. */
export function UserSheet({ user, onDone, onClose }: { user: UserRecord | null; onDone: (notice: string) => void; onClose: () => void }) {
  const [email, setEmail] = useState(""), [access, setAccess] = useState<UserAccessInput>(user ? { type: user.type, miniApps: user.miniApps } : { type: STAFF, miniApps: [] }), [busy, setBusy] = useState(false), [error, setError] = useState(""), first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      if (user) { await updateUser(user.uid, access); onDone(`Saved changes for ${user.email}.`); }
      else { const created = await createUser({ email: email.trim(), ...access }); onDone(created.emailSent ? `User created. An invite email was sent to ${created.email}.` : `User created, but the invite email to ${created.email} could not be sent. Use Resend invite on that user to try again.`); }
    } catch (cause) { setError(messageOf(cause, user ? "The changes could not be saved. Try again." : "The user could not be created. Try again.")); setBusy(false); }
  }
  return <Sheet title={user ? "Edit user" : "Add user"} onClose={busy ? () => undefined : onClose}>
    <form className="ws-sheet-form" onSubmit={submit}>
      {error && <div className="ws-status error" role="alert">{error}</div>}
      <label className="ws-sheet-wide">Email address{user ? <input value={user.email} readOnly /> : <input ref={first} type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={200} required autoComplete="off" />}</label>
      <AccessFields value={access} onChange={setAccess} />
      <div className="ws-sheet-buttons"><button type="button" className="ws-button ghost" onClick={onClose} disabled={busy}>Cancel</button><button className="ws-button big" disabled={busy || (!user && !email.trim())}>{busy ? "Saving…" : user ? "Save changes" : "Create user"}</button></div>
    </form>
  </Sheet>;
}
