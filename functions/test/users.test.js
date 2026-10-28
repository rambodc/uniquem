import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSuperAdminRemains, notYourself, userView, validateAccess } from "../users.js";

test("validateAccess: super admins store no mini apps, staff store the assigned list in registry order", () => {
  assert.deepEqual(validateAccess({ type: "super_admin", miniApps: ["party"] }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "super_admin" }), { type: "super_admin", miniApps: [] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: ["contact", "party", "party"] }), { type: "staff", miniApps: ["party", "contact"] });
  assert.deepEqual(validateAccess({ type: "staff", miniApps: [] }), { type: "staff", miniApps: [] });
});
test("validateAccess rejects unknown types, unknown mini apps, and the users mini app for staff", () => {
  for (const bad of [null, [], "staff", {}, { type: "admin", miniApps: [] }, { type: "Staff", miniApps: [] }, { type: "staff" }, { type: "staff", miniApps: "party" }, { type: "staff", miniApps: ["nope"] }, { type: "staff", miniApps: [1] }]) assert.throws(() => validateAccess(bad), /Choose|does not exist/);
  assert.throws(() => validateAccess({ type: "staff", miniApps: ["party", "users"] }), /super admins only/);
});
test("a super admin can never act on their own account", () => {
  assert.throws(() => notYourself({ uid: "a" }, "a", "deactivate"), /can't deactivate your own/);
  assert.doesNotThrow(() => notYourself({ uid: "a" }, "b", "deactivate"));
});
test("the last active super admin can't be demoted, deactivated or deleted", () => {
  const records = [{ uid: "a", type: "super_admin", active: true }, { uid: "b", type: "super_admin", active: false }, { uid: "c", type: "staff", active: true }];
  assert.throws(() => assertSuperAdminRemains(records, "a", { type: "staff", active: true }), /at least one active super admin/);
  assert.throws(() => assertSuperAdminRemains(records, "a", { type: "super_admin", active: false }), /at least one/);
  assert.throws(() => assertSuperAdminRemains(records, "a", null), /at least one/);
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "c", { type: "staff", active: false }));
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "b", { type: "super_admin", active: true }));
  assert.doesNotThrow(() => assertSuperAdminRemains(records, "c", { type: "super_admin", active: true }));
  assert.doesNotThrow(() => assertSuperAdminRemains([...records, { uid: "d", type: "super_admin", active: true }], "a", null));
});
test("userView exposes the fields the Users screen shows and no secrets", () => {
  const view = userView("u1", { email: "a@uniquem.ca", type: "staff", miniApps: ["party"], active: true, createdAt: { toDate: () => new Date("2026-10-28T12:00:00Z") }, createdBy: "boss@uniquem.ca" }, "2026-10-28T13:00:00.000Z");
  assert.deepEqual(Object.keys(view).sort(), ["active", "createdAt", "createdBy", "email", "lastSignInAt", "miniApps", "type", "uid", "updatedAt"]);
  assert.equal(view.createdAt, "2026-10-28T12:00:00.000Z");
  assert.equal(view.updatedAt, null);
});
