import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_FROM, EMAIL_TO, RESEND_ENDPOINT, formatMountainTimestamp, sendInquiryNotification } from "../mailer.js";

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
  assert.match(body.subject, /Friction Reducer/);
  assert.match(body.text, /Example Oilfield/);
  assert.match(body.text, /Sep 22, 2026, 11:00 AM MDT/);
});

test("omits reply_to for a phone-only call-back lead", async () => {
  const calls = [];
  await sendInquiryNotification({ name: "Caller", phone: "+1 403 555 0100", productName: "SandWeb", message: "Call back requested" }, "re_test_key", { fetchImpl: okFetch(calls) });
  assert.equal("reply_to" in calls[0].body, false);
  assert.match(calls[0].body.text, /Email: Not provided/);
  assert.match(calls[0].body.text, /Phone: \+1 403 555 0100/);
  assert.equal("Idempotency-Key" in calls[0].init.headers, false);
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
