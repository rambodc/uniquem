import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Guest } from "../core/api";
import { genderRatio, summarize } from "./summary";

type G = Pick<Guest, "status" | "plusOnes" | "plusOnesArrived" | "checkedIn" | "gender">;
const g = (over: Partial<G> = {}): G => ({ gender: "male", status: "coming", plusOnes: 0, plusOnesArrived: 0, checkedIn: false, ...over });
const many = (count: number, over: Partial<G> = {}) => Array.from({ length: count }, () => g(over));

describe("party summary invariants (table driven)", () => {
  const cases: { name: string; guests: G[]; capacity: number | null; expect: Partial<ReturnType<typeof summarize>> }[] = [
    { name: "nobody arrived: capacity left equals capacity, whatever is planned", guests: many(73), capacity: 80, expect: { invited: 73, coming: 73, checkedIn: 0, arrivedPeople: 0, expectedHeadcount: 73, capacityLeft: 80 } },
    { name: "planned plus-ones never reduce capacity left", guests: [...many(10, { plusOnes: 2 })], capacity: 80, expect: { comingPlusOnes: 20, expectedHeadcount: 30, arrivedPeople: 0, capacityLeft: 80 } },
    { name: "a guest arrives alone", guests: [g({ checkedIn: true }), ...many(2)], capacity: 80, expect: { checkedIn: 1, arrivedPeople: 1, capacityLeft: 79 } },
    { name: "plus-ones arrived count as people", guests: [g({ plusOnes: 2, checkedIn: true, plusOnesArrived: 2 }), g({ plusOnes: 3, checkedIn: true, plusOnesArrived: 1 })], capacity: 10, expect: { checkedIn: 2, arrivedPeople: 3 + 2, expectedHeadcount: 3 + 4, capacityLeft: 5 } },
    { name: "undo: not checked in means nobody arrived, even if plus-ones were left on the record", guests: [g({ plusOnes: 2, checkedIn: false, plusOnesArrived: 2 })], capacity: 10, expect: { checkedIn: 0, arrivedPeople: 0, capacityLeft: 10 } },
    { name: "walk-in over capacity is negative and never hidden", guests: [...many(3, { checkedIn: true }), g({ checkedIn: true, plusOnes: 1, plusOnesArrived: 1 })], capacity: 4, expect: { arrivedPeople: 5, capacityLeft: -1 } },
    { name: "exactly full is 0", guests: many(4, { checkedIn: true }), capacity: 4, expect: { capacityLeft: 0 } },
    { name: "pending and not-coming guests: counted by status, not expected, plus-ones not expected", guests: [g({ status: "pending", plusOnes: 5 }), g({ status: "notComing", plusOnes: 5 }), g()], capacity: 10, expect: { invited: 3, coming: 1, pending: 1, notComing: 1, comingPlusOnes: 0, expectedHeadcount: 1, capacityLeft: 10 } },
    { name: "a pending or not-coming guest who shows up takes a space and is reported", guests: [g({ status: "pending", checkedIn: true, plusOnes: 1, plusOnesArrived: 1 }), g({ status: "notComing", checkedIn: true })], capacity: 10, expect: { checkedIn: 2, checkedInPending: 1, checkedInNotComing: 1, arrivedPeople: 3, expectedHeadcount: 0, capacityLeft: 7 } },
    { name: "deleted or archived guests are not in the list, so they are not counted", guests: [], capacity: 80, expect: { invited: 0, coming: 0, arrivedPeople: 0, expectedHeadcount: 0, capacityLeft: 80 } },
    { name: "no capacity set: no capacity left", guests: [g({ checkedIn: true })], capacity: null, expect: { capacity: null, capacityLeft: null, arrivedPeople: 1 } },
    { name: "capacity 0 is a real capacity", guests: [g({ checkedIn: true })], capacity: 0, expect: { capacityLeft: -1 } },
  ];
  for (const { name, guests, capacity, expect: expected } of cases) it(name, () => expect(summarize(guests, capacity)).toMatchObject(expected));

  it("the numbers always add up, for any list", () => {
    const statuses = ["coming", "pending", "notComing"] as const;
    for (let seed = 1; seed <= 200; seed++) {
      let x = seed * 9301 % 49297; const next = (max: number) => { x = (x * 9301 + 49297) % 233280; return x % max; };
      const guests = Array.from({ length: next(30) }, () => g({ status: statuses[next(3)], plusOnes: next(4), plusOnesArrived: next(4), checkedIn: next(2) === 1 }));
      const s = summarize(guests, 40);
      expect(s.coming + s.pending + s.notComing).toBe(s.invited);
      expect(s.invited).toBe(guests.length);
      expect(s.arrivedPeople).toBe(guests.filter((guest) => guest.checkedIn).reduce((sum, guest) => sum + 1 + guest.plusOnesArrived, 0));
      expect(s.capacityLeft).toBe(40 - s.arrivedPeople);
      expect(s.checkedIn).toBeLessThanOrEqual(s.arrivedPeople);
      expect(s.checkedInPending + s.checkedInNotComing).toBeLessThanOrEqual(s.checkedIn);
      expect(s.male + s.female).toBe(s.invited);
      expect(s.checkedInMale + s.checkedInFemale).toBe(s.checkedIn);
    }
  });
  it("gender: every guest on the list, and those checked in; plus-ones are not counted; ratio is reduced", () => {
    const s = summarize([g({ gender: "female", checkedIn: true, plusOnes: 2, plusOnesArrived: 2 }), g({ gender: "female" }), ...many(3, { checkedIn: true }), g({ status: "notComing" })], null);
    expect([s.male, s.female, s.checkedInMale, s.checkedInFemale]).toEqual([4, 2, 3, 1]);
    expect(genderRatio(s.male, s.female)).toBe("2 : 1"); expect(genderRatio(3, 1)).toBe("3 : 1"); expect(genderRatio(5, 0)).toBe("1 : 0"); expect(genderRatio(0, 0)).toBe("—"); expect(genderRatio(23, 17)).toBe("23 : 17");
  });
  it("does not change the guests it is given", () => { const guests = [g({ checkedIn: true, plusOnesArrived: 1 })], copy = structuredClone(guests); summarize(guests, 5); expect(guests).toEqual(copy); });
});

describe("one source of truth for counts", () => {
  const dir = new URL("./", import.meta.url), files = readdirSync(dir).filter((name) => /\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name) && name !== "summary.ts");
  const source = (name: string) => readFileSync(new URL(name, dir), "utf8");
  it("the screens that show counts import them from the summary module", () => {
    for (const name of ["CheckIn.tsx", "PartyDetail.tsx"]) expect(source(name), name).toMatch(/import \{[^}]*\bsummarize\b[^}]*\} from "\.\/summary"/);
  });
  it("no other party file counts guests, adds up plus-ones or works out capacity itself", () => {
    const forbidden: [RegExp, string][] = [
      [/\.reduce\(/, "reduce over guests"],
      [/\.(checkedIn|plusOnes|plusOnesArrived)\b\s*[-+*]|[-+*]\s*\w+\.(plusOnes|plusOnesArrived)\b/, "arithmetic on plus-ones or check-ins"],
      [/(checkedIn|status\s*===?\s*["'][a-zA-Z]+["'])\)\.length/, "counting filtered guests"],
      [/capacity\s*-|-\s*\w*\.?capacity\b/, "capacity arithmetic"],
      [/\bdoorCounts\b|function \w*(count|total|summar)\w*\(/i, "a second counting helper"],
    ];
    for (const name of files) for (const [pattern, what] of forbidden) expect(source(name), `${name}: ${what}`).not.toMatch(pattern);
  });
  it("only summary.ts defines capacity left", () => { for (const name of files) expect(source(name), name).not.toMatch(/capacityLeft\s*[:=]/); });
});
