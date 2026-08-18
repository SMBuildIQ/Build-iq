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
