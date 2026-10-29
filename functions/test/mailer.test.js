import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_FROM, EMAIL_REPLY_TO, EMAIL_TO, RESEND_ENDPOINT, ResendError, buildInviteEmail, deliveryStatus, fetchDeliveryStatus, formatMountainTimestamp, retryDelay, sendInquiryNotification, sendInviteEmail } from "../mailer.js";

const okFetch = (calls) => async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ id: "email_123" }) }; };

test("formats timestamps in Alberta daylight and standard Mountain Time", () => {
  assert.match(formatMountainTimestamp("2026-09-22T17:00:00.000Z"), /MDT/);
  assert.match(formatMountainTimestamp("2026-01-15T18:00:00.000Z"), /MST/);
});

test("sends a product inquiry through Resend from website@uniquem.ca to the Uniquem inbox", async () => {
  const calls = [];
  const result = await sendInquiryNotification({
    name: "A Customer",
    email: "customer@example.com",
    company: "Example Oilfield",
    phone: "403-555-0100",
    productName: "Friction Reducer",
    message: "Please share application information.",
    notificationTimestamp: "2026-09-22T17:00:00.000Z",
  }, "re_test_key", { inquiryId: "abc123", fetchImpl: okFetch(calls) });
  assert.equal(result.id, "email_123");
  const [{ url, init, body }] = calls;
  assert.equal(url, RESEND_ENDPOINT);
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, "Bearer re_test_key");
  assert.equal(init.headers["Idempotency-Key"], "contact-inquiry/abc123");
  assert.equal(EMAIL_FROM, "Uniquem Website <website@uniquem.ca>");
  assert.equal(EMAIL_REPLY_TO, "rambodr@uniquem.ca");
  assert.equal(body.from, EMAIL_FROM);
  assert.deepEqual(body.to, [EMAIL_TO]);
  assert.equal(EMAIL_TO, "rambodr@uniquem.ca");
  assert.equal(body.reply_to, "customer@example.com");
  assert.equal(body.subject, "New Uniquem website inquiry (Friction Reducer) - Sep 22, 2026, 11:00 AM MDT");
  assert.match(body.text, /Example Oilfield/);
  assert.match(body.text, /Sep 22, 2026, 11:00 AM MDT/);
});

test("formats a phone-only SandWeb call-back lead like a contact-page inquiry", async () => {
  const calls = [];
  await sendInquiryNotification({ name: "Caller", phone: "+1 403 555 0100", company: "Acme", productName: "SandWeb", message: "Please call me about SandWeb.", notificationTimestamp: "2026-10-20T19:00:00.000Z" }, "re_test_key", { fetchImpl: okFetch(calls) });
  const { body } = calls[0];
  assert.equal(body.reply_to, EMAIL_TO);
  assert.equal(body.subject, "New Uniquem website inquiry (SandWeb) - Oct 20, 2026, 1:00 PM MDT");
  assert.equal(body.text, "New Uniquem website inquiry\nProduct: SandWeb\nName: Caller\nCompany: Acme\nPhone: +1 403 555 0100\nSubmitted: Oct 20, 2026, 1:00 PM MDT\nMessage:\nPlease call me about SandWeb.");
  assert.equal("Idempotency-Key" in calls[0].init.headers, false);
});

test("uses the generic subject for contact-page inquiries", async () => {
  const calls = [];
  await sendInquiryNotification({ name: "C", email: "c@example.com", message: "A general question.", notificationTimestamp: "2026-01-15T18:00:00.000Z" }, "re_test_key", { fetchImpl: okFetch(calls) });
  assert.equal(calls[0].body.subject, "New Uniquem website inquiry - Jan 15, 2026, 11:00 AM MST");
  assert.equal(calls[0].body.reply_to, "c@example.com");
});

test("refuses to send without an API key", async () => {
  await assert.rejects(sendInquiryNotification({ name: "C", email: "c@example.com", message: "Q" }, "", { fetchImpl: okFetch([]) }), /RESEND_API_KEY is not configured/);
});

test("surfaces Resend API failures so the inquiry stays saved with notificationSent false", async () => {
  const failing = async () => ({ ok: false, status: 403, json: async () => ({ message: "The uniquem.ca domain is not verified." }) });
  await assert.rejects(
    sendInquiryNotification({ name: "Customer", email: "customer@example.com", message: "Question" }, "re_test_key", { fetchImpl: failing }),
    /Resend responded 403: The uniquem.ca domain is not verified/,
  );
  await assert.rejects(
    sendInquiryNotification({ name: "Customer", email: "customer@example.com", message: "Question" }, "re_test_key", { fetchImpl: async () => { throw new Error("network down"); } }),
    /network down/,
  );
});

test("the user invite goes out from the Uniquem sender to the new user only, with the one-time link and no password", async () => {
  const calls = [];
  const link = "https://uniquem-4366e.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=TESTCODE";
  await sendInviteEmail({ to: "new.user@example.com", firstName: "Nina", invitedBy: "admin@uniquem.ca", link }, "re_test_key", { idempotencyKey: "user-invite/u/1", fetchImpl: okFetch(calls) });
  const [{ url, init, body }] = calls;
  assert.equal(url, RESEND_ENDPOINT);
  assert.equal(init.headers.Authorization, "Bearer re_test_key");
  assert.equal(body.from, EMAIL_FROM);
  assert.deepEqual(body.to, ["new.user@example.com"]);
  assert.equal(body.reply_to, "rambodr@uniquem.ca");
  assert.match(body.text, /^Hi Nina,/);
  assert.match(body.text, /oobCode=TESTCODE/);
  assert.match(body.text, /https:\/\/uniquem\.ca\/signin/);
  assert.doesNotMatch(body.text, /temporary password|your password is/i);
  assert.equal(buildInviteEmail({ to: "a@b.co", firstName: "A", invitedBy: "x@uniquem.ca", link }).subject, "Your Uniquem workspace account");
});
test("an invite fails loudly without a key or when Resend rejects it", async () => {
  const invite = { to: "a@b.co", firstName: "A", invitedBy: "x@uniquem.ca", link: "https://example.com/l" };
  await assert.rejects(() => sendInviteEmail(invite, ""), /RESEND_API_KEY/);
  await assert.rejects(() => sendInviteEmail(invite, "k", { idempotencyKey: "i", fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: "domain not verified" }) }) }), /403: domain not verified/);
});

const response = (status, body, headers = {}) => ({ ok: status < 300, status, headers: { get: (name) => headers[name] ?? null }, json: async () => body });
const invite = { to: "a@b.co", firstName: "A", invitedBy: "x@uniquem.ca", link: "https://example.com/l" };
test("an invite retries transient failures (network, 429, 5xx) with the same idempotency key and body, then succeeds once", async () => {
  const seen = [], waits = [];
  const replies = [() => { throw new Error("socket hang up"); }, () => response(429, { message: "Too many requests" }, { "retry-after": "2" }), () => response(200, { id: "re_ok" })];
  const fetchImpl = async (url, init) => { seen.push({ key: init.headers["Idempotency-Key"], body: init.body }); return replies[seen.length - 1](); };
  const result = await sendInviteEmail(invite, "k", { idempotencyKey: "user-invite/u/1", fetchImpl, wait: async (ms) => { waits.push(ms); } });
  assert.equal(result.id, "re_ok");
  assert.equal(seen.length, 3);
  assert.deepEqual(new Set(seen.map((call) => call.key)), new Set(["user-invite/u/1"]));
  assert.equal(new Set(seen.map((call) => call.body)).size, 1, "every try sends the identical body, so Resend dedupes it");
  assert.deepEqual(waits, [500, 2000], "backs off, honouring Retry-After");
});
test("an invite gives up after 2 retries, and never retries a permanent rejection", async () => {
  let tries = 0;
  await assert.rejects(sendInviteEmail(invite, "k", { idempotencyKey: "i", fetchImpl: async () => { tries += 1; return response(503, { message: "unavailable" }); }, wait: async () => {} }), (error) => error instanceof ResendError && error.status === 503 && error.transient);
  assert.equal(tries, 3);
  tries = 0;
  await assert.rejects(sendInviteEmail(invite, "k", { idempotencyKey: "i", fetchImpl: async () => { tries += 1; return response(422, { message: "Invalid `to` field" }); }, wait: async () => {} }), /422: Invalid `to` field/);
  assert.equal(tries, 1);
});
test("a 200 without an email id is treated as not sent", async () => {
  await assert.rejects(sendInviteEmail(invite, "k", { idempotencyKey: "i", fetchImpl: async () => response(200, {}), wait: async () => {} }), /no email id/);
});
test("retryDelay: 0.5 s, then 1.5 s, or Retry-After capped at 5 s", () => {
  assert.equal(retryDelay(1), 500); assert.equal(retryDelay(2), 1500); assert.equal(retryDelay(1, "3"), 3000); assert.equal(retryDelay(1, "60"), 5000);
});
test("delivery status maps Resend's last event", async () => {
  for (const [event, status] of [["delivered", "delivered"], ["opened", "delivered"], ["clicked", "delivered"], ["delivery_delayed", "delayed"], ["bounced", "bounced"], ["complained", "complained"], ["failed", "failed"], ["sent", "sent"], ["queued", "sent"], [undefined, "sent"]]) assert.equal(deliveryStatus(event), status);
  const calls = [];
  assert.equal(await fetchDeliveryStatus("re_1", "k", { fetchImpl: async (url, init) => { calls.push({ url, init }); return response(200, { last_event: "bounced" }); } }), "bounced");
  assert.equal(calls[0].url, `${RESEND_ENDPOINT}/re_1`);
  assert.equal(calls[0].init.method, undefined, "a read, never a send");
  await assert.rejects(fetchDeliveryStatus("re_1", "k", { fetchImpl: async () => response(500, {}) }), /500/);
});
