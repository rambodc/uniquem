// Single source of truth (browser side) for who may see which feature. Mirrors functions/permissions.js;
// the server is what actually enforces access, this only decides what to show.
// Both copies are checked against each other in permissions.test.ts and functions/test/permissions.test.js.
//
// Add a feature: add it to FEATURES, list it for the roles that get it in ROLE_FEATURES,
// then add its dashboard card and route guard (see Dashboard.tsx and App.tsx).
export const FEATURES = ["contact", "party"] as const;
export const ROLES = ["admin", "staff"] as const;
export type Feature = (typeof FEATURES)[number];
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = "staff";
export const ROLE_FEATURES: Record<Role, readonly Feature[]> = {
  admin: FEATURES,
  staff: ["contact", "party"],
};
export const ROLE_LABELS: Record<Role, string> = { admin: "Admin", staff: "Staff" };
export type Access = { role: Role; features: Feature[] };
