import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { draftNegotiation } from "../src/lib/ai/negotiation";

// brief §17: negotiation is "assisted mode" only — this module drafts, a human
// sends. Flagged as untested (zero automated coverage) in this session's own
// progress audit; closing that gap. The target-price math is entirely
// deterministic (never an LLM guess), which is exactly what makes it worth
// testing precisely rather than just smoke-checking that it runs.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `negdraft-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Negotiation Draft Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `NegDraft Org ${suffix}`, slug: `negdraft-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

test("the target reduction is half the gap to the lowest qualified quote, floored at 3%", async () => {
  const orgId = await makeOrgId();
  // gap = 1000 - 950 = 50, gapPct = 5%, half = 2.5% — below the 3% floor, so 3% applies.
  const draft = await draftNegotiation({
    organizationId: orgId,
    quoteId: randomUUID(),
    supplierName: "Acme",
    currentTotal: 1000,
    lowestQualifiedTotal: 950,
    freight: null,
    freightIncluded: false,
  });
  assert.equal(draft.targetReductionPct, 0.03);
  assert.equal(draft.targetPrice, 970); // 1000 * 0.97
});

test("a large gap to the lowest qualified quote uses half the gap, not the full gap", async () => {
  const orgId = await makeOrgId();
  // gap = 2000 - 1000 = 1000, gapPct = 50%, half = 25% — above the 15% cap, so 15% applies.
  const draft = await draftNegotiation({
    organizationId: orgId,
    quoteId: randomUUID(),
    supplierName: "Acme",
    currentTotal: 2000,
    lowestQualifiedTotal: 1000,
    freight: null,
    freightIncluded: false,
  });
  assert.equal(draft.targetReductionPct, 0.15);
  assert.equal(draft.targetPrice, 1700); // 2000 * 0.85
});

test("a moderate gap lands between the floor and cap at exactly half the gap percentage", async () => {
  const orgId = await makeOrgId();
  // gap = 1000 - 800 = 200, gapPct = 20%, half = 10% — within [3%, 15%].
  const draft = await draftNegotiation({
    organizationId: orgId,
    quoteId: randomUUID(),
    supplierName: "Acme",
    currentTotal: 1000,
    lowestQualifiedTotal: 800,
    freight: null,
    freightIncluded: false,
  });
  assert.equal(draft.targetReductionPct, 0.1);
  assert.equal(draft.targetPrice, 900);
});

test("this quote already being the lowest qualified quote still floors at the minimum 3% ask", async () => {
  const orgId = await makeOrgId();
  const draft = await draftNegotiation({
    organizationId: orgId,
    quoteId: randomUUID(),
    supplierName: "Acme",
    currentTotal: 1000,
    lowestQualifiedTotal: 1000,
    freight: null,
    freightIncluded: false,
  });
  assert.equal(draft.targetReductionPct, 0.03);
});

test("freight inclusion is requested only when freight is real and not already included", async () => {
  const orgId = await makeOrgId();

  const withFreight = await draftNegotiation({
    organizationId: orgId, quoteId: randomUUID(), supplierName: "Acme",
    currentTotal: 1000, lowestQualifiedTotal: 900, freight: 50, freightIncluded: false,
  });
  assert.equal(withFreight.requestFreightInclusion, true);
  assert.match(withFreight.message, /with freight included/);

  const alreadyIncluded = await draftNegotiation({
    organizationId: orgId, quoteId: randomUUID(), supplierName: "Acme",
    currentTotal: 1000, lowestQualifiedTotal: 900, freight: 50, freightIncluded: true,
  });
  assert.equal(alreadyIncluded.requestFreightInclusion, false);
  assert.doesNotMatch(alreadyIncluded.message, /freight/);

  const noFreight = await draftNegotiation({
    organizationId: orgId, quoteId: randomUUID(), supplierName: "Acme",
    currentTotal: 1000, lowestQualifiedTotal: 900, freight: null, freightIncluded: false,
  });
  assert.equal(noFreight.requestFreightInclusion, false);
});

test("the drafted message states the actual target price and reduction percentage", async () => {
  const orgId = await makeOrgId();
  const draft = await draftNegotiation({
    organizationId: orgId, quoteId: randomUUID(), supplierName: "Acme",
    currentTotal: 1000, lowestQualifiedTotal: 800, freight: null, freightIncluded: false,
  });
  assert.match(draft.message, /10\.0% reduction/);
  assert.match(draft.message, /\$900/);
});

test("every draft is recorded in AIActivityLog against the quote it was drafted for", async () => {
  const orgId = await makeOrgId();
  const quoteId = randomUUID();
  const draft = await draftNegotiation({
    organizationId: orgId, quoteId, supplierName: "Acme",
    currentTotal: 1000, lowestQualifiedTotal: 900, freight: null, freightIncluded: false,
  });

  const log = await prisma.aIActivityLog.findUnique({ where: { id: draft.aiActivityLogId } });
  assert.ok(log);
  assert.equal(log!.feature, "negotiation_draft");
  assert.equal(log!.promptVersion, "negotiation-draft-v1");
  assert.equal(log!.entityType, "Quote");
  assert.equal(log!.entityId, quoteId);
});
