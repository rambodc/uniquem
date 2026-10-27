import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { db, callable, requireFeature, validateInquiry, text } from "./core.js";
import { sendInquiryNotification } from "./mailer.js";

const resendApiKey = defineSecret("RESEND_API_KEY");

export const submitContactInquiry = onCall({ ...callable, secrets: [resendApiKey] }, async (request) => {
  const inquiry = validateInquiry(request.data);
  const ref = db.collection("contactInquiries").doc();
  await ref.set(inquiry);
  let notificationSent = false;
  try {
    await sendInquiryNotification({ ...inquiry, notificationTimestamp: new Date().toISOString() }, resendApiKey.value(), { inquiryId: ref.id });
    notificationSent = true;
  } catch (error) {
    globalThis.console.error("Inquiry email notification failed", error instanceof Error ? error.message : error);
  }
  return { success: true, inquiryId: ref.id, notificationSent };
});
export const listContactInquiries = onCall(callable, async (request) => { await requireFeature(request, "contact"); const archived = request.data?.archived === true, query = typeof request.data?.query === "string" ? request.data.query.trim().toLowerCase() : "", snapshot = await db.collection("contactInquiries").orderBy("createdAt", "desc").limit(500).get(); const inquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.().toISOString() || null })).filter((item) => item.archived === archived && (!query || [item.productName, item.name, item.email, item.company, item.message].some((value) => String(value || "").toLowerCase().includes(query)))); return { inquiries, total: inquiries.length, nextCursor: null }; });
export const archiveContactInquiry = onCall(callable, async (request) => { await requireFeature(request, "contact"); const id = text(request.data?.inquiryId, "inquiry", 100), ref = db.collection("contactInquiries").doc(id); await ref.update({ archived: true }); return { success: true }; });
export const restoreContactInquiry = onCall(callable, async (request) => { await requireFeature(request, "contact"); const id = text(request.data?.inquiryId, "inquiry", 100), ref = db.collection("contactInquiries").doc(id); await ref.update({ archived: false }); return { success: true }; });

// Party feature (staff only): see party-functions.js
export * from "./party-functions.js";
