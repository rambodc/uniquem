import { describe, expect, it } from "vitest";
import { leadPayload } from "./Ending";

const base = { name: " Pat Driller ", phone: "", email: "", company: "", website: "" };
describe("SandWeb lead payload", () => {
  it("sends a call-back lead with a phone and no placeholder email", () => {
    const data = leadPayload("call", { ...base, phone: "403 555 0100" }, false);
    expect(data.phone).toBe("403 555 0100");
    expect("email" in data).toBe(false);
    expect(JSON.stringify(data)).not.toMatch(/sandweb@uniquem|390-0067/);
    expect(data.message).toContain("Call back requested");
  });
  it("sends an email lead with the visitor's email", () => {
    const data = leadPayload("email", { ...base, email: "pat@example.com", company: "Acme" }, true);
    expect(data.email).toBe("pat@example.com");
    expect("phone" in data).toBe(false);
    expect(data.company).toBe("Acme");
    expect(data.message.startsWith("[PREVIEW TEST")).toBe(true);
  });
});
