import assert from "node:assert/strict";
import { test } from "node:test";
import { validateInquiry } from "../core.js";
test("validates and normalizes a contact inquiry", () => { const result = validateInquiry({ inquiryType: "chemicals", name: "Rambod", email: "RAMBODR@UNIQUEM.CA", message: "I would like to learn more about your chemicals." }); assert.equal(result.email, "rambodr@uniquem.ca"); assert.equal(result.archived, false); });
test("rejects a honeypot submission", () => { assert.throws(() => validateInquiry({ name: "Bot", email: "bot@example.com", message: "This is spam", website: "https://spam.invalid" }), /could not be submitted/); });
test("preserves product inquiry context", () => { const result = validateInquiry({ inquiryType: "product", productName: "Elixir", name: "Product inquiry", email: "person@example.com", message: "I have a question about this product." }); assert.equal(result.inquiryType, "product"); assert.equal(result.productName, "Elixir"); });
