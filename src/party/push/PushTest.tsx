import { useCallback, useEffect, useRef, useState } from "react";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { firebaseApp, functions } from "../../core/firebase";
import { webPushVapidKey } from "../../core/firebaseConfig";
import "../party.css";
import "./push.css";

// Standalone web push test for the party area. No login: it subscribes this browser to Firebase Cloud Messaging and
// asks the sendPartyPushTest function to push one fixed test notification back to this browser only.
const SW_URL = "/party-push-sw.js", SW_SCOPE = "/party/push-test";
type Entry = { at: string; text: string; tone?: "ok" | "error" | "push" };
type Support = "checking" | "yes" | "no";
const time = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
const permissionNow = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const errorText = (error: unknown) => (error as { message?: string })?.message || String(error);

export default function PushTest() {
  const [support, setSupport] = useState<Support>("checking");
  const [permission, setPermission] = useState<string>(permissionNow);
  const [worker, setWorker] = useState("Not registered");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<{ title: string; body: string; at: string } | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const messaging = useRef<Messaging | null>(null);
  const add = useCallback((text: string, tone?: Entry["tone"]) => setLog((items) => [{ at: time(), text, tone }, ...items].slice(0, 30)), []);

  const subscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    setWorker(`Registered (scope ${SW_SCOPE})`);
    messaging.current ??= getMessaging(firebaseApp);
    const next = await getToken(messaging.current, { serviceWorkerRegistration: registration, ...(webPushVapidKey ? { vapidKey: webPushVapidKey } : {}) });
    if (!next) throw new Error("Firebase returned no token.");
    setToken(next);
    add("This browser is subscribed to push.", "ok");
  }, [add]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "manifest"; link.href = "/party-push-manifest.webmanifest";
    document.head.appendChild(link);
    let unsubscribe = () => {};
    let alive = true;
    void isSupported().then(async (ok) => {
      if (!alive) return;
      const usable = ok && "serviceWorker" in navigator && typeof Notification !== "undefined";
      setSupport(usable ? "yes" : "no");
      if (!usable) return;
      messaging.current ??= getMessaging(firebaseApp);
      unsubscribe = onMessage(messaging.current, (payload) => {
        const title = payload.notification?.title || "Push received", body = payload.notification?.body || "";
        setLatest({ title, body, at: time() });
        add(`Push received on this page: ${title}${body ? `. ${body}` : ""}`, "push");
      });
      if (Notification.permission === "granted") { try { await subscribe(); } catch (error) { add(`Could not subscribe: ${errorText(error)}`, "error"); } }
    });
    return () => { alive = false; unsubscribe(); link.remove(); };
  }, [add, subscribe]);

  async function enable() {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") { add(result === "denied" ? "Notifications are blocked. Allow them in the browser's site settings, then try again." : "Permission was not given.", "error"); return; }
      await subscribe();
    } catch (error) { add(`Could not turn on notifications: ${errorText(error)}`, "error"); }
    finally { setBusy(false); }
  }

  async function send(delaySeconds = 0) {
    setBusy(true);
    try {
      if (delaySeconds) { add(`Sending in ${delaySeconds} seconds. Switch to another tab or lock your phone to see it as a system notification.`); await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000)); }
      await httpsCallable<{ token: string }, { sent: boolean; messageId: string }>(functions, "sendPartyPushTest", { timeout: 30_000 })({ token });
      add("Test push sent by Firebase Cloud Messaging.", "ok");
    } catch (error) { add(`Send failed: ${errorText(error)}`, "error"); }
    finally { setBusy(false); }
  }

  const ready = support === "yes" && permission === "granted" && !!token;
  return <main className="ws-page ws-narrow push-test">
    <header className="ws-header"><div>
      <span className="ws-eyebrow">UEX 2 · Party</span>
      <h1>Push notification test</h1>
      <p>Turn on notifications for this browser, then send yourself a test push. Nothing to sign in to.</p>
    </div></header>

    <section className="push-card">
      <dl className="push-status">
        <div><dt>Browser support</dt><dd>{support === "checking" ? "Checking…" : support === "yes" ? "Supported" : "Not supported here"}</dd></div>
        <div><dt>Permission</dt><dd>{permission === "default" ? "Not asked yet" : permission}</dd></div>
        <div><dt>Service worker</dt><dd>{worker}</dd></div>
        <div><dt>Push token</dt><dd>{token ? `…${token.slice(-12)}` : "None yet"}</dd></div>
      </dl>
      <div className="ws-actions">
        <button className="ws-button" type="button" disabled={busy || support !== "yes" || permission === "denied"} onClick={() => void enable()}>{token ? "Notifications on" : "Enable notifications"}</button>
        <button className="ws-button" type="button" disabled={busy || !ready} onClick={() => void send()}>Send test push</button>
        <button className="ws-button ghost" type="button" disabled={busy || !ready} onClick={() => void send(10)}>Send in 10 s</button>
      </div>
      {isIos() && !isStandalone() && <p className="push-note">On iPhone or iPad (iOS 16.4 or later), tap Share, then Add to Home Screen, and open this page from the new icon to get notifications.</p>}
    </section>

    {latest && <section className="push-latest" role="status" aria-live="polite"><span>Received {latest.at}</span><strong>{latest.title}</strong>{latest.body && <p>{latest.body}</p>}</section>}

    <section>
    <h2 className="ws-h2">Activity <em>newest first</em></h2>
    <ol className="push-log">{log.length ? log.map((entry, index) => <li key={`${entry.at}-${index}`} className={entry.tone}><time>{entry.at}</time>{entry.text}</li>) : <li className="empty">Nothing yet.</li>}</ol>
    </section>
    <p className="push-note">With this page open, the push shows above. With the tab in the background or closed, it arrives as a system notification; tapping it opens this page.</p>
  </main>;
}
