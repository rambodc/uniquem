import { describe, expect, it } from "vitest";
import type { Guest, Party } from "../core/api";
import { arrivedGuests, checkedInMessage, clampPlusOnes, filterGuests, groupChips, inGroup, letterOf, letterSections, mergePolled, optimisticGuest, searchResults, sortGuests, splitName, splitParties } from "./logic";
import { edmontonInputToIso, formatClock, formatClockShort, isoToEdmontonInput } from "./time";
import { checkPhotoFile } from "./photo";

const guest = (over: Partial<Guest>): Guest => ({ id: "g", firstName: "Ada", lastName: "Lovelace", company: "Engines Ltd", invitedBy: "", notes: "", status: "pending", plusOnes: 0, vip: false, plusOnesArrived: 0, checkedIn: false, checkedInAt: null, createdAt: null, updatedAt: null, ...over });
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
  it("deep search (door check-in) also matches invited by / type and notes; normal search does not", () => {
    const list = [guest({ id: "1", invitedBy: "Party Crew", notes: "Vegan, plus-one" }), guest({ id: "2", firstName: "Bob", lastName: "Ray", company: "Acme", invitedBy: "Client" })];
    expect(filterGuests(list, "crew", "all", true).map((g) => g.id)).toEqual(["1"]);
    expect(filterGuests(list, "vegan plus", "all", true).map((g) => g.id)).toEqual(["1"]);
    expect(filterGuests(list, "client acme", "all", true).map((g) => g.id)).toEqual(["2"]);
    expect(filterGuests(list, "crew")).toEqual([]);
    expect(filterGuests(list, "vegan")).toEqual([]);
  });
  it("filters by status", () => { expect(filterGuests(guests, "", "coming").map((g) => g.id)).toEqual(["3"]); expect(filterGuests(guests, "", "notComing").map((g) => g.id)).toEqual(["2"]); });
  it("sorts by first name (then last name), ignoring case and accents", () => {
    const list = [guest({ id: "1", firstName: "zoe", lastName: "Adams" }), guest({ id: "2", firstName: "Éric", lastName: "Zed" }), guest({ id: "3", firstName: "eric", lastName: "Baker" }), guest({ id: "4", firstName: "Ada", lastName: "Young" }), guest({ id: "5", firstName: "ada", lastName: "Brown" })];
    expect(sortGuests(list).map((g) => g.id)).toEqual(["5", "4", "3", "2", "1"]);
  });
  it("does not change the order of the original list", () => { const list = [guest({ id: "1", firstName: "Zed" }), guest({ id: "2", firstName: "Abe" })]; sortGuests(list); expect(list.map((g) => g.id)).toEqual(["1", "2"]); });
});

describe("photo checks", () => {
  it("accepts jpeg/png/webp up to 5 MB only", () => {
    expect(checkPhotoFile({ type: "image/png", size: 1000 })).toBe("");
    expect(checkPhotoFile({ type: "image/gif", size: 1000 })).toMatch(/JPEG, PNG or WebP/);
    expect(checkPhotoFile({ type: "image/webp", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
});

describe("door optimistic updates", () => {
  it("shows a check-in or undo at once", () => {
    const out = optimisticGuest(guest({ id: "1", checkedIn: true, checkedInAt: "2026-07-11T01:30:15.000Z" }), false, "2026-07-11T02:00:00.000Z");
    expect(out.checkedIn).toBe(false); expect(out.checkedInAt).toBeNull();
    const back = optimisticGuest(out, true, "2026-07-11T02:00:00.000Z");
    expect(back.checkedIn).toBe(true); expect(back.checkedInAt).toBe("2026-07-11T02:00:00.000Z");
  });
  it("a poll never overwrites a row that is mid-action, but updates the rest", () => {
    const current = [guest({ id: "1", checkedIn: false }), guest({ id: "2", checkedIn: false })];
    const polled = [guest({ id: "1", checkedIn: true, checkedInAt: "2026-07-11T01:30:15.000Z" }), guest({ id: "2", checkedIn: true, checkedInAt: "2026-07-11T01:31:00.000Z" }), guest({ id: "3" })];
    const merged = mergePolled(current, polled, new Set(["1"]));
    expect(merged.map((g) => g.checkedIn)).toEqual([false, true, false]);
    expect(mergePolled(current, polled, new Set())).toBe(polled);
  });
});

describe("door tools", () => {
  const list = [
    guest({ id: "1", firstName: "Sam", lastName: "Hughes", invitedBy: "Client", status: "coming", plusOnes: 2 }),
    guest({ id: "2", firstName: "Ada", lastName: "Lovelace", invitedBy: "client ", status: "coming", checkedIn: true, checkedInAt: "2026-07-11T01:30:00.000Z", plusOnesArrived: 1, plusOnes: 1 }),
    guest({ id: "3", firstName: "éric", lastName: "Zed", invitedBy: "Work", status: "pending" }),
    guest({ id: "4", firstName: "Bob", lastName: "Ray", invitedBy: "", status: "notComing", checkedIn: true, checkedInAt: "2026-07-11T02:10:00.000Z", plusOnesArrived: 0 }),
    guest({ id: "5", firstName: "7th", lastName: "Heaven", invitedBy: "Work", vip: true }),
    guest({ id: "6", firstName: "Ann", lastName: "Lee", invitedBy: "Walk-in", status: "coming" }),
  ];
  it("search puts guests who have not arrived first, A–Z, then arrived ones", () => {
    const all = searchResults(list.map((g) => ({ ...g, notes: "e" })), "e");
    expect(all.map((g) => g.checkedIn)).toEqual([false, false, false, false, true, true]);
    expect(all.slice(0, 4).map((g) => g.firstName)).toEqual(["7th", "Ann", "éric", "Sam"]);
  });
  it("search finds VIPs and walk-ins by word", () => {
    expect(searchResults(list, "vip").map((g) => g.id)).toEqual(["5"]);
    expect(searchResults(list, "walk-in").map((g) => g.id)).toEqual(["6"]);
  });
  it("arrived list is latest first", () => { expect(arrivedGuests(list).map((g) => g.id)).toEqual(["4", "2"]); });
  it("groups the browse chips from the data (case-insensitive), most common first", () => {
    expect(groupChips(list)).toEqual([{ key: "client", label: "Client", count: 2 }, { key: "work", label: "Work", count: 2 }, { key: "walk-in", label: "Walk-in", count: 1 }]);
    expect(list.filter((g) => inGroup(g, "client")).map((g) => g.id)).toEqual(["1", "2"]);
    expect(list.filter((g) => inGroup(g, null))).toHaveLength(6);
  });
  it("letter sections are A–Z by first name with # last for non-letters", () => {
    expect(letterOf({ firstName: "éric" })).toBe("E"); expect(letterOf({ firstName: "7th" })).toBe("#"); expect(letterOf({ firstName: "" })).toBe("#");
    expect(letterSections(list).map((s) => s.letter)).toEqual(["A", "B", "E", "S", "#"]);
    expect(letterSections(list)[0].guests.map((g) => g.firstName)).toEqual(["Ada", "Ann"]);
  });
  it("splits a typed name for the walk-in form", () => {
    expect(splitName("  sam   van der berg ")).toEqual({ firstName: "sam", lastName: "van der berg" });
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" }); expect(splitName("")).toEqual({ firstName: "", lastName: "" });
  });
  it("clamps plus-ones to 0–10 whole numbers", () => { expect([clampPlusOnes(-3), clampPlusOnes(2.6), clampPlusOnes(40), clampPlusOnes(NaN)]).toEqual([0, 3, 10, 0]); });
  it("check-in keeps how many plus-ones arrived and undo resets it", () => {
    const base = guest({ id: "1", plusOnes: 2 });
    const inn = optimisticGuest(base, true, "2026-07-11T01:30:15.000Z", 2);
    expect(inn.plusOnesArrived).toBe(2);
    expect(optimisticGuest(inn, false, "").plusOnesArrived).toBe(0);
    expect(optimisticGuest(base, true, "2026-07-11T01:30:15.000Z").plusOnesArrived).toBe(0);
  });
  it("formats the confirmation line and a short clock", () => {
    expect(formatClockShort("2026-07-11T01:42:30.000Z")).toBe("7:42 PM");
    expect(checkedInMessage(guest({ firstName: "Sam", lastName: "Hughes", plusOnesArrived: 2 }), "7:42 PM")).toBe("Checked in Sam Hughes +2 · 7:42 PM");
    expect(checkedInMessage(guest({ firstName: "Sam", lastName: "Hughes" }), "7:42 PM")).toBe("Checked in Sam Hughes · 7:42 PM");
  });
});
