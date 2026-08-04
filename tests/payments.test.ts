import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockPaymentsAllowed, paymentConfigured } from "../src/lib/commerce/payments";

describe("payments fail-closed", () => {
  it("exposes configuration helpers", () => {
    assert.equal(typeof paymentConfigured(), "boolean");
    assert.equal(typeof mockPaymentsAllowed(), "boolean");
  });

  it("allows mock in non-production when stripe unset", () => {
    // NODE_ENV is typically test/dev under tsx
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
      assert.equal(mockPaymentsAllowed(), false);
    } else if (!paymentConfigured()) {
      assert.equal(mockPaymentsAllowed(), true);
    }
  });
});
