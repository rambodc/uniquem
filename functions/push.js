// Push devices: pure helpers for push-functions.js (tested in test/push.test.js).
import { createHash } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";

/** One top-level collection, pushDevices/{sha256 of the FCM token} = { uid, platform: "ios", token, updatedAt }. Server-only. */
export const PUSH_DEVICES = "pushDevices";
export const PLATFORMS = ["ios"];
/** A person may send themselves one test notification every 20 seconds. */
export const TEST_PUSH_GAP_MS = 20_000;
export const TEST_PUSH = { title: "Uniq Group test", body: "Push notifications are working 🎉", path: "/dashboard" };
/** FCM errors that mean the token is dead and its device record should go. */
const DEAD_TOKEN = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

export function validateDevice(value) {
  const token = value?.token, platform = value?.platform;
  if (typeof token !== "string" || !/^[\w:.-]{20,4096}$/.test(token)) throw new HttpsError("invalid-argument", "The device token is invalid.");
  if (!PLATFORMS.includes(platform)) throw new HttpsError("invalid-argument", "The device platform is invalid.");
  return { token, platform };
}
export const deviceId = (token) => createHash("sha256").update(token).digest("hex");
/** Milliseconds left before the next test may be sent (0 = send now). */
export function testPushWait(lastTimes, now = Date.now()) { const last = Math.max(0, ...lastTimes.filter(Number.isFinite)); return Math.max(0, last + TEST_PUSH_GAP_MS - now); }
export const isDeadToken = (code) => DEAD_TOKEN.has(code);
/** The FCM multicast message for a test notification. */
export function testPushMessage(tokens) {
  return { tokens, notification: { title: TEST_PUSH.title, body: TEST_PUSH.body }, data: { path: TEST_PUSH.path }, apns: { payload: { aps: { sound: "default" } } } };
}
