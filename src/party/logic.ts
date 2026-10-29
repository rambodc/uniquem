import type { Gender, Guest, GuestStatus, Party } from "../core/api";
/** A party counts as "upcoming" until 12 hours after it starts, so tonight's party stays on top while it is running. */
export const UPCOMING_GRACE_MS = 12 * 60 * 60 * 1000;
export function splitParties(parties: Party[], now = Date.now()) {
  const time = (party: Party) => (party.startsAt ? Date.parse(party.startsAt) : 0);
  const upcoming = parties.filter((party) => time(party) + UPCOMING_GRACE_MS >= now).sort((a, b) => time(a) - time(b));
  const past = parties.filter((party) => time(party) + UPCOMING_GRACE_MS < now).sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}
/** Gender, required on every guest. New guests start on male. */
export const GENDER_LABEL: Record<Gender, string> = { male: "Male", female: "Female" };
export const GENDERS = Object.keys(GENDER_LABEL) as Gender[];
export const STATUS_LABEL: Record<GuestStatus, string> = { coming: "Coming", pending: "Pending", notComing: "Not coming" };
export const guestName = (guest: Pick<Guest, "firstName" | "lastName">) => `${guest.firstName} ${guest.lastName}`;
/** Matches every typed word against first name, last name or company (any order, ignores case and accents).
 *  With `deep` it also matches "invited by / type", notes and the word "vip" (used by the door check-in search). */
export function filterGuests(guests: Guest[], query: string, status: GuestStatus | "all" = "all", deep = false) {
  const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  return guests.filter((guest) => (status === "all" || guest.status === status) && (() => { const key = fold(`${guest.firstName} ${guest.lastName} ${guest.company}${deep ? ` ${guest.invitedBy} ${guest.notes}${guest.vip ? " vip" : ""}` : ""}`); return words.every((word) => key.includes(word)); })());
}
const foldName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Guests are always listed A to Z by first name, then last name (ignores case and accents). */
export const compareGuests = (a: Pick<Guest, "firstName" | "lastName">, b: Pick<Guest, "firstName" | "lastName">) => foldName(a.firstName).localeCompare(foldName(b.firstName), "en") || foldName(a.lastName).localeCompare(foldName(b.lastName), "en");
export const sortGuests = (guests: Guest[]) => [...guests].sort(compareGuests);

/** Door check-in: the row as the screen shows it while a check-in or undo is still being confirmed by the server. */
export const optimisticGuest = (guest: Guest, checkedIn: boolean, at: string, plusOnesArrived = 0): Guest => ({ ...guest, checkedIn, checkedInAt: checkedIn ? at : null, plusOnesArrived: checkedIn ? plusOnesArrived : 0 });
/** A fresh list from the server, except rows that are mid-action keep what the screen shows, so the poll never undoes an optimistic row. */
export function mergePolled(current: Guest[], next: Guest[], busyIds: ReadonlySet<string>): Guest[] {
  if (busyIds.size === 0) return next;
  const mine = new Map(current.map((guest) => [guest.id, guest]));
  return next.map((guest) => busyIds.has(guest.id) ? mine.get(guest.id) ?? guest : guest);
}

export const MAX_PLUS_ONES = 10;
export const clampPlusOnes = (value: number) => Math.min(MAX_PLUS_ONES, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
/** Search results at the door: matches in A–Z order with guests who have not arrived first, so the person you want is on top. */
export function searchResults(guests: Guest[], query: string): Guest[] {
  const found = filterGuests(sortGuests(guests), query, "all", true);
  return [...found.filter((guest) => !guest.checkedIn), ...found.filter((guest) => guest.checkedIn)];
}
/** Checked-in guests, most recent first. */
export const arrivedGuests = (guests: Guest[]) => guests.filter((guest) => guest.checkedIn).sort((a, b) => (Date.parse(b.checkedInAt ?? "") || 0) - (Date.parse(a.checkedInAt ?? "") || 0) || compareGuests(a, b));
/** A–Z rail letter for a guest (by first name); anything that is not a letter goes under "#". */
export const letterOf = (guest: Pick<Guest, "firstName">) => { const first = foldName(guest.firstName.trim()).charAt(0).toUpperCase(); return first >= "A" && first <= "Z" ? first : "#"; };
/** Distinct "invited by / type" values (ignoring case and spacing), most common first, for the filter chips. The label is the most-used spelling. */
export function groupChips(guests: Guest[]): { key: string; label: string; count: number }[] {
  const groups = new Map<string, { counts: Map<string, number>; count: number }>();
  for (const guest of guests) {
    const label = guest.invitedBy.trim().replace(/\s+/g, " "); if (!label) continue;
    const key = foldName(label), entry = groups.get(key) ?? { counts: new Map(), count: 0 };
    entry.count += 1; entry.counts.set(label, (entry.counts.get(label) ?? 0) + 1); groups.set(key, entry);
  }
  return [...groups.entries()].map(([key, { counts, count }]) => ({ key, label: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en", { caseFirst: "upper" }))[0][0], count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en"));
}
export const inGroup = (guest: Guest, key: string | null) => key === null || foldName(guest.invitedBy.trim().replace(/\s+/g, " ")) === key;
/** The browse list: everyone in A–Z order (optionally one group), split into letter sections for the jump rail. */
export function letterSections(guests: Guest[]): { letter: string; guests: Guest[] }[] {
  const sections = new Map<string, Guest[]>();
  for (const guest of sortGuests(guests)) { const letter = letterOf(guest); sections.set(letter, [...(sections.get(letter) ?? []), guest]); }
  return [...sections.entries()].sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b))).map(([letter, list]) => ({ letter, guests: list }));
}
/** Prefills the walk-in form from what was typed in search: the first word is the first name, the rest the last name. */
export function splitName(query: string): { firstName: string; lastName: string } {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return { firstName: words[0] ?? "", lastName: words.slice(1).join(" ") };
}
/** "Checked in Sam Hughes · 7:42 PM" style line for the door toast. */
export const checkedInMessage = (guest: Guest, clock: string) => `Checked in ${guestName(guest)}${guest.plusOnesArrived > 0 ? ` +${guest.plusOnesArrived}` : ""} · ${clock}`;
