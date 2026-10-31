import { useEffect, useState } from "react";

/** "Opening your Uniquem workspace…". After 8 s it offers a Retry that reloads the app, so the screen never spins with no way out. */
export default function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setSlow(true), 8_000); return () => clearTimeout(timer); }, []);
  return <main className="center-state"><div className="loading-state">
    <p>Opening your Uniquem workspace…</p>
    {slow && <><p>This is taking longer than usual. Check your connection and try again.</p><button type="button" className="button-primary" onClick={() => window.location.reload()}>Retry</button></>}
  </div></main>;
}
