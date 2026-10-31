import { FirebaseAppCheck } from "@capacitor-firebase/app-check";

// App Check inside the iOS app. reCAPTCHA can't run in the app's web view, so the native Firebase SDK attests the device with
// App Attest and the web SDK's CustomProvider passes that token on to every callable. A simulator or debug build uses the debug
// provider when built with VITE_APPCHECK_DEBUG=true (see ios/README.md); release and TestFlight builds always use App Attest.
let ready: Promise<void> | undefined;
export async function nativeAppCheckToken() {
  ready ??= FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true, debugToken: import.meta.env.VITE_APPCHECK_DEBUG === "true" });
  await ready;
  const { token, expireTimeMillis } = await FirebaseAppCheck.getToken({ forceRefresh: false });
  return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60_000 };
}
