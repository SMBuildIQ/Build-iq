import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { generateQuoteRecommendation, type QuoteForRecommendation } from "../src/lib/ai/quoteRecommendation";
import { __setAIProviderForTests } from "../src/lib/ai/provider";
import type { AIProvider, AICompletionResult } from "../src/lib/ai/types";

// brief §15-16: the recommendation must weigh more than price and must always
// be explainable. This was flagged as untested (zero automated coverage) in
// this session's own progress audit despite being one of the two AI-driven
// purchasing decisions the brief treats as core value — closing that gap.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `recommend-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Recommend Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Recommend Org ${suffix}`, slug: `recommend-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

function quote(overrides: Partial<QuoteForRecommendation> & { quoteId: string; supplierName: string; totalLandedCost: number }): QuoteForRecommendation {
  return { leadTimeDays: null, paymentTerms: null, warranty: null, supplierPerformanceScore: null, ...overrides };
}

test("under the mock provider, the cheapest quote wins when no other quote has materially better terms", async () => {
  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "a", supplierName: "Acme", totalLandedCost: 1000 }),
    quote({ quoteId: "b", supplierName: "Beta", totalLandedCost: 1050 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "a");
  assert.match(rec.rationale, /lowest total landed cost/);
});

test("a quote within a 3% price premium with a materially better performance score wins over the cheapest", async () => {
  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "cheap", supplierName: "Cheap Co", totalLandedCost: 1000, supplierPerformanceScore: 40 }),
    quote({ quoteId: "reliable", supplierName: "Reliable Co", totalLandedCost: 1020, supplierPerformanceScore: 90 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "reliable");
  assert.match(rec.rationale, /despite being \$20 more/);
  assert.match(rec.rationale, /performance score of 90/);
});

test("a better-scored quote outside the 3% price band does not win — the premium must stay small", async () => {
  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "cheap", supplierName: "Cheap Co", totalLandedCost: 1000, supplierPerformanceScore: 40 }),
    quote({ quoteId: "pricey", supplierName: "Pricey Co", totalLandedCost: 1200, supplierPerformanceScore: 99 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "cheap");
});

test("a materially shorter lead time within the price band wins over the cheapest", async () => {
  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "slow", supplierName: "Slow Co", totalLandedCost: 1000, leadTimeDays: 30 }),
    quote({ quoteId: "fast", supplierName: "Fast Co", totalLandedCost: 1010, leadTimeDays: 5 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "fast");
  assert.match(rec.rationale, /5-day lead time/);
});

test("every recommendation is recorded in AIActivityLog with the real provider and prompt version", async () => {
  const orgId = await makeOrgId();
  const prId = randomUUID();
  const quotes = [quote({ quoteId: "a", supplierName: "Acme", totalLandedCost: 1000 })];
  const rec = await generateQuoteRecommendation(orgId, prId, quotes);

  const log = await prisma.aIActivityLog.findUnique({ where: { id: rec.aiActivityLogId } });
  assert.ok(log);
  assert.equal(log!.feature, "quote_recommendation");
  assert.equal(log!.provider, "mock");
  assert.equal(log!.promptVersion, "quote-recommendation-v1");
  assert.equal(log!.entityType, "PurchaseRequest");
  assert.equal(log!.entityId, prId);
});

test("under a real provider, a valid JSON response is used verbatim instead of the heuristic", async () => {
  const fakeProvider: AIProvider = {
    name: "fake-llm",
    model: "fake-llm-1",
    supportsDocuments: false,
    async complete(): Promise<AICompletionResult> {
      return {
        text: JSON.stringify({ recommendedQuoteId: "b", rationale: "Chosen for its warranty terms despite a higher price." }),
        tokensIn: 50,
        tokensOut: 20,
        costUsd: 0.0005,
      };
    },
  };
  __setAIProviderForTests(fakeProvider);

  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "a", supplierName: "Acme", totalLandedCost: 1000 }),
    quote({ quoteId: "b", supplierName: "Beta", totalLandedCost: 1500 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "b");
  assert.equal(rec.rationale, "Chosen for its warranty terms despite a higher price.");

  __setAIProviderForTests(null);
});

test("under a real provider, an unparseable response falls back to the heuristic rather than failing", async () => {
  const fakeProvider: AIProvider = {
    name: "fake-llm",
    model: "fake-llm-1",
    supportsDocuments: false,
    async complete(): Promise<AICompletionResult> {
      return { text: "not json at all", tokensIn: 10, tokensOut: 5, costUsd: 0.0001 };
    },
  };
  __setAIProviderForTests(fakeProvider);

  const orgId = await makeOrgId();
  const quotes = [
    quote({ quoteId: "a", supplierName: "Acme", totalLandedCost: 1000 }),
    quote({ quoteId: "b", supplierName: "Beta", totalLandedCost: 1500 }),
  ];
  const rec = await generateQuoteRecommendation(orgId, randomUUID(), quotes);
  assert.equal(rec.recommendedQuoteId, "a"); // cheapest — the heuristic fallback, never a guess from the malformed text

  __setAIProviderForTests(null);
});

after(() => __setAIProviderForTests(null));
