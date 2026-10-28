import { Buffer } from "node:buffer";
// Validation and pure helpers for the Party feature. No Firebase calls here, so everything is unit-testable.
import { HttpsError } from "firebase-functions/v2/https";

export const STATUSES = ["coming", "pending", "notComing"];
export const LIMITS = { name: 120, location: 200, description: 2000, hostNotes: 2000, firstName: 80, lastName: 80, company: 120, invitedBy: 120, capacityMax: 100000, guestsPerParty: 2000, importPerCall: 200 };
export const PHOTO = { maxBytes: 5 * 1024 * 1024, thumbMaxBytes: 30 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } };
const MIN_TIME = Date.UTC(2020, 0, 1), MAX_TIME = Date.UTC(2100, 0, 1);
const invalid = (message) => new HttpsError("invalid-argument", message);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
// Control characters (except newline/tab in multi-line fields) are dropped.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Single-line text: trimmed, whitespace collapsed. */
export function line(value, label, max, { required = true } = {}) {
  if (value == null || value === "") { if (required) throw invalid(`Enter a ${label}.`); return ""; }
  if (typeof value !== "string") throw invalid(`Enter a valid ${label}.`);
  const result = value.replace(CONTROL, "").replace(/\s+/g, " ").trim();
  if (!result && required) throw invalid(`Enter a ${label}.`);
  if (result.length > max) throw invalid(`The ${label} is too long (max ${max} characters).`);
  return result;
}
/** Multi-line text: trimmed, line breaks kept. */
export function block(value, label, max) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw invalid(`Enter a valid ${label}.`);
  const result = value.replace(/\r\n?/g, "\n").replace(CONTROL, "").trim();
  if (result.length > max) throw invalid(`The ${label} is too long (max ${max} characters).`);
  return result;
}
/** Firestore ids we create are 20 chars; reject anything that could address another path. */
export function docId(value, label = "id") {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw invalid(`Invalid ${label}.`);
  return value;
}
export function status(value) {
  if (!STATUSES.includes(value)) throw invalid("Status must be coming, pending or notComing.");
  return value;
}
export function capacity(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > LIMITS.capacityMax) throw invalid(`Capacity must be a whole number from 0 to ${LIMITS.capacityMax}.`);
  return value;
}
export function startsAt(value) {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()) || date.getTime() < MIN_TIME || date.getTime() > MAX_TIME) throw invalid("Enter a valid date and time.");
  return date;
}
/** The editable fields of a party. startsAt comes back as a Date (stored as a Firestore Timestamp). */
export function validateParty(value) {
  if (!isObject(value)) throw invalid("The party is invalid.");
  return {
    name: line(value.name, "party name", LIMITS.name),
    startsAt: startsAt(value.startsAt),
    location: line(value.location, "location", LIMITS.location),
    description: block(value.description, "description", LIMITS.description),
    capacity: capacity(value.capacity),
    hostNotes: block(value.hostNotes, "host notes", LIMITS.hostNotes),
  };
}
export function searchKey(guest) { return [guest.firstName, guest.lastName, guest.company].filter(Boolean).join(" ").toLowerCase(); }
/** The editable fields of a guest. */
export function validateGuest(value) {
  if (!isObject(value)) throw invalid("The guest is invalid.");
  const guest = {
    firstName: line(value.firstName, "first name", LIMITS.firstName),
    lastName: line(value.lastName, "last name", LIMITS.lastName),
    company: line(value.company, "company", LIMITS.company, { required: false }),
    invitedBy: line(value.invitedBy, "invited by", LIMITS.invitedBy, { required: false }),
    status: value.status == null ? "pending" : status(value.status),
  };
  return { ...guest, searchKey: searchKey(guest) };
}

/** Two guests are "the same person" on a party when first + last name match, ignoring case and extra spaces. */
export const guestKey = (guest) => `${guest.firstName.toLowerCase()}\n${guest.lastName.toLowerCase()}`;
/** A bulk import: 1 to LIMITS.importPerCall guests, each validated and trimmed exactly like a single guest. */
export function validateGuestBatch(value) {
  if (!Array.isArray(value) || value.length === 0) throw invalid("Add at least one guest to import.");
  if (value.length > LIMITS.importPerCall) throw invalid(`You can import up to ${LIMITS.importPerCall} guests at a time.`);
  return value.map((entry, index) => {
    try { return validateGuest(entry); } catch (cause) { throw invalid(`Guest ${index + 1}: ${cause?.message ?? "invalid"}`); }
  });
}
/**
 * What a pasted guest may fill in on a guest already on the list: "invited by" and company, only where the existing value is blank
 * and the pasted one is not. Returns null when nothing would change. Never overwrites a value, never touches status or check-in.
 */
export function fillBlanks(current, pasted) {
  const set = {};
  for (const field of ["invitedBy", "company"]) {
    if (!String(current?.[field] ?? "").trim() && String(pasted?.[field] ?? "").trim()) set[field] = pasted[field];
  }
  return Object.keys(set).length ? set : null;
}
/**
 * Splits validated guests into new guests to add, existing guests to fill in, and the number skipped.
 * `existing` is [{ id, key, company, invitedBy }] for the guests already on the party (key from guestKey).
 * Repeats of a new name within the import are skipped; repeats of an existing name can only fill what an earlier row did not.
 */
export function planImport(guests, existing) {
  const byKey = new Map();
  for (const entry of existing) if (!byKey.has(entry.key)) byKey.set(entry.key, { ...entry });
  const seen = new Set(), toAdd = [], updates = new Map();
  for (const guest of guests) {
    const key = guestKey(guest), current = byKey.get(key);
    if (current) {
      const set = fillBlanks(current, guest);
      if (!set) continue;
      Object.assign(current, set);
      updates.set(current.id, { id: current.id, set: { ...(updates.get(current.id)?.set ?? {}), ...set } });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key); toAdd.push(guest);
  }
  const updated = [...updates.values()];
  return { toAdd, updates: updated, skipped: guests.length - toAdd.length - updated.length };
}

const hasBytes = (buffer, bytes, offset = 0) => bytes.every((byte, index) => buffer[offset + index] === byte);
/** Checks the real file signature, not just the type the browser claims. */
export function sniffImage(buffer) {
  if (buffer.length > 12 && hasBytes(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (buffer.length > 12 && hasBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (buffer.length > 12 && hasBytes(buffer, [0x52, 0x49, 0x46, 0x46]) && hasBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
function decodeImage(base64, label, maxBytes) {
  if (typeof base64 !== "string" || !base64 || base64.length > Math.ceil(maxBytes * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw invalid(`The ${label} is invalid or too large.`);
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > maxBytes) throw invalid(`The ${label} is too large.`);
  const type = sniffImage(buffer);
  if (!type) throw invalid("Photos must be JPEG, PNG or WebP images.");
  return { buffer, type, ext: PHOTO.types[type] };
}
/** A full-size photo plus a small thumbnail (both made by the browser, both re-checked here). */
export function validatePhoto(value) {
  if (!isObject(value)) throw invalid("The photo is invalid.");
  const full = decodeImage(value.photo, "photo", PHOTO.maxBytes), thumb = decodeImage(value.thumb, "thumbnail", PHOTO.thumbMaxBytes);
  if (thumb.type === "image/png") throw invalid("The thumbnail must be JPEG or WebP.");
  return { full, thumb, thumbDataUrl: `data:${thumb.type};base64,${thumb.buffer.toString("base64")}` };
}

/** Guest order everywhere: first name, then last name, ignoring case and accents. Works on any { firstName, lastName }. */
const foldName = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function compareGuests(a, b) {
  return foldName(a.firstName).localeCompare(foldName(b.firstName), "en") || foldName(a.lastName).localeCompare(foldName(b.lastName), "en") || String(a.id ?? "").localeCompare(String(b.id ?? ""));
}
export const sortGuestList = (guests) => [...guests].sort(compareGuests);

/** Counts for one party's guest list. Guests need { status, checkedIn }. */
export function summarize(guests, partyCapacity) {
  const summary = { invited: guests.length, coming: 0, pending: 0, notComing: 0, checkedIn: 0, checkedInNotComing: 0, checkedInPending: 0, capacity: partyCapacity ?? null, capacityLeft: null };
  for (const guest of guests) {
    if (guest.status in summary) summary[guest.status] += 1;
    if (guest.checkedIn) { summary.checkedIn += 1; if (guest.status === "notComing") summary.checkedInNotComing += 1; if (guest.status === "pending") summary.checkedInPending += 1; }
  }
  if (partyCapacity != null) summary.capacityLeft = partyCapacity - summary.checkedIn;
  return summary;
}
