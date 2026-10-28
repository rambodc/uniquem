import { describe, expect, it } from "vitest";
import { PASSWORD_MIN, checkPasswordChange, passwordErrorMessage } from "./password";

describe("checkPasswordChange", () => {
  const ok = { current: "old-password", next: "a-new-password", confirm: "a-new-password" };
  it("accepts a valid change", () => expect(checkPasswordChange(ok)).toBe(""));
  it("needs the current password", () => expect(checkPasswordChange({ ...ok, current: "" })).toMatch(/current password/));
  it(`needs at least ${PASSWORD_MIN} characters`, () => { expect(checkPasswordChange({ ...ok, next: "short", confirm: "short" })).toMatch(/at least 8/); expect(checkPasswordChange({ ...ok, next: "12345678", confirm: "12345678" })).toBe(""); });
  it("must differ from the current one and match the confirmation", () => { expect(checkPasswordChange({ ...ok, next: ok.current, confirm: ok.current })).toMatch(/different/); expect(checkPasswordChange({ ...ok, confirm: "another-one-here" })).toMatch(/match/); });
});
describe("passwordErrorMessage", () => {
  it("explains known Firebase failures without echoing anything typed", () => {
    expect(passwordErrorMessage({ code: "auth/invalid-credential" })).toMatch(/current password is not right/);
    expect(passwordErrorMessage({ code: "auth/wrong-password" })).toMatch(/current password is not right/);
    expect(passwordErrorMessage({ code: "auth/weak-password" })).toMatch(/stronger/);
    expect(passwordErrorMessage({ code: "auth/too-many-requests" })).toMatch(/Too many/);
    expect(passwordErrorMessage({ code: "auth/requires-recent-login" })).toMatch(/sign back in/);
  });
  it("falls back to a generic message", () => { expect(passwordErrorMessage(new Error("Firebase: secret details"))).toBe("The password could not be changed. Try again."); expect(passwordErrorMessage(null)).toMatch(/could not be changed/); });
});
