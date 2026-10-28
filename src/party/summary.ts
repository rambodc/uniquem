import type { Guest } from "../core/api";

/** The only fields the counts need from a guest. */
export type SummaryGuest = Pick<Guest, "status" | "plusOnes" | "plusOnesArrived" | "checkedIn">;
export type PartySummary = {
  /** Every guest on the list. */
  invited: number;
  coming: number; pending: number; notComing: number;
  /** Guests who are checked in (plus-ones not counted). */
  checkedIn: number;
  /** Checked-in guests who were marked pending / not coming. */
  checkedInPending: number; checkedInNotComing: number;
  /** Planning: the plus-ones of coming guests, and coming guests + those plus-ones. Never used for capacity left. */
  comingPlusOnes: number; expectedHeadcount: number;
  /** Door: checked-in guests + the plus-ones who actually arrived with them (walk-ins included). */
  arrivedPeople: number;
  /** The party's own stored capacity, or null when none is set. */
  capacity: number | null;
  /** capacity − arrivedPeople. Negative when over capacity (never floored). Null when no capacity is set. */
  capacityLeft: number | null;
};

/**
 * THE one place party counts are worked out. Everything is derived from the guest list every time it is read: nothing is stored or incremented,
 * so the numbers cannot drift. Screens never count guests themselves; they call this and show what it returns.
 * Plus-ones who arrived only count while the guest is checked in. Guests that were deleted are simply not in the list.
 */
export function summarize(guests: readonly SummaryGuest[], capacity: number | null): PartySummary {
  const summary: PartySummary = { invited: guests.length, coming: 0, pending: 0, notComing: 0, checkedIn: 0, checkedInPending: 0, checkedInNotComing: 0, comingPlusOnes: 0, expectedHeadcount: 0, arrivedPeople: 0, capacity, capacityLeft: null };
  for (const guest of guests) {
    summary[guest.status] += 1;
    if (guest.status === "coming") { summary.comingPlusOnes += guest.plusOnes; summary.expectedHeadcount += 1 + guest.plusOnes; }
    if (!guest.checkedIn) continue;
    summary.checkedIn += 1; summary.arrivedPeople += 1 + guest.plusOnesArrived;
    if (guest.status === "pending") summary.checkedInPending += 1;
    if (guest.status === "notComing") summary.checkedInNotComing += 1;
  }
  if (capacity != null) summary.capacityLeft = capacity - summary.arrivedPeople;
  return summary;
}
