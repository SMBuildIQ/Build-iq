import { prisma } from "@/lib/db";

// brief §4: "Purchasing Insights" panel on the dashboard. Every insight here is
// a plain structured query over real data — no AI call, no invented numbers.
// This intentionally does NOT try to match every brief example ("pricing is
// 11.4% above historical" needs PriceBenchmark, which nothing populates yet —
// see KNOWN_LIMITATIONS.md); it only surfaces what's actually knowable today.

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

  return insights;
}
