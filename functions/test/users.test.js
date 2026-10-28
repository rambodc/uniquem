import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSuperAdminRemains, notYourself, userView, validateAccess } from "../users.js";

test("validateAccess: super admins store no mini apps, staff store the assigned list in registry order", () => {
  assert.deepEqual(validateAccess({ type: "super_admin", miniApps: ["party"] }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "super_admin" }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: ["contact", "party", "party"] }), { type: "staff", miniApps: ["party", "contact"] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: [] }), { type: "staff", miniApps: [] });
});
test("validateAccess rejects unknown types, unknown mini apps, and the users mini app for staff (it can only ever belong to super admins)", () => {
  for (const bad of [null, [], "staff", {}, { type: "admin", miniApps: [] }, { type: "Staff", miniApps: [] }, { type: "staff" }, { type: "staff", miniApps: "party" }, { type: "staff", miniApps: ["nope"] }, { type: "staff", miniApps: [1] }]) assert.throws(() => validateAccess(bad), /Choose|does not exist/);
  assert.throws(() => validateAccess({ type: "staff", miniApps: ["party", "users"] }), /super admins only/);
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
test("userView exposes the fields the Users screen shows and no secrets", () => {
  const view = userView("u1", { email: "a@uniquem.ca", type: "staff", miniApps: ["party"], createdAt: { toDate: () => new Date("2026-10-28T12:00:00Z") }, createdBy: "boss@uniquem.ca" }, "2026-10-28T13:00:00.000Z");
  assert.deepEqual(Object.keys(view).sort(), ["createdAt", "createdBy", "email", "lastSignInAt", "miniApps", "type", "uid", "updatedAt"]);
  assert.equal(view.createdAt, "2026-10-28T12:00:00.000Z");
  assert.equal(view.updatedAt, null);
});
