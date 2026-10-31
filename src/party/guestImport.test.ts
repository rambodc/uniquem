import { describe, expect, it } from "vitest";
import { parseGuestImport, parseStatus } from "./guestImport";

/** A guest already on the list, with every field. */
const onList = (over: { firstName: string; lastName: string } & Partial<{ company: string; invitedBy: string; notes: string; plusOnes: number }>) => ({ company: "", invitedBy: "", notes: "", plusOnes: 0, ...over });

describe("parseStatus", () => {
  it("understands friendly variants and defaults blank to pending", () => {
    for (const word of ["coming", "Coming", "yes", "Confirmed", "attending"]) expect(parseStatus(word)).toBe("coming");
    for (const word of ["pending", "", "  ", "Maybe", "TBD"]) expect(parseStatus(word)).toBe("pending");
    for (const word of ["notComing", "not coming", "Not-Coming", "NOT_COMING", "no", "Declined", "can't come"]) expect(parseStatus(word)).toBe("notComing");
    expect(parseStatus("banana")).toBeNull();
  });
});

describe("plus-ones in the import", () => {
  it("reads an optional 7th field and treats blank as 0", () => {
    const { toAdd, problems } = parseGuestImport("Ada\tLovelace\tCo\tClient\tcoming\tVegan\t2\nGrace\tHopper\t\t\t\t\t\nAlan, Turing");
    expect(problems).toEqual([]);
    expect(toAdd.map((guest) => guest.plusOnes)).toEqual([2, 0, 0]);
  });
  it("rejects plus-ones that are not whole numbers from 0 to 10", () => {
    const { problems, toAdd } = parseGuestImport("A, B, C, D, coming, n, 11\nA, C, C, D, coming, n, -1\nA, D, C, D, coming, n, two");
    expect(toAdd).toEqual([]);
    expect(problems.map((problem) => problem.reason)).toEqual(Array(3).fill(expect.stringMatching(/Plus-ones .* whole number from 0 to 10/)));
  });
  it("fills plus-ones on a guest already on the list only when they have none, and never overwrites", () => {
    const preview = parseGuestImport("Ada, Lovelace, , , , , 2\nGrace, Hopper, , , , , 3", [onList({ firstName: "Ada", lastName: "Lovelace", company: "Co", invitedBy: "x", notes: "y" }), onList({ firstName: "Grace", lastName: "Hopper", plusOnes: 1, company: "Co", invitedBy: "x", notes: "y" })]);
    expect(preview.rows.map((row) => row.fills)).toEqual([["plusOnes"], []]);
    expect(preview.toUpdate.map((guest) => guest.firstName)).toEqual(["Ada"]); expect(preview.skipped).toBe(1);
  });
});

describe("parseGuestImport", () => {
  it("reads comma separated lines with optional trailing fields", () => {
    const { rows, problems, toAdd } = parseGuestImport("Ada, Lovelace, Engines Ltd, Rambod, coming\nGrace,Hopper\n\n  Alan , Turing , , , not coming  ");
    expect(problems).toEqual([]);
    expect(toAdd).toEqual([
      { firstName: "Ada", lastName: "Lovelace", gender: "male", company: "Engines Ltd", invitedBy: "Rambod", notes: "", status: "coming", plusOnes: 0, vip: false },
      { firstName: "Grace", lastName: "Hopper", gender: "male", company: "", invitedBy: "", notes: "", status: "pending", plusOnes: 0, vip: false },
      { firstName: "Alan", lastName: "Turing", gender: "male", company: "", invitedBy: "", notes: "", status: "notComing", plusOnes: 0, vip: false },
    ]);
    expect(rows.map((row) => row.line)).toEqual([1, 2, 4]);
  });
  it("reads tab separated rows pasted from a spreadsheet (commas inside a field are kept) and Windows line endings", () => {
    const { toAdd, problems } = parseGuestImport("Ada\tLovelace\tEngines, Ltd\tRambod\tyes\r\nGrace\tHopper\t\t\t\r\n");
    expect(problems).toEqual([]);
    expect(toAdd[0]).toMatchObject({ company: "Engines, Ltd", invitedBy: "Rambod", status: "coming" });
    expect(toAdd[1]).toMatchObject({ firstName: "Grace", company: "", status: "pending" });
  });
  it("ignores a header row", () => {
    const { toAdd, problems } = parseGuestImport("First name\tLast name\tCompany\tInvited by / Type\tStatus\nAda\tLovelace");
    expect(problems).toEqual([]); expect(toAdd).toHaveLength(1);
  });
  it("reads an optional 6th field as notes and keeps 5-field lines working", () => {
    const { toAdd, problems } = parseGuestImport("Ada, Lovelace, Co, Work, coming, Allergic to nuts\nGrace, Hopper, Navy, Friends, pending\nAlan\tTuring\t\tClient\tcoming\tVIP, plus-one, vegan\nLinus, Torvalds, , , , ");
    expect(problems).toEqual([]);
    expect(toAdd.map((guest) => guest.notes)).toEqual(["Allergic to nuts", "", "VIP, plus-one, vegan", ""]);
    expect(toAdd[0]).toMatchObject({ invitedBy: "Work", status: "coming" });
  });
  it("rejects notes that are too long", () => {
    const { problems } = parseGuestImport("Ada, Lovelace, , , , " + "x".repeat(501));
    expect(problems[0].reason).toBe("The notes is too long (max 500 characters).");
  });
  it("fills blank notes on an existing guest but never overwrites", () => {
    const { rows, toUpdate } = parseGuestImport("Ada, Lovelace, , , , Nut allergy\nGrace, Hopper, , , , New note", [
      onList({ firstName: "Ada", lastName: "Lovelace" }), onList({ firstName: "Grace", lastName: "Hopper", notes: "VIP" })]);
    expect(rows.map((row) => row.fills)).toEqual([["notes"], []]);
    expect(toUpdate).toHaveLength(1);
  });
  it("names the invited by / type field when it is too long", () => {
    const { problems } = parseGuestImport("Ada, Lovelace, Co, " + "x".repeat(121));
    expect(problems[0].reason).toBe("The invited by / type is too long (max 120 characters).");
  });
  it("reports problem lines with their line number and does not add them", () => {
    const { toAdd, problems } = parseGuestImport("Ada, Lovelace\nMadonna\nJohn Smith\nBob, Jones, Co, Me, whenever\n, Nobody\nA, B, C, D, coming, note, 1, extra\n" + "x".repeat(81) + ", Long");
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["Ada"]);
    expect(problems.map((problem) => problem.line)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(problems[1].reason).toMatch(/comma or tab/);
    expect(problems[2].reason).toMatch(/Status/);
    expect(problems[4].reason).toMatch(/Too many fields/);
    expect(problems[4].reason).toContain("invited by / type");
    expect(problems[5].reason).toMatch(/too long/);
  });
  it("skips names already on the list and repeats within the paste, ignoring case", () => {
    const { rows, toAdd, skipped } = parseGuestImport("ada, LOVELACE\nAda, Lovelace\nGrace, Hopper\ngrace, hopper", [onList({ firstName: "Ada", lastName: "Lovelace" })]);
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["Grace"]);
    expect(skipped).toBe(3);
    expect(rows.map((row) => row.duplicate)).toEqual(["list", "list", null, "paste"]);
  });
  it("strips control characters and extra spaces", () => {
    expect(parseGuestImport("Ada\u0007  May,  Love   lace").toAdd[0]).toMatchObject({ firstName: "Ada May", lastName: "Love lace" });
  });
  it("fills in invited by (and company) on guests already on the list when theirs is blank", () => {
    const existing = [
      onList({ firstName: "Ada", lastName: "Lovelace" }),
      onList({ firstName: "Grace", lastName: "Hopper", company: "Navy", invitedBy: "Friends" }),
      onList({ firstName: "Alan", lastName: "Turing", invitedBy: "Client" }),
    ];
    const { rows, toAdd, toUpdate, skipped } = parseGuestImport("ADA, lovelace, Engines, Work\nGrace, Hopper, Other, Work\nAlan, Turing, Bletchley\nAlan, Turing, Bletchley\nAda, Lovelace, , Crew\nNew, Person, , Work", existing);
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["New"]);
    expect(toUpdate.map((guest) => guest.firstName)).toEqual(["ADA", "Alan"]);
    expect(rows.map((row) => row.duplicate)).toEqual([null, "list", null, "list", "list", null]);
    expect(rows.map((row) => row.fills)).toEqual([["invitedBy", "company"], [], ["company"], [], [], []]);
    expect(skipped).toBe(3);
  });
  it("treats a pasted blank invited by as nothing to fill", () => {
    const { rows, toUpdate, skipped } = parseGuestImport("Ada, Lovelace", [onList({ firstName: "Ada", lastName: "Lovelace" })]);
    expect(toUpdate).toEqual([]); expect(skipped).toBe(1); expect(rows[0].duplicate).toBe("list");
  });
});
