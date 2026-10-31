import assert from "node:assert/strict";
import { test } from "node:test";
import { PUSH_LIMITS, PUSH_TEST_MESSAGE, allowSend, waitText, pushTestMessage, pushToken, tokenKey } from "../push.js";

const token = `${"a".repeat(60)}:APA91b${"Z_-9".repeat(30)}`;
test("push test accepts only a real-looking FCM token", () => {
  assert.equal(pushToken(token), token);
  for (const bad of [undefined, 42, "", "short", `${token} `, `${token}<script>`, "x".repeat(5000)]) assert.throws(() => pushToken(bad), /Turn on notifications/);
});
test("the token is never stored: only a short hash keys the limit record", () => {
  assert.match(tokenKey(token), /^[0-9a-f]{40}$/);
  assert.equal(tokenKey(token), tokenKey(token));
  assert.ok(!tokenKey(token).includes("APA91b"));
});
test("rate limit keeps only sends inside the window and stops at the limit", () => {
  const now = 1_000_000_000;
  assert.deepEqual(allowSend(undefined, now, 3, 600_000), [now]);
  assert.deepEqual(allowSend([now - 700_000, now - 1000], now, 3, 600_000), [now - 1000, now]);
  assert.throws(() => allowSend([now - 3, now - 2, now - 1], now, 3, 600_000), /Too many test pushes from this device \(3 per 10 minutes\)\. Try again in 10 minutes\./);
  assert.throws(() => allowSend([now - 570_000, now - 2, now - 1], now, 3, 600_000), /Try again in 30 seconds\./);
  assert.equal(PUSH_LIMITS.perToken, 20); assert.equal(PUSH_LIMITS.total, 200);
  assert.equal(waitText(1000), "1 second"); assert.equal(waitText(61_000), "2 minutes");
});
test("the message is fixed text, goes to the one token given and opens the test page", () => {
  const message = pushTestMessage(token, "2026-10-31T18:00:00.000Z");
  assert.equal(message.token, token);
  assert.deepEqual(message.notification, PUSH_TEST_MESSAGE);
  assert.equal(message.webpush.fcmOptions.link, "https://uniquem.ca/party/push-test");
  assert.equal(Object.keys(message).sort().join(), "data,notification,token,webpush");
});
