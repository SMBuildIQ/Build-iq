import type { EstimateTotals, MaterialLine, ProposalCategory } from "@buildiq/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type EstimateOptions = {
  contingencyPct?: number;
  overheadPct?: number;
  profitPct?: number;
  taxPct?: number;
};

export function lineExtendedCost(
  m: Pick<MaterialLine, "quantity" | "unitCost" | "wasteFactor">
): number {
  const base = m.quantity * m.unitCost;
  return round2(base * (1 + m.wasteFactor));
}

export function calculateEstimate(
  materials: Pick<
    MaterialLine,
    "quantity" | "unitCost" | "laborHours" | "laborRate" | "wasteFactor"
  >[],
  options: EstimateOptions = {}
): Omit<EstimateTotals, "version"> {
  const contingencyPct = options.contingencyPct ?? 0.1;
  const overheadPct = options.overheadPct ?? 0.08;
  const profitPct = options.profitPct ?? 0.12;
  const taxPct = options.taxPct ?? 0.065;

  let materialCost = 0;
  let laborCost = 0;
  let wasteCost = 0;

  for (const m of materials) {
    const base = m.quantity * m.unitCost;
    materialCost += base;
    wasteCost += base * m.wasteFactor;
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

export function depositAmount(grandTotal: number, depositPct = 0.3) {
  return round2(grandTotal * depositPct);
}

const CATEGORY_ALIASES: Record<string, ProposalCategory> = {
  windows: "Windows",
  doors: "Doors",
  lumber: "Lumber",
  framing: "Lumber",
  sheathing: "Lumber",
  trusses: "Trusses",
  roofing: "Trusses",
  cabinetry: "Cabinetry",
  masonry: "Masonry Stone",
  concrete: "Masonry Stone",
  hardware: "Door Hardware",
  millwork: "Millwork",
  trim: "Millwork",
};

export function mapMaterialToProposalCategory(
  category: string,
  trade?: string
): ProposalCategory {
  const catKey = category.trim().toLowerCase();
  if (CATEGORY_ALIASES[catKey]) return CATEGORY_ALIASES[catKey];
  if (trade) {
    const t = trade.trim().toLowerCase();
    if (t === "framing") return "Lumber";
    if (t === "windows & doors") {
      if (catKey.includes("door")) return catKey.includes("hardware") ? "Door Hardware" : "Doors";
      return "Windows";
    }
    if (t === "roofing") return "Trusses";
  }
  return "Other";
}
