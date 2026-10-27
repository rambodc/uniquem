import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateParty, validateGuest, validatePhoto, summarize, docId, status, capacity, sniffImage, PHOTO } from "../party.js";
import { staffAccess, requireStaff } from "../core.js";

const party = { name: "  Winter   Mixer ", startsAt: "2026-12-04T02:30:00.000Z", location: " Calgary Petroleum Club ", description: "  Drinks\r\nand food ", capacity: 120, hostNotes: "Reserve table 4" };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(40)]);

test("validates and trims a party", () => {
  const result = validateParty(party);
  assert.equal(result.name, "Winter Mixer");
  assert.equal(result.location, "Calgary Petroleum Club");
  assert.equal(result.description, "Drinks\nand food");
  assert.equal(result.capacity, 120);
  assert.ok(result.startsAt instanceof Date);
});
test("party needs a name, location and a real date; description, notes and capacity are optional", () => {
  assert.throws(() => validateParty({ ...party, name: "   " }), /party name/);
  assert.throws(() => validateParty({ ...party, location: "" }), /location/);
  assert.throws(() => validateParty({ ...party, startsAt: "tomorrow" }), /date and time/);
  assert.throws(() => validateParty({ ...party, startsAt: "1999-01-01T00:00:00Z" }), /date and time/);
  assert.throws(() => validateParty(null), /invalid/);
  const minimal = validateParty({ name: "A", startsAt: party.startsAt, location: "B" });
  assert.equal(minimal.capacity, null); assert.equal(minimal.description, ""); assert.equal(minimal.hostNotes, "");
});
test("enforces length limits and capacity rules", () => {
  assert.throws(() => validateParty({ ...party, name: "x".repeat(121) }), /too long/);
  assert.throws(() => validateParty({ ...party, description: "x".repeat(2001) }), /too long/);
  assert.throws(() => validateParty({ ...party, hostNotes: "x".repeat(2001) }), /too long/);
  assert.equal(capacity(0), 0);
  for (const bad of [-1, 1.5, "50", 100001, NaN]) assert.throws(() => capacity(bad), /Capacity/);
});
test("strips control characters from text", () => { assert.equal(validateParty({ ...party, name: "Mix\u0000er\u0007" }).name, "Mixer"); });

test("validates and trims a guest, builds a search key and defaults status to pending", () => {
  const guest = validateGuest({ firstName: " Ada ", lastName: "  Lovelace", company: " Analytical  Engines ", invitedBy: " Rambod " });
  assert.deepEqual([guest.firstName, guest.lastName, guest.company, guest.invitedBy, guest.status], ["Ada", "Lovelace", "Analytical Engines", "Rambod", "pending"]);
  assert.equal(guest.searchKey, "ada lovelace analytical engines");
});
test("guest needs first and last name, and only the three statuses are allowed", () => {
  assert.throws(() => validateGuest({ firstName: "", lastName: "X" }), /first name/);
  assert.throws(() => validateGuest({ firstName: "X", lastName: " " }), /last name/);
  assert.throws(() => validateGuest({ firstName: "X", lastName: "Y", status: "maybe" }), /Status/);
  assert.throws(() => validateGuest({ firstName: "x".repeat(81), lastName: "Y" }), /too long/);
  assert.throws(() => validateGuest({ firstName: 5, lastName: "Y" }), /valid first name/);
  for (const ok of ["coming", "pending", "notComing"]) assert.equal(status(ok), ok);
  assert.equal(validateGuest({ firstName: "X", lastName: "Y" }).company, "");
});
test("document ids cannot address other paths", () => {
  assert.equal(docId("AbC123_-x"), "AbC123_-x");
  for (const bad of ["", "a/b", "..", "a b", 5, null, "x".repeat(65)]) assert.throws(() => docId(bad), /Invalid/);
});

test("recognises real image signatures and rejects everything else", () => {
  assert.equal(sniffImage(png), "image/png"); assert.equal(sniffImage(jpeg), "image/jpeg"); assert.equal(sniffImage(webp), "image/webp");
  assert.equal(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
  assert.equal(sniffImage(Buffer.from("GIF89a" + "0".repeat(30))), null);
});
test("validates a photo and thumbnail", () => {
  const result = validatePhoto({ photo: png.toString("base64"), thumb: jpeg.toString("base64") });
  assert.equal(result.full.ext, "png"); assert.match(result.thumbDataUrl, /^data:image\/jpeg;base64,/);
  assert.throws(() => validatePhoto({ photo: Buffer.from("not an image at all, just text").toString("base64"), thumb: jpeg.toString("base64") }), /JPEG, PNG or WebP/);
  assert.throws(() => validatePhoto({ photo: png.toString("base64"), thumb: png.toString("base64") }), /JPEG or WebP/);
  assert.throws(() => validatePhoto({ photo: "data:image/png;base64,AAAA", thumb: jpeg.toString("base64") }), /invalid/);
  assert.throws(() => validatePhoto({ photo: png.toString("base64") }), /thumbnail/);
  assert.throws(() => validatePhoto(null), /invalid/);
});
test("rejects photos over the size limits", () => {
  const big = Buffer.concat([png, Buffer.alloc(PHOTO.maxBytes)]);
  assert.throws(() => validatePhoto({ photo: big.toString("base64"), thumb: jpeg.toString("base64") }), /too large/);
  const bigThumb = Buffer.concat([jpeg, Buffer.alloc(PHOTO.thumbMaxBytes)]);
  assert.throws(() => validatePhoto({ photo: png.toString("base64"), thumb: bigThumb.toString("base64") }), /thumbnail/);
});

test("summarizes guest counts, check-ins by status and capacity left", () => {
  const guests = [
    { status: "coming", checkedIn: true }, { status: "coming", checkedIn: false }, { status: "pending", checkedIn: true },
    { status: "notComing", checkedIn: true }, { status: "notComing", checkedIn: false },
  ];
  assert.deepEqual(summarize(guests, 10), { invited: 5, coming: 2, pending: 1, notComing: 2, checkedIn: 3, checkedInNotComing: 1, checkedInPending: 1, capacity: 10, capacityLeft: 7 });
  assert.equal(summarize(guests, null).capacityLeft, null);
  assert.equal(summarize(guests, 2).capacityLeft, -1);
  assert.equal(summarize([], 5).invited, 0);
});

const fakeDb = (staff) => ({ collection: (name) => { assert.equal(name, "staff"); return { doc: (id) => ({ get: async () => ({ exists: id in staff, data: () => staff[id] }) }) }; } });
const request = (email, verified = true) => ({ auth: { uid: "u1", token: { email, email_verified: verified } } });
test("staff access: owner, listed active staff, everyone else denied", async () => {
  const database = fakeDb({ "ann@uniquem.ca": { active: true }, "bob@uniquem.ca": { active: false } });
  assert.deepEqual(await staffAccess(request("RAMBODR@uniquem.ca"), database), { uid: "u1", email: "rambodr@uniquem.ca", owner: true });
  assert.equal((await staffAccess(request("Ann@uniquem.ca"), database)).owner, false);
  assert.equal(await staffAccess(request("bob@uniquem.ca"), database), null);
  assert.equal(await staffAccess(request("eve@example.com"), database), null);
  assert.equal(await staffAccess(request("ann@uniquem.ca", false), database), null);
  assert.equal(await staffAccess({}, database), null);
  await assert.rejects(() => requireStaff(request("eve@example.com"), database), /not authorized/);
});
