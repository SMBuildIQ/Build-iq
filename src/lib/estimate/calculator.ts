import type { MaterialItem } from "@prisma/client";

export type EstimateTotals = {
  materialCost: number;
  laborCost: number;
  wasteCost: number;
  contingencyPct: number;
  contingencyCost: number;
  overheadPct: number;
  overheadCost: number;
  profitPct: number;
  profitAmount: number;
  taxPct: number;
  taxAmount: number;
  grandTotal: number;
};

export type EstimateOptions = {
  contingencyPct?: number;
  overheadPct?: number;
  profitPct?: number;
  taxPct?: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calculateEstimate(
  materials: Pick<
    MaterialItem,
    "quantity" | "unitCost" | "laborHours" | "laborRate" | "wasteFactor"
  >[],
  options: EstimateOptions = {}
): EstimateTotals {
  const contingencyPct = options.contingencyPct ?? 0.1;
  const overheadPct = options.overheadPct ?? 0.08;
  const profitPct = options.profitPct ?? 0.12;
  const taxPct = options.taxPct ?? 0.065;

  let materialCost = 0;
  let laborCost = 0;
  let wasteCost = 0;

  for (const m of materials) {
    const base = m.quantity * m.unitCost;
    const waste = base * m.wasteFactor;
    materialCost += base;
    wasteCost += waste;
    laborCost += m.laborHours * m.laborRate;
  }

  const subtotal = materialCost + wasteCost + laborCost;
  const contingencyCost = subtotal * contingencyPct;
  const afterContingency = subtotal + contingencyCost;
  const overheadCost = afterContingency * overheadPct;
  const afterOverhead = afterContingency + overheadCost;
  const profitAmount = afterOverhead * profitPct;
  const taxable = afterOverhead + profitAmount;
  const taxAmount = taxable * taxPct;
  const grandTotal = taxable + taxAmount;

  return {
    materialCost: round2(materialCost),
    laborCost: round2(laborCost),
    wasteCost: round2(wasteCost),
    contingencyPct,
    contingencyCost: round2(contingencyCost),
    overheadPct,
    overheadCost: round2(overheadCost),
    profitPct,
    profitAmount: round2(profitAmount),
    taxPct,
    taxAmount: round2(taxAmount),
    grandTotal: round2(grandTotal),
  };
}

export function lineExtendedCost(m: {
  quantity: number;
  unitCost: number;
  wasteFactor: number;
  laborHours: number;
  laborRate: number;
}) {
  const material = m.quantity * m.unitCost * (1 + m.wasteFactor);
  const labor = m.laborHours * m.laborRate;
  return round2(material + labor);
}
