import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { extractPurchaseRequest } from "../src/lib/ai/purchaseRequestExtraction";
import { heuristicExtract } from "../src/lib/ai/heuristicExtractor";

// AI_PROVIDER defaults to "mock" (see .env.example / src/lib/ai/provider.ts), so
// this runs the deterministic heuristic path with no network access — exactly
// what CI and any offline dev environment exercises.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `ai-test-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "AI Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `AI Test Org ${suffix}`, slug: `ai-test-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

test("heuristic extractor structures the brief's worked example", () => {
  const description =
    "We need 75 Lenovo ThinkPads with 32GB RAM delivered to Detroit before September 20. " +
    "Budget is $95,000. Equivalent Dell models are acceptable.";

  const fields = heuristicExtract(description);

  assert.equal(fields.quantity, 75);
  assert.equal(fields.manufacturer, "Lenovo");
  assert.equal(fields.budget, 95000);
  assert.equal(fields.deliveryLocation, "Detroit");
  assert.ok(fields.requiredDeliveryDate, "should find a delivery date");
  const date = new Date(fields.requiredDeliveryDate!);
  assert.equal(date.getUTCMonth(), 8); // September, 0-indexed
  assert.equal(date.getUTCDate(), 20);
  assert.deepEqual(fields.acceptableSubstitutions, ["Dell"]);
});

test("extractPurchaseRequest flags missing critical fields instead of guessing", async () => {
  const orgId = await makeOrgId();
  const result = await extractPurchaseRequest(orgId, "We need some office chairs at some point.");
  assert.ok(result.missingCriticalFields.includes("quantity"));
  assert.ok(result.missingCriticalFields.includes("requiredDeliveryDate"));
  assert.ok(result.missingCriticalFields.includes("deliveryLocation"));
});

test("extractPurchaseRequest reports no missing critical fields for a fully specified request", async () => {
  const orgId = await makeOrgId();
  const result = await extractPurchaseRequest(
    orgId,
    "We need 75 Lenovo ThinkPads with 32GB RAM delivered to Detroit before September 20. Budget is $95,000."
  );
  assert.deepEqual(result.missingCriticalFields, []);
  assert.equal(result.confidence, 0.5); // mock provider is always lower-confidence than a real LLM call
});

test("extractPurchaseRequest always logs an AIActivityLog entry (brief §26)", async () => {
  const orgId = await makeOrgId();
  const result = await extractPurchaseRequest(orgId, "We need 10 office chairs delivered to Austin by June 1.");
  assert.ok(result.aiActivityLogId);
  const log = await prisma.aIActivityLog.findUnique({ where: { id: result.aiActivityLogId } });
  assert.ok(log);
  assert.equal(log!.feature, "purchase_request_extraction");
});
