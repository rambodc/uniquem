import { FirebaseAppCheck } from "@capacitor-firebase/app-check";

// App Check inside the iOS app. reCAPTCHA can't run in the app's web view, so the native Firebase SDK attests the device with
// App Attest and the web SDK's CustomProvider passes that token on to every callable. A simulator or debug build uses the debug
// provider when built with VITE_APPCHECK_DEBUG=true (see ios/README.md); release and TestFlight builds always use App Attest.
// A device that can't attest fails within 15 s instead of holding every call open; the server then answers (and refuses) normally.
let ready: Promise<void> | undefined;
const within = <T,>(work: Promise<T>, ms: number) => Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("App Check timed out")), ms))]);
export async function nativeAppCheckToken() {
  ready ??= FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true, debugToken: import.meta.env.VITE_APPCHECK_DEBUG === "true" }).catch((cause: unknown) => { ready = undefined; throw cause; });
  const { token, expireTimeMillis } = await within(ready.then(() => FirebaseAppCheck.getToken({ forceRefresh: false })), 15_000);
  return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60_000 };
}
