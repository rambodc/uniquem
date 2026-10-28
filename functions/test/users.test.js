import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSelfChangeIsSafe, assertSuperAdminRemains, notYourself, userView, validateAccess, validateUserFields } from "../users.js";

test("validateAccess: super admins store no mini apps, staff store the assigned list in registry order", () => {
  assert.deepEqual(validateAccess({ type: "super_admin", miniApps: ["party"] }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "super_admin" }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: ["contact", "party", "party"] }), { type: "staff", miniApps: ["party", "contact"] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: [] }), { type: "staff", miniApps: [] });
});
test("validateAccess rejects unknown types, unknown mini apps, and the users mini app for staff (it can only ever belong to super admins)", () => {
  for (const bad of [null, [], "staff", {}, { type: "admin", miniApps: [] }, { type: "Staff", miniApps: [] }, { type: "staff" }, { type: "staff", miniApps: "party" }, { type: "staff", miniApps: ["nope"] }, { type: "staff", miniApps: [1] }]) assert.throws(() => validateAccess(bad), /Choose|does not exist/);
  assert.throws(() => validateAccess({ type: "staff", miniApps: ["party", "users"] }), /super admins only/);
  assert.throws(() => validateAccess({ type: "staff", miniApps: ["party", "profile"] }), /Everyone already has/, "Profile is never assigned: everyone has it");
});
test("a super admin can never act on their own account", () => {
  assert.throws(() => notYourself({ uid: "a" }, "a", "delete"), /can't delete your own/);
  assert.doesNotThrow(() => notYourself({ uid: "a" }, "b", "delete"));
});
test("the last super admin can't be demoted or deleted; super admins can change each other", () => {
  const records = [{ uid: "a", type: "super_admin" }, { uid: "b", type: "staff" }];
  assert.throws(() => assertSuperAdminRemains(records, "a", "staff"), /at least one super admin/);
  assert.throws(() => assertSuperAdminRemains(records, "a", null), /at least one/);
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "a", "super_admin"));
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "b", null));
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "b", "super_admin"));
  const two = [...records, { uid: "c", type: "super_admin" }];
  assert.doesNotThrow(() => assertSuperAdminRemains(two, "a", "staff"), "another super admin can demote one");
  assert.doesNotThrow(() => assertSuperAdminRemains(two, "c", null), "another super admin can delete one");
  assert.throws(() => assertSuperAdminRemains([{ uid: "a", type: "staff" }], "a", null), /at least one/);
});
test("validateUserFields: names, email and access together; names are trimmed, required and bounded; email is lowercased", () => {
  const ok = validateUserFields({ firstName: "  Ana  Maria ", lastName: "O'Neil-Smith", email: " ANA@Uniquem.ca ", type: "staff", miniApps: ["contact"] });
  assert.deepEqual(ok, { firstName: "Ana Maria", lastName: "O'Neil-Smith", email: "ana@uniquem.ca", type: "staff", miniApps: ["contact"] });
  assert.equal(validateUserFields({ firstName: "Rambod", lastName: "Rad (test)", email: "r@uniquem.ca", type: "super_admin" }).lastName, "Rad (test)");
  const base = { firstName: "A", lastName: "B", email: "a@b.co", type: "staff", miniApps: [] };
  for (const bad of [{ firstName: "" }, { firstName: "   " }, { lastName: undefined }, { lastName: 5 }, { firstName: "x".repeat(61) }, { lastName: "Bad\u0000Name" }, { email: "nope" }, { email: "" }, { type: "boss" }]) assert.throws(() => validateUserFields({ ...base, ...bad }), /Enter|must be|not allowed|Choose/, JSON.stringify(bad));
  assert.doesNotThrow(() => validateUserFields({ ...base, firstName: "x".repeat(60) }));
  assert.throws(() => validateUserFields(null), /Enter/);
});
test("validateUserFields takes no password and no photo: those keys are ignored if sent", () => {
  const out = validateUserFields({ firstName: "A", lastName: "B", email: "a@b.co", type: "staff", miniApps: [], password: "hunter22!", photo: "AAAA", thumbDataUrl: "x", photoPath: "y" });
  assert.deepEqual(Object.keys(out).sort(), ["email", "firstName", "lastName", "miniApps", "type"]);
});
test("a super admin can fix their own name but not their own email, type or mini apps", () => {
  const current = { email: "me@uniquem.ca", type: "super_admin", miniApps: [] }, same = { email: "me@uniquem.ca", type: "super_admin", miniApps: [] };
  assert.doesNotThrow(() => assertSelfChangeIsSafe({ uid: "me" }, "me", current, same));
  assert.throws(() => assertSelfChangeIsSafe({ uid: "me" }, "me", current, { ...same, email: "new@uniquem.ca" }), /another super admin/);
  assert.throws(() => assertSelfChangeIsSafe({ uid: "me" }, "me", current, { ...same, type: "staff" }), /another super admin/);
  assert.throws(() => assertSelfChangeIsSafe({ uid: "me" }, "me", current, { ...same, miniApps: ["party"] }), /another super admin/);
  assert.doesNotThrow(() => assertSelfChangeIsSafe({ uid: "boss" }, "me", current, { ...same, email: "new@uniquem.ca", type: "staff", miniApps: ["party"] }), "another super admin may change anything");
});
test("userView exposes the fields the Users screen shows (names, small avatar, email) and no secrets or full photo", () => {
  const view = userView("u1", { email: "a@uniquem.ca", firstName: "Ann", lastName: "Lee", photoPath: "profile-photos/u1/avatar.jpg", thumbDataUrl: "data:image/jpeg;base64,AAAA", type: "staff", miniApps: ["party"], createdAt: { toDate: () => new Date("2026-10-28T12:00:00Z") }, createdBy: "boss@uniquem.ca" }, "2026-10-28T13:00:00.000Z");
  assert.deepEqual(Object.keys(view).sort(), ["createdAt", "createdBy", "email", "firstName", "lastName", "lastSignInAt", "miniApps", "thumbDataUrl", "type", "uid", "updatedAt"]);
  assert.equal(view.createdAt, "2026-10-28T12:00:00.000Z");
  assert.equal(view.updatedAt, null);
});
