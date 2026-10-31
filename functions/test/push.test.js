import assert from "node:assert/strict";
import { test } from "node:test";
import { TEST_PUSH_GAP_MS, deviceId, isDeadToken, testPushMessage, testPushWait, validateDevice } from "../push.js";

const token = "fcmToken123:APA91b-abc_DEF.ghi";
test("device: an FCM-looking token and a known platform", () => {
  assert.deepEqual(validateDevice({ token, platform: "ios" }), { token, platform: "ios" });
  for (const bad of [{}, { token, platform: "android" }, { token: "short", platform: "ios" }, { token: "bad token with spaces and more", platform: "ios" }, { token: 7, platform: "ios" }, null]) assert.throws(() => validateDevice(bad), /invalid/);
});
test("device id: a stable sha256 of the token", () => { assert.equal(deviceId(token), deviceId(token)); assert.match(deviceId(token), /^[0-9a-f]{64}$/); assert.notEqual(deviceId(token), deviceId(`${token}x`)); });
test("test push: one per 20 s across the person's devices", () => {
  const now = 1_000_000;
  assert.equal(testPushWait([], now), 0); assert.equal(testPushWait([undefined], now), 0);
  assert.equal(testPushWait([now - TEST_PUSH_GAP_MS], now), 0);
  assert.equal(testPushWait([now - 5_000, now - 60_000], now), TEST_PUSH_GAP_MS - 5_000);
});
test("test push: message opens the dashboard; dead tokens are recognised", () => {
  const message = testPushMessage([token]);
  assert.deepEqual(message.tokens, [token]); assert.equal(message.data.path, "/dashboard"); assert.ok(message.notification.title && message.notification.body);
  assert.equal(isDeadToken("messaging/registration-token-not-registered"), true); assert.equal(isDeadToken("messaging/internal-error"), false);
});
