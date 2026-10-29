import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";

// The old roles/features system is gone. If any of its names, shapes or one-off scripts reappear anywhere in the repo, this fails.
const root = fileURLToPath(new URL("../..", import.meta.url));
const skipDirs = new Set(["node_modules", "dist", ".git", ".firebase", ".seo-build", "reports"]);
const files = (dir) => readdirSync(dir).flatMap((name) => {
  if (skipDirs.has(name)) return [];
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.(js|mjs|ts|tsx|json|md|yml|rules|css|html)$/.test(name) && name !== "package-lock.json" ? [path] : [];
});
const THIS_FILE = fileURLToPath(import.meta.url);
const old = [
  [/requireFeature|RequireFeature/, "requireFeature / RequireFeature"],
  [/getStaffAccess|StaffAccess/, "getStaffAccess"],
  [/\bROLE_(FEATURES|LABELS)\b|\bDEFAULT_ROLE\b|normalizeRole|featuresFor|roleCan|\bROLES\b|\bFEATURES\b/, "role/feature maps"],
  [/\bFeature\b|\bfeatures?\s*[:=[]|\bfeature=|\.features\b/, "feature (now: mini app)"],
  [/\brole:|\.role\b|"role"|\broles\b|\bRole\b|\buser\.role\b/, "role (now: type)"],
  [/collection\(["']staff["']\)|staff\/\{|staff\/\$|"admin" \| "staff"|role: ?["']admin["']/, "the old staff/{email} document"],
  [/permissions\.(js|ts)|src\/auth\/permissions/, "the old permissions files"],
  [/\bdeleteParty\b|setUserActive|createSignInLink|\bactive: (true|false)\b.*\b(users|user record)/, "retired callables"],
  [/migrat(e|ion) script|one-off script|\.migrate\b|backfill/i, "migration / one-off scripts"],
];
test("no remnant of the old role/feature system anywhere in the repo", () => {
  for (const file of files(root)) {
    if (file === THIS_FILE) continue;
    const text = readFileSync(file, "utf8").replace(/migrating|migrate with the flow|fines migration|Fines migration|migrat\w* (and|into)|detach and migrate/gi, "");
    for (const [pattern, name] of old) assert.doesNotMatch(text, pattern, `${file.slice(root.length)} mentions ${name}`);
  }
});
test("the old staff collection and shapes are gone: no data file, no script, no Firestore rule for them", () => {
  const top = readdirSync(root);
  for (const name of top) assert.doesNotMatch(name, /migrat|backfill|seed/i, `${name}: no one-off scripts in the repo`);
  for (const name of readdirSync(join(root, "scripts"))) assert.doesNotMatch(name, /migrat|backfill|seed|staff|role/i, `scripts/${name}`);
  assert.doesNotMatch(readFileSync(join(root, "firestore.rules"), "utf8"), /staff|users/, "rules stay deny-all");
});
test("emails go out only from website@uniquem.ca; the old irobotx.io sender never comes back", () => {
  for (const file of files(root)) {
    if (file === THIS_FILE) continue;
    assert.doesNotMatch(readFileSync(file, "utf8"), /irobotx/i, `${file.slice(root.length)} mentions irobotx`);
  }
});
