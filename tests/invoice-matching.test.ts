import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { runThreeWayMatch } from "../src/lib/invoiceMatching";

async function makeOrgWithPO(freight: number | null, tax: number | null) {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `invoice-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Invoice Test User" },
  });
  const { organization, membership } = await createOrganizationWithOwner({
    name: `Invoice Org ${suffix}`,
    slug: `invoice-org-${suffix}`,
    ownerUserId: user.id,
  });
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "Test Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: {
      organizationId: organization.id,
      requestNumber: `PR-${suffix}`,
      requesterId: membership.userId,
      title: "Test purchase",
      status: "po_issued",
    },
  });
  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId: organization.id,
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      poNumber: `PO-${suffix}`,
      status: "delivered",
      freight,
      tax,
      total: 1000 + (freight ?? 0) + (tax ?? 0),
      lineItems: { create: [{ description: "Widget", quantity: 10, unitPrice: 100, total: 1000 }] },
    },
    include: { lineItems: true },
  });
  return { organization, po };
}

async function receiveFully(poId: string, lineItemId: string, quantity: number) {
  await prisma.receipt.create({
    data: {
      purchaseOrderId: poId,
      lineItems: { create: [{ purchaseOrderLineItemId: lineItemId, quantityReceived: quantity }] },
    },
  });
}

test("a clean invoice matching the PO exactly is marked matched with no exceptions", async () => {
  const { po } = await makeOrgWithPO(0, 0);
  await receiveFully(po.id, po.lineItems[0].id, 10);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: po.organizationId,
      purchaseOrderId: po.id,
      amount: 1000,
      lineItems: { create: [{ purchaseOrderLineItemId: po.lineItems[0].id, description: "Widget", quantity: 10, unitPrice: 100, total: 1000 }] },
    },
  });

  await runThreeWayMatch(invoice.id);

  const result = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { matchExceptions: true } });
  assert.equal(result.status, "matched");
  assert.equal(result.matchExceptions.length, 0);
});

test("freight billed when the PO specified freight included is flagged (brief §23 worked example)", async () => {
  const { po } = await makeOrgWithPO(0, 0); // freight = 0 means "included"
  await receiveFully(po.id, po.lineItems[0].id, 10);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: po.organizationId,
      purchaseOrderId: po.id,
      amount: 1150,
      freight: 150,
      lineItems: { create: [{ purchaseOrderLineItemId: po.lineItems[0].id, description: "Widget", quantity: 10, unitPrice: 100, total: 1000 }] },
    },
  });

  await runThreeWayMatch(invoice.id);

  const result = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { matchExceptions: true } });
  assert.equal(result.status, "discrepancy");
  assert.ok(result.matchExceptions.some((e) => e.type === "unauthorized_freight"));
});

test("a price increase per unit is flagged as a price_difference exception", async () => {
  const { po } = await makeOrgWithPO(0, 0);
  await receiveFully(po.id, po.lineItems[0].id, 10);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: po.organizationId,
      purchaseOrderId: po.id,
      amount: 1100,
      lineItems: { create: [{ purchaseOrderLineItemId: po.lineItems[0].id, description: "Widget", quantity: 10, unitPrice: 110, total: 1100 }] },
    },
  });

  await runThreeWayMatch(invoice.id);

  const result = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { matchExceptions: true } });
  const exc = result.matchExceptions.find((e) => e.type === "price_difference");
  assert.ok(exc);
  assert.equal(exc!.difference, 100);
});

test("invoicing more than was received is flagged as item_not_received", async () => {
  const { po } = await makeOrgWithPO(0, 0);
  await receiveFully(po.id, po.lineItems[0].id, 7); // only 7 of 10 received

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: po.organizationId,
      purchaseOrderId: po.id,
      amount: 1000,
      lineItems: { create: [{ purchaseOrderLineItemId: po.lineItems[0].id, description: "Widget", quantity: 10, unitPrice: 100, total: 1000 }] },
    },
  });

  await runThreeWayMatch(invoice.id);

  const result = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { matchExceptions: true } });
  assert.ok(result.matchExceptions.some((e) => e.type === "item_not_received"));
});

test("a duplicate supplier invoice number against the same PO is flagged", async () => {
  const { po } = await makeOrgWithPO(0, 0);
  await receiveFully(po.id, po.lineItems[0].id, 10);

  const lineData = { purchaseOrderLineItemId: po.lineItems[0].id, description: "Widget", quantity: 10, unitPrice: 100, total: 1000 };
  const first = await prisma.invoice.create({
    data: { organizationId: po.organizationId, purchaseOrderId: po.id, supplierInvoiceNumber: "INV-1", amount: 1000, lineItems: { create: [lineData] } },
  });
  await runThreeWayMatch(first.id);

  const second = await prisma.invoice.create({
    data: { organizationId: po.organizationId, purchaseOrderId: po.id, supplierInvoiceNumber: "INV-1", amount: 1000, lineItems: { create: [lineData] } },
  });
  await runThreeWayMatch(second.id);

  const result = await prisma.invoice.findUniqueOrThrow({ where: { id: second.id }, include: { matchExceptions: true } });
  assert.ok(result.matchExceptions.some((e) => e.type === "duplicate_invoice"));
});
