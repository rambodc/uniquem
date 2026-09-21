import { describe, expect, it } from "vitest";
import { ALLOWED_EMAIL } from "./firebase";
describe("Uniquem access configuration", () => { it("uses the single authorized inbox email", () => { expect(ALLOWED_EMAIL).toBe("rambodr@uniquem.ca"); }); });
