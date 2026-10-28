import type { GuestInput, GuestStatus } from "../core/api";

/** Per-field limits, the same as the one-at-a-time form and the server. */
export const IMPORT_LIMITS = { firstName: 80, lastName: 80, company: 120, invitedBy: 120, notes: 500, plusOnes: 10, perCall: 200 };

const STATUS_WORDS: Record<string, GuestStatus> = {
  coming: "coming", yes: "coming", y: "coming", confirmed: "coming", confirm: "coming", attending: "coming", accepted: "coming", accept: "coming", rsvp: "coming", going: "coming",
  pending: "pending", maybe: "pending", tbd: "pending", invited: "pending", unknown: "pending", unsure: "pending", awaiting: "pending",
  notcoming: "notComing", no: "notComing", n: "notComing", declined: "notComing", decline: "notComing", cancelled: "notComing", canceled: "notComing", notattending: "notComing", notgoing: "notComing", cantcome: "notComing", cannotcome: "notComing",
};
/** "Not coming", "not-coming", "notComing", "Can't come" … all work. Blank means pending. Returns null when not understood. */
export function parseStatus(raw: string): GuestStatus | null {
  const key = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return "pending";
  return STATUS_WORDS[key] ?? null;
}

export type FillField = "invitedBy" | "company" | "notes" | "plusOnes";
/** `fills` lists what a row would fill in on a guest already on the list (only blank values are ever filled). */
export type ImportRow = { line: number; guest: GuestInput; duplicate: "list" | "paste" | null; fills: FillField[] };
export type ImportProblem = { line: number; text: string; reason: string };
/** `toAdd` are new guests, `toUpdate` are pasted rows that fill in blanks on existing guests, `skipped` change nothing. */
export type ImportPreview = { rows: ImportRow[]; problems: ImportProblem[]; toAdd: GuestInput[]; toUpdate: GuestInput[]; skipped: number };
type ExistingGuest = Pick<GuestInput, "firstName" | "lastName" | "company" | "invitedBy" | "notes" | "plusOnes">;

const nameKey = (guest: Pick<GuestInput, "firstName" | "lastName">) => `${guest.firstName.toLowerCase()}\n${guest.lastName.toLowerCase()}`;
// eslint-disable-next-line no-control-regex
const clean = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
const HEADER = /^(first\s*name|firstname|first)$/i;

/**
 * One guest per line. Fields are separated by tabs (pasted from a spreadsheet) or commas:
 * first name, last name, company, invited by / type, status, notes, plus-ones (everything after the names is optional).
 * A header row ("First name, Last name, …") and blank lines are ignored.
 * `existing` are guests already on the party. A matching line (first + last name, any case) is never added twice:
 * if the line has an "invited by / type", company, notes or plus-ones (more than 0) and the existing guest's is blank it fills it in, otherwise the line is skipped.
 * Existing values are never overwritten. The server applies the same rule against the live list.
 */
export function parseGuestImport(text: string, existing: ExistingGuest[] = []): ImportPreview {
  const onList = new Map<string, { company: string; invitedBy: string; notes: string; plusOnes: number }>();
  for (const guest of existing) {
    const key = nameKey({ firstName: clean(guest.firstName), lastName: clean(guest.lastName) });
    if (!onList.has(key)) onList.set(key, { company: clean(guest.company), invitedBy: clean(guest.invitedBy), notes: clean(guest.notes), plusOnes: guest.plusOnes });
  }
  const inPaste = new Set<string>(), rows: ImportRow[] = [], problems: ImportProblem[] = [], toAdd: GuestInput[] = [], toUpdate: GuestInput[] = [];
  let skipped = 0, header = true;
  text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/).forEach((original, index) => {
    const line = index + 1;
    if (!original.trim()) return;
    const cells = (original.includes("\t") ? original.split("\t") : original.split(",")).map(clean);
    while (cells.length > 7 && cells[cells.length - 1] === "") cells.pop();
    const wasFirstContent = header; header = false;
    if (wasFirstContent && HEADER.test(cells[0] ?? "")) return;
    const problem = (reason: string) => problems.push({ line, text: original.trim(), reason });
    const [firstName = "", lastName = "", company = "", invitedBy = "", statusText = "", notes = "", plusText = ""] = cells;
    if (cells.length > 7) return problem("Too many fields. Use: first name, last name, company, invited by / type, status, notes, plus-ones. A comma inside a company or note splits it, so paste from a spreadsheet (tabs) when notes need commas.");
    if (!firstName || !lastName) return problem(cells.length === 1 && firstName.includes(" ") ? "Needs a first and last name separated by a comma or tab." : "Needs both a first name and a last name.");
    const status = parseStatus(statusText);
    if (!status) return problem(`Status “${statusText}” isn't coming, pending or not coming.`);
    const tooLong = (value: string, max: number, label: string) => (value.length > max ? `The ${label} is too long (max ${max} characters).` : "");
    const long = tooLong(firstName, IMPORT_LIMITS.firstName, "first name") || tooLong(lastName, IMPORT_LIMITS.lastName, "last name") || tooLong(company, IMPORT_LIMITS.company, "company") || tooLong(invitedBy, IMPORT_LIMITS.invitedBy, "invited by / type") || tooLong(notes, IMPORT_LIMITS.notes, "notes");
    if (long) return problem(long);
    const plusOnes = plusText === "" ? 0 : /^\d{1,2}$/.test(plusText) ? Number(plusText) : -1;
    if (plusOnes < 0 || plusOnes > IMPORT_LIMITS.plusOnes) return problem(`Plus-ones “${plusText}” must be a whole number from 0 to ${IMPORT_LIMITS.plusOnes}.`);
    const guest: GuestInput = { firstName, lastName, company, invitedBy, notes, status, plusOnes, vip: false }, key = nameKey(guest);
    const current = onList.get(key);
    if (current) {
      const fills: FillField[] = (["invitedBy", "company", "notes"] as const).filter((field) => !current[field] && guest[field]);
      if (!current.plusOnes && guest.plusOnes > 0) fills.push("plusOnes");
      rows.push({ line, guest, duplicate: fills.length ? null : "list", fills: [...fills] });
      if (!fills.length) { skipped += 1; return; }
      for (const field of fills) if (field === "plusOnes") current.plusOnes = guest.plusOnes; else current[field] = guest[field];
      toUpdate.push(guest);
      return;
    }
    const duplicate = inPaste.has(key) ? "paste" : null;
    rows.push({ line, guest, duplicate, fills: [] });
    if (duplicate) { skipped += 1; return; }
    inPaste.add(key); toAdd.push(guest);
  });
  return { rows, problems, toAdd, toUpdate, skipped };
}
