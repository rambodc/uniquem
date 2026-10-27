// All Party times are shown, and typed, in Calgary time (America/Edmonton), whatever the device's own zone is.
export const PARTY_TZ = "America/Edmonton";
const partsOf = (date: Date) => {
  const out: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", { timeZone: PARTY_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date)) if (part.type !== "literal") out[part.type] = Number(part.value);
  return out;
};
const pad = (value: number) => String(value).padStart(2, "0");
/** ISO instant -> "YYYY-MM-DDTHH:mm" as shown on a Calgary clock (for <input type="datetime-local">). */
export function isoToEdmontonInput(iso: string): string { const p = partsOf(new Date(iso)); return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`; }
/** "YYYY-MM-DDTHH:mm" typed as Calgary wall-clock time -> ISO instant. Returns "" if the text is not a valid date/time. */
export function edmontonInputToIso(input: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) return "";
  const [year, month, day, hour, minute] = match.slice(1).map(Number), wall = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wall)) return "";
  let guess = wall;
  for (let i = 0; i < 3; i++) { const p = partsOf(new Date(guess)); guess += wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute); }
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) || isoToEdmontonInput(result.toISOString()) !== input ? "" : result.toISOString();
}
export const formatPartyDateTime = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: PARTY_TZ, weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "";
export const formatPartyDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: PARTY_TZ, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)) : "";
export const formatClock = (iso: string | null) => iso ? new Intl.DateTimeFormat("en-CA", { timeZone: PARTY_TZ, hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(iso)) : "";
