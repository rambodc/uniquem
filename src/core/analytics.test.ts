// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://uniquem.ca/chemicals/sandweb"}
import { beforeEach, describe, expect, it } from "vitest";
import { cleanParams, isLiveHost, isPrivatePath, measurementId, resetAnalyticsForTests, trackEvent, trackPageView } from "./analytics";

beforeEach(() => { resetAnalyticsForTests(); delete window.gtag; window.dataLayer = []; });
const calls = () => (window.dataLayer ?? []).map((args) => [...(args as IArguments)]);

describe("analytics", () => {
  it("uses the live GA4 measurement ID", () => { expect(measurementId()).toBe("G-1DLVMZX18M"); });
  it("only reports from the live hosts", () => { expect(isLiveHost("uniquem.ca")).toBe(true); expect(isLiveHost("www.uniquem.ca")).toBe(true); expect(isLiveHost("localhost")).toBe(false); expect(isLiveHost("uniquem-4366e.web.app")).toBe(false); });
  it("never tracks private pages and disables GA while one is open", () => {
    expect(isPrivatePath("/signin")).toBe(true); expect(isPrivatePath("/contact-inbox/x")).toBe(true); expect(isPrivatePath("/signing")).toBe(false);
    expect(trackPageView("/signin")).toBe(false); expect(trackPageView("/contact-inbox")).toBe(false);
    expect(calls()).toEqual([]);
    expect((window as unknown as Record<string, boolean>)["ga-disable-G-1DLVMZX18M"]).toBe(true);
  });
  it("starts GA once on the first public page (config sends the landing page_view)", () => {
    expect(trackPageView("/chemicals/sandweb")).toBe(true);
    expect(trackPageView("/chemicals")).toBe(true);
    expect((window as unknown as Record<string, boolean>)["ga-disable-G-1DLVMZX18M"]).toBe(false);
    expect(calls().filter((c) => c[0] === "config")).toEqual([["config", "G-1DLVMZX18M"]]);
    expect(calls().some((c) => c[1] === "page_view")).toBe(false);
  });
  it("drops personal data and unknown parameters from events", () => {
    expect(cleanParams("lead_form_submit", { form: "contact_page", method: "email", email: "a@b.com", name: "Jane" })).toEqual({ form: "contact_page", method: "email" });
    expect(cleanParams("contact_option_select", { option: "someone@example.com" })).toEqual({});
    expect(cleanParams("lead_form_submit", { form: "4035551234567" })).toEqual({});
    trackEvent("sandweb_scene_view", { scene_number: 2, scene_title: "SandWeb changes the charge" });
    expect(calls().find((c) => c[1] === "sandweb_scene_view")?.[2]).toEqual({ scene_number: 2, scene_title: "SandWeb changes the charge" });
  });
});
