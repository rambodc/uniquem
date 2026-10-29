import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { MINI_APP_IDS, SUPER_ADMIN, USER_TYPES, miniAppsFor } from "./miniApps.js";
import { hasNames, profileView } from "./profile.js";
/** Key for the Resend email API (inquiry notifications and user invites). Never logged. */
export const resendApiKey = defineSecret("RESEND_API_KEY");
export const db = getFirestore(getApps().length ? getApps()[0] : initializeApp());
export const callable = { region: "us-central1", maxInstances: 2, cors: true, enforceAppCheck: globalThis.process?.env?.FUNCTIONS_EMULATOR !== "true" };
export function text(value, field, max) { if (typeof value !== "string") throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); const result = value.trim(); if (!result || result.length > max) throw new HttpsError("invalid-argument", `Enter a valid ${field}.`); return result; }
export function optional(value, field, max) { if (value == null || value === "") return undefined; return text(value, field, max); }
export function email(value) { const result = text(value, "email", 200).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(result)) throw new HttpsError("invalid-argument", "Enter a valid email address."); return result; }
export function validateInquiry(value) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpsError("invalid-argument", "The inquiry is invalid."); if (value.website) throw new HttpsError("invalid-argument", "The inquiry could not be submitted."); const inquiryType = value.inquiryType === "product" ? "product" : "general", productName = optional(value.productName, "product", 120), company = optional(value.company, "company", 120), phone = optional(value.phone, "phone number", 40), inquiry = { schemaVersion: 1, inquiryType, name: text(value.name, "name", 100), message: text(value.message, "message", 3000), archived: false, createdAt: FieldValue.serverTimestamp() }; const address = value.email == null || value.email === "" ? undefined : email(value.email); if (!address && !phone) throw new HttpsError("invalid-argument", "Enter an email address or a phone number."); if (address) inquiry.email = address; if (productName) inquiry.productName = productName; if (company) inquiry.company = company; if (phone) inquiry.phone = phone; return inquiry; }

// Access for the private workspace. There is no hardcoded owner: every account needs a verified email and an active
// record at users/{Firebase Auth uid} = { email, firstName, lastName, type: "super_admin" | "staff", miniApps: string[], photoPath, thumbDataUrl,
// invite (see invite.js), createdAt, createdBy, updatedAt, updatedBy }.
// A super admin can open every mini app in miniApps.js; staff can open the mini apps everyone has (Profile) plus the ones listed on their record.
// A record that is missing, for another email, without both names, or with an unknown type means no access: nothing is guessed or defaulted.
// Removing a user deletes the record (and the sign-in account), so access ends on their very next call.
export async function resolveAccess(request, database = db) {
  const token = request.auth?.token;
  if (!token?.email || token.email_verified !== true) return null;
  const address = token.email.toLowerCase();
  const snapshot = await database.collection("users").doc(request.auth.uid).get();
  if (!snapshot.exists) return null;
  const record = snapshot.data();
  if (record.email !== address || !USER_TYPES.includes(record.type) || !hasNames(record)) return null;
  return { uid: request.auth.uid, email: address, type: record.type, miniApps: miniAppsFor(record.type, record.miniApps), profile: profileView(record) };
}
/** Throws "not authorized" unless the signed-in, verified account may open the mini app `appId`. */
export async function requireMiniApp(request, appId, database = db) {
  if (!MINI_APP_IDS.includes(appId)) throw new Error(`Unknown mini app: ${appId}`);
  const access = await resolveAccess(request, database);
  if (!access || !access.miniApps.includes(appId)) throw new HttpsError("permission-denied", "This account is not authorized.");
  return access;
}
/** Throws "not authorized" unless the signed-in, verified account is a super admin. */
export async function requireSuperAdmin(request, database = db) {
  const access = await resolveAccess(request, database);
  if (!access || access.type !== SUPER_ADMIN) throw new HttpsError("permission-denied", "This account is not authorized.");
  return access;
}
