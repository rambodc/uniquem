import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AVATAR, NAME_MAX, fullName, hasNames, photoPrefix, profileView, validateAvatar, validateName, validateNames } from "../profile.js";

const jpeg = (size = 2000) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0]), Buffer.alloc(size)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const b64 = (buffer) => buffer.toString("base64");

test("names: trimmed, inner spaces collapsed, 1 to 60 characters, no control characters", () => {
  assert.equal(validateName("  Mary   Jane ", "first name"), "Mary Jane");
  assert.equal(validateName("Zoë-Müller", "first name"), "Zoë-Müller");
  assert.equal(validateName("x".repeat(NAME_MAX), "first name").length, NAME_MAX);
  for (const bad of ["", "   ", null, undefined, 7, {}, "x".repeat(NAME_MAX + 1), "a\u0007b"]) assert.throws(() => validateName(bad, "first name"), /first name/);
  assert.deepEqual(validateNames({ firstName: "A", lastName: "B" }), { firstName: "A", lastName: "B" });
  assert.throws(() => validateNames({ firstName: "A" }), /last name/);
  assert.equal(fullName({ firstName: "A", lastName: "B" }), "A B");
});
test("hasNames accepts only records stored in the current form", () => {
  assert.equal(hasNames({ firstName: "A", lastName: "B" }), true);
  for (const bad of [null, {}, { firstName: "A" }, { firstName: "A", lastName: "" }, { firstName: " A", lastName: "B" }, { firstName: 1, lastName: "B" }, { firstName: "A", lastName: "x".repeat(61) }]) assert.equal(hasNames(bad), false);
});
test("avatar: a small JPEG and a small JPEG thumbnail, checked by their real bytes", () => {
  const ok = validateAvatar({ photo: b64(jpeg(30000)), thumb: b64(jpeg(3000)) });
  assert.equal(ok.full.type, "image/jpeg"); assert.equal(ok.full.ext, "jpg");
  assert.match(ok.thumbDataUrl, /^data:image\/jpeg;base64,/);
});
test("avatar: rejects other types, fakes, oversize files, bad base64 and non-objects", () => {
  const good = { photo: b64(jpeg()), thumb: b64(jpeg()) };
  assert.throws(() => validateAvatar({ ...good, photo: b64(png) }), /JPEG made by the app/);
  assert.throws(() => validateAvatar({ ...good, thumb: b64(png) }), /JPEG made by the app/);
  assert.throws(() => validateAvatar({ ...good, photo: b64(Buffer.from("<svg onload=alert(1)></svg>")) }), /JPEG, PNG or WebP/);
  assert.throws(() => validateAvatar({ ...good, photo: b64(jpeg(AVATAR.maxBytes)) }), /too large/);
  assert.throws(() => validateAvatar({ ...good, thumb: b64(jpeg(AVATAR.thumbMaxBytes)) }), /too large/);
  assert.throws(() => validateAvatar({ ...good, photo: "not base64!!" }), /invalid or too large/);
  assert.throws(() => validateAvatar({ ...good, photo: "" }), /invalid/);
  for (const bad of [null, [], "x", {}, { photo: good.photo }]) assert.throws(() => validateAvatar(bad), /invalid|photo/);
});
test("each person's photos live under their own uid; the view carries names, email and the small avatar only", () => {
  assert.equal(photoPrefix("abc"), "profile-photos/abc/");
  assert.notEqual(photoPrefix("abc").slice(0, -1), photoPrefix("abcd").slice(0, -1));
  assert.deepEqual(profileView({ firstName: "A", lastName: "B", email: "a@b.co", thumbDataUrl: undefined, photoPath: "secret/path", type: "staff" }), { firstName: "A", lastName: "B", email: "a@b.co", thumbDataUrl: null });
});
