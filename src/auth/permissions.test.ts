import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE, FEATURES, ROLES, ROLE_FEATURES, ROLE_LABELS } from "./permissions";
describe("permissions", () => {
  it("gives admins every feature and staff contact + party", () => {
    expect([...ROLE_FEATURES.admin]).toEqual([...FEATURES]);
    expect([...ROLE_FEATURES.staff]).toEqual(["contact", "party"]);
    expect(DEFAULT_ROLE).toBe("staff");
    for (const role of ROLES) { expect(ROLE_LABELS[role]).toBeTruthy(); for (const feature of ROLE_FEATURES[role]) expect(FEATURES).toContain(feature); }
  });
  it("matches the server permission maps exactly", async () => {
    const path = "../../functions/permissions.js"; // dynamic so TypeScript does not type-check the server file
    const server = await import(/* @vite-ignore */ path);
    expect([...FEATURES]).toEqual(server.FEATURES);
    expect([...ROLES]).toEqual(server.ROLES);
    expect(server.DEFAULT_ROLE).toBe(DEFAULT_ROLE);
    for (const role of ROLES) expect([...ROLE_FEATURES[role]]).toEqual(server.ROLE_FEATURES[role]);
  });
});
