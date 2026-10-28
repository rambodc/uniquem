import { describe, expect, it } from "vitest";
import { safeNext } from "./next";
describe("safeNext", () => {
  it("defaults to the dashboard", () => { expect(safeNext(null)).toBe("/dashboard"); expect(safeNext("")).toBe("/dashboard"); });
  it("keeps known private pages", () => { for (const path of ["/dashboard", "/contact-inbox", "/party", "/party/new", "/party/abc123/check-in", "/users"]) expect(safeNext(path)).toBe(path); });
  it("refuses anything else", () => { for (const path of ["https://evil.example", "//evil.example", "/chemicals", "/party/../x", "/party/a/b/c", "/signin"]) expect(safeNext(path)).toBe("/dashboard"); });
});
