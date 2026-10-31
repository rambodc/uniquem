import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { registerPushDevice, unregisterPushDevice } from "../core/api";

// iOS app only. After sign-in: ask for notification permission (iOS asks once), get this phone's FCM token and save it on the
// server for the signed-in person; a new token (FCM rotates them) is saved again. On log out the device is forgotten first.
export async function registerThisDevice() {
  let { receive } = await FirebaseMessaging.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") ({ receive } = await FirebaseMessaging.requestPermissions());
  if (receive !== "granted") return false;
  const { token } = await FirebaseMessaging.getToken();
  await registerPushDevice(token);
  return true;
}
export const watchTokenChanges = () => FirebaseMessaging.addListener("tokenReceived", ({ token }) => { void registerPushDevice(token).catch(() => undefined); });
export async function forgetThisDevice() {
  const { token } = await FirebaseMessaging.getToken();
  await unregisterPushDevice(token);
}
