// Single source of truth for the private workspace's mini apps and user types.
// Read by the Cloud Functions (access checks, user validation) and by the browser (dashboard tiles, route guards,
// private-path lists, the Users screen), so a mini app is added or changed in exactly one place: this file.
//
// Add a mini app:  1) add one entry to MINI_APPS below
//                  2) guard its callables with requireMiniApp(request, "<id>")   (functions/core.js)
//                  3) add its routes inside <RequireMiniApp app="<id>"> in src/App.tsx and a noindex header in firebase.json
//                  4) add its icon to ICONS in src/auth/miniApps.ts if it uses a new one
// Tests fail if any of these is forgotten. Super admins get every mini app in this list automatically.

/** `superAdminOnly` mini apps can never be assigned to staff: only super admins ever see or use them. */
export const MINI_APPS = /** @type {const} */ ([
  { id: "party", name: "Party", description: "Parties, guest lists and door check-in.", route: "/party", icon: "PartyPopper", superAdminOnly: false },
  { id: "contact", name: "Contact form", description: "Messages received through uniquem.ca.", route: "/contact-inbox", icon: "Mail", superAdminOnly: false },
  { id: "users", name: "Users", description: "Create users and choose which mini apps each one can open.", route: "/users", icon: "Users", superAdminOnly: true },
]);

export const SUPER_ADMIN = "super_admin";
export const STAFF = "staff";
/** `super_admin` sees every mini app; `staff` sees only the mini apps assigned on their record. */
export const USER_TYPES = /** @type {const} */ ([SUPER_ADMIN, STAFF]);

export const MINI_APP_IDS = MINI_APPS.map((app) => app.id);
/** The mini apps a super admin may hand to a staff user. */
export const ASSIGNABLE_MINI_APP_IDS = MINI_APPS.filter((app) => !app.superAdminOnly).map((app) => app.id);

/** The mini apps an account can open: all of them for a super admin, otherwise the assigned ones that are assignable. */
export function miniAppsFor(type, assigned) {
  if (type === SUPER_ADMIN) return [...MINI_APP_IDS];
  return ASSIGNABLE_MINI_APP_IDS.filter((id) => Array.isArray(assigned) && assigned.includes(id));
}
