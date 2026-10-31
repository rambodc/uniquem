import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { firebaseConfig } from "./firebaseConfig";
const app = initializeApp(firebaseConfig);
const appCheckKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
export const appCheck = appCheckKey && typeof window !== "undefined"
  ? initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true })
  : undefined;
export const firebaseApp = app;
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch(() => undefined);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
// Local testing only: `VITE_USE_EMULATORS=true npm run dev` talks to the Firebase emulators instead of production.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") { connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); connectFunctionsEmulator(functions, "127.0.0.1", 5001); }
