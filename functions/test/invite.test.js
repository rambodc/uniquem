import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import { DELIVERY_CHECK_WINDOW_MS, deliverInvite, deliveryUpdate, inviteView, needsDeliveryCheck } from "../invite.js";
import { ResendError } from "../mailer.js";

const record = { email: "nina@example.com", firstName: "Nina", lastName: "New" };
const at = new Date("2026-10-29T14:05:44Z");
function fakes(over = {}) {
  const calls = { links: [], sends: [], saves: [], logs: [] };
  const deps = {
    makeLink: async (address) => { calls.links.push(address); return "https://uniquem-4366e.firebaseapp.com/__/auth/action?oobCode=SECRET"; },
    send: async (invite, key) => { calls.sends.push({ invite, key }); return { id: "re_1" }; },
    save: async (invite) => { calls.saves.push(invite); },
    newKey: () => "k1", now: () => at, log: (message) => calls.logs.push(message), ...over,
  };
  return { deps, calls };
}

test("a sent invite makes the link for the record's email, sends it with a per-invite idempotency key and saves status sent", async () => {
  const { deps, calls } = fakes();
  const result = await deliverInvite({ uid: "u1", record, invitedBy: "boss@uniquem.ca" }, deps);
  assert.deepEqual(result, { sent: true, id: "re_1" });
  assert.deepEqual(calls.links, ["nina@example.com"], "the link is made for the email on the record, never undefined");
  assert.deepEqual(calls.sends[0].invite, { to: "nina@example.com", firstName: "Nina", invitedBy: "boss@uniquem.ca", link: "https://uniquem-4366e.firebaseapp.com/__/auth/action?oobCode=SECRET" });
  assert.equal(calls.sends[0].key, "user-invite/u1/k1");
  assert.deepEqual(calls.saves, [{ at, by: "boss@uniquem.ca", checkedAt: null, status: "sent", resendId: "re_1", error: null }]);
  assert.deepEqual(calls.logs, []);
});

test("a failed send is never silent: it returns sent false with the reason, saves status failed and logs it (without the link)", async () => {
  const { deps, calls } = fakes({ send: async () => { throw new ResendError("Resend responded 422: Invalid `to` field", { status: 422, transient: false }); } });
  const result = await deliverInvite({ uid: "u1", record, invitedBy: "boss@uniquem.ca" }, deps);
  assert.equal(result.sent, false);
  assert.match(result.reason, /could not be sent\. Resend responded 422/);
  assert.equal(calls.saves[0].status, "failed");
  assert.equal(calls.saves[0].resendId, null);
  assert.equal(calls.saves[0].error, result.reason);
  assert.equal(calls.logs.length, 1);
  assert.doesNotMatch(calls.logs[0] + result.reason, /oobCode|SECRET/);
});

test("a link that can't be made (e.g. an unauthorized domain or a bad address) is reported the same way and nothing is sent", async () => {
  const { deps, calls } = fakes({ makeLink: async () => { throw new Error("The email address is improperly formatted."); } });
  const result = await deliverInvite({ uid: "u1", record, invitedBy: "b@uniquem.ca" }, deps);
  assert.deepEqual(result, { sent: false, reason: "The sign-in link could not be made (The email address is improperly formatted.)." });
  assert.equal(calls.sends.length, 0);
  assert.equal(calls.saves[0].status, "failed");
});

test("the outcome is still returned when the status can't be saved", async () => {
  const { deps, calls } = fakes({ save: async () => { throw new Error("NOT_FOUND"); } });
  assert.deepEqual(await deliverInvite({ uid: "u1", record, invitedBy: "b@uniquem.ca" }, deps), { sent: true, id: "re_1" });
  assert.match(calls.logs[0], /could not be saved/);
});

test("both callables hand sendInvite the whole stored record, so createUser and Resend invite take the same path", () => {
  const source = readFileSync(new URL("../users-functions.js", import.meta.url), "utf8");
  const calls = [...source.matchAll(/await sendInvite\((.+)\) \};/g)].map((match) => match[1]);
  assert.deepEqual(calls, ["account.uid, record, actor.email", "uid, snapshot.data(), actor.email"]);
  assert.match(source, /create\(\{ \.\.\.record, /, "createUser stores the same record it invites");
  assert.doesNotMatch(source, /emailSent/);
});

test("delivery is re-checked only for recent invites Resend accepted that have not reached a final state", () => {
  const now = at.getTime() + 60_000;
  assert.equal(needsDeliveryCheck({ status: "sent", resendId: "re_1" }, at.getTime(), now), true);
  assert.equal(needsDeliveryCheck({ status: "delayed", resendId: "re_1" }, at.getTime(), now), true);
  for (const status of ["delivered", "bounced", "complained", "failed"]) assert.equal(needsDeliveryCheck({ status, resendId: "re_1" }, at.getTime(), now), false);
  assert.equal(needsDeliveryCheck({ status: "failed", resendId: null }, at.getTime(), now), false);
  assert.equal(needsDeliveryCheck(null, 0, now), false);
  assert.equal(needsDeliveryCheck({ status: "sent", resendId: "re_1" }, at.getTime(), at.getTime() + DELIVERY_CHECK_WINDOW_MS + 1), false);
});

test("a bounce or spam report becomes a problem the super admin can read", () => {
  const sent = { at, by: "b@uniquem.ca", status: "sent", resendId: "re_1", error: null, checkedAt: null }, checkedAt = new Date();
  assert.match(deliveryUpdate(sent, "bounced", checkedAt).error, /bounced/);
  assert.match(deliveryUpdate(sent, "complained", checkedAt).error, /spam/);
  assert.deepEqual(deliveryUpdate(sent, "delivered", checkedAt), { ...sent, status: "delivered", checkedAt });
});

test("the browser sees status, times, who sent it and the reason, never Resend's id", () => {
  const view = inviteView({ at: { toDate: () => at }, by: "b@uniquem.ca", status: "failed", resendId: null, error: "nope", checkedAt: null });
  assert.deepEqual(view, { status: "failed", at: "2026-10-29T14:05:44.000Z", by: "b@uniquem.ca", error: "nope", checkedAt: null });
  assert.equal(inviteView(null), null);
});
