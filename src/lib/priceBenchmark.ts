import { prisma } from "@/lib/db";

// brief §25: "Purchasing Intelligence Database... This is one of the most
// important long-term assets." Benchmarks are computed only from real,
// committed prices — PurchaseOrderLineItem.unitPrice on issued POs — never
// from quotes or estimates, so "this is 14% above historical" always compares
// against what the organization actually paid before.

const ROLLING_WINDOW_DAYS = 180;
const ABOVE_BENCHMARK_THRESHOLD = 0.15; // 15%

/**
 * A PurchaseRequestLineItem may or may not have a category set today (nothing
 * in the UI captures it yet). Falling back to "mfr:<manufacturer>" keeps
 * items with a known manufacturer benchmarkable instead of silently dropping
 * them; an item with neither is not benchmarkable and returns null.
 */
export function benchmarkBucketKey(manufacturer: string | null, category: string | null): string | null {
  if (category) return category;
  if (manufacturer) return `mfr:${manufacturer}`;
  return null;
}

/**
 * Recomputes every benchmark bucket for an org from real PO line items issued
 * within the rolling window. Idempotent: clears all of this org's existing
 * rows before inserting fresh ones — periodEnd is `new Date()` at call time,
 * so it never matches a prior call's rows, and nothing reads historical
 * windows (only the latest per bucket is ever queried), so a full replace is
 * correct rather than accumulating duplicate rows across repeated calls.
 */
export async function recomputePriceBenchmarks(organizationId: string): Promise<void> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const lineItems = await prisma.purchaseOrderLineItem.findMany({
    where: {
      purchaseOrder: { organizationId, createdAt: { gte: periodStart, lte: periodEnd }, status: { notIn: ["cancelled"] } },
    },
    include: {
      rfqLineItem: { include: { sourceLineItem: true } },
    },
  });

  const buckets = new Map<string, { category: string; manufacturer: string | null; unitOfMeasure: string; prices: number[] }>();

  for (const li of lineItems) {
    const source = li.rfqLineItem?.sourceLineItem;
    const manufacturer = source?.manufacturer ?? null;
    const category = source?.category ?? null;
    const bucketKey = benchmarkBucketKey(manufacturer, category);
    if (!bucketKey) continue;

    const unitOfMeasure = source?.unitOfMeasure ?? "each";
    const key = `${bucketKey}::${unitOfMeasure}`;
    if (!buckets.has(key)) {
      buckets.set(key, { category: bucketKey, manufacturer, unitOfMeasure, prices: [] });
    }
    buckets.get(key)!.prices.push(li.unitPrice);
  }

  await prisma.$transaction([
    prisma.priceBenchmark.deleteMany({ where: { organizationId } }),
    ...[...buckets.values()].map((b) =>
      prisma.priceBenchmark.create({
        data: {
          organizationId,
          category: b.category,
          manufacturer: b.manufacturer,
          unitOfMeasure: b.unitOfMeasure,
          periodStart,
          periodEnd,
          avgUnitPrice: b.prices.reduce((sum, p) => sum + p, 0) / b.prices.length,
          sampleSize: b.prices.length,
        },
      })
    ),
  ]);
}

export interface BenchmarkComparison {
  avgUnitPrice: number;
  sampleSize: number;
  percentAboveBenchmark: number; // negative means below benchmark
}

/** Latest benchmark for a bucket, or null if nothing's been observed yet. */
export async function getBenchmark(
  organizationId: string,
  manufacturer: string | null,
  category: string | null,
  unitOfMeasure: string
): Promise<{ avgUnitPrice: number; sampleSize: number } | null> {
  const bucketKey = benchmarkBucketKey(manufacturer, category);
  if (!bucketKey) return null;

  const benchmark = await prisma.priceBenchmark.findFirst({
    where: { organizationId, category: bucketKey, unitOfMeasure },
    orderBy: { periodEnd: "desc" },
  });
  return benchmark ? { avgUnitPrice: benchmark.avgUnitPrice, sampleSize: benchmark.sampleSize } : null;
}

export async function compareToBenchmark(
  organizationId: string,
  manufacturer: string | null,
  category: string | null,
  unitOfMeasure: string,
  unitPrice: number
): Promise<BenchmarkComparison | null> {
  const benchmark = await getBenchmark(organizationId, manufacturer, category, unitOfMeasure);
  if (!benchmark || benchmark.avgUnitPrice <= 0) return null;
  return {
    avgUnitPrice: benchmark.avgUnitPrice,
    sampleSize: benchmark.sampleSize,
    percentAboveBenchmark: (unitPrice - benchmark.avgUnitPrice) / benchmark.avgUnitPrice,
  };
}

export { ABOVE_BENCHMARK_THRESHOLD };
