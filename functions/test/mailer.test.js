import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_FROM, EMAIL_TO, RESEND_ENDPOINT, buildInviteEmail, formatMountainTimestamp, sendInquiryNotification, sendInviteEmail } from "../mailer.js";

const okFetch = (calls) => async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ id: "email_123" }) }; };

test("formats timestamps in Alberta daylight and standard Mountain Time", () => {
  assert.match(formatMountainTimestamp("2026-09-22T17:00:00.000Z"), /MDT/);
  assert.match(formatMountainTimestamp("2026-01-15T18:00:00.000Z"), /MST/);
});

test("sends a product inquiry through Resend from website@irobotx.io to the Uniquem inbox", async () => {
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
  assert.equal(EMAIL_FROM, "Uniquem Website <website@irobotx.io>");
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
  const failing = async () => ({ ok: false, status: 403, json: async () => ({ message: "The irobotx.io domain is not verified." }) });
  await assert.rejects(
    sendInquiryNotification({ name: "Customer", email: "customer@example.com", message: "Question" }, "re_test_key", { fetchImpl: failing }),
    /Resend responded 403: The irobotx.io domain is not verified/,
  );
  await assert.rejects(
    sendInquiryNotification({ name: "Customer", email: "customer@example.com", message: "Question" }, "re_test_key", { fetchImpl: async () => { throw new Error("network down"); } }),
    /network down/,
  );
});

test("the user invite goes out from the Uniquem sender to the new user only, with the one-time link and no password", async () => {
  const calls = [];
  const link = "https://uniquem-4366e.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=TESTCODE";
  await sendInviteEmail({ to: "new.user@example.com", invitedBy: "admin@uniquem.ca", link }, "re_test_key", { fetchImpl: okFetch(calls) });
  const [{ url, init, body }] = calls;
  assert.equal(url, RESEND_ENDPOINT);
  assert.equal(init.headers.Authorization, "Bearer re_test_key");
  assert.equal(body.from, EMAIL_FROM);
  assert.deepEqual(body.to, ["new.user@example.com"]);
  assert.equal(body.reply_to, "admin@uniquem.ca");
  assert.match(body.text, /oobCode=TESTCODE/);
  assert.match(body.text, /https:\/\/uniquem\.ca\/signin/);
  assert.doesNotMatch(body.text, /temporary password|your password is/i);
  assert.equal(buildInviteEmail({ to: "a@b.co", invitedBy: "x@uniquem.ca", link }).subject, "Your Uniquem workspace account");
});
test("an invite fails loudly without a key or when Resend rejects it", async () => {
  const invite = { to: "a@b.co", invitedBy: "x@uniquem.ca", link: "https://example.com/l" };
  await assert.rejects(() => sendInviteEmail(invite, ""), /RESEND_API_KEY/);
  await assert.rejects(() => sendInviteEmail(invite, "k", { fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: "domain not verified" }) }) }), /403: domain not verified/);
});
