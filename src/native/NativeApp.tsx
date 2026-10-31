import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { StatusBar, Style } from "@capacitor/status-bar";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { auth } from "../core/firebase";
import { registerThisDevice, watchTokenChanges } from "./push";

// Native-only behaviour for the iOS app; loaded only when isNativeApp(), never on the website.
// Status bar: dark text on the light workspace background. Push: once someone is signed in, ask for permission and save this
// phone's FCM token for them (src/native/push.ts); tapping a notification that carries a site path (data.path, e.g. "/party/abc") opens it.
// Notifications that arrive while the app is open show as a banner (capacitor.config.ts presentationOptions).
export default function NativeApp() {
  const navigate = useNavigate();
  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    const tap = FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
      const path = (notification.data as { path?: unknown } | undefined)?.path;
      if (typeof path === "string" && path.startsWith("/")) navigate(path);
    });
    const tokens = watchTokenChanges();
    let registeredFor: string | null = null;
    const stop = onAuthStateChanged(auth, (user) => {
      if (!user || !user.emailVerified) { registeredFor = null; return; }
      if (registeredFor === user.uid) return;
      registeredFor = user.uid;
      void registerThisDevice().catch(() => { registeredFor = null; });
    });
    return () => { stop(); void tap.then((handle) => handle.remove()); void tokens.then((handle) => handle.remove()); };
  }, [navigate]);
  return null;
}
