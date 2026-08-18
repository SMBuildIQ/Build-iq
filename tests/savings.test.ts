import { test } from "node:test";
import assert from "node:assert/strict";
import { computeInitialSavingsFields, computeRealizedSavings } from "../src/lib/savings";

// brief §24: "realizedSavings = initial qualified quote minus the final
// invoice amount — only ever set once an invoice actually exists, never
// estimated." Flagged as untested (written only as a side effect of tested
// flows, never asserted directly) in this session's own progress audit.

test("initialQuoteTotal is always the lowest qualified quote, not the selected quote's own price", () => {
  const fields = computeInitialSavingsFields({
    qualifiedQuoteTotals: [1200, 1000, 1100],
    selectedQuoteTotal: 1200, // the buyer picked the most expensive one
    acceptedNegotiationResultPrice: null,
  });
  assert.equal(fields.initialQuoteTotal, 1000);
  assert.equal(fields.lowestQualifiedQuote, 1000);
});

test("without an accepted negotiation, finalApprovedPrice is the selected quote's price and negotiated fields stay null", () => {
  const fields = computeInitialSavingsFields({
    qualifiedQuoteTotals: [1000, 1100],
    selectedQuoteTotal: 1100,
    acceptedNegotiationResultPrice: null,
  });
  assert.equal(fields.finalApprovedPrice, 1100);
  assert.equal(fields.negotiatedQuoteTotal, null);
  assert.equal(fields.negotiatedSavings, null);
});

test("with an accepted negotiation, finalApprovedPrice is the negotiated price, not the original quote price", () => {
  const fields = computeInitialSavingsFields({
    qualifiedQuoteTotals: [1000, 1100],
    selectedQuoteTotal: 1100,
    acceptedNegotiationResultPrice: 1050,
  });
  assert.equal(fields.finalApprovedPrice, 1050);
  assert.equal(fields.negotiatedQuoteTotal, 1050);
});

test("negotiatedSavings measures against the initial (lowest qualified) total, not the negotiated quote's own pre-negotiation price", () => {
  // Lowest qualified was $1000; the buyer negotiated a $1100 quote down to $1080.
  // Savings should read as -$80 (still $80 above the market floor), not +$20
  // (the discount off that one supplier's own asking price) — the metric is
  // "did this purchase beat what was available," not "did negotiation help."
  const fields = computeInitialSavingsFields({
    qualifiedQuoteTotals: [1000, 1100],
    selectedQuoteTotal: 1100,
    acceptedNegotiationResultPrice: 1080,
  });
  assert.equal(fields.negotiatedSavings, -80);
});

test("a single-quote RFQ still computes correctly — the lowest of one is itself", () => {
  const fields = computeInitialSavingsFields({
    qualifiedQuoteTotals: [750],
    selectedQuoteTotal: 750,
    acceptedNegotiationResultPrice: null,
  });
  assert.equal(fields.initialQuoteTotal, 750);
  assert.equal(fields.finalApprovedPrice, 750);
});

test("computeRealizedSavings is the initial quote total minus what was actually invoiced", () => {
  assert.equal(computeRealizedSavings(1000, 950), 50); // paid less than the market floor — real savings
  assert.equal(computeRealizedSavings(1000, 1050), -50); // paid more — negative savings, not clamped to zero
  assert.equal(computeRealizedSavings(1000, 1000), 0);
});
