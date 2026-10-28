import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSIGNABLE_MINI_APP_IDS, ICONS, MINI_APPS, STAFF, SUPER_ADMIN, USER_TYPES, USER_TYPE_LABELS, miniAppById } from "./miniApps";
import { PRIVATE_ROOTS, isPrivatePage } from "./privatePaths";

const read = (path: string) => readFileSync(path, "utf8");
const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => { const path = join(dir, name); return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []; });

describe("mini-app registry (functions/miniApps.js is the single source)", () => {
  it("matches the server registry exactly", async () => {
    const path = "../../functions/miniApps.js"; // dynamic so this reads the very file the Cloud Functions use
    const server = await import(/* @vite-ignore */ path);
    expect(MINI_APPS).toEqual(server.MINI_APPS);
    expect([...USER_TYPES]).toEqual([...server.USER_TYPES]);
    expect([...ASSIGNABLE_MINI_APP_IDS]).toEqual(server.ASSIGNABLE_MINI_APP_IDS);
    expect(server.miniAppsFor("staff", [])).toEqual(["profile"]);
  });
  it("has an icon, a label and one unique route for everything", () => {
    for (const app of MINI_APPS) { expect(ICONS[app.icon]).toBeTruthy(); expect(miniAppById(app.id)).toBe(app); }
    expect(new Set(MINI_APPS.map((app) => app.route)).size).toBe(MINI_APPS.length);
    for (const type of USER_TYPES) expect(USER_TYPE_LABELS[type]).toBeTruthy();
    expect([SUPER_ADMIN, STAFF]).toEqual([...USER_TYPES]);
  });
  it("keeps the Users mini app for super admins only", () => {
    expect(miniAppById("users").superAdminOnly).toBe(true);
    expect(ASSIGNABLE_MINI_APP_IDS).not.toContain("users");
    expect([...ASSIGNABLE_MINI_APP_IDS]).toEqual(MINI_APPS.filter((app) => !app.superAdminOnly && !app.everyone).map((app) => app.id));
  });
  it("Profile is for everyone: never assignable, so it is never a checkbox in the Users picker", () => {
    expect(miniAppById("profile").everyone).toBe(true);
    expect(ASSIGNABLE_MINI_APP_IDS).not.toContain("profile");
    expect(MINI_APPS.filter((app) => app.everyone && app.superAdminOnly)).toEqual([]);
    expect(read("src/users/UserSheets.tsx")).toContain("ASSIGNABLE_MINI_APP_IDS.map");
    expect(read("src/users/UserSheets.tsx")).not.toMatch(/MINI_APPS\.(map|filter)/);
  });
  it("tiles come from the registry: every app has an icon and its own green-led accent (no yellow)", () => {
    const hue = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min; if (!d) return 0; const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
    expect(new Set(MINI_APPS.map((app) => app.accent)).size).toBe(MINI_APPS.length);
    for (const app of MINI_APPS) { expect(app.accent).toMatch(/^#[0-9a-f]{6}$/); expect(hue(app.accent) < 40 || hue(app.accent) > 75, `${app.id} accent must not be yellow`).toBe(true); }
    const dashboard = read("src/auth/Dashboard.tsx");
    expect(dashboard).toContain("MINI_APPS.filter((app) => can(app.id))");
    expect(dashboard).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
  it("private paths come from the registry", () => {
    expect(PRIVATE_ROOTS).toEqual(["signin", "dashboard", ...MINI_APPS.map((app) => app.route.slice(1))]);
    for (const app of MINI_APPS) { expect(isPrivatePage(app.route)).toBe(true); expect(isPrivatePage(`${app.route}/x`)).toBe(true); }
    expect(isPrivatePage("/users")).toBe(true); expect(isPrivatePage("/chemicals")).toBe(false); expect(isPrivatePage("/usersx")).toBe(false);
  });
  it("every mini app has a guarded route in App.tsx and a noindex header in firebase.json", () => {
    const app = read("src/App.tsx"), hosting = JSON.parse(read("firebase.json")).hosting.headers as { source: string; headers: { key: string; value: string }[] }[];
    for (const { id, route } of MINI_APPS) {
      expect(app, `${id} needs <RequireMiniApp app="${id}">`).toContain(`<RequireMiniApp app="${id}" />`);
      expect(app).toContain(`path="${route}`);
      for (const source of [route, `${route}/**`]) expect(hosting.find((entry) => entry.source === source)?.headers.some((h) => h.key === "X-Robots-Tag" && /noindex/.test(h.value)), `${source} noindex`).toBe(true);
    }
  });
});

describe("no ad hoc user-type checks", () => {
  it("only the access modules know about user types; components ask can(<mini app>) or use the guards", () => {
    const allowed = new Set(["src/auth/miniApps.ts", "src/auth/AuthContext.tsx", "src/auth/RequireMiniApp.tsx", "src/auth/SignIn.tsx", "src/auth/AccountBar.tsx", "src/auth/Dashboard.tsx", "src/core/api.ts", "src/party/Workspace.tsx", "src/users/UserSheets.tsx", "src/users/UsersApp.tsx"]);
    for (const file of sourceFiles("src")) {
      const text = read(file);
      if (!allowed.has(file)) expect(text, `${file} must not check user types itself`).not.toMatch(/SUPER_ADMIN|"super_admin"|\buser\.type\b|\btype === "staff"/);
    }
  });
  it("routes only reach a mini app through its guard", () => {
    const app = read("src/App.tsx");
    for (const { route } of MINI_APPS) expect(app.split(`path="${route}`).length - 1, `${route} appears in the routes`).toBeGreaterThan(0);
    expect(app).not.toMatch(/useAuth|can\(/);
  });
});
