import { describe, expect, it } from "vitest";
import { parseGuestImport, parseStatus } from "./importGuests";

describe("parseStatus", () => {
  it("understands friendly variants and defaults blank to pending", () => {
    for (const word of ["coming", "Coming", "yes", "Confirmed", "attending"]) expect(parseStatus(word)).toBe("coming");
    for (const word of ["pending", "", "  ", "Maybe", "TBD"]) expect(parseStatus(word)).toBe("pending");
    for (const word of ["notComing", "not coming", "Not-Coming", "NOT_COMING", "no", "Declined", "can't come"]) expect(parseStatus(word)).toBe("notComing");
    expect(parseStatus("banana")).toBeNull();
  });
});

describe("parseGuestImport", () => {
  it("reads comma separated lines with optional trailing fields", () => {
    const { rows, problems, toAdd } = parseGuestImport("Ada, Lovelace, Engines Ltd, Rambod, coming\nGrace,Hopper\n\n  Alan , Turing , , , not coming  ");
    expect(problems).toEqual([]);
    expect(toAdd).toEqual([
      { firstName: "Ada", lastName: "Lovelace", company: "Engines Ltd", invitedBy: "Rambod", status: "coming" },
      { firstName: "Grace", lastName: "Hopper", company: "", invitedBy: "", status: "pending" },
      { firstName: "Alan", lastName: "Turing", company: "", invitedBy: "", status: "notComing" },
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
    const { toAdd, problems } = parseGuestImport("First name\tLast name\tCompany\tInvited by\tStatus\nAda\tLovelace");
    expect(problems).toEqual([]); expect(toAdd).toHaveLength(1);
  });
  it("reports problem lines with their line number and does not add them", () => {
    const { toAdd, problems } = parseGuestImport("Ada, Lovelace\nMadonna\nJohn Smith\nBob, Jones, Co, Me, whenever\n, Nobody\nA, B, C, D, coming, extra\n" + "x".repeat(81) + ", Long");
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["Ada"]);
    expect(problems.map((problem) => problem.line)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(problems[1].reason).toMatch(/comma or tab/);
    expect(problems[2].reason).toMatch(/Status/);
    expect(problems[4].reason).toMatch(/Too many fields/);
    expect(problems[5].reason).toMatch(/too long/);
  });
  it("skips names already on the list and repeats within the paste, ignoring case", () => {
    const { rows, toAdd, skipped } = parseGuestImport("ada, LOVELACE\nAda, Lovelace\nGrace, Hopper\ngrace, hopper", [{ firstName: "Ada", lastName: "Lovelace" }]);
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["Grace"]);
    expect(skipped).toBe(3);
    expect(rows.map((row) => row.duplicate)).toEqual(["list", "list", null, "paste"]);
  });
  it("strips control characters and extra spaces", () => {
    expect(parseGuestImport("Ada\u0007  May,  Love   lace").toAdd[0]).toMatchObject({ firstName: "Ada May", lastName: "Love lace" });
  });
  it("fills in invited by (and company) on guests already on the list when theirs is blank", () => {
    const existing = [
      { firstName: "Ada", lastName: "Lovelace", company: "", invitedBy: "" },
      { firstName: "Grace", lastName: "Hopper", company: "Navy", invitedBy: "Friends" },
      { firstName: "Alan", lastName: "Turing", company: "", invitedBy: "Client" },
    ];
    const { rows, toAdd, toUpdate, skipped } = parseGuestImport("ADA, lovelace, Engines, Work\nGrace, Hopper, Other, Work\nAlan, Turing, Bletchley\nAlan, Turing, Bletchley\nAda, Lovelace, , Crew\nNew, Person, , Work", existing);
    expect(toAdd.map((guest) => guest.firstName)).toEqual(["New"]);
    expect(toUpdate.map((guest) => guest.firstName)).toEqual(["ADA", "Alan"]);
    expect(rows.map((row) => row.duplicate)).toEqual([null, "list", null, "list", "list", null]);
    expect(rows.map((row) => row.fills)).toEqual([["invitedBy", "company"], [], ["company"], [], [], []]);
    expect(skipped).toBe(3);
  });
  it("treats a pasted blank invited by as nothing to fill", () => {
    const { rows, toUpdate, skipped } = parseGuestImport("Ada, Lovelace", [{ firstName: "Ada", lastName: "Lovelace", company: "", invitedBy: "" }]);
    expect(toUpdate).toEqual([]); expect(skipped).toBe(1); expect(rows[0].duplicate).toBe("list");
  });
});
