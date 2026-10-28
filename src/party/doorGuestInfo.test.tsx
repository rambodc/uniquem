import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Guest } from "../core/api";
import DoorGuestInfo from "./DoorGuestInfo";

const guest = (over: Partial<Guest>): Guest => ({ id: "g", firstName: "Ada", lastName: "Lovelace", company: "Engines Ltd", invitedBy: "Client", notes: "Vegan, plus-one", status: "coming", plusOnes: 0, vip: false, plusOnesArrived: 0, checkedIn: false, checkedInAt: null, createdAt: null, updatedAt: null, ...over });
const html = (over: Partial<Guest> = {}, busy?: "in" | "out") => renderToStaticMarkup(<DoorGuestInfo guest={guest(over)} busy={busy} />);

describe("door guest info", () => {
  it("shows every field with labels", () => {
    const out = html();
    for (const text of ["Ada Lovelace", "Company", "Engines Ltd", "Invited by / Type", "Client", "Status", "Coming", "Notes", "Vegan, plus-one"]) expect(out).toContain(text);
    expect(out).not.toContain("Checked in");
  });
  it("hides labels for empty company, group and notes but always shows status", () => {
    const out = html({ company: "", invitedBy: "", notes: "" });
    expect(out).not.toContain("Company"); expect(out).not.toContain("Invited by"); expect(out).not.toContain("Notes");
    expect(out).toContain("Status");
  });
  it("flags guests who are not coming or pending", () => {
    expect(html({ status: "notComing" })).toContain("Marked not coming");
    expect(html({ status: "pending" })).toContain("Marked pending");
  });
  it("shows VIP, plus-ones (planned and arrived) and a note icon when collapsed", () => {
    const out = html({ vip: true, plusOnes: 2, checkedIn: true, checkedInAt: "2026-07-11T01:30:15.000Z", plusOnesArrived: 1 });
    expect(out).toContain("VIP"); expect(out).toContain("+2"); expect(out).toContain("2 planned · 1 arrived");
    const collapsed = renderToStaticMarkup(<DoorGuestInfo guest={guest({ vip: true, plusOnes: 1 })} expanded={false} />);
    expect(collapsed).toContain("Has a note"); expect(collapsed).toContain("VIP"); expect(collapsed).toContain("Engines Ltd · Client");
    expect(collapsed).not.toContain("Vegan"); expect(collapsed).not.toContain("<dl");
    expect(renderToStaticMarkup(<DoorGuestInfo guest={guest({ notes: "" })} expanded={false} />)).not.toContain("Has a note");
  });
  it("shows no VIP or plus-one marks for a plain guest", () => { const out = html(); expect(out).not.toContain("VIP"); expect(out).not.toContain("Plus-ones"); });
  it("still shows all info plus the check-in time after check-in", () => {
    const out = html({ checkedIn: true, checkedInAt: "2026-07-11T01:30:15.000Z" });
    expect(out).toContain("Checked in"); expect(out).toMatch(/7:30:15/);
    for (const text of ["Engines Ltd", "Client", "Vegan, plus-one", "Coming"]) expect(out).toContain(text);
  });
  it("shows Checking in… instead of a time while a check-in is being confirmed", () => {
    const out = html({ checkedIn: true, checkedInAt: "2026-07-11T01:30:15.000Z" }, "in");
    expect(out).toContain("Checking in…"); expect(out).not.toMatch(/7:30:15/);
  });
});
