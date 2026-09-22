import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_FROM, EMAIL_TO, sendInquiryNotification } from "../mailer.js";

test("formats a product inquiry for the notification recipient", async () => {
  let message;
  await sendInquiryNotification({
    name: "A Customer",
    email: "customer@example.com",
    company: "Example Oilfield",
    phone: "403-555-0100",
    productName: "Friction Reducer",
    message: "Please share application information.",
    notificationTimestamp: "2026-09-22T17:00:00.000Z",
  }, "test-secret", () => ({ sendMail: async (options) => { message = options; } }));
  assert.equal(message.to, EMAIL_TO);
  assert.match(message.from, new RegExp(EMAIL_FROM.replace("@", "\\@")));
  assert.equal(message.replyTo, "customer@example.com");
  assert.match(message.subject, /Friction Reducer/);
  assert.match(message.text, /Example Oilfield/);
  assert.match(message.text, /2026-09-22/);
});

test("surfaces transport failures without changing the inquiry record", async () => {
  await assert.rejects(
    sendInquiryNotification({ name: "Customer", email: "customer@example.com", message: "Question" }, "test-secret", () => ({ sendMail: async () => { throw new Error("SMTP unavailable"); } })),
    /SMTP unavailable/,
  );
});
