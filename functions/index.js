import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { db, callable, requireAllowed, validateInquiry, text } from "./core.js";
import { sendInquiryNotification } from "./mailer.js";

const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

export const submitContactInquiry = onCall({ ...callable, secrets: [gmailAppPassword] }, async (request) => {
  const inquiry = validateInquiry(request.data);
  const ref = db.collection("contactInquiries").doc();
  await ref.set(inquiry);
  let notificationSent = false;
  try {
    await sendInquiryNotification({ ...inquiry, notificationTimestamp: new Date().toISOString() }, gmailAppPassword.value());
    notificationSent = true;
  } catch (error) {
    globalThis.console.error("Inquiry email notification failed", error instanceof Error ? error.message : error);
  }
  return { success: true, inquiryId: ref.id, notificationSent };
});
export const listContactInquiries = onCall(callable, async (request) => { requireAllowed(request); const archived = request.data?.archived === true, query = typeof request.data?.query === "string" ? request.data.query.trim().toLowerCase() : "", snapshot = await db.collection("contactInquiries").orderBy("createdAt", "desc").limit(500).get(); const inquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.().toISOString() || null })).filter((item) => item.archived === archived && (!query || [item.productName, item.name, item.email, item.company, item.message].some((value) => String(value || "").toLowerCase().includes(query)))); return { inquiries, total: inquiries.length, nextCursor: null }; });
export const archiveContactInquiry = onCall(callable, async (request) => { requireAllowed(request); const id = text(request.data?.inquiryId, "inquiry", 100), ref = db.collection("contactInquiries").doc(id); await ref.update({ archived: true }); return { success: true }; });
export const restoreContactInquiry = onCall(callable, async (request) => { requireAllowed(request); const id = text(request.data?.inquiryId, "inquiry", 100), ref = db.collection("contactInquiries").doc(id); await ref.update({ archived: false }); return { success: true }; });
