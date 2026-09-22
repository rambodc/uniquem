import nodemailer from "nodemailer";

export const EMAIL_FROM = "rambodc@irobotx.io";
export const EMAIL_TO = "rambodr@uniquem.ca";

export function createMailer(password) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: EMAIL_FROM, pass: password },
  });
}

export function formatInquiryEmail(inquiry) {
  const product = inquiry.productName ? `Product: ${inquiry.productName}\n` : "";
  const company = inquiry.company ? `Company: ${inquiry.company}\n` : "";
  const phone = inquiry.phone ? `Phone: ${inquiry.phone}\n` : "";
  const timestamp = inquiry.notificationTimestamp || new Date().toISOString();
  return [
    "New Uniquem website inquiry",
    "",
    product.trimEnd(),
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    company.trimEnd(),
    phone.trimEnd(),
    `Submitted: ${timestamp}`,
    "",
    "Message:",
    inquiry.message,
  ].filter(Boolean).join("\n");
}

export async function sendInquiryNotification(inquiry, password, transportFactory = createMailer) {
  if (!password) throw new Error("GMAIL_APP_PASSWORD is not configured");
  const transport = transportFactory(password);
  const subject = inquiry.productName
    ? `Uniquem product inquiry: ${inquiry.productName}`
    : "New Uniquem website inquiry";
  return transport.sendMail({
    from: `Uniquem Website <${EMAIL_FROM}>`,
    to: EMAIL_TO,
    replyTo: inquiry.email,
    subject,
    text: formatInquiryEmail(inquiry),
  });
}
