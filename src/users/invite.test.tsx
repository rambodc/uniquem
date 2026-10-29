import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { UserInvite, UserRecord } from "../core/api";
import { inviteNotice, inviteState } from "./invite";
import { UserCard } from "./UsersApp";

const invite = (over: Partial<UserInvite>): UserInvite => ({ status: "sent", at: "2026-10-29T14:05:44.000Z", by: "boss@uniquem.ca", error: null, checkedAt: null, ...over });
const user = (over: Partial<UserRecord>): UserRecord => ({ uid: "u", firstName: "Nina", lastName: "New", thumbDataUrl: null, email: "nina@example.com", type: "staff", miniApps: ["party"], createdAt: null, updatedAt: null, createdBy: "boss@uniquem.ca", invite: null, lastSignInAt: null, you: false, ...over });
const card = (over: Partial<UserRecord>) => renderToStaticMarkup(<UserCard user={user(over)} busy={false} onEdit={() => undefined} onInvite={() => undefined} onDelete={() => undefined} />);

describe("invite status", () => {
  it("a failed create-time invite is a red problem with the reason, never a success", () => {
    const notice = inviteNotice("nina@example.com", { sent: false, reason: "The email could not be sent. Resend responded 503." }, true);
    expect(notice.tone).toBe("problem");
    expect(notice.text).toContain("NOT sent");
    expect(notice.text).toContain("Resend responded 503");
    expect(notice.text).toContain("Resend invite");
    expect(inviteNotice("nina@example.com", { sent: true, id: "re_1" }, true)).toEqual({ tone: "ok", text: "User created. The invite email to nina@example.com was sent." });
    expect(inviteNotice("nina@example.com", { sent: false, reason: "x." }, false).text).toMatch(/^The invite email/);
  });
  it("labels each status, in Calgary time", () => {
    expect(inviteState(invite({}), null)).toMatchObject({ tone: "info", label: expect.stringMatching(/^Invite sent · .*8:05/) });
    expect(inviteState(invite({ status: "delivered" }), null)?.tone).toBe("ok");
    expect(inviteState(invite({ status: "delayed" }), null)?.label).toMatch(/delayed/);
    expect(inviteState(invite({ status: "bounced", error: "bad address" }), null)).toMatchObject({ tone: "problem", detail: "bad address" });
    expect(inviteState(invite({ status: "complained" }), null)?.label).toMatch(/spam/);
    expect(inviteState(null, null)?.label).toBe("No invite sent yet");
  });
  it("once someone signs in only problems are still shown", () => {
    expect(inviteState(invite({ status: "delivered" }), "2026-10-29T15:00:00Z")).toBeNull();
    expect(inviteState(null, "2026-10-29T15:00:00Z")).toBeNull();
    expect(inviteState(invite({ status: "failed", error: "nope" }), "2026-10-29T15:00:00Z")?.tone).toBe("problem");
  });
  it("the card shows a failed invite as a red alert with the reason and a Resend invite button", () => {
    const html = card({ invite: invite({ status: "failed", error: "The sign-in link could not be made." }) });
    expect(html).toContain('role="alert"');
    expect(html).toContain("ws-invite problem");
    expect(html).toContain("Invite not sent");
    expect(html).toContain("The sign-in link could not be made.");
    expect(html).toContain("Resend invite");
  });
  it("the card shows a delivered invite calmly", () => {
    const html = card({ invite: invite({ status: "delivered" }) });
    expect(html).toContain("ws-invite ok");
    expect(html).not.toContain('role="alert"');
  });
});
