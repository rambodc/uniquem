import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { MiniAppId, UserType } from "../auth/miniApps";
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
export type Guest = { id: string; firstName: string; lastName: string; company: string; invitedBy: string; notes: string; status: GuestStatus; plusOnes: number; vip: boolean; plusOnesArrived: number; checkedIn: boolean; checkedInAt: string | null; createdAt: string | null; updatedAt: string | null };
export type GuestInput = { firstName: string; lastName: string; company: string; invitedBy: string; notes: string; status: GuestStatus; plusOnes: number; vip: boolean };
/** What staff may change at the door: never names or company. */
export type GuestDoorPatch = Partial<Pick<GuestInput, "notes" | "status" | "vip" | "plusOnes">> & { plusOnesArrived?: number };
/** A walk-in is added and checked in at the door in one step. */
export type WalkInInput = { firstName: string; lastName: string; company: string; invitedBy: string; notes: string; plusOnes: number; vip?: boolean };
export type GuestList = { party: Party; guests: Guest[]; serverTime: string };
/** Who the signed-in account is: names and email (changed only by a super admin) and the small avatar (changed only by the person). */
export type Profile = { firstName: string; lastName: string; email: string; thumbDataUrl: string | null };
/** What the server says the signed-in account may open and who it is. `type` and `profile` are null when the account has no active access record. */
export type Access = { type: UserType | null; miniApps: MiniAppId[]; profile: Profile | null };
export const getAccess = () => invoke<undefined, Access>("getAccess");

// ---- Users mini app (super admins only) ----
/** How the last invite went: "sent" (Resend accepted it), "delivered", "delayed", "bounced", "complained" (marked as spam) or "failed" (it never went out). */
export type InviteStatus = "sent" | "delivered" | "delayed" | "bounced" | "complained" | "failed";
/** The last invite emailed from the Users mini app, or null if none ever was. `error` says why it failed or bounced. */
export type UserInvite = { status: InviteStatus; at: string | null; by: string; error: string | null; checkedAt: string | null };
/** What the server says right after it tried to send an invite. */
export type InviteResult = { sent: true; id: string } | { sent: false; reason: string };
export type UserRecord = { uid: string; firstName: string; lastName: string; thumbDataUrl: string | null; email: string; type: UserType; miniApps: MiniAppId[]; createdAt: string | null; updatedAt: string | null; createdBy: string; invite: UserInvite | null; lastSignInAt: string | null; you: boolean };
export type UserAccessInput = { type: UserType; miniApps: MiniAppId[] };
/** Everything a super admin sets about a person. The password and the photo are never part of it: only the person changes those. */
export type UserInput = UserAccessInput & { firstName: string; lastName: string; email: string };
export const listUsers = () => invoke<undefined, { users: UserRecord[] }>("listUsers");
/** Creates the user and emails them an invite (a one-time link to choose their own password). `invite.sent` is false, with the reason, if only the email failed. */
export const createUser = (data: UserInput) => invoke<typeof data, { uid: string; email: string; invite: InviteResult }>("createUser", data);
export const updateUser = (uid: string, data: UserInput) => invoke("updateUser", { uid, ...data });
export const deleteUser = (uid: string) => invoke("deleteUser", { uid });
export const sendUserInvite = (uid: string) => invoke<{ uid: string }, { invite: InviteResult }>("sendUserInvite", { uid });

// ---- Profile mini app (everyone, own photo only) ----
/** `photo` is a 256px JPEG and `thumb` a 96px JPEG, both base64 and both made in the browser. */
export const setMyPhoto = (photo: { photo: string; thumb: string }) => invoke<typeof photo, { thumbDataUrl: string }>("setMyPhoto", photo);
export const removeMyPhoto = () => invoke("removeMyPhoto");
export const getMyPhoto = () => invoke<undefined, { dataUrl: string | null }>("getMyPhoto");
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
/** Door edit: only notes, status, VIP, plus-ones and (checked-in guests) plus-ones who arrived. Returns the saved guest. */
export const updateGuestAtDoor = (partyId: string, guestId: string, patch: GuestDoorPatch) => invoke<unknown, { guest: Guest }>("updateGuest", { partyId, guestId, patch: true, ...patch });
export const addWalkIn = (partyId: string, data: WalkInInput) => invoke<unknown, { guest: Guest }>("addWalkIn", { partyId, ...data });
export const deleteGuest = (partyId: string, guestId: string) => invoke("deleteGuest", { partyId, guestId });
export const checkInGuest = (partyId: string, guestId: string, plusOnesArrived = 0) => invoke<{ partyId: string; guestId: string; plusOnesArrived: number }, { alreadyCheckedIn: boolean; guest: Guest }>("checkInGuest", { partyId, guestId, plusOnesArrived });
export const undoCheckIn = (partyId: string, guestId: string) => invoke<{ partyId: string; guestId: string }, { guest: Guest }>("undoCheckIn", { partyId, guestId });
export const setGuestStatus = (partyId: string, guestId: string, status: GuestStatus) => invoke("setGuestStatus", { partyId, guestId, status });

// ---- Safety mini app (assigned per person) ----
export type SafetyStatus = "not_started" | "passed" | "failed";
export type SafetySlideType = "image" | "video" | "3d";
/** The signed-in person's own progress on one lesson (its current version). */
export type SafetyProgress = { status: SafetyStatus; attempts: number; lastScore: number | null; bestScore: number | null; completedAt: string | null; viewedAt: string | null };
export type SafetyCategory = { id: string; title: string; description: string; order: number };
export type SafetyLessonSummary = { id: string; categoryId: string; title: string; order: number; version: number; passMark: number; slideCount: number; questionCount: number; kinds: SafetySlideType[]; progress: SafetyProgress };
/** Media URLs are short-lived signed links. `audioUrl` is optional narration. */
export type SafetySlide = { type: SafetySlideType; title: string | null; caption: string; url: string; posterUrl: string | null; audioUrl: string | null };
/** A lesson as the browser gets it: the quiz has no answers until it is submitted. */
export type SafetyLesson = { id: string; categoryId: string; title: string; version: number; passMark: number; slides: SafetySlide[]; quiz: { q: string; options: string[] }[] };
export type SafetyResult = { score: number; passed: boolean; correct: number; total: number; passMark: number; results: { chosen: number; answerIndex: number; correct: boolean; explanation: string }[]; progress: SafetyProgress };
export type SafetyProgressBoard = { users: { uid: string; firstName: string; lastName: string; email: string }[]; lessons: { id: string; title: string; category: string; version: number }[]; cells: Record<string, SafetyProgress> };
export const listSafety = () => invoke<undefined, { categories: SafetyCategory[]; lessons: SafetyLessonSummary[]; canViewProgress: boolean }>("listSafety");
export const getSafetyLesson = (lessonId: string) => invoke<{ lessonId: string }, { lesson: SafetyLesson; progress: SafetyProgress }>("getSafetyLesson", { lessonId });
export const submitSafetyQuiz = (lessonId: string, answers: number[]) => invoke<{ lessonId: string; answers: number[] }, SafetyResult>("submitSafetyQuiz", { lessonId, answers });
export const listSafetyProgress = () => invoke<undefined, SafetyProgressBoard>("listSafetyProgress");
