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
    `Email: ${inquiry.email || "Not provided"}`,
    inquiry.company ? `Company: ${inquiry.company}` : "",
    inquiry.phone ? `Phone: ${inquiry.phone}` : "",
    `Submitted: ${timestamp}`,
    "",
    "Message:",
    inquiry.message,
  ].filter(Boolean).join("\n");
}

export function buildInquiryEmail(inquiry) {
  const subject = inquiry.productName
    ? `Uniquem product inquiry: ${inquiry.productName}`
    : "New Uniquem website inquiry";
  const message = { from: EMAIL_FROM, to: [EMAIL_TO], subject, text: formatInquiryEmail(inquiry) };
  // Reply goes straight to the visitor, but only when they gave an email.
  if (inquiry.email) message.reply_to = inquiry.email;
  return message;
}

/**
 * Sends the notification. `inquiryId` makes the Resend idempotency key so a
 * retried call never sends a duplicate. Throws on any non-2xx response.
 */
export async function sendInquiryNotification(inquiry, apiKey, { inquiryId, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  if (inquiryId) headers["Idempotency-Key"] = `contact-inquiry/${inquiryId}`;
  const response = await fetchImpl(RESEND_ENDPOINT, { method: "POST", headers, body: JSON.stringify(buildInquiryEmail(inquiry)) });
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json(); detail = body?.message ? `: ${body.message}` : ""; } catch { /* ignore non-JSON bodies */ }
    throw new Error(`Resend responded ${response.status}${detail}`);
  }
  return response.json();
}
