// Users mini app (super admins only): create users, choose their type and mini apps, deactivate, reactivate, delete.
// Source of truth: Firestore users/{Firebase Auth uid} = { email, type, miniApps, active, createdAt, createdBy, updatedAt, updatedBy }.
// Browsers never touch Firestore; these callables are the only way in. Passwords are never read, stored, logged or returned.
import { randomBytes } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db, callable, requireSuperAdmin, email, text } from "./core.js";
import { assertSuperAdminRemains, notYourself, userView, validateAccess } from "./users.js";

const users = () => db.collection("users");
const SIGN_IN_URL = "https://uniquem.ca/signin";
const notFound = () => new HttpsError("not-found", "That user no longer exists.");
const isMissing = (error) => error?.code === "auth/user-not-found";

/** A one-time link that lets the person choose their own password (and then sign in). It is returned to the super admin
 * who asked for it, never emailed from here and never logged. Firebase expires it after about an hour. */
const signInLink = (address) => getAuth().generatePasswordResetLink(address, { url: SIGN_IN_URL });

async function recordOf(uid) {
  const snapshot = await users().doc(uid).get();
  if (!snapshot.exists) throw notFound();
  return snapshot;
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

/** Creates the sign-in account and the access record together. Returns a one-time link for the new user to set a password. */
export const createUser = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const address = email(request.data?.email), access = validateAccess(request.data);
  const existing = await getAuth().getUserByEmail(address).then(() => true, (error) => { if (isMissing(error)) return false; throw error; });
  if (existing) throw new HttpsError("already-exists", "A user with that email already exists.");
  // Nobody knows this password: the person sets their own through the link. emailVerified is true because a super admin vouches for the address.
  const account = await getAuth().createUser({ email: address, password: randomBytes(32).toString("base64url"), emailVerified: true, disabled: false });
  try {
    const link = await signInLink(address);
    const now = FieldValue.serverTimestamp();
    await users().doc(account.uid).create({ email: address, ...access, active: true, createdAt: now, createdBy: actor.email, updatedAt: now, updatedBy: actor.email });
    return { uid: account.uid, email: address, link };
  } catch (error) {
    await getAuth().deleteUser(account.uid); // never leave a sign-in account without an access record
    throw error;
  }
});

/** Changes a user's type and mini apps. Super admins can't change themselves. */
export const updateUser = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128), access = validateAccess(request.data);
  notYourself(actor, uid, "change");
  await changeRecord(uid, ({ transaction, ref, current, records }) => {
    assertSuperAdminRemains(records, uid, { type: access.type, active: current.active });
    transaction.update(ref, { ...access, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.email });
  });
  return { success: true };
});

/** Deactivating blocks every sign-in and API call at once (access is checked on each call); reactivating restores the record as it was. */
export const setUserActive = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128);
  if (typeof request.data?.active !== "boolean") throw new HttpsError("invalid-argument", "Choose whether the user is active.");
  const active = request.data.active;
  notYourself(actor, uid, "deactivate");
  await changeRecord(uid, ({ transaction, ref, current, records }) => {
    assertSuperAdminRemains(records, uid, { type: current.type, active });
    transaction.update(ref, { active, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.email });
  });
  await getAuth().updateUser(uid, { disabled: !active });
  if (!active) await getAuth().revokeRefreshTokens(uid);
  return { success: true };
});

/** Permanently removes the sign-in account and the record. Only a deactivated user can be deleted. */
export const deleteUser = onCall(callable, async (request) => {
  const actor = await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128);
  notYourself(actor, uid, "delete");
  await changeRecord(uid, ({ current, records }) => {
    if (current.active) throw new HttpsError("failed-precondition", "Deactivate this user before deleting them.");
    assertSuperAdminRemains(records, uid, null);
  });
  await getAuth().deleteUser(uid).catch((error) => { if (!isMissing(error)) throw error; });
  await users().doc(uid).delete();
  return { success: true };
});

/** A fresh one-time link for an active user who has not set a password yet or has forgotten it. */
export const createSignInLink = onCall(callable, async (request) => {
  await requireSuperAdmin(request);
  const uid = text(request.data?.uid, "user", 128), record = (await recordOf(uid)).data();
  if (record.active !== true) throw new HttpsError("failed-precondition", "Reactivate this user first.");
  return { link: await signInLink(record.email) };
});
