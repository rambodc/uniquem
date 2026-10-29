import type { InviteResult, UserInvite } from "../core/api";
import { formatPartyDateTime } from "../party/time";

export type Tone = "ok" | "info" | "problem";
/** A message for the Users screen. "problem" is shown in red and announced; it never looks like a success. */
export type Notice = { tone: "ok" | "problem"; text: string };

const PROBLEM_LABELS = { failed: "Invite not sent", bounced: "Invite bounced", complained: "Invite marked as spam" } as const;
export const isInviteProblem = (invite: UserInvite | null) => invite != null && invite.status in PROBLEM_LABELS;

/** What a user's card says about their last invite, or null when there is nothing to say (no invite and they already sign in, or delivered and signed in). */
export function inviteState(invite: UserInvite | null, lastSignInAt: string | null): { tone: Tone; label: string; detail: string | null } | null {
  if (!invite) return lastSignInAt ? null : { tone: "info", label: "No invite sent yet", detail: null };
  const when = formatPartyDateTime(invite.at);
  if (invite.status === "failed" || invite.status === "bounced" || invite.status === "complained") return { tone: "problem", label: `${PROBLEM_LABELS[invite.status]} · ${when}`, detail: invite.error };
  if (lastSignInAt) return null;
  if (invite.status === "delivered") return { tone: "ok", label: `Invite delivered · ${when}`, detail: null };
  if (invite.status === "delayed") return { tone: "info", label: `Invite delayed · ${when}`, detail: "The recipient's mail server hasn't accepted it yet. Resend keeps trying." };
  return { tone: "info", label: `Invite sent · ${when}`, detail: null };
}

/** The notice after creating a user or pressing Resend invite. A failed email is a red problem with the reason and what to do. */
export function inviteNotice(email: string, invite: InviteResult, created: boolean): Notice {
  if (invite.sent) return { tone: "ok", text: created ? `User created. The invite email to ${email} was sent.` : `A new invite email to ${email} was sent.` };
  return { tone: "problem", text: `${created ? "User created, but the" : "The"} invite email to ${email} was NOT sent. ${invite.reason} Press Resend invite on their card to try again.` };
}
