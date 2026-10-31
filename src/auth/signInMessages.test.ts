import { describe, expect, it } from "vitest";
import { RESET_CONTINUE_URL, RESET_SENT, accessErrorMessage, resetOutcome, signInErrorMessage } from "./signInMessages";

describe("password reset is neutral about whether an account exists", () => {
  it("says the same thing for a sent link and for an unknown account", () => {
    expect(resetOutcome(undefined)).toEqual({ sent: true });
    expect(resetOutcome({ code: "auth/user-not-found" })).toEqual({ sent: true });
    expect(RESET_SENT).toMatch(/^If an account exists for that email, a reset link is on its way/);
  });
  it("only shows errors that do not depend on the account", () => {
    expect(resetOutcome({ code: "auth/invalid-email" })).toEqual({ sent: false, message: "Enter a valid email address." });
    expect(resetOutcome({ code: "auth/too-many-requests" })).toMatchObject({ sent: false, message: expect.stringMatching(/Too many/) });
    expect(resetOutcome({ code: "auth/network-request-failed" })).toMatchObject({ sent: false });
    expect(resetOutcome(new Error("anything else"))).toMatchObject({ sent: false, message: "The reset link could not be requested. Try again." });
  });
  it("sends people back to the sign-in page", () => expect(RESET_CONTINUE_URL).toBe("https://uniquem.ca/signin"));
});
describe("signInErrorMessage", () => {
  it("never reveals Firebase wording or whether an email exists", () => {
    for (const code of ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-email", "auth/user-disabled"]) expect(signInErrorMessage({ code })).toBe("Sign in failed. Check your email and password.");
    expect(signInErrorMessage({ code: "auth/too-many-requests" })).toMatch(/Too many/);
  });
  it("keeps the app's own messages", () => expect(signInErrorMessage(new Error("This account is not authorized for the Uniquem workspace."))).toMatch(/not authorized/));
});

describe("accessErrorMessage", () => {
  it("never says 'not authorized' for a failed check", () => {
    expect(accessErrorMessage({ code: "functions/unauthenticated" })).toMatch(/device could not be verified/);
    expect(accessErrorMessage({ code: "functions/unavailable" })).toMatch(/No connection/);
    expect(accessErrorMessage(new Error("App Check timed out"))).toMatch(/No connection/);
    expect(accessErrorMessage({ code: "functions/internal" })).toMatch(/could not be checked/);
    for (const code of ["functions/unauthenticated", "functions/unavailable", "functions/internal"]) expect(accessErrorMessage({ code })).not.toMatch(/not authorized/);
  });
});
