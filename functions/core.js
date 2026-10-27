import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
export const db = getFirestore(getApps().length ? getApps()[0] : initializeApp());
export const ALLOWED_EMAIL = "rambodr@uniquem.ca";
export const callable = { region: "us-central1", maxInstances: 2, cors: true, enforceAppCheck: globalThis.process?.env?.FUNCTIONS_EMULATOR !== "true" };
export function text(value, field, max) { if (typeof value !== "string") throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); const result = value.trim(); if (!result || result.length > max) throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); return result; }
export function optional(value, field, max) { if (value == null || value === "") return undefined; return text(value, field, max); }
export function email(value) { const result = text(value, "email", 200).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(result)) throw new HttpsError("invalid-argument", "Enter a valid email address."); return result; }
export function requireAllowed(request) { const identity = request.auth; if (!identity?.token?.email || identity.token.email.toLowerCase() !== ALLOWED_EMAIL || identity.token.email_verified !== true) throw new HttpsError("permission-denied", "This account is not authorized."); return identity.uid; }
export function validateInquiry(value) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "The inquiry is invalid."); if (value.website) throw new HttpsError("invalid-argument", "The inquiry could not be submitted."); const inquiryType = value.inquiryType === "product" ? "product" : "general", productName = optional(value.productName, "product", 120), company = optional(value.company, "company", 120), phone = optional(value.phone, "phone number", 40), inquiry = { schemaVersion: 1, inquiryType, name: text(value.name, "name", 100), message: text(value.message, "message", 3000), archived: false, createdAt: FieldValue.serverTimestamp() }; const address = value.email == null || value.email === "" ? undefined : email(value.email); if (!address && !phone) throw new HttpsError("invalid-argument", "Enter an email address or a phone number."); if (address) inquiry.email = address; if (productName) inquiry.productName = productName; if (company) inquiry.company = company; if (phone) inquiry.phone = phone; return inquiry; }

// Staff access for the private workspace (Party). The owner account above always has access.
// Additional staff are added by the owner as Firestore documents: staff/{lowercase email} = { active: true }.
// Nothing here reads or changes who can open the contact inbox (requireAllowed above).
export function isOwnerToken(token) { return Boolean(token?.email && token.email.toLowerCase() === ALLOWED_EMAIL && token.email_verified === true); }
export async function staffAccess(request, database = db) {
  const token = request.auth?.token;
  if (!token?.email || token.email_verified !== true) return null;
  const address = token.email.toLowerCase();
  if (address === ALLOWED_EMAIL) return { uid: request.auth.uid, email: address, owner: true };
  const snapshot = await database.collection("staff").doc(address).get();
  return snapshot.exists && snapshot.data()?.active === true ? { uid: request.auth.uid, email: address, owner: false } : null;
}
export async function requireStaff(request, database = db) { const access = await staffAccess(request, database); if (!access) throw new HttpsError("permission-denied", "This account is not authorized."); return access; }
