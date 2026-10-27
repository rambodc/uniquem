import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { featuresFor, normalizeRole, roleCan } from "./permissions.js";
export const db = getFirestore(getApps().length ? getApps()[0] : initializeApp());
export const callable = { region: "us-central1", maxInstances: 2, cors: true, enforceAppCheck: globalThis.process?.env?.FUNCTIONS_EMULATOR !== "true" };
export function text(value, field, max) { if (typeof value !== "string") throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); const result = value.trim(); if (!result || result.length > max) throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); return result; }
export function optional(value, field, max) { if (value == null || value === "") return undefined; return text(value, field, max); }
export function email(value) { const result = text(value, "email", 200).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(result)) throw new HttpsError("invalid-argument", "Enter a valid email address."); return result; }
export function validateInquiry(value) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "The inquiry is invalid."); if (value.website) throw new HttpsError("invalid-argument", "The inquiry could not be submitted."); const inquiryType = value.inquiryType === "product" ? "product" : "general", productName = optional(value.productName, "product", 120), company = optional(value.company, "company", 120), phone = optional(value.phone, "phone number", 40), inquiry = { schemaVersion: 1, inquiryType, name: text(value.name, "name", 100), message: text(value.message, "message", 3000), archived: false, createdAt: FieldValue.serverTimestamp() }; const address = value.email == null || value.email === "" ? undefined : email(value.email); if (!address && !phone) throw new HttpsError("invalid-argument", "Enter an email address or a phone number."); if (address) inquiry.email = address; if (productName) inquiry.productName = productName; if (company) inquiry.company = company; if (phone) inquiry.phone = phone; return inquiry; }

// Access for the private workspace. There is no hardcoded owner: every account needs a verified email and an active
// Firestore document staff/{lowercase email} = { active: true, role: "admin" | "staff" }. A missing or unknown role
// means "staff". Roles and features are defined in permissions.js. The first admin is created by hand in the console.
export async function resolveAccess(request, database = db) {
  const token = request.auth?.token;
  if (!token?.email || token.email_verified !== true) return null;
  const address = token.email.toLowerCase();
  const snapshot = await database.collection("staff").doc(address).get();
  if (!snapshot.exists || snapshot.data()?.active !== true) return null;
  const role = normalizeRole(snapshot.data()?.role);
  return { uid: request.auth.uid, email: address, role, features: featuresFor(role) };
}
/** Throws "not authorized" unless the signed-in, verified account's role includes `feature`. */
export async function requireFeature(request, feature, database = db) {
  const access = await resolveAccess(request, database);
  if (!access || !roleCan(access.role, feature)) throw new HttpsError("permission-denied", "This account is not authorized.");
  return access;
}
