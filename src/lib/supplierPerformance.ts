import { prisma } from "@/lib/db";

// Deterministic, non-AI supplier scoring (brief §8: "Eventually I want the
// system to create a proprietary supplier-performance score. Design the data
// model to support this.") Recomputed from real transaction history whenever
// a relevant event happens — never estimated, never AI-generated. This is what
// src/lib/ai/quoteRecommendation.ts reads as `supplierPerformanceScore`.

const WEIGHTS = { onTime: 0.4, response: 0.3, quality: 0.3 };

export async function recomputeSupplierPerformance(supplierId: string): Promise<void> {
  const [rfqSuppliers, purchaseOrders] = await Promise.all([
    prisma.rFQSupplier.findMany({ where: { supplierId, status: { not: "pending" } } }),
    prisma.purchaseOrder.findMany({
      where: { supplierId },
      include: { statusHistory: { orderBy: { createdAt: "asc" } }, receipts: { include: { lineItems: true } } },
    }),
  ]);

  const sent = rfqSuppliers.filter((rs) => rs.sentAt !== null);
  // A decline is still an engaged response — only true silence ("no_response")
  // counts against the rate.
  const engaged = sent.filter((rs) => rs.status === "responded" || rs.status === "declined");
  const responseRate = sent.length > 0 ? engaged.length / sent.length : null;

  const quoted = sent.filter((rs) => rs.status === "responded" && rs.respondedAt);
  const responseHours = quoted
    .map((rs) => (rs.respondedAt!.getTime() - rs.sentAt!.getTime()) / 3_600_000)
    .filter((h) => h >= 0);
  const avgResponseHours = responseHours.length > 0 ? responseHours.reduce((a, b) => a + b, 0) / responseHours.length : null;

  const deliveredOrders = purchaseOrders.filter((po) => po.requestedDeliveryDate && po.statusHistory.some((e) => e.toStatus === "delivered"));
  const onTimeCount = deliveredOrders.filter((po) => {
    const deliveredEvent = po.statusHistory.find((e) => e.toStatus === "delivered");
    return deliveredEvent && deliveredEvent.createdAt <= po.requestedDeliveryDate!;
  }).length;
  const onTimeDeliveryRate = deliveredOrders.length > 0 ? onTimeCount / deliveredOrders.length : null;

  const qualityIssueCount = purchaseOrders.reduce(
    (sum, po) => sum + po.receipts.reduce((s, r) => s + r.lineItems.filter((li) => li.quantityDamaged > 0 || li.quantityMissing > 0).length, 0),
    0
  );

  // Composite score only once there's enough history to be meaningful —
  // otherwise leave it null ("unrated") rather than guessing.
  const components: number[] = [];
  const weights: number[] = [];
  if (onTimeDeliveryRate !== null) {
    components.push(onTimeDeliveryRate * 100);
    weights.push(WEIGHTS.onTime);
  }
  if (responseRate !== null) {
    components.push(responseRate * 100);
    weights.push(WEIGHTS.response);
  }
  if (purchaseOrders.length > 0) {
    const qualityScore = Math.max(0, 100 - qualityIssueCount * 10);
    components.push(qualityScore);
    weights.push(WEIGHTS.quality);
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const performanceScore =
    totalWeight > 0 ? Math.round(components.reduce((sum, c, i) => sum + c * weights[i], 0) / totalWeight) : null;

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { responseRate, avgResponseHours, onTimeDeliveryRate, qualityIssueCount, performanceScore },
  });
}
