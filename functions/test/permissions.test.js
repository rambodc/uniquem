import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { URL } from "node:url";
import { resolveAccess, requireMiniApp, requireSuperAdmin } from "../core.js";
import { ASSIGNABLE_MINI_APP_IDS, EVERYONE_MINI_APP_IDS, MINI_APPS, MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES, miniAppsFor } from "../miniApps.js";

// users/{uid} records, keyed by Auth uid.
const fakeDb = (records) => ({ collection: (name) => { assert.equal(name, "users"); return { doc: (id) => ({ get: async () => ({ exists: id in records, data: () => records[id] }) }) }; } });
const request = (uid, email, verified = true) => ({ auth: { uid, token: { email, email_verified: verified } } });
const named = (fields) => ({ firstName: "Test", lastName: "Person", photoPath: null, thumbDataUrl: null, ...fields });
const database = fakeDb({
  boss: named({ email: "boss@uniquem.ca", type: "super_admin", miniApps: [] }),
  ann: named({ email: "ann@uniquem.ca", type: "staff", miniApps: ["party"] }),
  both: named({ email: "both@uniquem.ca", type: "staff", miniApps: ["party", "contact"] }),
  none: named({ email: "none@uniquem.ca", type: "staff", miniApps: [] }),
  sneaky: named({ email: "sneaky@uniquem.ca", type: "staff", miniApps: ["party", "users", "profile", "nope"] }),
  odd: named({ email: "odd@uniquem.ca", type: "superuser", miniApps: ["party"] }),
  untyped: named({ email: "untyped@uniquem.ca", miniApps: ["party"] }),
  moved: named({ email: "someone-else@uniquem.ca", type: "super_admin", miniApps: [] }),
  nameless: { email: "nameless@uniquem.ca", type: "staff", miniApps: ["party"] },
  halfnamed: { email: "half@uniquem.ca", firstName: "Half", type: "staff", miniApps: ["party"] },
  untrimmed: named({ email: "untrimmed@uniquem.ca", firstName: " Pat", type: "staff", miniApps: [] }),
});

test("registry is the single source: ids are unique, every entry is complete, only super-admin-only apps are withheld", () => {
  assert.deepEqual([...MINI_APP_IDS].sort(), ["contact", "party", "profile", "users"]);
  assert.equal(new Set(MINI_APP_IDS).size, MINI_APPS.length);
  for (const app of MINI_APPS) {
    for (const key of ["id", "name", "description", "route", "icon", "accent"]) assert.equal(typeof app[key], "string", `${app.id}.${key}`);
    assert.match(app.route, /^\/[a-z-]+$/);
    assert.match(app.accent, /^#[0-9a-f]{6}$/);
    for (const key of ["superAdminOnly", "everyone"]) assert.equal(typeof app[key], "boolean", `${app.id}.${key}`);
    assert.equal(app.superAdminOnly && app.everyone, false, `${app.id} can't be both super-admin-only and for everyone`);
  }
  assert.equal(new Set(MINI_APPS.map((app) => app.route)).size, MINI_APPS.length, "one route each");
  assert.deepEqual(ASSIGNABLE_MINI_APP_IDS, ["party", "contact"], "neither users (super admins only) nor profile (everyone) is ever assigned");
  assert.deepEqual(EVERYONE_MINI_APP_IDS, ["profile"]);
  assert.equal(MINI_APPS.find((app) => app.id === "users").superAdminOnly, true);
  assert.equal(MINI_APPS.find((app) => app.id === "profile").everyone, true);
  assert.deepEqual([...USER_TYPES], ["super_admin", "staff"]);
});
test("miniAppsFor: super admins get every mini app; staff get what everyone has plus the assigned assignable ones, in registry order", () => {
  assert.deepEqual(miniAppsFor(SUPER_ADMIN, []), MINI_APP_IDS);
  assert.deepEqual(miniAppsFor(SUPER_ADMIN, undefined), MINI_APP_IDS);
  assert.deepEqual(miniAppsFor(STAFF, ["contact"]), ["contact", "profile"]);
  assert.deepEqual(miniAppsFor(STAFF, ["contact", "party"]), ["party", "contact", "profile"]);
  assert.deepEqual(miniAppsFor(STAFF, ["users", "party", "nope"]), ["party", "profile"], "users can never be assigned");
  assert.deepEqual(miniAppsFor(STAFF, []), ["profile"], "everyone has Profile, even with nothing assigned");
  assert.deepEqual(miniAppsFor(STAFF, undefined), ["profile"]);
  assert.deepEqual(miniAppsFor(STAFF, ["profile"]), ["profile"], "assigning Profile changes nothing");
});
test("resolveAccess: access comes only from a users/{uid} record that matches the signed-in email", async () => {
  assert.deepEqual(await resolveAccess(request("ann", "ANN@uniquem.ca"), database), { uid: "ann", email: "ann@uniquem.ca", type: "staff", miniApps: ["party", "profile"], profile: { firstName: "Test", lastName: "Person", email: "ann@uniquem.ca", thumbDataUrl: null } });
  assert.deepEqual((await resolveAccess(request("boss", "boss@uniquem.ca"), database)).miniApps, MINI_APP_IDS);
  assert.deepEqual((await resolveAccess(request("sneaky", "sneaky@uniquem.ca"), database)).miniApps, ["party", "profile"]);
  assert.deepEqual((await resolveAccess(request("none", "none@uniquem.ca"), database)).miniApps, ["profile"], "a user with no assigned mini apps still has Profile");
  for (const [uid, address] of [["nameless", "nameless@uniquem.ca"], ["halfnamed", "half@uniquem.ca"], ["untrimmed", "untrimmed@uniquem.ca"]]) assert.equal(await resolveAccess(request(uid, address), database), null, `${uid}: a record without both stored names is not on the current schema`);
  assert.equal(await resolveAccess(request("ann", "ann@uniquem.ca"), fakeDb({})), null, "no record: no access, no hardcoded owner");
  for (const uid of ["odd", "untyped"]) assert.equal(await resolveAccess(request(uid, `${uid}@uniquem.ca`), database), null, `${uid}: unknown or missing type`);
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
  for (const uid of ["ann", "both", "none", "boss"]) assert.equal((await requireMiniApp(request(uid, `${uid}@uniquem.ca`), "profile", database)).uid, uid, `${uid} has Profile`);
  await assert.rejects(() => requireMiniApp({}, "profile", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("stranger", "eve@example.com"), "profile", database), /not authorized/);
  for (const id of MINI_APP_IDS) assert.equal((await requireMiniApp(request("boss", "boss@uniquem.ca"), id, database)).type, "super_admin");
  await assert.rejects(() => requireMiniApp({}, "party", database), /not authorized/);
  await assert.rejects(() => requireMiniApp(request("boss", "boss@uniquem.ca"), "typo", database), /Unknown mini app/);
});
test("requireSuperAdmin: only super admins", async () => {
  assert.equal((await requireSuperAdmin(request("boss", "boss@uniquem.ca"), database)).uid, "boss");
  for (const [uid, email] of [["ann", "ann@uniquem.ca"], ["both", "both@uniquem.ca"], ["stranger", "eve@example.com"]]) await assert.rejects(() => requireSuperAdmin(request(uid, email), database), /not authorized/);
  await assert.rejects(() => requireSuperAdmin({}, database), /not authorized/);
});

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const callables = (source) => source.split(/export const (\w+) = onCall\(/).slice(1).reduce((all, part, i, parts) => i % 2 === 0 ? [...all, { name: part, body: parts[i + 1].split(/\n(?:\/\*\*|export const )/)[0] }] : all, []);
test("every callable is guarded: contact and party by requireMiniApp, profile by requireMiniApp(profile), users by requireSuperAdmin; only submitContactInquiry and getAccess are open", () => {
  const sources = { "../index.js": read("../index.js"), "../party-functions.js": read("../party-functions.js"), "../profile-functions.js": read("../profile-functions.js"), "../users-functions.js": read("../users-functions.js") };
  const open = new Set(["submitContactInquiry", "getAccess"]);
  for (const [file, source] of Object.entries(sources)) {
    for (const { name, body } of callables(source)) {
      if (open.has(name)) continue;
      const guard = file.includes("users") ? /requireSuperAdmin\(request\)/ : file.includes("profile") ? /requireMiniApp\(request, "profile"\)/ : /requireMiniApp\(request, "(party|contact)"\)/;
      assert.match(body, guard, `${name} in ${file} must check access first`);
    }
  }
});
test("password and profile photo are self-service only: no admin callable touches either, and the photo callables never take a uid", () => {
  const admin = callables(read("../users-functions.js")), self = callables(read("../profile-functions.js"));
  assert.deepEqual(admin.map((c) => c.name).sort(), ["createUser", "deleteUser", "listUsers", "sendUserInvite", "updateUser"]);
  assert.deepEqual(self.map((c) => c.name).sort(), ["getMyPhoto", "removeMyPhoto", "setMyPhoto"]);
  for (const { name } of admin) assert.doesNotMatch(name, /password|photo|avatar/i);
  const update = admin.find((c) => c.name === "updateUser").body;
  assert.doesNotMatch(update, /password|photo|thumb|storage|avatar/i, "updateUser can't change a password or a photo");
  const passwordLines = read("../users-functions.js").split("\n").filter((line) => !line.trim().startsWith("//") && /password\s*:/.test(line));
  assert.equal(passwordLines.length, 1, "the only password set is the random, unknown one when a user is created");
  assert.match(passwordLines[0], /password: randomBytes\(32\)/);
  const profileSource = read("../profile-functions.js");
  assert.doesNotMatch(profileSource, /request\.data\??\.uid|data\??\.uid|\{ uid \}/, "photo callables act on the caller only");
  assert.doesNotMatch(profileSource, /requireSuperAdmin/);
  assert.doesNotMatch(read("../profile-functions.js") + read("../users-functions.js"), /updatePassword|password:\s*request|setPassword/i);
});
test("no code checks user types ad hoc: access decisions live in miniApps.js and core.js only", () => {
  const files = readdirSync(new URL("..", import.meta.url)).filter((name) => name.endsWith(".js") && !["miniApps.js", "core.js", "users.js", "eslint.config.mjs"].includes(name));
  for (const name of files) {
    const source = read(`../${name}`);
    assert.doesNotMatch(source, /super_admin|SUPER_ADMIN|\.type\s*[!=]==\s*"(staff|super_admin)"|STAFF\b/, `${name} must use requireMiniApp / requireSuperAdmin`);
  }
});
test("browser registry is imported from this file, not copied", () => {
  const browser = read("../../src/auth/miniApps.ts");
  assert.match(browser, /from "..\/..\/functions\/miniApps.js"/);
  assert.doesNotMatch(browser, /superAdminOnly:\s*(true|false)/);
});
