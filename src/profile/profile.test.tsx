import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../auth/AuthContext", () => ({ useAuth: () => ({ user: { email: "a@uniquem.ca" }, profile: { firstName: "Ann", lastName: "Lee", email: "a@uniquem.ca", thumbDataUrl: null }, type: "staff", refreshAccess: async () => undefined, logout: async () => undefined }) }));
const { default: ProfileApp } = await import("./ProfileApp");
const { default: AccountBar } = await import("../auth/AccountBar");

describe("Profile and the top bar", () => {
  it("Change password starts collapsed (one row), with Log out below it", () => {
    const html = renderToStaticMarkup(<MemoryRouter><ProfileApp /></MemoryRouter>);
    expect(html).toContain('aria-expanded="false"'); expect(html).toContain("Change password");
    expect(html).not.toContain("Current password");
    expect(html.indexOf("Log out")).toBeGreaterThan(html.indexOf('id="pf-password"'));
  });
  it("the top bar has no log out on any page; Profile is the only place", () => {
    const bar = renderToStaticMarkup(<MemoryRouter><AccountBar /></MemoryRouter>);
    expect(bar).not.toMatch(/sign out|log ?out/i);
    expect(readFileSync("src/auth/AccountBar.tsx", "utf8")).not.toMatch(/logout/);
  });
});
