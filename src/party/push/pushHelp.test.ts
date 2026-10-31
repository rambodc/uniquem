import { describe, expect, it } from "vitest";
import { pushHelp, readDevice } from "./pushHelp";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
describe("push test help", () => {
  it("explains the Home Screen steps on iPhone Safari", () => {
    const help = pushHelp(readDevice(IPHONE, "iPhone", 5, false), false, ["Push API"], "default", false, "");
    expect(help?.title).toMatch(/Home Screen icon/);
    expect(help?.steps.join(" ")).toMatch(/Share.*Add to Home Screen/);
  });
  it("flags iOS older than 16.4", () => {
    const ua = IPHONE.replace("18_1", "16_3");
    expect(pushHelp(readDevice(ua, "iPhone", 5, false), false, [], "default", false, "")?.title).toMatch(/16\.4/);
  });
  it("treats iPad (desktop user agent with touch) as iOS", () => expect(readDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5, false).ios).toBe(true));
  it("never blocks a supported Android or desktop browser", () => {
    const android = readDevice(ANDROID, "Linux armv8l", 5, false);
    expect(pushHelp(android, true, [], "default", false, "")?.title).toMatch(/Enable notifications/);
    expect(pushHelp(android, true, [], "granted", true, "")).toBeNull();
    expect(pushHelp(android, true, [], "denied", false, "")?.steps.join(" ")).toMatch(/Site settings/);
  });
  it("shows the real error text", () => {
    expect(pushHelp(readDevice(ANDROID, "", 0, false), true, [], "granted", false, "messaging/token-subscribe-failed")?.steps[0]).toBe("messaging/token-subscribe-failed");
  });
});
