// Party feature: parties, guest lists, door check-in. Staff only; every read and write goes through these
// callable functions (Firestore and Storage rules stay deny-all for browsers).
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, callable, resolveAccess, requireFeature } from "./core.js";
import { LIMITS, sortGuestList, docId, status, validateParty, validateGuest, validateGuestBatch, validateGuestPatch, validateWalkIn, withGuestDefaults, plusOnes, planImport, fillBlanks, searchKey, guestKey, validatePhoto, summarize } from "./party.js";

/** Door-screen callables stay warm (one idle instance) so the first tap is not delayed by a cold start. */
const warm = { ...callable, minInstances: 1 };
const parties = () => db.collection("parties");
const guestsOf = (partyId) => parties().doc(partyId).collection("guests");
const iso = (value) => value?.toDate?.().toISOString() ?? null;
const photoPrefix = (partyId) => `party-photos/${partyId}/`;

function partyView(doc) {
  const data = doc.data();
  return { id: doc.id, name: data.name, startsAt: iso(data.startsAt), location: data.location, description: data.description ?? "", capacity: data.capacity ?? null, hostNotes: data.hostNotes ?? "", hasPhoto: Boolean(data.photoPath), thumbDataUrl: data.thumbDataUrl ?? null, archived: data.archived === true, archivedAt: iso(data.archivedAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}
function guestView(doc) {
  const data = doc.data();
  return { id: doc.id, firstName: data.firstName, lastName: data.lastName, company: data.company ?? "", invitedBy: data.invitedBy ?? "", notes: data.notes ?? "", status: data.status, plusOnes: Number(data.plusOnes) || 0, vip: data.vip === true, plusOnesArrived: data.checkedIn === true ? Number(data.plusOnesArrived) || 0 : 0, checkedIn: data.checkedIn === true, checkedInAt: iso(data.checkedInAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}
async function loadParty(partyId) {
  const snapshot = await parties().doc(partyId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "That party no longer exists.");
  return snapshot;
}
async function guestSnapshot(partyId, guestId) {
  const snapshot = await guestsOf(partyId).doc(guestId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "That guest no longer exists.");
  return snapshot;
}
async function listGuestDocs(partyId) {
  const snapshot = await guestsOf(partyId).limit(LIMITS.guestsPerParty).get();
  return snapshot.docs; // sorted by first name (then last name) in listGuests, so no composite index is needed
}

export const getStaffAccess = onCall(callable, async (request) => {
  const access = await resolveAccess(request);
  return { role: access?.role ?? null, features: access?.features ?? [] };
});

export const listParties = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const wantArchived = request.data?.archived === true, snapshot = await parties().orderBy("startsAt", "desc").limit(200).get();
  return { parties: snapshot.docs.map(partyView).filter((party) => party.archived === wantArchived) }; // parties without the field are active
});
export const getParty = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  return { party: partyView(await loadParty(docId(request.data?.partyId, "party"))) };
});
export const createParty = onCall(callable, async (request) => {
  const staff = await requireFeature(request, "party");
  const party = validateParty(request.data);
  const ref = parties().doc();
  await ref.set({ schemaVersion: 1, ...party, startsAt: Timestamp.fromDate(party.startsAt), photoPath: null, thumbDataUrl: null, createdBy: staff.email, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { success: true, partyId: ref.id };
});
export const updateParty = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), party = validateParty(request.data);
  await loadParty(partyId);
  await parties().doc(partyId).update({ ...party, startsAt: Timestamp.fromDate(party.startsAt), updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
/** Archiving hides a party but keeps everything (guests, check-ins, photo). Nothing is deleted. */
const archiveHandler = async (request) => {
  const staff = await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party");
  await loadParty(partyId);
  await parties().doc(partyId).update({ archived: true, archivedAt: FieldValue.serverTimestamp(), archivedBy: staff.email, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
};
export const archiveParty = onCall(callable, archiveHandler);
/** Legacy name kept so an older open page can never hard-delete a party: it archives instead. */
export const deleteParty = onCall(callable, archiveHandler);
export const restoreParty = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party");
  await loadParty(partyId);
  await parties().doc(partyId).update({ archived: false, archivedAt: null, archivedBy: null, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

export const setPartyPhoto = onCall({ ...callable, memory: "512MiB" }, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), photo = validatePhoto(request.data);
  const party = await loadParty(partyId), bucket = getStorage().bucket();
  const path = `${photoPrefix(partyId)}photo-${Date.now()}.${photo.full.ext}`;
  await bucket.file(path).save(photo.full.buffer, { contentType: photo.full.type, resumable: false, metadata: { cacheControl: "private, max-age=0" } });
  const previous = party.data().photoPath;
  await parties().doc(partyId).update({ photoPath: path, thumbDataUrl: photo.thumbDataUrl, updatedAt: FieldValue.serverTimestamp() });
  if (previous && previous !== path) await bucket.file(previous).delete({ ignoreNotFound: true });
  return { success: true };
});
export const removePartyPhoto = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), party = await loadParty(partyId), previous = party.data().photoPath;
  await parties().doc(partyId).update({ photoPath: null, thumbDataUrl: null, updatedAt: FieldValue.serverTimestamp() });
  if (previous) await getStorage().bucket().file(previous).delete({ ignoreNotFound: true });
  return { success: true };
});
/** Staff only. The photo never has a public URL; it is returned to the signed-in staff member as a data URL. */
export const getPartyPhoto = onCall({ ...callable, memory: "512MiB" }, async (request) => {
  await requireFeature(request, "party");
  const party = await loadParty(docId(request.data?.partyId, "party")), path = party.data().photoPath;
  if (!path || !path.startsWith(photoPrefix(party.id))) return { dataUrl: null };
  const file = getStorage().bucket().file(path), [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  return { dataUrl: `data:${metadata.contentType || "image/jpeg"};base64,${buffer.toString("base64")}` };
});

export const listGuests = onCall(warm, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), party = await loadParty(partyId), docs = await listGuestDocs(partyId), guests = sortGuestList(docs.map(guestView));
  return { party: partyView(party), guests, summary: summarize(guests, party.data().capacity ?? null), serverTime: new Date().toISOString() };
});
export const addGuest = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guest = validateGuest(request.data);
  await loadParty(partyId);
  const count = (await guestsOf(partyId).count().get()).data().count;
  if (count >= LIMITS.guestsPerParty) throw new HttpsError("resource-exhausted", `A party can have up to ${LIMITS.guestsPerParty} guests.`);
  const ref = guestsOf(partyId).doc();
  await ref.set({ schemaVersion: 1, ...withGuestDefaults(guest), checkedIn: false, checkedInAt: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { success: true, guestId: ref.id };
});
/**
 * Bulk add (staff only). New names are added. A name already on the party (first + last, any case) is never duplicated:
 * its blank "invited by / type", company, notes or plus-ones (0) is filled in from the import, existing values are never overwritten, and status and check-in
 * data are never touched. Returns { added, updated, skipped }.
 */
export const importGuests = onCall(callable, async (request) => {
  const staff = await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guests = validateGuestBatch(request.data?.guests);
  await loadParty(partyId);
  const docs = (await guestsOf(partyId).select("firstName", "lastName", "company", "invitedBy", "notes", "plusOnes").limit(LIMITS.guestsPerParty).get()).docs;
  const existing = docs.map((doc) => ({ id: doc.id, key: guestKey({ firstName: String(doc.get("firstName") ?? ""), lastName: String(doc.get("lastName") ?? "") }), company: String(doc.get("company") ?? ""), invitedBy: String(doc.get("invitedBy") ?? ""), notes: String(doc.get("notes") ?? ""), plusOnes: Number(doc.get("plusOnes")) || 0 }));
  const { toAdd, updates, skipped } = planImport(guests, existing);
  if (existing.length + toAdd.length > LIMITS.guestsPerParty) throw new HttpsError("resource-exhausted", `A party can have up to ${LIMITS.guestsPerParty} guests.`);
  let updated = 0;
  if (updates.length) {
    // One transaction (at most 200 guests per call): re-read each guest and only fill what is still blank, so a concurrent edit is never overwritten.
    updated = await db.runTransaction(async (transaction) => {
      const refs = updates.map((update) => guestsOf(partyId).doc(update.id)), snapshots = await transaction.getAll(...refs);
      let count = 0;
      snapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) return;
        const current = snapshot.data(), set = fillBlanks(current, updates[index].set);
        if (!set) return;
        const merged = { firstName: current.firstName ?? "", lastName: current.lastName ?? "", company: set.company ?? current.company ?? "" };
        transaction.update(refs[index], { ...set, searchKey: searchKey(merged), updatedAt: FieldValue.serverTimestamp() });
        count += 1;
      });
      return count;
    });
  }
  for (let start = 0; start < toAdd.length; start += 400) {
    const batch = db.batch();
    for (const guest of toAdd.slice(start, start + 400)) batch.set(guestsOf(partyId).doc(), { schemaVersion: 1, ...withGuestDefaults(guest), checkedIn: false, checkedInAt: null, importedBy: staff.email, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
  }
  return { success: true, added: toAdd.length, updated, skipped: skipped + (updates.length - updated) };
});
/**
 * Full edit (party page, names included) or, with `patch: true`, a door edit that can only change notes, status, VIP, plus-ones and how many plus-ones arrived.
 * Door edits never touch names or company and never touch check-in. Fields missing from a full edit (plus-ones, VIP) are left as they are.
 */
export const updateGuest = onCall(warm, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest");
  if (request.data?.patch === true) {
    const patch = validateGuestPatch(request.data), snapshot = await guestSnapshot(partyId, guestId);
    if (snapshot.data().checkedIn !== true) delete patch.plusOnesArrived; // arrivals only exist for checked-in guests
    await guestsOf(partyId).doc(guestId).update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
    return { success: true, guest: guestView(await guestsOf(partyId).doc(guestId).get()) };
  }
  const guest = validateGuest(request.data);
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).update({ ...guest, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
/** A walk-in: creates a "coming" guest and checks them in, in one step. Returns the new guest. */
export const addWalkIn = onCall(warm, async (request) => {
  const staff = await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guest = validateWalkIn(request.data);
  await loadParty(partyId);
  const count = (await guestsOf(partyId).count().get()).data().count;
  if (count >= LIMITS.guestsPerParty) throw new HttpsError("resource-exhausted", `A party can have up to ${LIMITS.guestsPerParty} guests.`);
  const ref = guestsOf(partyId).doc();
  await ref.set({ schemaVersion: 1, ...guest, walkIn: true, checkedIn: true, checkedInAt: FieldValue.serverTimestamp(), checkedInBy: staff.email, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { success: true, guest: guestView(await ref.get()) };
});
export const setGuestStatus = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), next = status(request.data?.status);
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).update({ status: next, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
export const deleteGuest = onCall(callable, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest");
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).delete();
  return { success: true };
});

/** Works for any status. Records how many plus-ones arrived (default 0). If the guest is already checked in, nothing changes and the original time is returned. */
export const checkInGuest = onCall(warm, async (request) => {
  const staff = await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), ref = guestsOf(partyId).doc(guestId), arrived = plusOnes(request.data?.plusOnesArrived, "plus-ones who arrived");
  const alreadyCheckedIn = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found", "That guest no longer exists.");
    if (snapshot.data().checkedIn === true) return true;
    transaction.update(ref, { checkedIn: true, checkedInAt: FieldValue.serverTimestamp(), plusOnesArrived: arrived, checkedInBy: staff.email, updatedAt: FieldValue.serverTimestamp() });
    return false;
  });
  return { success: true, alreadyCheckedIn, guest: guestView(await ref.get()) };
});
export const undoCheckIn = onCall(warm, async (request) => {
  await requireFeature(request, "party");
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), ref = guestsOf(partyId).doc(guestId);
  // One write instead of read-then-write: update() fails with NOT_FOUND (code 5) when the guest is gone.
  try { await ref.update({ checkedIn: false, checkedInAt: null, plusOnesArrived: 0, checkedInBy: null, updatedAt: FieldValue.serverTimestamp() }); }
  catch (error) { if (error?.code === 5) throw new HttpsError("not-found", "That guest no longer exists."); throw error; }
  return { success: true, guest: guestView(await ref.get()) };
});
