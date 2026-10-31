// Party push test: sends one fixed test notification to the browser that asks for it (its own FCM token only). No login needed;
// App Check is enforced like every callable, and pushes are rate limited per device and site-wide. Tokens are never stored.
import { getMessaging } from "firebase-admin/messaging";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, callable } from "./core.js";
import { PUSH_LIMITS, allowSend, pushTestMessage, pushToken, tokenKey } from "./push.js";

export const sendPartyPushTest = onCall(callable, async (request) => {
  const token = pushToken(request.data?.token), now = Date.now();
  const deviceRef = db.collection("partyPushTest").doc(tokenKey(token)), totalRef = db.collection("partyPushTest").doc("_total");
  await db.runTransaction(async (tx) => {
    const [device, total] = await Promise.all([tx.get(deviceRef), tx.get(totalRef)]);
    const deviceTimes = allowSend(device.data()?.times, now, PUSH_LIMITS.perToken, PUSH_LIMITS.tokenWindowMs);
    const totalTimes = allowSend(total.data()?.times, now, PUSH_LIMITS.total, PUSH_LIMITS.totalWindowMs, "the whole site");
    tx.set(deviceRef, { times: deviceTimes, updatedAt: new Date(now) });
    tx.set(totalRef, { times: totalTimes, updatedAt: new Date(now) });
  });
  try {
    const messageId = await getMessaging().send(pushTestMessage(token, new Date(now).toISOString()));
    return { sent: true, messageId };
  } catch (error) {
    const code = String(error?.code || "");
    if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) throw new HttpsError("failed-precondition", "This device's notification token is no longer valid. Turn notifications on again.");
    globalThis.console.error("Party push test failed", code || (error instanceof Error ? error.message : error));
    throw new HttpsError("internal", "The test push could not be sent.");
  }
});
