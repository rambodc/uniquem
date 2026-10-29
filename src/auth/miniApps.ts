// Browser side of the mini-app registry. The list itself (ids, names, descriptions, routes, icons, accents, superAdminOnly, everyone)
// lives in functions/miniApps.js, the one file the server and the browser both read (including each tile's accent colour). Only the icon components
// are added here, because they cannot live in a server file. Add a mini app: see the header of that file.
import { CircleUserRound, HardHat, Inbox, PartyPopper, ShieldCheck, type LucideIcon } from "lucide-react";
import { ASSIGNABLE_MINI_APP_IDS, MINI_APPS as REGISTRY, STAFF, SUPER_ADMIN, USER_TYPES } from "../../functions/miniApps.js";

export type MiniApp = (typeof REGISTRY)[number];
export type MiniAppId = MiniApp["id"];
export type UserType = (typeof USER_TYPES)[number];
export const MINI_APPS: readonly MiniApp[] = REGISTRY;
export { ASSIGNABLE_MINI_APP_IDS, STAFF, SUPER_ADMIN, USER_TYPES };

/** One component per icon name used in the registry; the compiler rejects a registry icon that is missing here. */
export const ICONS: Record<MiniApp["icon"], LucideIcon> = { PartyPopper, Inbox, HardHat, ShieldCheck, CircleUserRound };
export const USER_TYPE_LABELS: Record<UserType, string> = { super_admin: "Super admin", staff: "Staff" };
export const miniAppById = (id: MiniAppId): MiniApp => MINI_APPS.find((app) => app.id === id)!;
