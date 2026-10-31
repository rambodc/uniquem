import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { StatusBar, Style } from "@capacitor/status-bar";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { auth } from "../core/firebase";

// Native-only behaviour for the iOS app; loaded only when isNativeApp(), never on the website.
// Status bar: dark text on the light workspace background. Push: once someone is signed in, ask for permission and register
// with Firebase Cloud Messaging; tapping a notification that carries a site path (data.path, e.g. "/party/abc") opens it.
export default function NativeApp() {
  const navigate = useNavigate();
  useEffect(() => {
    void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    const tap = FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
      const path = (notification.data as { path?: unknown } | undefined)?.path;
      if (typeof path === "string" && path.startsWith("/")) navigate(path);
    });
    let asked = false;
    const stop = onAuthStateChanged(auth, (user) => {
      if (!user || asked) return;
      asked = true;
      void FirebaseMessaging.requestPermissions()
        .then(({ receive }) => (receive === "granted" ? FirebaseMessaging.getToken() : undefined))
        .catch(() => undefined);
    });
    return () => { stop(); void tap.then((handle) => handle.remove()); };
  }, [navigate]);
  return null;
}
