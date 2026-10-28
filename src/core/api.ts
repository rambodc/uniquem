import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { Feature, Role } from "../auth/permissions";
async function invoke<TRequest, TResponse>(name: string, data?: TRequest) { return (await httpsCallable<TRequest, TResponse>(functions, name)(data as TRequest)).data; }
export type Inquiry = { id: string; inquiryType: string; productName?: string; name: string; email?: string; company?: string; phone?: string; message: string; createdAt: string | null; archived: boolean };
export type InquiryList = { inquiries: Inquiry[]; total: number; nextCursor: number | null };
export const submitContactInquiry = (data: Record<string, string>) => invoke("submitContactInquiry", data);
export const listContactInquiries = (data: { archived: boolean; query?: string; cursor?: number }) => invoke<typeof data, InquiryList>("listContactInquiries", data);
export const archiveContactInquiry = (inquiryId: string) => invoke("archiveContactInquiry", { inquiryId });
export const restoreContactInquiry = (inquiryId: string) => invoke("restoreContactInquiry", { inquiryId });

// ---- Access and Party ----
export type GuestStatus = "coming" | "pending" | "notComing";
export type Party = { id: string; name: string; startsAt: string | null; location: string; description: string; capacity: number | null; hostNotes: string; hasPhoto: boolean; archived: boolean; archivedAt: string | null; thumbDataUrl: string | null; createdAt: string | null; updatedAt: string | null };
export type PartyInput = { name: string; startsAt: string; location: string; description: string; capacity: number | null; hostNotes: string };
export type Guest = { id: string; firstName: string; lastName: string; company: string; invitedBy: string; notes: string; status: GuestStatus; checkedIn: boolean; checkedInAt: string | null; createdAt: string | null; updatedAt: string | null };
export type GuestInput = { firstName: string; lastName: string; company: string; invitedBy: string; notes: string; status: GuestStatus };
export type PartySummary = { invited: number; coming: number; pending: number; notComing: number; checkedIn: number; checkedInNotComing: number; checkedInPending: number; capacity: number | null; capacityLeft: number | null };
export type GuestList = { party: Party; guests: Guest[]; summary: PartySummary; serverTime: string };
/** What the server says the signed-in account may use. `role` is null when the account has no active staff document. */
export type StaffAccess = { role: Role | null; features: Feature[] };
export const getStaffAccess = () => invoke<undefined, StaffAccess>("getStaffAccess");
export const listParties = (archived = false) => invoke<{ archived: boolean }, { parties: Party[] }>("listParties", { archived });
export const getParty = (partyId: string) => invoke<{ partyId: string }, { party: Party }>("getParty", { partyId });
export const createParty = (data: PartyInput) => invoke<PartyInput, { partyId: string }>("createParty", data);
export const updateParty = (partyId: string, data: PartyInput) => invoke("updateParty", { partyId, ...data });
export const archiveParty = (partyId: string) => invoke("archiveParty", { partyId });
export const restoreParty = (partyId: string) => invoke("restoreParty", { partyId });
export const setPartyPhoto = (partyId: string, photo: { photo: string; thumb: string }) => invoke("setPartyPhoto", { partyId, ...photo });
export const removePartyPhoto = (partyId: string) => invoke("removePartyPhoto", { partyId });
export const getPartyPhoto = (partyId: string) => invoke<{ partyId: string }, { dataUrl: string | null }>("getPartyPhoto", { partyId });
export const listGuests = (partyId: string) => invoke<{ partyId: string }, GuestList>("listGuests", { partyId });
export const addGuest = (partyId: string, data: GuestInput) => invoke("addGuest", { partyId, ...data });
export const importGuests = (partyId: string, guests: GuestInput[]) => invoke<{ partyId: string; guests: GuestInput[] }, { added: number; updated: number; skipped: number }>("importGuests", { partyId, guests });
export const updateGuest = (partyId: string, guestId: string, data: GuestInput) => invoke("updateGuest", { partyId, guestId, ...data });
export const deleteGuest = (partyId: string, guestId: string) => invoke("deleteGuest", { partyId, guestId });
export const checkInGuest = (partyId: string, guestId: string) => invoke<{ partyId: string; guestId: string }, { alreadyCheckedIn: boolean; guest: Guest }>("checkInGuest", { partyId, guestId });
export const undoCheckIn = (partyId: string, guestId: string) => invoke<{ partyId: string; guestId: string }, { guest: Guest }>("undoCheckIn", { partyId, guestId });
export const setGuestStatus = (partyId: string, guestId: string, status: GuestStatus) => invoke("setGuestStatus", { partyId, guestId, status });
