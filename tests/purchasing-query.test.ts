import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { heuristicExtractQueryFilter, runPurchasingQuery } from "../src/lib/ai/purchasingQuery";

// The /intelligence page was a PlannedModule stub: "natural-language queries
// over structured purchasing data ('What did we pay for Lenovo laptops last
// year?')... backed by PriceBenchmark and the full purchase history graph."
// This is that graph exercised for real — every number below comes from an
// actual PurchaseOrderLineItem row created in these tests, not a fixture
// describing what a real answer would look like.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `pq-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "PQ Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `PQ Org ${suffix}`, slug: `pq-org-${suffix}` , ownerUserId: user.id });
  return organization.id;
}

async function issuePoWithLineItem(
  organizationId: string,
  opts: { manufacturer?: string | null; category?: string | null; description?: string; unitPrice: number; quantity?: number; createdAt?: Date; status?: string }
) {
  const suffix = randomUUID().slice(0, 8);
  const supplier = await prisma.supplier.create({ data: { organizationId, name: `Supplier ${suffix}` } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "po_issued" },
  });
  const description = opts.description ?? "Widget";
  const quantity = opts.quantity ?? 1;
  const prLineItem = await prisma.purchaseRequestLineItem.create({
    data: { purchaseRequestId: pr.id, description, quantity, unitOfMeasure: "each", manufacturer: opts.manufacturer ?? null, category: opts.category ?? null },
  });
  const rfq = await prisma.rFQ.create({ data: { organizationId, purchaseRequestId: pr.id, rfqNumber: `RFQ-${suffix}`, status: "sent" } });
  const rfqLineItem = await prisma.rFQLineItem.create({
    data: { rfqId: rfq.id, sourceLineItemId: prLineItem.id, description, quantity, unitOfMeasure: "each" },
  });
  const total = opts.unitPrice * quantity;
  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId,
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      poNumber: `PO-${suffix}`,
      status: opts.status ?? "issued",
      createdAt: opts.createdAt ?? new Date(),
      lineItems: { create: [{ rfqLineItemId: rfqLineItem.id, description, quantity, unitPrice: opts.unitPrice, total }] },
    },
  });
  return po;
}

test("heuristicExtractQueryFilter recognizes a known manufacturer and 'last year', matching the brief's own example question", () => {
  const filter = heuristicExtractQueryFilter("What did we pay for Lenovo laptops last year?");
  assert.equal(filter.manufacturer, "Lenovo");
  assert.equal(filter.timeframe, "last_year");
  assert.match(filter.keyword ?? "", /laptops/i);
});

test("heuristicExtractQueryFilter defaults to all_time and null fields when nothing is recognized", () => {
  const filter = heuristicExtractQueryFilter("How are things going?");
  assert.equal(filter.timeframe, "all_time");
  assert.equal(filter.manufacturer, null);
});

test("runPurchasingQuery under the mock provider sums real PO line items matching the manufacturer", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", description: "Lenovo ThinkPad laptop", unitPrice: 1000, quantity: 2 });
  await issuePoWithLineItem(orgId, { manufacturer: "Dell", description: "Dell laptop", unitPrice: 800, quantity: 1 });

  const result = await runPurchasingQuery(orgId, "What did we pay for Lenovo laptops?");

  assert.equal(result.lineItemCount, 1);
  assert.equal(result.totalSpent, 2000);
  assert.equal(result.avgUnitPrice, 1000);
  assert.match(result.answer, /Lenovo/);
  assert.match(result.answer, /\$2,000/);
});

test("runPurchasingQuery matches by keyword against the line item description when no manufacturer is recognized", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { description: "HVAC compressor unit", unitPrice: 500 });
  await issuePoWithLineItem(orgId, { description: "Office chairs", unitPrice: 200 });

  const result = await runPurchasingQuery(orgId, "How much did we spend on HVAC parts?");

  assert.equal(result.lineItemCount, 1);
  assert.equal(result.lineItems[0].description, "HVAC compressor unit");
});

test("runPurchasingQuery respects the last_month timeframe, excluding older purchase orders", async () => {
  const orgId = await makeOrgId();
  const now = new Date();
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", unitPrice: 1000, createdAt: now });
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", unitPrice: 5000, createdAt: twoMonthsAgo });

  const result = await runPurchasingQuery(orgId, "What did we pay for Lenovo last month?");

  assert.equal(result.lineItemCount, 1);
  assert.equal(result.totalSpent, 1000);
});

test("runPurchasingQuery excludes cancelled purchase orders from spend totals", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", unitPrice: 1000, status: "cancelled" });

  const result = await runPurchasingQuery(orgId, "What did we pay for Lenovo?");
  assert.equal(result.lineItemCount, 0);
  assert.equal(result.totalSpent, 0);
});

test("runPurchasingQuery returns a real 'no results' answer, not a fabricated one, when nothing matches", async () => {
  const orgId = await makeOrgId();
  const result = await runPurchasingQuery(orgId, "What did we pay for Acme rockets?");
  assert.equal(result.lineItemCount, 0);
  assert.equal(result.totalSpent, 0);
  assert.equal(result.avgUnitPrice, null);
  assert.match(result.answer, /No purchase history found/);
});

test("runPurchasingQuery never crosses tenant boundaries", async () => {
  const orgA = await makeOrgId();
  const orgB = await makeOrgId();
  await issuePoWithLineItem(orgA, { manufacturer: "Lenovo", unitPrice: 1000 });
  await issuePoWithLineItem(orgB, { manufacturer: "Lenovo", unitPrice: 9999 });

  const result = await runPurchasingQuery(orgA, "What did we pay for Lenovo?");
  assert.equal(result.lineItemCount, 1);
  assert.equal(result.totalSpent, 1000);
});

test("runPurchasingQuery logs an AIActivityLog entry even under the mock provider", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", unitPrice: 1000 });

  const result = await runPurchasingQuery(orgId, "What did we pay for Lenovo?");
  assert.ok(result.aiActivityLogId);
  const log = await prisma.aIActivityLog.findUnique({ where: { id: result.aiActivityLogId! } });
  assert.equal(log!.feature, "purchasing_query");
});
