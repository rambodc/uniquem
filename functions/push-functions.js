// Push notifications for the iOS app. Every signed-in person (anyone with the Profile mini app) registers their own devices and
// may send themselves a test. Device records live only in pushDevices (see push.js) and are read and written here, never by the browser.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getMessaging } from "firebase-admin/messaging";
import { FieldValue } from "firebase-admin/firestore";
import { db, callable, requireMiniApp } from "./core.js";
import { PUSH_DEVICES, deviceId, isDeadToken, testPushMessage, testPushWait, validateDevice } from "./push.js";

const devices = () => db.collection(PUSH_DEVICES);

/** Saves (or moves to the caller) this device's FCM token. Called after sign-in and whenever the token changes. */
export const registerPushDevice = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "profile"), { token, platform } = validateDevice(request.data);
  await devices().doc(deviceId(token)).set({ uid: access.uid, platform, token, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

/** Forgets this device on log out, so it stops getting the person's notifications. Only the caller's own device record is removed. */
export const unregisterPushDevice = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "profile"), { token } = validateDevice({ ...request.data, platform: "ios" });
  const ref = devices().doc(deviceId(token));
  await db.runTransaction(async (tx) => { const snap = await tx.get(ref); if (snap.exists && snap.data().uid === access.uid) tx.delete(ref); });
  return { success: true };
});

/** Sends a test notification to every device of the caller (at most once per 20 s) and removes devices whose token is dead. */
export const sendTestPush = onCall(callable, async (request) => {
  const access = await requireMiniApp(request, "profile"), snapshot = await devices().where("uid", "==", access.uid).get();
  if (snapshot.empty) throw new HttpsError("failed-precondition", "This account has no devices for notifications yet. Open the iPhone app, sign in and allow notifications.");
  const wait = testPushWait(snapshot.docs.map((doc) => doc.data().lastTestAt?.toMillis?.()));
  if (wait > 0) throw new HttpsError("resource-exhausted", `Wait ${Math.ceil(wait / 1000)} seconds before sending another test.`);
  const batch = db.batch(); snapshot.docs.forEach((doc) => batch.update(doc.ref, { lastTestAt: FieldValue.serverTimestamp() })); await batch.commit();
  const result = await getMessaging().sendEachForMulticast(testPushMessage(snapshot.docs.map((doc) => doc.data().token)));
  const dead = result.responses.flatMap((response, index) => (!response.success && isDeadToken(response.error?.code) ? [snapshot.docs[index].ref] : []));
  await Promise.all(dead.map((ref) => ref.delete()));
  result.responses.forEach((response) => { if (!response.success) globalThis.console.error("Test push failed", response.error?.code, response.error?.message); });
  return { sent: result.successCount, failed: result.failureCount, removed: dead.length };
});
