import { getAuth, initializeAuth, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { isNativeApp } from "../native/platform";
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-iuHRZWAzhCCq76fyFUnf4qvI0hK1C8w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "uniquem-4366e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "uniquem-4366e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "uniquem-4366e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1023614587151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1023614587151:web:76ea373e6e7408de1eee7a"
});
const appCheckKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
// Website: reCAPTCHA Enterprise. iOS app: App Attest through the native SDK (src/native/appCheck.ts), since reCAPTCHA can't run there.
export const appCheck = isNativeApp()
  ? initializeAppCheck(app, { provider: new CustomProvider({ getToken: () => import("../native/appCheck").then(({ nativeAppCheckToken }) => nativeAppCheckToken()) }), isTokenAutoRefreshEnabled: true })
  : appCheckKey && typeof window !== "undefined"
    ? initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true })
    : undefined;
// iOS app: getAuth() also loads the popup/redirect helper, which waits on an iframe from the auth domain that never answers inside
// the capacitor:// web view, so the sign-in state never arrives. The app only uses email + password, so it starts Auth without it.
export const auth = isNativeApp() ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
export const authReady = isNativeApp() ? Promise.resolve() : setPersistence(auth, browserLocalPersistence).catch(() => undefined);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
// Local testing only: `VITE_USE_EMULATORS=true npm run dev` talks to the Firebase emulators instead of production.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); connectFunctionsEmulator(functions, "127.0.0.1", 5001); }
