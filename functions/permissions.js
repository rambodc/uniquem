// Single source of truth (server side) for who may use which feature.
// Keep in sync with src/auth/permissions.ts (functions/test/permissions.test.js and
// src/auth/permissions.test.ts fail if the two copies drift apart).
//
// Add a feature:   1) add it to FEATURES   2) list it for the roles that get it in ROLE_FEATURES
//                  3) guard its callables with requireFeature(request, "<feature>").
export const FEATURES = ["contact", "party"];
export const ROLES = ["admin", "staff"];
export const DEFAULT_ROLE = "staff";
export const ROLE_FEATURES = {
  admin: [...FEATURES], // admins always get every feature
  staff: ["contact", "party"],
};
/** Unknown, missing or malformed roles fall back to the least-privileged role. */
export function normalizeRole(value) { return typeof value === "string" && ROLES.includes(value.trim().toLowerCase()) ? value.trim().toLowerCase() : DEFAULT_ROLE; }
export function featuresFor(role) { return [...ROLE_FEATURES[normalizeRole(role)]]; }
export function roleCan(role, feature) { return ROLE_FEATURES[normalizeRole(role)].includes(feature); }
