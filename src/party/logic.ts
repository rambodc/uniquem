import type { Guest, GuestStatus, Party } from "../core/api";
/** A party counts as "upcoming" until 12 hours after it starts, so tonight's party stays on top while it is running. */
export const UPCOMING_GRACE_MS = 12 * 60 * 60 * 1000;
export function splitParties(parties: Party[], now = Date.now()) {
  const time = (party: Party) => (party.startsAt ? Date.parse(party.startsAt) : 0);
  const upcoming = parties.filter((party) => time(party) + UPCOMING_GRACE_MS >= now).sort((a, b) => time(a) - time(b));
  const past = parties.filter((party) => time(party) + UPCOMING_GRACE_MS < now).sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}
export const STATUS_LABEL: Record<GuestStatus, string> = { coming: "Coming", pending: "Pending", notComing: "Not coming" };
export const guestName = (guest: Pick<Guest, "firstName" | "lastName">) => `${guest.firstName} ${guest.lastName}`;
/** Matches every typed word against first name, last name or company (any order, ignores case and accents).
 *  With `deep` it also matches "invited by / type" and notes (used by the door check-in search). */
export function filterGuests(guests: Guest[], query: string, status: GuestStatus | "all" = "all", deep = false) {
  const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return guests.filter((guest) => (status === "all" || guest.status === status) && (() => { const key = fold(`${guest.firstName} ${guest.lastName} ${guest.company}${deep ? ` ${guest.invitedBy ?? ""} ${guest.notes ?? ""}` : ""}`); return words.every((word) => key.includes(word)); })());
}
const foldName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Guests are always listed A to Z by first name, then last name (ignores case and accents). */
export const compareGuests = (a: Pick<Guest, "firstName" | "lastName">, b: Pick<Guest, "firstName" | "lastName">) => foldName(a.firstName).localeCompare(foldName(b.firstName), "en") || foldName(a.lastName).localeCompare(foldName(b.lastName), "en");
export const sortGuests = (guests: Guest[]) => [...guests].sort(compareGuests);
