import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { recomputeSupplierPerformance } from "../src/lib/supplierPerformance";

async function makeOrgAndSupplier() {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `perf-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Perf Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Perf Org ${suffix}`, slug: `perf-org-${suffix}`, ownerUserId: user.id });
  const supplier = await prisma.supplier.create({ data: { organizationId: organization.id, name: "Perf Test Supplier" } });
  return { organization, supplier };
}

test("a supplier with no history stays unrated rather than defaulting to a score", async () => {
  const { supplier } = await makeOrgAndSupplier();
  await recomputeSupplierPerformance(supplier.id);
  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
  assert.equal(updated.performanceScore, null);
  assert.equal(updated.responseRate, null);
  assert.equal(updated.onTimeDeliveryRate, null);
});

test("response rate counts declines as engaged but not silence", async () => {
  const { organization, supplier } = await makeOrgAndSupplier();
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: randomUUID(), title: "t", status: "rfq_active" },
  });
  const now = new Date();

  // one responded, one declined, one silent (across 3 separate RFQs, since a
  // supplier can only appear once per RFQ) — response rate should be 2/3
  const statuses: { status: string; extra: Record<string, Date> }[] = [
    { status: "responded", extra: { respondedAt: now } },
    { status: "declined", extra: { declinedAt: now } },
    { status: "no_response", extra: {} },
  ];
  for (const s of statuses) {
    const rfq = await prisma.rFQ.create({
      data: { organizationId: organization.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${randomUUID().slice(0, 8)}`, status: "sent" },
    });
    await prisma.rFQSupplier.create({
      data: { rfqId: rfq.id, supplierId: supplier.id, status: s.status, secureToken: randomBytes(12).toString("hex"), sentAt: now, ...s.extra },
    });
  }

  await recomputeSupplierPerformance(supplier.id);
  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
  assert.ok(Math.abs(updated.responseRate! - 2 / 3) < 0.001);
});

test("on-time delivery rate reflects the actual delivered timestamp against the requested date", async () => {
  const { organization, supplier } = await makeOrgAndSupplier();
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: organization.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: randomUUID(), title: "t", status: "po_issued" },
  });

  const onTimeDate = new Date("2026-01-10T00:00:00Z");
  const lateDate = new Date("2026-01-10T00:00:00Z");

  const onTimePo = await prisma.purchaseOrder.create({
    data: {
      organizationId: organization.id,
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      poNumber: `PO-${randomUUID().slice(0, 8)}`,
      status: "delivered",
      requestedDeliveryDate: onTimeDate,
      statusHistory: { create: [{ toStatus: "delivered", actorType: "system", createdAt: new Date("2026-01-09T00:00:00Z") }] },
    },
  });
  const latePo = await prisma.purchaseOrder.create({
    data: {
      organizationId: organization.id,
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      poNumber: `PO-${randomUUID().slice(0, 8)}`,
      status: "delivered",
      requestedDeliveryDate: lateDate,
      statusHistory: { create: [{ toStatus: "delivered", actorType: "system", createdAt: new Date("2026-01-15T00:00:00Z") }] },
    },
  });
  void onTimePo;
  void latePo;

  await recomputeSupplierPerformance(supplier.id);
  const updated = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
  assert.equal(updated.onTimeDeliveryRate, 0.5);
});
