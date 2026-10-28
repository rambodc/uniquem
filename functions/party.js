import { Buffer } from "node:buffer";
// Validation and pure helpers for the Party mini app. No Firebase calls here, so everything is unit-testable.
import { HttpsError } from "firebase-functions/v2/https";

export const STATUSES = ["coming", "pending", "notComing"];
export const LIMITS = { name: 120, location: 200, description: 2000, hostNotes: 2000, firstName: 80, lastName: 80, company: 120, invitedBy: 120, notes: 500, plusOnesMax: 10, capacityMax: 100000, guestsPerParty: 2000, importPerCall: 200 };
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
/** Plus-ones (planned or arrived): a whole number from 0 to LIMITS.plusOnesMax. Blank means 0. */
export function plusOnes(value, label = "plus-ones") {
  if (value == null || value === "") return 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > LIMITS.plusOnesMax) throw invalid(`The ${label} must be a whole number from 0 to ${LIMITS.plusOnesMax}.`);
  return value;
}
/** A true/false flag. Anything else is rejected. */
export function flag(value, label) {
  if (typeof value !== "boolean") throw invalid(`The ${label} must be true or false.`);
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
/** The editable fields of a guest: every one is validated and always returned (blank plus-ones means 0, VIP must be true or false). */
export function validateGuest(value) {
  if (!isObject(value)) throw invalid("The guest is invalid.");
  const guest = {
    firstName: line(value.firstName, "first name", LIMITS.firstName),
    lastName: line(value.lastName, "last name", LIMITS.lastName),
    company: line(value.company, "company", LIMITS.company, { required: false }),
    invitedBy: line(value.invitedBy, "invited by / type", LIMITS.invitedBy, { required: false }),
    notes: block(value.notes, "notes", LIMITS.notes),
    status: value.status == null ? "pending" : status(value.status),
    plusOnes: plusOnes(value.plusOnes),
    vip: value.vip == null ? false : flag(value.vip, "VIP flag"),
  };
  return { ...guest, searchKey: searchKey(guest) };
}
/**
 * Door edit ("patch" mode of updateGuest): only notes, status, VIP, plus-ones and, for a checked-in guest, how many plus-ones arrived.
 * Names and company can never be changed this way. Only the fields present are returned; at least one is required.
 */
export function validateGuestPatch(value) {
  if (!isObject(value)) throw invalid("The guest is invalid.");
  const patch = {};
  if (value.notes != null) patch.notes = block(value.notes, "notes", LIMITS.notes);
  if (value.status != null) patch.status = status(value.status);
  if (value.vip != null) patch.vip = flag(value.vip, "VIP flag");
  if (value.plusOnes != null) patch.plusOnes = plusOnes(value.plusOnes);
  if (value.plusOnesArrived != null) patch.plusOnesArrived = plusOnes(value.plusOnesArrived, "plus-ones who arrived");
  if (Object.keys(patch).length === 0) throw invalid("Nothing to change.");
  return patch;
}
/**
 * The only two shapes a guest's check-in fields can have, so they can never disagree: not checked in (no time, nobody arrived) or checked in
 * (a time, who did it, and 0 to LIMITS.plusOnesMax plus-ones arrived). Every writer uses one of these. `at` is the check-in timestamp.
 */
export const notCheckedIn = () => ({ checkedIn: false, checkedInAt: null, checkedInBy: null, plusOnesArrived: 0 });
export const checkedInNow = (at, by, arrived) => ({ checkedIn: true, checkedInAt: at, checkedInBy: by, plusOnesArrived: plusOnes(arrived, "plus-ones who arrived") });
/** A door edit applied to a guest: plus-ones who arrived can only change while the guest is checked in, otherwise that field is dropped (it stays 0). */
export function doorPatchFor(current, patch) {
  const result = { ...patch };
  if (!current.checkedIn) delete result.plusOnesArrived;
  return result;
}
/** A walk-in: a guest who was not on the list, added and checked in at the door in one step. Always "coming". */
export function validateWalkIn(value) {
  if (!isObject(value)) throw invalid("The guest is invalid.");
  const guest = validateGuest({ ...value, status: "coming", invitedBy: value.invitedBy == null || value.invitedBy === "" ? "Walk-in" : value.invitedBy });
  return { ...guest, plusOnesArrived: value.plusOnesArrived == null ? guest.plusOnes : plusOnes(value.plusOnesArrived, "plus-ones who arrived") };
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
 * What a pasted guest may fill in on a guest already on the list: "invited by / type", company, notes and plus-ones (0 counts as blank), only where the existing value is blank
 * and the pasted one is not. Returns null when nothing would change. Never overwrites a value, never touches status or check-in.
 */
export function fillBlanks(current, pasted) {
  const set = {};
  for (const field of ["invitedBy", "company", "notes"]) {
    if (field in pasted && !current[field].trim() && pasted[field].trim()) set[field] = pasted[field];
  }
  if ("plusOnes" in pasted && current.plusOnes === 0 && pasted.plusOnes > 0) set.plusOnes = pasted.plusOnes;
  return Object.keys(set).length ? set : null;
}
/**
 * Splits validated guests into new guests to add, existing guests to fill in, and the number skipped.
 * `existing` is [{ id, key, company, invitedBy, notes, plusOnes }] for the guests already on the party (key from guestKey).
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
