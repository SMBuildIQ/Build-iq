import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { generatePurchasingInsights } from "@/lib/insights";

async function loadMetrics(organizationId: string) {
  const [totalRequests, awaitingApproval, openRfqs, ordersInProgress, lateOrders, savings, ratedSuppliers] = await Promise.all([
    prisma.purchaseRequest.count({ where: { organizationId } }),
    prisma.purchaseRequest.count({ where: { organizationId, status: "awaiting_approval" } }),
    prisma.rFQ.count({ where: { organizationId, status: { in: ["sent", "responses_open"] } } }),
    prisma.purchaseOrder.count({ where: { organizationId, status: { notIn: ["closed", "cancelled", "delivered"] } } }),
    prisma.purchaseOrder.count({ where: { organizationId, status: "delayed" } }),
    prisma.savingsRecord.aggregate({ where: { organizationId }, _sum: { realizedSavings: true } }),
    prisma.supplier.findMany({
      where: { organizationId, OR: [{ responseRate: { not: null } }, { onTimeDeliveryRate: { not: null } }] },
      select: { responseRate: true, onTimeDeliveryRate: true },
    }),
  ]);

  const responseRates = ratedSuppliers.map((s) => s.responseRate).filter((r): r is number => r !== null);
  const onTimeRates = ratedSuppliers.map((s) => s.onTimeDeliveryRate).filter((r): r is number => r !== null);
  const avg = (nums: number[]) => (nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  return {
    totalRequests,
    awaitingApproval,
    openRfqs,
    ordersInProgress,
    lateOrders,
    verifiedSavings: savings._sum.realizedSavings ?? 0,
    supplierResponseRate: avg(responseRates),
    onTimeDeliveryRate: avg(onTimeRates),
  };
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const [metrics, insights] = await Promise.all([loadMetrics(ctx.organizationId), generatePurchasingInsights(ctx.organizationId)]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-xl font-semibold">What does your business need?</h1>
        <p className="mb-4 text-sm text-gray-500">
          Describe a purchase in plain English — BuildIQ will structure it into a formal purchase request.
        </p>
        <Link
          href="/purchases/new"
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Describe a purchase
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Purchase requests" value={metrics.totalRequests} />
        <Metric label="Awaiting approval" value={metrics.awaitingApproval} />
        <Metric label="Open RFQs" value={metrics.openRfqs} />
        <Metric label="Orders in progress" value={metrics.ordersInProgress} />
        <Metric label="Late orders" value={metrics.lateOrders} />
        <Metric
          label="Supplier response rate"
          value={metrics.supplierResponseRate !== null ? `${Math.round(metrics.supplierResponseRate * 100)}%` : "—"}
        />
        <Metric
          label="On-time delivery"
          value={metrics.onTimeDeliveryRate !== null ? `${Math.round(metrics.onTimeDeliveryRate * 100)}%` : "—"}
        />
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Verified realized savings</h2>
        <p className="text-2xl font-semibold">
          ${metrics.verifiedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Realized savings = initial qualified quote minus final invoice amount, recorded only once a purchase closes.
        </p>
      </div>

      <div className={`rounded-xl border p-6 ${insights.length > 0 ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-white"}`}>
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Purchasing insights</h2>
        {insights.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2 text-sm text-gray-700">
            {insights.map((insight) => (
              <li key={insight.type} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {insight.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Nothing needs attention right now. Insights are computed from real purchasing data — none are
            fabricated or shown before there is data to support them.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
