// Users mini app (super admins only): create users, choose their type and mini apps, delete them, resend an invite.
// Source of truth: Firestore users/{Firebase Auth uid} = { email, type, miniApps, createdAt, createdBy, updatedAt, updatedBy }.
// Browsers never touch Firestore; these callables are the only way in. Passwords are never read, stored, logged or returned.
import { randomBytes } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db, callable, resendApiKey, requireSuperAdmin, email, text } from "./core.js";
import { sendInviteEmail } from "./mailer.js";
import { assertSuperAdminRemains, notYourself, userView, validateAccess } from "./users.js";

const users = () => db.collection("users");
const withEmail = { ...callable, secrets: [resendApiKey] };
const SIGN_IN_URL = "https://uniquem.ca/signin";
const notFound = () => new HttpsError("not-found", "That user no longer exists.");
const isMissing = (error) => error?.code === "auth/user-not-found";

/** Emails the person a one-time link to choose their own password (Firebase expires it after about an hour).
 * The link goes only into that email: it is never returned to the browser or logged. */
async function sendInvite(address, invitedBy) {
  const link = await getAuth().generatePasswordResetLink(address, { url: SIGN_IN_URL });
  await sendInviteEmail({ to: address, invitedBy, link }, resendApiKey.value());
}
async function lastSignIns(uids) {
  const result = new Map();
  for (let start = 0; start < uids.length; start += 100) {
    const { users: found } = await getAuth().getUsers(uids.slice(start, start + 100).map((uid) => ({ uid })));
    for (const account of found) result.set(account.uid, account.metadata.lastSignInTime ? new Date(account.metadata.lastSignInTime).toISOString() : null);
  }
  return result;
}
/** Runs `change` on one record inside a transaction with every user record visible, so "keep one super admin" is checked on the same data. */
function changeRecord(uid, change) {
  return db.runTransaction(async (transaction) => {
    const all = await transaction.get(users().limit(500));
    const target = all.docs.find((doc) => doc.id === uid);
    if (!target) throw notFound();
    return change({ transaction, ref: target.ref, current: target.data(), records: all.docs.map((doc) => ({ uid: doc.id, ...doc.data() })) });
  });
}

export const listUsers = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const snapshot = await users().limit(500).get(), signedIn = await lastSignIns(snapshot.docs.map((doc) => doc.id));
  const list = snapshot.docs.map((doc) => ({ ...userView(doc.id, doc.data(), signedIn.get(doc.id)), you: doc.id === actor.uid })).sort((a, b) => a.email.localeCompare(b.email));
  return { users: list };
});

/** Creates the sign-in account and the access record together, then emails the invite once.
 * If only the email fails, the user still exists and `emailSent` is false: use sendUserInvite to try again. */
export const createUser = onCall(withEmail, async (request) => {
  const actor = await requireSuperAdmin(request);
  const address = email(request.data?.email), access = validateAccess(request.data);
  const existing = await getAuth().getUserByEmail(address).then(() => true, (error) => { if (isMissing(error)) return false; throw error; });
  if (existing) throw new HttpsError("already-exists", "A user with that email already exists.");
  // Nobody knows this password: the person sets their own through the invite link. emailVerified is true because a super admin vouches for the address.
  const account = await getAuth().createUser({ email: address, password: randomBytes(32).toString("base64url"), emailVerified: true, disabled: false });
  try {
    const now = FieldValue.serverTimestamp();
    await users().doc(account.uid).create({ email: address, ...access, createdAt: now, createdBy: actor.email, updatedAt: now, updatedBy: actor.email });
  } catch (error) {
    await getAuth().deleteUser(account.uid); // never leave a sign-in account without an access record
    throw error;
  }
  let emailSent = true;
  try { await sendInvite(address, actor.email); } catch (error) { emailSent = false; globalThis.console.error("Invite email failed", error instanceof Error ? error.message : error); }
  return { uid: account.uid, email: address, emailSent };
});

/** Changes a user's type and mini apps. Super admins can change each other but never themselves. */
export const updateUser = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128), access = validateAccess(request.data);
  notYourself(actor, uid, "change");
  await changeRecord(uid, ({ transaction, ref, records }) => {
    assertSuperAdminRemains(records, uid, access.type);
    transaction.update(ref, { ...access, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.email });
  });
  return { success: true };
});

/** Permanently removes the sign-in account and the access record (access ends on the user's next call). Super admins can't delete themselves. */
export const deleteUser = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128);
  notYourself(actor, uid, "delete");
  await changeRecord(uid, ({ records }) => assertSuperAdminRemains(records, uid, null));
  await getAuth().deleteUser(uid).catch((error) => { if (!isMissing(error)) throw error; }); // first, so a failed attempt can simply be repeated
  await users().doc(uid).delete();
  return { success: true };
});

/** Emails a fresh invite (a new one-time link to choose a password) to an existing user. */
export const sendUserInvite = onCall(withEmail, async (request) => {
  const actor = await requireSuperAdmin(request);
  const snapshot = await users().doc(text(request.data?.uid, "user", 128)).get();
  if (!snapshot.exists) throw notFound();
  try { await sendInvite(snapshot.data().email, actor.email); } catch (error) { globalThis.console.error("Invite email failed", error instanceof Error ? error.message : error); throw new HttpsError("unavailable", "The invite email could not be sent. Try again."); }
  return { success: true };
});
