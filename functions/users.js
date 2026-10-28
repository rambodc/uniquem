// Pure rules for the Users mini app (no Firebase here, so they are easy to test).
import { HttpsError } from "firebase-functions/v2/https";
import { ASSIGNABLE_MINI_APP_IDS, MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES } from "./miniApps.js";

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
    if (!ASSIGNABLE_MINI_APP_IDS.includes(id)) throw invalid("That mini app is for super admins only.");
  }
  return { type: STAFF, miniApps: ASSIGNABLE_MINI_APP_IDS.filter((id) => miniApps.includes(id)) };
}

/** A super admin can't change, deactivate or delete their own account (that could lock everyone out). */
export function notYourself(actor, uid, what) { if (actor.uid === uid) throw new HttpsError("failed-precondition", `You can't ${what} your own account.`); }

/** `records` are every user record ({ uid, type, active }). `after` is how the changed account will look ({ type, active }),
 * or null when it is being deleted. Throws unless at least one active super admin is left. */
export function assertSuperAdminRemains(records, uid, after) {
  const others = records.filter((record) => record.uid !== uid && record.active === true && record.type === SUPER_ADMIN).length;
  const changed = after && after.active === true && after.type === SUPER_ADMIN ? 1 : 0;
  if (others + changed === 0) throw new HttpsError("failed-precondition", "There must always be at least one active super admin.");
}

/** What the Users screen needs about one record. */
export function userView(uid, data, lastSignInAt) {
  return { uid, email: data.email, type: data.type, miniApps: data.miniApps, active: data.active, createdAt: data.createdAt?.toDate?.().toISOString() ?? null, updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null, createdBy: data.createdBy, lastSignInAt: lastSignInAt ?? null };
}
