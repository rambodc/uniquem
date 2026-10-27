// Party feature: parties, guest lists, door check-in. Staff only; every read and write goes through these
// callable functions (Firestore and Storage rules stay deny-all for browsers).
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db, callable, staffAccess, requireStaff } from "./core.js";
import { LIMITS, docId, status, validateParty, validateGuest, validatePhoto, summarize } from "./party.js";

const parties = () => db.collection("parties");
const guestsOf = (partyId) => parties().doc(partyId).collection("guests");
const iso = (value) => value?.toDate?.().toISOString() ?? null;
const photoPrefix = (partyId) => `party-photos/${partyId}/`;

function partyView(doc) {
  const data = doc.data();
  return { id: doc.id, name: data.name, startsAt: iso(data.startsAt), location: data.location, description: data.description ?? "", capacity: data.capacity ?? null, hostNotes: data.hostNotes ?? "", hasPhoto: Boolean(data.photoPath), thumbDataUrl: data.thumbDataUrl ?? null, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}
function guestView(doc) {
  const data = doc.data();
  return { id: doc.id, firstName: data.firstName, lastName: data.lastName, company: data.company ?? "", invitedBy: data.invitedBy ?? "", status: data.status, checkedIn: data.checkedIn === true, checkedInAt: iso(data.checkedInAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
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
  const snapshot = await guestsOf(partyId).orderBy("lastName").limit(LIMITS.guestsPerParty).get();
  return snapshot.docs;
}

export const getStaffAccess = onCall(callable, async (request) => {
  const access = await staffAccess(request);
  return { party: Boolean(access), inbox: access?.owner === true };
});

export const listParties = onCall(callable, async (request) => {
  await requireStaff(request);
  const snapshot = await parties().orderBy("startsAt", "desc").limit(200).get();
  return { parties: snapshot.docs.map(partyView) };
});
export const getParty = onCall(callable, async (request) => {
  await requireStaff(request);
  return { party: partyView(await loadParty(docId(request.data?.partyId, "party"))) };
});
export const createParty = onCall(callable, async (request) => {
  const staff = await requireStaff(request);
  const party = validateParty(request.data);
  const ref = parties().doc();
  await ref.set({ schemaVersion: 1, ...party, startsAt: Timestamp.fromDate(party.startsAt), photoPath: null, thumbDataUrl: null, createdBy: staff.email, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { success: true, partyId: ref.id };
});
export const updateParty = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), party = validateParty(request.data);
  await loadParty(partyId);
  await parties().doc(partyId).update({ ...party, startsAt: Timestamp.fromDate(party.startsAt), updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
export const deleteParty = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party");
  await loadParty(partyId);
  await db.recursiveDelete(parties().doc(partyId)); // the party and all of its guests
  await getStorage().bucket().deleteFiles({ prefix: photoPrefix(partyId), force: true });
  return { success: true };
});

export const setPartyPhoto = onCall({ ...callable, memory: "512MiB" }, async (request) => {
  await requireStaff(request);
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
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), party = await loadParty(partyId), previous = party.data().photoPath;
  await parties().doc(partyId).update({ photoPath: null, thumbDataUrl: null, updatedAt: FieldValue.serverTimestamp() });
  if (previous) await getStorage().bucket().file(previous).delete({ ignoreNotFound: true });
  return { success: true };
});
/** Staff only. The photo never has a public URL; it is returned to the signed-in staff member as a data URL. */
export const getPartyPhoto = onCall({ ...callable, memory: "512MiB" }, async (request) => {
  await requireStaff(request);
  const party = await loadParty(docId(request.data?.partyId, "party")), path = party.data().photoPath;
  if (!path || !path.startsWith(photoPrefix(party.id))) return { dataUrl: null };
  const file = getStorage().bucket().file(path), [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  return { dataUrl: `data:${metadata.contentType || "image/jpeg"};base64,${buffer.toString("base64")}` };
});

export const listGuests = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), party = await loadParty(partyId), docs = await listGuestDocs(partyId), guests = docs.map(guestView);
  return { party: partyView(party), guests, summary: summarize(guests, party.data().capacity ?? null), serverTime: new Date().toISOString() };
});
export const addGuest = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guest = validateGuest(request.data);
  await loadParty(partyId);
  const count = (await guestsOf(partyId).count().get()).data().count;
  if (count >= LIMITS.guestsPerParty) throw new HttpsError("resource-exhausted", `A party can have up to ${LIMITS.guestsPerParty} guests.`);
  const ref = guestsOf(partyId).doc();
  await ref.set({ schemaVersion: 1, ...guest, checkedIn: false, checkedInAt: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { success: true, guestId: ref.id };
});
export const updateGuest = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), guest = validateGuest(request.data);
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).update({ ...guest, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
export const setGuestStatus = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), next = status(request.data?.status);
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).update({ status: next, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});
export const deleteGuest = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest");
  await guestSnapshot(partyId, guestId);
  await guestsOf(partyId).doc(guestId).delete();
  return { success: true };
});

/** Works for any status. If the guest is already checked in, nothing changes and the original time is returned. */
export const checkInGuest = onCall(callable, async (request) => {
  const staff = await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), ref = guestsOf(partyId).doc(guestId);
  const alreadyCheckedIn = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found", "That guest no longer exists.");
    if (snapshot.data().checkedIn === true) return true;
    transaction.update(ref, { checkedIn: true, checkedInAt: FieldValue.serverTimestamp(), checkedInBy: staff.email, updatedAt: FieldValue.serverTimestamp() });
    return false;
  });
  return { success: true, alreadyCheckedIn, guest: guestView(await ref.get()) };
});
export const undoCheckIn = onCall(callable, async (request) => {
  await requireStaff(request);
  const partyId = docId(request.data?.partyId, "party"), guestId = docId(request.data?.guestId, "guest"), ref = guestsOf(partyId).doc(guestId);
  await guestSnapshot(partyId, guestId);
  await ref.update({ checkedIn: false, checkedInAt: null, checkedInBy: null, updatedAt: FieldValue.serverTimestamp() });
  return { success: true, guest: guestView(await ref.get()) };
});
