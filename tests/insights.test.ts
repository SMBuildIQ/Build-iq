import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { generatePurchasingInsights } from "../src/lib/insights";

async function makeOrg() {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `insights-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Insights Test User" },
  });
  return createOrganizationWithOwner({ name: `Insights Org ${suffix}`, slug: `insights-org-${suffix}`, ownerUserId: user.id });
}

test("a fresh organization with no activity gets no insights", async () => {
  const { organization } = await makeOrg();
  const insights = await generatePurchasingInsights(organization.id);
  assert.deepEqual(insights, []);
});

test("an unresponded RFQSupplier on an open RFQ surfaces an unresponsive_suppliers insight", async () => {
  const { organization, membership } = await makeOrg();
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "Slow Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: membership.userId, title: "t", status: "rfq_active" },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId: organization.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${randomUUID().slice(0, 8)}`, status: "sent" },
  });
  await prisma.rFQSupplier.create({
    data: { rfqId: rfq.id, supplierId: supplier.id, status: "sent", secureToken: randomBytes(12).toString("hex"), sentAt: new Date() },
  });

  const insights = await generatePurchasingInsights(organization.id);
  assert.ok(insights.some((i) => i.type === "unresponsive_suppliers"));
});

test("a discrepancy invoice surfaces an invoice_discrepancies insight, a matched one does not", async () => {
  const { organization } = await makeOrg();
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "Invoice Test Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: randomUUID(), title: "t", status: "po_issued" },
  });
  const po = await prisma.purchaseOrder.create({
    data: { organizationId: organization.id, purchaseRequestId: pr.id, supplierId: supplier.id, poNumber: `PO-${randomUUID().slice(0, 8)}`, status: "delivered" },
  });
  await prisma.invoice.create({ data: { organizationId: organization.id, purchaseOrderId: po.id, amount: 100, status: "matched" } });

  let insights = await generatePurchasingInsights(organization.id);
  assert.ok(!insights.some((i) => i.type === "invoice_discrepancies"));

  await prisma.invoice.create({ data: { organizationId: organization.id, purchaseOrderId: po.id, amount: 150, status: "discrepancy" } });
  insights = await generatePurchasingInsights(organization.id);
  assert.ok(insights.some((i) => i.type === "invoice_discrepancies" && i.message.includes("1 invoice")));
});

test("a quote priced above the org's real price benchmark surfaces an above_benchmark_pricing insight", async () => {
  const { organization } = await makeOrg();
  const suffix = randomUUID().slice(0, 8);
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "Benchmark Test Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "rfq_active" },
  });
  const prLineItem = await prisma.purchaseRequestLineItem.create({
    data: { purchaseRequestId: pr.id, description: "Widget", quantity: 1, unitOfMeasure: "each", category: "Widgets" },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId: organization.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${suffix}`, status: "sent" },
  });
  const rfqLineItem = await prisma.rFQLineItem.create({
    data: { rfqId: rfq.id, sourceLineItemId: prLineItem.id, description: "Widget", quantity: 1, unitOfMeasure: "each" },
  });
  const rfqSupplier = await prisma.rFQSupplier.create({
    data: { rfqId: rfq.id, supplierId: supplier.id, status: "responded", secureToken: randomBytes(12).toString("hex") },
  });

  // A real benchmark: this org has historically paid $100 for "Widgets".
  await prisma.priceBenchmark.create({
    data: {
      organizationId: organization.id,
      category: "Widgets",
      manufacturer: null,
      unitOfMeasure: "each",
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      avgUnitPrice: 100,
      sampleSize: 3,
    },
  });

  // Below the threshold — $110 is only 10% above $100.
  const belowThresholdQuote = await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: supplier.id,
      status: "received",
      lineItems: { create: [{ rfqLineItemId: rfqLineItem.id, description: "Widget", quantity: 1, unitPrice: 110, extendedPrice: 110 }] },
    },
  });
  let insights = await generatePurchasingInsights(organization.id);
  assert.ok(!insights.some((i) => i.type === "above_benchmark_pricing"));

  // Above the 15% threshold — $130 is 30% above $100.
  await prisma.quote.update({ where: { id: belowThresholdQuote.id }, data: { status: "rejected" } });
  await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: supplier.id,
      status: "received",
      lineItems: { create: [{ rfqLineItemId: rfqLineItem.id, description: "Widget", quantity: 1, unitPrice: 130, extendedPrice: 130 }] },
    },
  });
  insights = await generatePurchasingInsights(organization.id);
  assert.ok(insights.some((i) => i.type === "above_benchmark_pricing" && i.message.includes("1 purchase")));
});

test("with no PriceBenchmark rows at all, above_benchmark_pricing never fires — no guessing without real history", async () => {
  const { organization } = await makeOrg();
  const suffix = randomUUID().slice(0, 8);
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "No Benchmark Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "rfq_active" },
  });
  const prLineItem = await prisma.purchaseRequestLineItem.create({
    data: { purchaseRequestId: pr.id, description: "Gadget", quantity: 1, unitOfMeasure: "each", category: "Gadgets" },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId: organization.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${suffix}`, status: "sent" },
  });
  const rfqLineItem = await prisma.rFQLineItem.create({
    data: { rfqId: rfq.id, sourceLineItemId: prLineItem.id, description: "Gadget", quantity: 1, unitOfMeasure: "each" },
  });
  const rfqSupplier = await prisma.rFQSupplier.create({
    data: { rfqId: rfq.id, supplierId: supplier.id, status: "responded", secureToken: randomBytes(12).toString("hex") },
  });
  await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: supplier.id,
      status: "received",
      lineItems: { create: [{ rfqLineItemId: rfqLineItem.id, description: "Gadget", quantity: 1, unitPrice: 999999, extendedPrice: 999999 }] },
    },
  });

  const insights = await generatePurchasingInsights(organization.id);
  assert.ok(!insights.some((i) => i.type === "above_benchmark_pricing"));
});

test("insights are strictly scoped per organization", async () => {
  const { organization: orgA } = await makeOrg();
  const { organization: orgB } = await makeOrg();
  const supplier = await prisma.supplier.create({ data: { organizationId: orgA.id, name: "Org A Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: orgA.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: randomUUID(), title: "t", status: "rfq_active" },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId: orgA.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${randomUUID().slice(0, 8)}`, status: "sent" },
  });
  await prisma.rFQSupplier.create({
    data: { rfqId: rfq.id, supplierId: supplier.id, status: "sent", secureToken: randomBytes(12).toString("hex"), sentAt: new Date() },
  });

  const insightsA = await generatePurchasingInsights(orgA.id);
  const insightsB = await generatePurchasingInsights(orgB.id);
  assert.ok(insightsA.some((i) => i.type === "unresponsive_suppliers"));
  assert.deepEqual(insightsB, []);
});
