import { prisma } from "@/lib/db";
import { benchmarkBucketKey, ABOVE_BENCHMARK_THRESHOLD } from "@/lib/priceBenchmark";

// brief §4: "Purchasing Insights" panel on the dashboard. Every insight here is
// a plain structured query over real data — no AI call, no invented numbers.

export interface Insight {
  type: string;
  message: string;
}

const STALE_APPROVAL_DAYS = 3;

export async function generatePurchasingInsights(organizationId: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  const unresponsiveSuppliers = await prisma.rFQSupplier.findMany({
    where: {
      status: "sent",
      rfq: { organizationId, status: { in: ["sent", "responses_open"] } },
    },
    select: { supplierId: true },
    distinct: ["supplierId"],
  });
  if (unresponsiveSuppliers.length > 0) {
    insights.push({
      type: "unresponsive_suppliers",
      message: `${unresponsiveSuppliers.length} supplier${unresponsiveSuppliers.length === 1 ? " has" : "s have"} not responded to open RFQs.`,
    });
  }

  const discrepancyInvoices = await prisma.invoice.count({ where: { organizationId, status: "discrepancy" } });
  if (discrepancyInvoices > 0) {
    insights.push({
      type: "invoice_discrepancies",
      message: `${discrepancyInvoices} invoice${discrepancyInvoices === 1 ? " does" : "s do"} not match ${discrepancyInvoices === 1 ? "its" : "their"} purchase order.`,
    });
  }

  const staleApprovalCutoff = new Date(Date.now() - STALE_APPROVAL_DAYS * 24 * 60 * 60 * 1000);
  const staleApprovals = await prisma.approvalRequest.count({
    where: { status: "pending", createdAt: { lt: staleApprovalCutoff }, purchaseRequest: { organizationId } },
  });
  if (staleApprovals > 0) {
    insights.push({
      type: "stale_approvals",
      message: `${staleApprovals} purchase${staleApprovals === 1 ? " has" : "s have"} been awaiting approval for more than ${STALE_APPROVAL_DAYS} days.`,
    });
  }

  const overdueRfqs = await prisma.rFQ.count({
    where: {
      organizationId,
      status: { in: ["sent", "responses_open"] },
      quoteDeadline: { lt: new Date() },
      suppliers: { some: { status: "sent" } },
    },
  });
  if (overdueRfqs > 0) {
    insights.push({
      type: "overdue_rfqs",
      message: `${overdueRfqs} RFQ${overdueRfqs === 1 ? " is" : "s are"} past ${overdueRfqs === 1 ? "its" : "their"} quote deadline with suppliers still not responded.`,
    });
  }

  const aboveBenchmarkCount = await countPurchasesAboveBenchmark(organizationId);
  if (aboveBenchmarkCount > 0) {
    insights.push({
      type: "above_benchmark_pricing",
      message: `${aboveBenchmarkCount} purchase${aboveBenchmarkCount === 1 ? " is" : "s are"} currently above historical pricing.`,
    });
  }

  return insights;
}

/**
 * Counts distinct purchase requests with an active (not yet selected or
 * rejected) quote containing at least one line item priced >15% above its
 * benchmark. Benchmarks only exist for buckets with real PO history
 * (recomputePriceBenchmarks), so this is silently zero until an org has
 * actually issued purchase orders — never a guess.
 */
async function countPurchasesAboveBenchmark(organizationId: string): Promise<number> {
  const quotes = await prisma.quote.findMany({
    where: { status: "received", rfqSupplier: { rfq: { organizationId } } },
    include: {
      lineItems: { include: { rfqLineItem: { include: { sourceLineItem: true } } } },
      rfqSupplier: { include: { rfq: true } },
    },
  });
  if (quotes.length === 0) return 0;

  const benchmarks = await prisma.priceBenchmark.findMany({
    where: { organizationId },
    orderBy: { periodEnd: "desc" },
  });
  const latestByBucket = new Map<string, number>();
  for (const b of benchmarks) {
    const key = `${b.category}::${b.unitOfMeasure}`;
    if (!latestByBucket.has(key)) latestByBucket.set(key, b.avgUnitPrice);
  }
  if (latestByBucket.size === 0) return 0;

  const flaggedPurchaseRequestIds = new Set<string>();
  for (const quote of quotes) {
    for (const li of quote.lineItems) {
      const source = li.rfqLineItem?.sourceLineItem;
      const bucketKey = benchmarkBucketKey(source?.manufacturer ?? null, source?.category ?? null);
      if (!bucketKey) continue;
      const unitOfMeasure = source?.unitOfMeasure ?? "each";
      const avg = latestByBucket.get(`${bucketKey}::${unitOfMeasure}`);
      if (avg && avg > 0 && (li.unitPrice - avg) / avg > ABOVE_BENCHMARK_THRESHOLD) {
        flaggedPurchaseRequestIds.add(quote.rfqSupplier.rfq.purchaseRequestId);
        break;
      }
    }
  }
  return flaggedPurchaseRequestIds.size;
}
