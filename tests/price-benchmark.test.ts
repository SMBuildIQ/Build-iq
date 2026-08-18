import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { recomputePriceBenchmarks, getBenchmark, compareToBenchmark, benchmarkBucketKey } from "../src/lib/priceBenchmark";

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `bench-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Bench Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Bench Org ${suffix}`, slug: `bench-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

/** Builds a full PR -> RFQ -> RFQLineItem -> issued PO -> PurchaseOrderLineItem
 * chain (the real traceability path a PO issuance now persists) so the
 * benchmark computation has real manufacturer/category data to group by. */
async function issuePoWithLineItem(
  organizationId: string,
  opts: { manufacturer?: string | null; category?: string | null; unitOfMeasure?: string; unitPrice: number }
) {
  const suffix = randomUUID().slice(0, 8);
  const supplier = await prisma.supplier.create({ data: { organizationId, name: `Supplier ${suffix}` } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "po_issued" },
  });
  const prLineItem = await prisma.purchaseRequestLineItem.create({
    data: {
      purchaseRequestId: pr.id,
      description: "Widget",
      quantity: 1,
      unitOfMeasure: opts.unitOfMeasure ?? "each",
      manufacturer: opts.manufacturer ?? null,
      category: opts.category ?? null,
    },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId, purchaseRequestId: pr.id, rfqNumber: `RFQ-${suffix}`, status: "sent" },
  });
  const rfqLineItem = await prisma.rFQLineItem.create({
    data: { rfqId: rfq.id, sourceLineItemId: prLineItem.id, description: "Widget", quantity: 1, unitOfMeasure: opts.unitOfMeasure ?? "each" },
  });
  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId,
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      poNumber: `PO-${suffix}`,
      status: "issued",
      lineItems: {
        create: [{ rfqLineItemId: rfqLineItem.id, description: "Widget", quantity: 1, unitPrice: opts.unitPrice, total: opts.unitPrice }],
      },
    },
  });
  return { po, rfqLineItem };
}

test("benchmarkBucketKey falls back to manufacturer when category is unset, and returns null with neither", () => {
  assert.equal(benchmarkBucketKey(null, "Laptops"), "Laptops");
  assert.equal(benchmarkBucketKey("Lenovo", null), "mfr:Lenovo");
  assert.equal(benchmarkBucketKey(null, null), null);
});

test("recomputePriceBenchmarks averages real PO line item prices for the same bucket", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { category: "Laptops", unitPrice: 1000 });
  await issuePoWithLineItem(orgId, { category: "Laptops", unitPrice: 1200 });

  await recomputePriceBenchmarks(orgId);

  const benchmark = await getBenchmark(orgId, null, "Laptops", "each");
  assert.ok(benchmark);
  assert.equal(benchmark!.avgUnitPrice, 1100);
  assert.equal(benchmark!.sampleSize, 2);
});

test("a line item with neither manufacturer nor category is excluded from benchmarking", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { unitPrice: 500 }); // no manufacturer, no category

  await recomputePriceBenchmarks(orgId);

  const benchmarks = await prisma.priceBenchmark.findMany({ where: { organizationId: orgId } });
  assert.equal(benchmarks.length, 0);
});

test("recomputePriceBenchmarks is idempotent — repeated calls don't accumulate duplicate rows", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { manufacturer: "Lenovo", unitPrice: 900 });

  await recomputePriceBenchmarks(orgId);
  await recomputePriceBenchmarks(orgId);
  await recomputePriceBenchmarks(orgId);

  const benchmarks = await prisma.priceBenchmark.findMany({ where: { organizationId: orgId } });
  assert.equal(benchmarks.length, 1);
});

test("compareToBenchmark reports the correct percentage above a real benchmark", async () => {
  const orgId = await makeOrgId();
  await issuePoWithLineItem(orgId, { category: "Widgets", unitPrice: 100 });
  await recomputePriceBenchmarks(orgId);

  const comparison = await compareToBenchmark(orgId, null, "Widgets", "each", 120);
  assert.ok(comparison);
  assert.ok(Math.abs(comparison!.percentAboveBenchmark - 0.2) < 0.001);
});

test("compareToBenchmark returns null when no benchmark exists for the bucket", async () => {
  const orgId = await makeOrgId();
  const comparison = await compareToBenchmark(orgId, null, "NeverPurchased", "each", 50);
  assert.equal(comparison, null);
});

test("benchmarks are strictly scoped per organization", async () => {
  const orgA = await makeOrgId();
  const orgB = await makeOrgId();
  await issuePoWithLineItem(orgA, { category: "Laptops", unitPrice: 1000 });
  await recomputePriceBenchmarks(orgA);

  const benchmarkA = await getBenchmark(orgA, null, "Laptops", "each");
  const benchmarkB = await getBenchmark(orgB, null, "Laptops", "each");
  assert.ok(benchmarkA);
  assert.equal(benchmarkB, null);
});
