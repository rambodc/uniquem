import { useCallback, useEffect, useRef, useState } from "react";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { firebaseApp, functions } from "../../core/firebase";
import { webPushVapidKey } from "../../core/firebaseConfig";
import { missingApis, pushHelp, readDevice } from "./pushHelp";
import "../party.css";
import "./push.css";

// Standalone web push test for the party area. No login: it subscribes this browser to Firebase Cloud Messaging and
// asks the sendPartyPushTest function to push one fixed test notification back to this browser only.
const SW_URL = "/party-push-sw.js", SW_SCOPE = "/party/push-test";
type Entry = { at: string; text: string; tone?: "ok" | "error" | "push" };
const time = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
const permissionNow = () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);
const errorText = (error: unknown) => { const { code, message } = (error ?? {}) as { code?: string; message?: string }; return [message || String(error), code && !String(message).includes(code) ? `(${code})` : ""].join(" ").trim(); };
const standaloneNow = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const apisNow = () => ({ secure: window.isSecureContext, serviceWorker: "serviceWorker" in navigator, pushManager: "PushManager" in window, notification: typeof Notification !== "undefined", indexedDb: "indexedDB" in window });

export default function PushTest() {
  const [device] = useState(() => readDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints || 0, standaloneNow()));
  const [supported, setSupported] = useState<boolean | null>(null);
  const [apis] = useState(apisNow);
  const missing = missingApis(apis);
  const [permission, setPermission] = useState<string>(permissionNow);
  const [worker, setWorker] = useState("Not registered");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [systemBanner, setSystemBanner] = useState(true);
  const [latest, setLatest] = useState<{ title: string; body: string; at: string } | null>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const messaging = useRef<Messaging | null>(null);
  const banner = useRef(systemBanner);
  useEffect(() => { banner.current = systemBanner; }, [systemBanner]);
  const add = useCallback((text: string, tone?: Entry["tone"]) => setLog((items) => [{ at: time(), text, tone }, ...items].slice(0, 30)), []);

  const subscribe = useCallback(async () => {
    setError("");
    let registration: ServiceWorkerRegistration;
    try { registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }); }
    catch (cause) { setWorker("Failed"); throw new Error(`Service worker could not start: ${errorText(cause)}`); }
    setWorker(`Registered (scope ${SW_SCOPE})`);
    messaging.current ??= getMessaging(firebaseApp);
    let next: string;
    try { next = await getToken(messaging.current, { serviceWorkerRegistration: registration, ...(webPushVapidKey ? { vapidKey: webPushVapidKey } : {}) }); }
    catch (cause) { throw new Error(`Could not get a push token: ${errorText(cause)}`); }
    if (!next) throw new Error("Could not get a push token: Firebase returned none.");
    setToken(next);
    add("This browser is subscribed to push.", "ok");
  }, [add]);

  useEffect(() => {
    let unsubscribe = () => {};
    let alive = true;
    void isSupported().catch(() => false).then(async (ok) => {
      if (!alive) return;
      const usable = ok && apis.serviceWorker && apis.notification;
      setSupported(usable);
      if (!usable) { add(`Push isn't available in this browser${missingApis(apis).length ? ` (missing: ${missingApis(apis).join(", ")})` : ""}.`, "error"); return; }
      try {
        messaging.current ??= getMessaging(firebaseApp);
        unsubscribe = onMessage(messaging.current, (payload) => {
          const title = payload.notification?.title || "Push received", body = payload.notification?.body || "";
          setLatest({ title, body, at: time() });
          add(`Push received on this page: ${title}${body ? `. ${body}` : ""}`, "push");
          if (banner.current) void navigator.serviceWorker.getRegistration(SW_SCOPE).then((registration) => registration?.showNotification(title, { body, icon: "/brand/uniquem-mark-180.png", tag: "uex-push-test" })).catch((cause) => add(`System banner could not be shown: ${errorText(cause)}`, "error"));
        });
      } catch (cause) { setError(errorText(cause)); add(errorText(cause), "error"); return; }
      if (Notification.permission === "granted") { try { await subscribe(); } catch (cause) { setError(errorText(cause)); add(errorText(cause), "error"); } }
    });
    return () => { alive = false; unsubscribe(); };
  }, [add, subscribe, apis]);

  async function enable() {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") { add(result === "denied" ? "Notifications were blocked." : "Permission was not given.", "error"); return; }
      await subscribe();
    } catch (cause) { setError(errorText(cause)); add(errorText(cause), "error"); }
    finally { setBusy(false); }
  }

  async function send(delaySeconds = 0) {
    setBusy(true);
    try {
      if (delaySeconds) { add(`Sending in ${delaySeconds} seconds. Switch to another tab or app, or lock your phone, to see the system banner.`); await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000)); }
      await httpsCallable<{ token: string }, { sent: boolean; messageId: string }>(functions, "sendPartyPushTest", { timeout: 30_000 })({ token });
      add("Test push sent by Firebase Cloud Messaging.", "ok");
    } catch (cause) { add(`Send failed: ${errorText(cause)}`, "error"); }
    finally { setBusy(false); }
  }

  const help = pushHelp(device, supported, missing, permission, !!token, error);
  const ready = supported === true && permission === "granted" && !!token;
  const canEnable = supported === true && permission !== "denied" && !token;
  return <main className="ws-page ws-narrow push-test">
    <header className="ws-header"><div>
      <span className="ws-eyebrow">UEX 2 · Party</span>
      <h1>Push notification test</h1>
      <p>Turn on notifications for this device, then send yourself a test push. Nothing to sign in to.</p>
    </div></header>

    <section className="push-card">
      {help && <div className={`push-help ${help.tone}`} role={help.tone === "error" ? "alert" : "status"}>
        <strong>{help.title}</strong>
        {help.steps.length > 0 && <ol>{help.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
      </div>}
      <dl className="push-status">
        <div><dt>Browser support</dt><dd>{supported === null ? "Checking…" : supported ? "Supported" : "Not available here"}</dd></div>
        <div><dt>Permission</dt><dd>{permission === "default" ? "Not asked yet" : permission === "unsupported" ? "Not available" : permission}</dd></div>
        <div><dt>Service worker</dt><dd>{worker}</dd></div>
        <div><dt>Push token</dt><dd>{token ? `…${token.slice(-12)}` : "None yet"}</dd></div>
      </dl>
      <div className="ws-actions">
        <button className="ws-button" type="button" disabled={busy || !canEnable} onClick={() => void enable()}>{token ? "Notifications on" : "Enable notifications"}</button>
        <button className="ws-button" type="button" disabled={busy || !ready} onClick={() => void send()}>Send test push</button>
        <button className="ws-button ghost" type="button" disabled={busy || !ready} onClick={() => void send(10)}>Send in 10 s</button>
      </div>
      {supported && <label className="push-toggle"><input type="checkbox" checked={systemBanner} onChange={(event) => setSystemBanner(event.target.checked)} /> Also show a system banner while this page is open</label>}
    </section>

    {latest && <section className="push-latest" role="status" aria-live="polite"><span>Received {latest.at}</span><strong>{latest.title}</strong>{latest.body && <p>{latest.body}</p>}</section>}

    <section className="push-explain">
      <h2 className="ws-h2">Where the push shows up</h2>
      <ul>
        <li><b>This page open and in front:</b> the push appears in the green box and the activity list below{systemBanner ? ", plus a system banner" : ""}.</li>
        <li><b>System banner:</b> tap <i>Send in 10 s</i>, then switch to another tab or app (or lock your phone). The banner appears within a few seconds; tapping it opens this page.</li>
        <li><b>No banner on a Mac?</b> Open System Settings → Notifications → Google Chrome (or Safari) and turn on Allow notifications with the Banners or Alerts style. Turn off Focus / Do Not Disturb.</li>
        <li><b>No banner on Windows?</b> Settings → System → Notifications: turn on notifications for your browser and turn off Do not disturb.</li>
        <li><b>iPhone / iPad:</b> needs iOS 16.4 or later and this page opened from its Home Screen icon (Safari → Share → Add to Home Screen).</li>
        <li><b>Android:</b> use Chrome, tap Enable notifications and choose Allow.</li>
      </ul>
    </section>

    <section>
      <h2 className="ws-h2">Activity <em>newest first</em></h2>
      <ol className="push-log">{log.length ? log.map((entry, index) => <li key={`${entry.at}-${index}`} className={entry.tone}><time>{entry.at}</time>{entry.text}</li>) : <li className="empty">Nothing yet.</li>}</ol>
    </section>
  </main>;
}
