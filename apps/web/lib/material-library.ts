import type { MaterialCatalogItem, ProjectLibraryItem } from "@buildiq/types";
import { MATERIAL_LIBRARY_CATEGORIES } from "@buildiq/types";

export { MATERIAL_LIBRARY_CATEGORIES };

/** Yard catalog (mirrors API materials catalog). */
export const MATERIAL_CATALOG: MaterialCatalogItem[] = [
  { id: "cat-lum-stud-24", category: "Lumber", name: '2x4 SPF Stud 92-5/8"', description: "Kiln-dried stud for residential framing", unit: "ea", unitCost: 4.85, spruceSku: "LUM-24-STUD" },
  { id: "cat-lum-stud-26", category: "Lumber", name: '2x6 SPF Stud 92-5/8"', description: "Exterior wall stud", unit: "ea", unitCost: 7.4, spruceSku: "LUM-26-STUD" },
  { id: "cat-lum-osb", category: "Lumber", name: '7/16" OSB Sheathing 4x8', unit: "sheet", unitCost: 18.9, spruceSku: "LUM-OSB-716" },
  { id: "cat-trs-common", category: "Trusses", name: "Common Roof Truss 6/12 · 28' span", description: "Engineered common with stamped layout", unit: "ea", unitCost: 285, spruceSku: "TRS-COM-28" },
  { id: "cat-trs-hip", category: "Trusses", name: "Hip / Valley Truss Set", unit: "set", unitCost: 1240, spruceSku: "TRS-HIP-SET" },
  { id: "cat-ijoist-117", category: "I-Joists", name: 'TJI 110 11-7/8" I-Joist', description: "Floor system I-joist", unit: "lf", unitCost: 6.75, spruceSku: "IJT-110-117" },
  { id: "cat-rimboard", category: "I-Joists", name: '1-1/8" LSL Rim Board', unit: "lf", unitCost: 4.1, spruceSku: "IJT-RIM-118" },
  { id: "cat-win-dh", category: "Windows", name: "Clad Double-Hung Low-E", unit: "ea", unitCost: 685, spruceSku: "WIN-DH-LE" },
  { id: "cat-win-fixed", category: "Windows", name: "Clad Picture / Fixed Unit", unit: "ea", unitCost: 920, spruceSku: "WIN-FX" },
  { id: "cat-door-entry", category: "Entry Doors", name: "Fiberglass Entry Door w/ Sidelight", unit: "ea", unitCost: 1850, spruceSku: "DOR-ENT-SL" },
  { id: "cat-door-int-shaker", category: "Interior Doors", name: "Shaker 2-Panel Prehung Interior", unit: "ea", unitCost: 245, spruceSku: "DOR-INT-2P" },
  { id: "cat-door-patio", category: "Exterior Doors", name: "Sliding Patio Door 6/6", unit: "ea", unitCost: 1680, spruceSku: "DOR-EXT-PAT" },
  { id: "cat-door-french", category: "Exterior Doors", name: "French Exterior Door Pair", unit: "pair", unitCost: 2450, spruceSku: "DOR-EXT-FR" },
  { id: "cat-cab-base", category: "Cabinetry", name: 'Base Cabinet 36" Soft-Close', unit: "ea", unitCost: 520, spruceSku: "CAB-BASE-36" },
  { id: "cat-cab-wall", category: "Cabinetry", name: 'Wall Cabinet 30" Shaker', unit: "ea", unitCost: 310, spruceSku: "CAB-WALL-30" },
  { id: "cat-hw-entry", category: "Hardware", name: "Entry Lockset Smart Deadbolt", unit: "ea", unitCost: 285, spruceSku: "HW-LCK-ENT" },
  { id: "cat-hw-passage", category: "Hardware", name: "Passage / Privacy Lever Set", unit: "ea", unitCost: 48, spruceSku: "HW-LVR-PSG" },
  { id: "cat-mas-veneer", category: "Masonry Stone", name: "Cultured Stone Veneer Flat", unit: "sf", unitCost: 9.75, spruceSku: "MAS-VEN-FLT" },
  { id: "cat-mas-corner", category: "Masonry Stone", name: "Stone Veneer Corners", unit: "lf", unitCost: 14.2, spruceSku: "MAS-VEN-CRN" },
  { id: "cat-mw-casing", category: "Millwork", name: 'Colonial Casing 2-1/4"', unit: "lf", unitCost: 2.85, spruceSku: "MW-CAS-214" },
  { id: "cat-mw-base", category: "Millwork", name: 'Baseboard 5-1/4" MDF', unit: "lf", unitCost: 1.95, spruceSku: "MW-BASE-514" },
];

function line(
  projectId: string,
  catalogId: string,
  quantity: number,
  source: ProjectLibraryItem["source"] = "order"
): ProjectLibraryItem | null {
  const cat = MATERIAL_CATALOG.find((c) => c.id === catalogId);
  if (!cat) return null;
  return {
    id: `${projectId}_${catalogId}`,
    projectId,
    category: cat.category,
    name: cat.name,
    description: cat.description,
    quantity,
    unit: cat.unit,
    unitCost: cat.unitCost,
    spruceSku: cat.spruceSku,
    source,
    updatedAt: "2026-08-02T12:00:00.000Z",
  };
}

/** Demo per-project libraries keyed to web mock job ids. */
export const DEMO_PROJECT_LIBRARIES: Record<string, ProjectLibraryItem[]> = {
  job_cedar: [
    line("job_cedar", "cat-lum-stud-24", 420),
    line("job_cedar", "cat-lum-stud-26", 180),
    line("job_cedar", "cat-lum-osb", 96),
    line("job_cedar", "cat-trs-common", 24),
    line("job_cedar", "cat-ijoist-117", 640),
    line("job_cedar", "cat-rimboard", 180),
    line("job_cedar", "cat-win-dh", 18),
    line("job_cedar", "cat-win-fixed", 4),
    line("job_cedar", "cat-door-entry", 1),
    line("job_cedar", "cat-door-int-shaker", 14),
    line("job_cedar", "cat-door-patio", 1),
    line("job_cedar", "cat-cab-base", 12, "takeoff"),
    line("job_cedar", "cat-cab-wall", 10, "takeoff"),
    line("job_cedar", "cat-hw-entry", 1),
    line("job_cedar", "cat-hw-passage", 14),
    line("job_cedar", "cat-mas-veneer", 420, "takeoff"),
    line("job_cedar", "cat-mw-casing", 380),
    line("job_cedar", "cat-mw-base", 520),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_harbor: [
    line("job_harbor", "cat-lum-stud-24", 210),
    line("job_harbor", "cat-ijoist-117", 280),
    line("job_harbor", "cat-win-dh", 9),
    line("job_harbor", "cat-door-int-shaker", 8),
    line("job_harbor", "cat-cab-base", 8, "takeoff"),
    line("job_harbor", "cat-hw-passage", 8),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_pine: [
    line("job_pine", "cat-lum-stud-24", 360),
    line("job_pine", "cat-trs-common", 18),
    line("job_pine", "cat-trs-hip", 1),
    line("job_pine", "cat-ijoist-117", 520),
    line("job_pine", "cat-win-dh", 14),
    line("job_pine", "cat-door-entry", 1),
    line("job_pine", "cat-door-french", 1),
    line("job_pine", "cat-cab-base", 10),
    line("job_pine", "cat-mas-veneer", 280),
    line("job_pine", "cat-mas-corner", 64),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_draft: [],
};
