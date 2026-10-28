// Inquiry notifications are sent through Resend's HTTP API from the verified
// irobotx.io domain to the Uniquem inbox. The API key comes from the Secret
// Manager secret RESEND_API_KEY and is never logged.
export const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const EMAIL_FROM = "Uniquem Website <website@irobotx.io>";
export const EMAIL_TO = "rambodr@uniquem.ca";

export function formatMountainTimestamp(value = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatInquiryEmail(inquiry) {
  const timestamp = formatMountainTimestamp(inquiry.notificationTimestamp || new Date());
  return [
    "New Uniquem website inquiry",
    "",
    inquiry.productName ? `Product: ${inquiry.productName}` : "",
    `Name: ${inquiry.name}`,
    inquiry.email ? `Email: ${inquiry.email}` : "",
    inquiry.company ? `Company: ${inquiry.company}` : "",
    inquiry.phone ? `Phone: ${inquiry.phone}` : "",
    `Submitted: ${timestamp}`,
    "",
    "Message:",
    inquiry.message,
  ].filter(Boolean).join("\n");
}

export function buildInquiryEmail(inquiry) {
  // A unique, dated subject per submission so Gmail never threads leads together.
  const stamp = formatMountainTimestamp(inquiry.notificationTimestamp || new Date());
  const subject = `New Uniquem website inquiry${inquiry.productName ? ` (${inquiry.productName})` : ""} - ${stamp}`;
  // Reply goes straight to the visitor; phone-only leads reply to the inbox itself.
  return { from: EMAIL_FROM, to: [EMAIL_TO], reply_to: inquiry.email || EMAIL_TO, subject, text: formatInquiryEmail(inquiry) };
}

/** Posts one message to Resend. `idempotencyKey` makes a retried call safe. Throws on any non-2xx response; the key and message are never logged. */
async function sendEmail(message, apiKey, { idempotencyKey, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetchImpl(RESEND_ENDPOINT, { method: "POST", headers, body: JSON.stringify(message) });
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json(); detail = body?.message ? `: ${body.message}` : ""; } catch { /* ignore non-JSON bodies */ }
    throw new Error(`Resend responded ${response.status}${detail}`);
  }
  return response.json();
}

/**
 * Sends the notification. `inquiryId` makes the Resend idempotency key so a
 * retried call never sends a duplicate. Throws on any non-2xx response.
 */
export function sendInquiryNotification(inquiry, apiKey, { inquiryId, fetchImpl } = {}) {
  return sendEmail(buildInquiryEmail(inquiry), apiKey, { idempotencyKey: inquiryId ? `contact-inquiry/${inquiryId}` : undefined, fetchImpl });
}

/** The invite a new user receives: a one-time link to choose their own password. */
export function buildInviteEmail({ to, invitedBy, link }) {
  const text = [
    "You have been added to the Uniquem private workspace.",
    "",
    `${invitedBy} created an account for you. Open this link to choose your password:`,
    "",
    link,
    "",
    "After that, sign in at https://uniquem.ca/signin with this email address and your new password.",
    "The link works for about an hour. If it has expired, ask the person who invited you to send a new invite.",
    "If you were not expecting this, you can ignore this email.",
  ].join("\n");
  return { from: EMAIL_FROM, to: [to], reply_to: invitedBy, subject: "Your Uniquem workspace account", text };
}

export function sendInviteEmail(invite, apiKey, { fetchImpl } = {}) {
  return sendEmail(buildInviteEmail(invite), apiKey, { fetchImpl });
}
