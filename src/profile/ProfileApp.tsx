import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Camera, Lock, Trash2 } from "lucide-react";
import { getMyPhoto, removeMyPhoto, setMyPhoto } from "../core/api";
import { auth } from "../core/firebase";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../auth/Avatar";
import { Page, messageOf } from "../party/Workspace";
import { prepareAvatar } from "./avatar";
import { PASSWORD_MIN, checkPasswordChange, passwordErrorMessage } from "./password";
import "./profile.css";

type Notice = { kind: "ok" | "error"; text: string } | null;
const Note = ({ notice }: { notice: Notice }) => notice ? <div className={`ws-status ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</div> : null;

/** Your photo: upload, replace or remove. Only you can change it; a super admin can't. */
function PhotoCard() {
  const { profile, refreshAccess } = useAuth(), [full, setFull] = useState<string | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState<Notice>(null), input = useRef<HTMLInputElement>(null);
  const hasPhoto = Boolean(profile?.thumbDataUrl);
  useEffect(() => { let active = true; if (hasPhoto) getMyPhoto().then(({ dataUrl }) => { if (active) setFull(dataUrl); }, () => undefined); return () => { active = false; }; }, [hasPhoto]);
  if (!profile) return null;
  async function run(task: () => Promise<string>, fallback: string) { setBusy(true); setNotice(null); try { setNotice({ kind: "ok", text: await task() }); await refreshAccess(); } catch (cause) { setNotice({ kind: "error", text: messageOf(cause, fallback) }); } finally { setBusy(false); } }
  const choose = (file: File | undefined) => { if (input.current) input.current.value = ""; if (file) void run(async () => { const prepared = await prepareAvatar(file); await setMyPhoto(prepared); setFull(`data:image/jpeg;base64,${prepared.photo}`); return "Your photo was updated."; }, "The photo could not be saved. Try again."); };
  const remove = () => void run(async () => { await removeMyPhoto(); setFull(null); return "Your photo was removed."; }, "The photo could not be removed. Try again.");
  return <section className="ws-panel pf-card" aria-labelledby="pf-photo">
    <h2 id="pf-photo">Profile photo</h2>
    <div className="pf-photo-row">
      <Avatar src={full ?? profile.thumbDataUrl} firstName={profile.firstName} lastName={profile.lastName} size={112} className="pf-avatar" />
      <div className="pf-photo-actions">
        <p>JPEG, PNG or WebP, up to 5 MB. It is cropped to a square.</p>
        <div className="ws-row">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => choose(event.target.files?.[0])} />
          <button type="button" className="ws-button" disabled={busy} onClick={() => input.current?.click()}><Camera size={17} /> {busy ? "Working…" : hasPhoto ? "Replace photo" : "Upload photo"}</button>
          {hasPhoto && <button type="button" className="ws-button ghost" disabled={busy} onClick={remove}><Trash2 size={17} /> Remove</button>}
        </div>
      </div>
    </div>
    <Note notice={notice} />
  </section>;
}

/** Your details, read-only: a super admin sets them. */
function DetailsCard() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <section className="ws-panel pf-card" aria-labelledby="pf-details">
    <h2 id="pf-details">Your details</h2>
    <div className="pf-fields">
      <label>First name<input value={profile.firstName} readOnly /></label>
      <label>Last name<input value={profile.lastName} readOnly /></label>
      <label className="pf-wide">Email address<input value={profile.email} readOnly /></label>
    </div>
    <p className="pf-lock"><Lock size={14} /> Your name and email are managed by a super admin. Ask one to change them.</p>
  </section>;
}

/** Change your own password: your current one is checked again first. */
function PasswordCard() {
  const { user, profile } = useAuth(), [current, setCurrent] = useState(""), [next, setNext] = useState(""), [confirm, setConfirm] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState<Notice>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !user?.email) return;
    const problem = checkPasswordChange({ current, next, confirm }); if (problem) { setNotice({ kind: "error", text: problem }); return; }
    setBusy(true); setNotice(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setCurrent(""); setNext(""); setConfirm("");
      setNotice({ kind: "ok", text: "Your password was changed. Use it the next time you sign in." });
    } catch (cause) { setNotice({ kind: "error", text: passwordErrorMessage(cause) }); } finally { setBusy(false); }
  }
  return <section className="ws-panel pf-card" aria-labelledby="pf-password">
    <h2 id="pf-password">Change password</h2>
    <form className="pf-fields" onSubmit={submit}>
      <input className="pf-hidden" type="text" name="username" value={profile?.email ?? ""} autoComplete="username" readOnly tabIndex={-1} aria-hidden="true" />
      <label className="pf-wide">Current password<input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required /></label>
      <label>New password<input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN} required /></label>
      <label>Confirm new password<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN} required /></label>
      <p className="pf-lock pf-wide">At least {PASSWORD_MIN} characters. Only you can change your password; nobody else can see or reset it for you.</p>
      <div className="pf-wide"><Note notice={notice} /></div>
      <div className="pf-wide"><button className="ws-button" disabled={busy}>{busy ? "Changing…" : "Change password"}</button></div>
    </form>
  </section>;
}

/** The Profile mini app: every signed-in person has it. */
export default function ProfileApp() {
  return <Page narrow title="Profile" subtitle="Your photo, your details and your password." back={{ to: "/dashboard", label: "Dashboard" }}>
    <div className="pf-stack"><PhotoCard /><DetailsCard /><PasswordCard /></div>
  </Page>;
}
