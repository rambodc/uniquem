// Pure rules for the Users mini app (no Firebase here, so they are easy to test).
import { HttpsError } from "firebase-functions/v2/https";
import { ASSIGNABLE_MINI_APP_IDS, EVERYONE_MINI_APP_IDS, MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES } from "./miniApps.js";
import { email } from "./core.js";
import { validateNames } from "./profile.js";
import { inviteView } from "./invite.js";

const invalid = (message) => new HttpsError("invalid-argument", message);

/** Validates the access a super admin picked. A super admin stores no mini apps (they get every one automatically);
 * staff store exactly the assigned list, which may only contain mini apps that exist and can be assigned. */
export function validateAccess(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("Choose a user type.");
  const { type, miniApps } = value;
  if (!USER_TYPES.includes(type)) throw invalid("Choose a valid user type.");
  if (type === SUPER_ADMIN) return { type, miniApps: [] };
  if (!Array.isArray(miniApps)) throw invalid("Choose the mini apps for this user.");
  for (const id of miniApps) {
    if (typeof id !== "string" || !MINI_APP_IDS.includes(id)) throw invalid("One of the chosen mini apps does not exist.");
    if (EVERYONE_MINI_APP_IDS.includes(id)) throw invalid("Everyone already has that mini app.");
    if (!ASSIGNABLE_MINI_APP_IDS.includes(id)) throw invalid("That mini app is for super admins only.");
  }
  return { type: STAFF, miniApps: ASSIGNABLE_MINI_APP_IDS.filter((id) => miniApps.includes(id)) };
}

/** Everything a super admin sets about a person: names, email and access. The photo and the password are never part of this: only the person changes those. */
export function validateUserFields(value) {
  return { ...validateNames(value), email: email(value?.email), ...validateAccess(value) };
}

/** A super admin can't delete their own account (that could lock everyone out). */
export function notYourself(actor, uid, what) { if (actor.uid === uid) throw new HttpsError("failed-precondition", `You can't ${what} your own account.`); }
/** A super admin can fix their own name, but their own email, type and mini apps need another super admin (changing them could lock everyone out).
 * `current` is the stored record, `next` the validated fields. */
export function assertSelfChangeIsSafe(actor, uid, current, next) {
  if (actor.uid !== uid) return;
  if (next.email !== current.email || next.type !== current.type || next.miniApps.join() !== current.miniApps.join()) throw new HttpsError("failed-precondition", "You can change your own name here. Ask another super admin to change your email or access.");
}

/** `records` are every user record ({ uid, type }). `after` is the changed account's new type, or null when it is being deleted.
 * Throws unless at least one super admin is left. */
export function assertSuperAdminRemains(records, uid, after) {
  const others = records.filter((record) => record.uid !== uid && record.type === SUPER_ADMIN).length;
  if (others + (after === SUPER_ADMIN ? 1 : 0) === 0) throw new HttpsError("failed-precondition", "There must always be at least one super admin.");
}

/** What the Users screen needs about one record: names, a small avatar, email and how the last invite went, never a password, the full photo or Resend's email id. */
export function userView(uid, data, lastSignInAt) {
  return { uid, firstName: data.firstName, lastName: data.lastName, thumbDataUrl: data.thumbDataUrl ?? null, email: data.email, type: data.type, miniApps: data.miniApps, createdAt: data.createdAt?.toDate?.().toISOString() ?? null, updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null, createdBy: data.createdBy, invite: inviteView(data.invite), lastSignInAt: lastSignInAt ?? null };
}
