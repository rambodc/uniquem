import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import { resolveAccess, requireFeature } from "../core.js";
import { FEATURES, ROLES, ROLE_FEATURES, DEFAULT_ROLE, featuresFor, normalizeRole, roleCan } from "../permissions.js";

const fakeDb = (staff) => ({ collection: (name) => { assert.equal(name, "staff"); return { doc: (id) => ({ get: async () => ({ exists: id in staff, data: () => staff[id] }) }) }; } });
const request = (email, verified = true) => ({ auth: { uid: "u1", token: { email, email_verified: verified } } });
const database = fakeDb({
  "boss@uniquem.ca": { active: true, role: "admin" },
  "rambodr@uniquem.ca": { active: true, role: "staff" },
  "ann@uniquem.ca": { active: true, role: "staff" },
  "old@uniquem.ca": { active: true },
  "odd@uniquem.ca": { active: true, role: "superuser" },
  "bob@uniquem.ca": { active: false, role: "admin" },
});

test("role map is consistent: admins get every feature, staff get contact and party", () => {
  assert.deepEqual(Object.keys(ROLE_FEATURES).sort(), [...ROLES].sort());
  assert.deepEqual([...ROLE_FEATURES.admin].sort(), [...FEATURES].sort());
  assert.deepEqual(ROLE_FEATURES.staff, ["contact", "party"]);
  for (const features of Object.values(ROLE_FEATURES)) for (const feature of features) assert.ok(FEATURES.includes(feature));
  assert.equal(DEFAULT_ROLE, "staff");
});
test("unknown or missing roles are staff; helpers", () => {
  assert.equal(normalizeRole(undefined), "staff");
  assert.equal(normalizeRole("superuser"), "staff");
  assert.equal(normalizeRole(" Admin "), "admin");
  assert.deepEqual(featuresFor("admin"), FEATURES);
  assert.equal(roleCan("staff", "contact"), true);
  assert.equal(roleCan("staff", "nope"), false);
});
test("resolveAccess: roles come only from active staff documents, everyone else is denied", async () => {
  assert.deepEqual(await resolveAccess(request("RAMBODR@uniquem.ca"), database), { uid: "u1", email: "rambodr@uniquem.ca", role: "staff", features: ["contact", "party"] });
  assert.equal(await resolveAccess(request("rambodr@uniquem.ca"), fakeDb({})), null, "no hardcoded owner: no document means no access");
  assert.equal((await resolveAccess(request("Boss@uniquem.ca"), database)).role, "admin");
  assert.equal((await resolveAccess(request("ann@uniquem.ca"), database)).role, "staff");
  assert.equal((await resolveAccess(request("old@uniquem.ca"), database)).role, "staff");
  assert.equal((await resolveAccess(request("odd@uniquem.ca"), database)).role, "staff");
  assert.equal(await resolveAccess(request("bob@uniquem.ca"), database), null);
  assert.equal(await resolveAccess(request("eve@example.com"), database), null);
  assert.equal(await resolveAccess(request("ann@uniquem.ca", false), database), null);
  assert.equal(await resolveAccess(request("boss@uniquem.ca", false), database), null);
  assert.equal(await resolveAccess({}, database), null);
});
test("requireFeature: staff and admin may use contact and party; unknown features and strangers are rejected", async () => {
  for (const email of ["ann@uniquem.ca", "boss@uniquem.ca"]) for (const feature of ["contact", "party"]) assert.equal((await requireFeature(request(email), feature, database)).email, email);
  await assert.rejects(() => requireFeature(request("ann@uniquem.ca"), "users", database), /not authorized/);
  await assert.rejects(() => requireFeature(request("eve@example.com"), "party", database), /not authorized/);
  await assert.rejects(() => requireFeature({}, "contact", database), /not authorized/);
});
test("browser and server permission maps are identical", () => {
  const source = readFileSync(new URL("../../src/auth/permissions.ts", import.meta.url), "utf8");
  const list = (name) => [...source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(list("FEATURES"), FEATURES);
  assert.deepEqual(list("ROLES"), ROLES);
  assert.match(source, /admin: FEATURES,/);
  assert.match(source, new RegExp(`staff: \\[${ROLE_FEATURES.staff.map((f) => `"${f}"`).join(", ")}\\],`));
});
