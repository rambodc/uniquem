import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../core/firebase";
import { getAccess } from "../core/api";
import { safeNext } from "./next";
import { NOT_AUTHORIZED, RESET_CONTINUE_URL, RESET_SENT, accessErrorMessage, resetOutcome, signInErrorMessage } from "./signInMessages";
import { useAuth } from "./AuthContext";

export default function SignIn() {
  const { user, type } = useAuth(), [params] = useSearchParams(), next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"signin" | "reset">("signin"), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState(false);
  if (user && user.emailVerified && type) return <Navigate to={next} replace />;
  const switchTo = (to: "signin" | "reset") => { setMode(to); setError(""); setSent(false); };
  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      if (!result.user.emailVerified) { await auth.signOut(); throw new Error(NOT_AUTHORIZED); }
      const access = await getAccess().catch(async (cause: unknown) => { await auth.signOut(); throw new Error(accessErrorMessage(cause)); });
      if (!access.type) { await auth.signOut(); throw new Error(NOT_AUTHORIZED); }
    } catch (cause) { setError(signInErrorMessage(cause)); } finally { setBusy(false); }
  }
  async function reset(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const outcome = resetOutcome(await sendPasswordResetEmail(auth, email.trim().toLowerCase(), { url: RESET_CONTINUE_URL }).then(() => undefined, (cause: unknown) => cause ?? new Error("reset failed")));
    if (outcome.sent) setSent(true); else setError(outcome.message);
    setBusy(false);
  }
  return <main className="auth-page"><Link className="auth-back" to="/">← Back to Uniquem</Link>
    {mode === "signin"
      ? <form className="auth-card" onSubmit={signIn}>
        <img className="auth-mark" src="/brand/uniquem-mark-180.png" alt="Uniquem" /><span className="eyebrow">Private workspace</span><h1>Welcome back.</h1><p>Sign in to open your Uniquem workspace.</p>
        {error && <div className="status error" role="alert">{error}</div>}
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        <button className="button-primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="auth-link" onClick={() => switchTo("reset")}>Forgot password?</button>
        <small>Access is limited to the private Uniquem workspace.</small>
      </form>
      : <form className="auth-card" onSubmit={reset}>
        <img className="auth-mark" src="/brand/uniquem-mark-180.png" alt="Uniquem" /><span className="eyebrow">Private workspace</span><h1>Reset your password.</h1><p>Enter your email address and we'll send you a link to choose a new password.</p>
        {error && <div className="status error" role="alert">{error}</div>}
        {sent && <div className="status success" role="status">{RESET_SENT}</div>}
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <button className="button-primary full" disabled={busy}>{busy ? "Sending…" : sent ? "Send again" : "Send reset link"}</button>
        <button type="button" className="auth-link" onClick={() => switchTo("signin")}>← Back to sign in</button>
      </form>}
  </main>;
}
