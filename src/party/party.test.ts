import { describe, expect, it } from "vitest";
import type { Guest, Party } from "../core/api";
import { arrivals, filterGuests, sortGuests, splitParties } from "./logic";
import { edmontonInputToIso, formatClock, isoToEdmontonInput } from "./time";
import { checkPhotoFile } from "./photo";

const guest = (over: Partial<Guest>): Guest => ({ id: "g", firstName: "Ada", lastName: "Lovelace", company: "Engines Ltd", invitedBy: "", status: "pending", checkedIn: false, checkedInAt: null, createdAt: null, updatedAt: null, ...over });
const party = (id: string, startsAt: string): Party => ({ id, name: id, startsAt, location: "", description: "", capacity: null, hostNotes: "", hasPhoto: false, archived: false, archivedAt: null, thumbDataUrl: null, createdAt: null, updatedAt: null });

describe("Calgary time", () => {
  // Alberta stays on UTC-6 all year from 1 Nov 2026 (Official Time Act), and tz data differs by version for later dates.
  // So fixed-offset checks use dates that are the same under every tz-data version (Jan 2026 = MST, Jul 2026 = MDT).
  it("converts typed Calgary time to the right instant in winter 2026 (MST, UTC-7) and summer (MDT, UTC-6)", () => {
    expect(edmontonInputToIso("2026-01-15T19:30")).toBe("2026-01-16T02:30:00.000Z");
    expect(edmontonInputToIso("2026-07-10T19:30")).toBe("2026-07-11T01:30:00.000Z");
  });
  it("gives a Calgary offset of 6 or 7 hours for a later winter date and round-trips it, whichever tz data is installed", () => {
    const iso = edmontonInputToIso("2026-12-04T19:30");
    expect(["2026-12-05T01:30:00.000Z", "2026-12-05T02:30:00.000Z"]).toContain(iso);
    expect(isoToEdmontonInput(iso)).toBe("2026-12-04T19:30");
  });
  it("round-trips and handles the daylight-saving edges", () => {
    for (const input of ["2026-12-04T19:30", "2026-01-15T19:30", "2026-03-08T01:30", "2026-03-08T03:30", "2026-11-01T00:30", "2026-11-01T03:30"]) expect(isoToEdmontonInput(edmontonInputToIso(input))).toBe(input);
    expect(edmontonInputToIso("2026-03-08T02:30")).toBe(""); // skipped hour when clocks spring forward
  });
  it("rejects malformed input", () => { expect(edmontonInputToIso("")).toBe(""); expect(edmontonInputToIso("2026-13-40T99:00")).toBe(""); });
  it("shows check-in times in Calgary time", () => { expect(formatClock("2026-07-11T01:30:15.000Z")).toMatch(/7:30:15\s?p\.?m/i); });
});

describe("party lists", () => {
  const now = Date.parse("2026-12-05T03:00:00Z");
  it("splits upcoming (including a party that started within 12h) from past, ordered sensibly", () => {
    const { upcoming, past } = splitParties([party("old", "2026-11-01T02:00:00Z"), party("tonight", "2026-12-05T02:30:00Z"), party("later", "2027-01-10T02:00:00Z"), party("soon", "2026-12-20T02:00:00Z"), party("older", "2026-10-01T02:00:00Z")], now);
    expect(upcoming.map((p) => p.id)).toEqual(["tonight", "soon", "later"]);
    expect(past.map((p) => p.id)).toEqual(["old", "older"]);
  });
});

describe("guest search", () => {
  const guests = [guest({ id: "1" }), guest({ id: "2", firstName: "José", lastName: "Álvarez", company: "Calgary Oil", status: "notComing" }), guest({ id: "3", firstName: "Grace", lastName: "Hopper", company: "Navy", status: "coming" })];
  it("matches first name, last name or company, in any order, ignoring case and accents", () => {
    expect(filterGuests(guests, "lovelace").map((g) => g.id)).toEqual(["1"]);
    expect(filterGuests(guests, "ADA lov").map((g) => g.id)).toEqual(["1"]);
    expect(filterGuests(guests, "jose alvarez").map((g) => g.id)).toEqual(["2"]);
    expect(filterGuests(guests, "alvarez jose").map((g) => g.id)).toEqual(["2"]);
    expect(filterGuests(guests, "calgary").map((g) => g.id)).toEqual(["2"]);
    expect(filterGuests(guests, "").length).toBe(3);
    expect(filterGuests(guests, "zzz")).toEqual([]);
  });
  it("filters by status", () => { expect(filterGuests(guests, "", "coming").map((g) => g.id)).toEqual(["3"]); expect(filterGuests(guests, "", "notComing").map((g) => g.id)).toEqual(["2"]); });
  it("sorts by first name (then last name), ignoring case and accents", () => {
    const list = [guest({ id: "1", firstName: "zoe", lastName: "Adams" }), guest({ id: "2", firstName: "Éric", lastName: "Zed" }), guest({ id: "3", firstName: "eric", lastName: "Baker" }), guest({ id: "4", firstName: "Ada", lastName: "Young" }), guest({ id: "5", firstName: "ada", lastName: "Brown" })];
    expect(sortGuests(list).map((g) => g.id)).toEqual(["5", "4", "3", "2", "1"]);
  });
  it("does not change the order of the original list", () => { const list = [guest({ id: "1", firstName: "Zed" }), guest({ id: "2", firstName: "Abe" })]; sortGuests(list); expect(list.map((g) => g.id)).toEqual(["1", "2"]); });
});

describe("arrivals", () => {
  const list = [guest({ id: "a", checkedIn: true, checkedInAt: "2026-12-05T02:40:00Z" }), guest({ id: "b", checkedIn: true, checkedInAt: "2026-12-05T02:10:00Z" }), guest({ id: "c" })];
  it("lists only checked-in guests, oldest or newest first", () => { expect(arrivals(list, false).map((g) => g.id)).toEqual(["b", "a"]); expect(arrivals(list, true).map((g) => g.id)).toEqual(["a", "b"]); });
});

describe("photo checks", () => {
  it("accepts jpeg/png/webp up to 5 MB only", () => {
    expect(checkPhotoFile({ type: "image/png", size: 1000 })).toBe("");
    expect(checkPhotoFile({ type: "image/gif", size: 1000 })).toMatch(/JPEG, PNG or WebP/);
    expect(checkPhotoFile({ type: "image/webp", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
});
