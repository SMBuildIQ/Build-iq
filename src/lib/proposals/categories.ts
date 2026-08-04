import { PACKAGE_CATEGORIES } from "@/lib/materials/packages";

/** Canonical proposal section order — matches shop takeoff packages + Other. */
export const PROPOSAL_CATEGORIES = [...PACKAGE_CATEGORIES, "Other"] as const;

export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, ProposalCategory> = {
  windows: "Windows",
  window: "Windows",
  doors: "Doors",
  door: "Doors",
  lumber: "Lumber",
  framing: "Lumber",
  sheathing: "Lumber",
  studs: "Lumber",
  trusses: "Trusses",
  truss: "Trusses",
  roofing: "Trusses",
  cabinetry: "Cabinetry",
  cabinets: "Cabinetry",
  cabinet: "Cabinetry",
  "masonry stone": "Masonry Stone",
  masonry: "Masonry Stone",
  stone: "Masonry Stone",
  concrete: "Masonry Stone",
  "door hardware": "Door Hardware",
  hardware: "Door Hardware",
  millwork: "Millwork",
  trim: "Millwork",
  finish: "Millwork",
};

const TRADE_TO_CATEGORY: Record<string, ProposalCategory> = {
  framing: "Lumber",
  "windows & doors": "Windows",
  roofing: "Trusses",
  foundation: "Masonry Stone",
  cabinetry: "Cabinetry",
  millwork: "Millwork",
};

/** Map a takeoff material category/trade into a proposal section category. */
export function mapMaterialToProposalCategory(
  category: string,
  trade?: string
): ProposalCategory {
  const catKey = category.trim().toLowerCase();
  if (CATEGORY_ALIASES[catKey]) return CATEGORY_ALIASES[catKey];

  // Exact package category match (case-insensitive)
  const exact = PROPOSAL_CATEGORIES.find((c) => c.toLowerCase() === catKey);
  if (exact) return exact;

  if (trade) {
    const tradeKey = trade.trim().toLowerCase();
    if (TRADE_TO_CATEGORY[tradeKey]) {
      // Windows & doors: prefer Doors when category hints door
      if (tradeKey === "windows & doors") {
        if (catKey.includes("door") || catKey.includes("hardware")) {
          return catKey.includes("hardware") ? "Door Hardware" : "Doors";
        }
        return "Windows";
      }
      return TRADE_TO_CATEGORY[tradeKey];
    }
  }

  return "Other";
}

export function categorySortIndex(category: string): number {
  const i = PROPOSAL_CATEGORIES.indexOf(category as ProposalCategory);
  return i === -1 ? 99 : i;
}

export const SECTION_BLURBS: Record<ProposalCategory, string> = {
  Windows: "Window units and installation accessories sized from plan takeoff.",
  Doors: "Entry, interior, and patio door units from the door schedule.",
  Lumber: "Framing lumber, plates, joists, beams, and sheathing.",
  Trusses: "Engineered roof trusses, bracing, and layout from roof plans.",
  Cabinetry: "Kitchen and bath cabinet packages from elevations / plans.",
  "Masonry Stone": "Stone veneer and masonry materials from elevation takeoff.",
  "Door Hardware": "Locks, hinges, stops, and closers matched to openings.",
  Millwork: "Casing, base, crown, and specialty interior trim.",
  Other: "Additional materials identified on the takeoff.",
};
