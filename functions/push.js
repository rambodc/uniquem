// Party push test (/party/push-test): pure rules, kept apart from the callable so they can be tested without Firebase.
import { createHash } from "node:crypto";
import { HttpsError } from "firebase-functions/v2/https";

/** The only message the test can send: fixed text, so the endpoint can't be used to push anything else. */
export const PUSH_TEST_MESSAGE = { title: "UEX 2 push test", body: "Notifications are working on this device." };
export const PUSH_TEST_LINK = "https://uniquem.ca/party/push-test";
export const PUSH_TEST_ICON = "https://uniquem.ca/brand/uniquem-mark-180.png";
/** Per device: 20 test pushes per 10 minutes. Whole site: 200 per hour. */
export const PUSH_LIMITS = { perToken: 20, tokenWindowMs: 10 * 60_000, total: 200, totalWindowMs: 60 * 60_000 };
/** "45 seconds", "1 minute", "3 minutes". */
export const waitText = (ms) => { const seconds = Math.max(1, Math.ceil(ms / 1000)); if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`; const minutes = Math.ceil(seconds / 60); return `${minutes} minute${minutes === 1 ? "" : "s"}`; };

/** An FCM registration token from the browser: letters, digits, '-', '_' and ':' only. */
export function pushToken(value) {
  if (typeof value !== "string" || value.length < 100 || value.length > 4096 || !/^[\w:-]+$/.test(value)) throw new HttpsError("invalid-argument", "Turn on notifications first, then send the test.");
  return value;
}
/** Short id for the rate-limit record; the token itself is never stored. */
export const tokenKey = (token) => createHash("sha256").update(token).digest("hex").slice(0, 40);
/** Send times still inside the window, newest last, or a resource-exhausted error when the limit is already reached. */
export function allowSend(times, now, limit, windowMs, scope = "this device") {
  const recent = (Array.isArray(times) ? times : []).filter((time) => typeof time === "number" && time > now - windowMs && time <= now).sort((a, b) => a - b);
  if (recent.length >= limit) {
    const waitMs = recent[recent.length - limit] + windowMs - now;
    throw new HttpsError("resource-exhausted", `Too many test pushes from ${scope} (${limit} per ${waitText(windowMs)}). Try again in ${waitText(waitMs)}.`, { retryAfterSeconds: Math.ceil(waitMs / 1000) });
  }
  return [...recent, now];
}
/** The FCM message for one device. */
export function pushTestMessage(token, sentAt) {
  return {
    token,
    notification: PUSH_TEST_MESSAGE,
    data: { sentAt },
    webpush: { notification: { icon: PUSH_TEST_ICON, tag: "uex-push-test" }, fcmOptions: { link: PUSH_TEST_LINK } }
  };
}
