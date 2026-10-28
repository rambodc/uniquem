import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import { resolveAccess, requireMiniApp, requireSuperAdmin } from "../core.js";
import { ASSIGNABLE_MINI_APP_IDS, MINI_APPS, MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES, miniAppsFor } from "../miniApps.js";

// users/{uid} records, keyed by Auth uid.
const fakeDb = (records) => ({ collection: (name) => { assert.equal(name, "users"); return { doc: (id) => ({ get: async () => ({ exists: id in records, data: () => records[id] }) }) }; } });
const request = (uid, email, verified = true) => ({ auth: { uid, token: { email, email_verified: verified } } });
const database = fakeDb({
  boss: { email: "boss@uniquem.ca", type: "super_admin", miniApps: [], active: true },
  ann: { email: "ann@uniquem.ca", type: "staff", miniApps: ["party"], active: true },
  both: { email: "both@uniquem.ca", type: "staff", miniApps: ["party", "contact"], active: true },
  none: { email: "none@uniquem.ca", type: "staff", miniApps: [], active: true },
  sneaky: { email: "sneaky@uniquem.ca", type: "staff", miniApps: ["party", "users", "nope"], active: true },
  odd: { email: "odd@uniquem.ca", type: "superuser", miniApps: ["party"], active: true },
  untyped: { email: "untyped@uniquem.ca", miniApps: ["party"], active: true },
  off: { email: "off@uniquem.ca", type: "super_admin", miniApps: [], active: false },
  moved: { email: "someone-else@uniquem.ca", type: "super_admin", miniApps: [], active: true },
});

test("registry is the single source: ids are unique, every entry is complete, only super-admin-only apps are withheld", () => {
  assert.deepEqual([...MINI_APP_IDS].sort(), ["contact", "party", "users"]);
  assert.equal(new Set(MINI_APP_IDS).size, MINI_APPS.length);
  for (const app of MINI_APPS) {
    for (const key of ["id", "name", "description", "route", "icon"]) assert.equal(typeof app[key], "string", `${app.id}.${key}`);
    assert.match(app.route, /^\/[a-z-]+$/);
    assert.equal(typeof app.superAdminOnly, "boolean");
  }
  assert.equal(new Set(MINI_APPS.map((app) => app.route)).size, MINI_APPS.length, "one route each");
  assert.deepEqual(ASSIGNABLE_MINI_APP_IDS, ["party", "contact"]);
  assert.equal(MINI_APPS.find((app) => app.id === "users").superAdminOnly, true);
  assert.deepEqual([...USER_TYPES], ["super_admin", "staff"]);
});
test("miniAppsFor: super admins get every mini app, staff only the assigned assignable ones", () => {
  assert.deepEqual(miniAppsFor(SUPER_ADMIN, []), MINI_APP_IDS);
  assert.deepEqual(miniAppsFor(SUPER_ADMIN, undefined), MINI_APP_IDS);
  assert.deepEqual(miniAppsFor(STAFF, ["contact"]), ["contact"]);
  assert.deepEqual(miniAppsFor(STAFF, ["users", "party", "nope"]), ["party"], "users can never be assigned");
  assert.deepEqual(miniAppsFor(STAFF, []), []);
  assert.deepEqual(miniAppsFor(STAFF, undefined), []);

});
test("resolveAccess: access comes only from an active users/{uid} record that matches the signed-in email", async () => {
  assert.deepEqual(await resolveAccess(request("ann", "ANN@uniquem.ca"), database), { uid: "ann", email: "ann@uniquem.ca", type: "staff", miniApps: ["party"] });
  assert.deepEqual((await resolveAccess(request("boss", "boss@uniquem.ca"), database)).miniApps, MINI_APP_IDS);
  assert.deepEqual((await resolveAccess(request("sneaky", "sneaky@uniquem.ca"), database)).miniApps, ["party"]);
  assert.deepEqual((await resolveAccess(request("none", "none@uniquem.ca"), database)).miniApps, []);
  assert.equal(await resolveAccess(request("ann", "ann@uniquem.ca"), fakeDb({})), null, "no record: no access, no hardcoded owner");
  for (const uid of ["odd", "untyped", "off"]) assert.equal(await resolveAccess(request(uid, `${uid}@uniquem.ca`), database), null, `${uid}: bad type or inactive`);
  assert.equal(await resolveAccess(request("moved", "boss@uniquem.ca"), database), null, "record email must match the account's email");
  assert.equal(await resolveAccess(request("ann", "ann@uniquem.ca", false), database), null, "unverified email");
  assert.equal(await resolveAccess(request("stranger", "eve@example.com"), database), null);
  assert.equal(await resolveAccess({}, database), null);
});
test("requireMiniApp: staff only get what is assigned; super admins get everything; nobody else gets in", async () => {
  assert.equal((await requireMiniApp(request("ann", "ann@uniquem.ca"), "party", database)).email, "ann@uniquem.ca");
  await assert.rejects(() => requireMiniApp(request("ann", "ann@uniquem.ca"), "contact", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("both", "both@uniquem.ca"), "users", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("sneaky", "sneaky@uniquem.ca"), "users", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("none", "none@uniquem.ca"), "party", database), /not authorized/);
  for (const id of MINI_APP_IDS) assert.equal((await requireMiniApp(request("boss", "boss@uniquem.ca"), id, database)).type, "super_admin");
  await assert.rejects(() => requireMiniApp(request("off", "off@uniquem.ca"), "party", database), /not authorized/);
  await assert.rejects(() => requireMiniApp({}, "party", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("boss", "boss@uniquem.ca"), "typo", database), /Unknown mini app/);
});
test("requireSuperAdmin: only active super admins", async () => {
  assert.equal((await requireSuperAdmin(request("boss", "boss@uniquem.ca"), database)).uid, "boss");
  for (const [uid, email] of [["ann", "ann@uniquem.ca"], ["both", "both@uniquem.ca"], ["off", "off@uniquem.ca"], ["stranger", "eve@example.com"]]) await assert.rejects(() => requireSuperAdmin(request(uid, email), database), /not authorized/);
  await assert.rejects(() => requireSuperAdmin({}, database), /not authorized/);
});

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("every callable is guarded: contact and party by requireMiniApp, users by requireSuperAdmin, only the three open ones unguarded", () => {
  const sources = { "../index.js": read("../index.js"), "../party-functions.js": read("../party-functions.js"), "../users-functions.js": read("../users-functions.js") };
  const open = new Set(["submitContactInquiry", "getAccess"]);
  for (const [file, source] of Object.entries(sources)) {
    const parts = source.split(/export const (\w+) = onCall\(/).slice(1);
    for (let i = 0; i < parts.length; i += 2) {
      const [name, body] = [parts[i], parts[i + 1].split(/\nexport const /)[0]];
      if (open.has(name)) continue;
      const guard = file.includes("users") ? /requireSuperAdmin\(request\)/ : /requireMiniApp\(request, "(party|contact)"\)/;
      assert.match(body, guard, `${name} in ${file} must check access first`);
    }
  }
});
test("no code checks roles ad hoc: access decisions live in miniApps.js and core.js only", () => {
  const files = readdirSync(new URL("..", import.meta.url)).filter((name) => name.endsWith(".js") && !["miniApps.js", "core.js", "users.js", "eslint.config.mjs"].includes(name));
  for (const name of files) {
    const source = read(`../${name}`);
    assert.doesNotMatch(source, /super_admin|SUPER_ADMIN|\.type\s*[!=]==\s*"(staff|super_admin)"|\.role\b|requireFeature|STAFF\b/, `${name} must use requireMiniApp / requireSuperAdmin`);
  }
});
test("browser registry is imported from this file, not copied", () => {
  const browser = read("../../src/auth/miniApps.ts");
  assert.match(browser, /from "..\/..\/functions\/miniApps.js"/);
  assert.doesNotMatch(browser, /superAdminOnly:\s*(true|false)/);
});
