import { FirebaseAppCheck } from "@capacitor-firebase/app-check";

// App Check inside the iOS app. reCAPTCHA can't run in the app's web view, so the native Firebase SDK attests the device and the
// web SDK's CustomProvider passes that token on to every callable. The native provider (App Attest on an iPhone, debug on the
// simulator) is set in ios/App/App/AppDelegate.swift before Firebase starts. A device that can't attest fails within 15 s
// instead of holding every call open; the server then answers (and refuses) normally.
const within = <T,>(work: Promise<T>, ms: number) => Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("App Check timed out")), ms))]);
export async function nativeAppCheckToken() {
  const { token, expireTimeMillis } = await within(FirebaseAppCheck.getToken({ forceRefresh: false }), 15_000);
  return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60_000 };
}
