import type {
  MaterialCatalogItem,
  MaterialLibraryCategory,
  ProjectLibraryItem,
} from "@buildiq/types";
import { MATERIAL_LIBRARY_CATEGORIES } from "@buildiq/types";

export { MATERIAL_LIBRARY_CATEGORIES };

/** Shared yard catalog (mirrors API materials catalog). */
export const MATERIAL_CATALOG: MaterialCatalogItem[] = [
  { id: "cat-lum-stud-24", category: "Lumber", name: "2x4 SPF Stud 92-5/8\"", description: "Kiln-dried stud for residential framing", unit: "ea", unitCost: 4.85, spruceSku: "LUM-24-STUD" },
  { id: "cat-lum-stud-26", category: "Lumber", name: "2x6 SPF Stud 92-5/8\"", description: "Exterior wall stud", unit: "ea", unitCost: 7.4, spruceSku: "LUM-26-STUD" },
  { id: "cat-lum-pt-46", category: "Lumber", name: "2x6 PT #2 Ground Contact", description: "Pressure-treated sill / deck framing", unit: "lf", unitCost: 2.15, spruceSku: "LUM-PT-26" },
  { id: "cat-lum-osb", category: "Lumber", name: "7/16\" OSB Sheathing 4x8", unit: "sheet", unitCost: 18.9, spruceSku: "LUM-OSB-716" },
  { id: "cat-trs-common", category: "Trusses", name: "Common Roof Truss 6/12 · 28' span", description: "Engineered common with stamped layout", unit: "ea", unitCost: 285, spruceSku: "TRS-COM-28" },
  { id: "cat-trs-hip", category: "Trusses", name: "Hip / Valley Truss Set", unit: "set", unitCost: 1240, spruceSku: "TRS-HIP-SET" },
  { id: "cat-trs-gable", category: "Trusses", name: "Gable End Frame", unit: "ea", unitCost: 410, spruceSku: "TRS-GABLE" },
  { id: "cat-ijoist-117", category: "I-Joists", name: "TJI 110 11-7/8\" I-Joist", description: "Floor system I-joist", unit: "lf", unitCost: 6.75, spruceSku: "IJT-110-117" },
  { id: "cat-ijoist-140", category: "I-Joists", name: "TJI 230 14\" I-Joist", unit: "lf", unitCost: 9.2, spruceSku: "IJT-230-14" },
  { id: "cat-rimboard", category: "I-Joists", name: "1-1/8\" LSL Rim Board", unit: "lf", unitCost: 4.1, spruceSku: "IJT-RIM-118" },
  { id: "cat-win-dh", category: "Windows", name: "Clad Double-Hung Low-E", unit: "ea", unitCost: 685, spruceSku: "WIN-DH-LE" },
  { id: "cat-win-fixed", category: "Windows", name: "Clad Picture / Fixed Unit", unit: "ea", unitCost: 920, spruceSku: "WIN-FX" },
  { id: "cat-win-slider", category: "Windows", name: "Clad Horizontal Slider", unit: "ea", unitCost: 740, spruceSku: "WIN-SL" },
  { id: "cat-door-entry", category: "Entry Doors", name: "Fiberglass Entry Door w/ Sidelight", unit: "ea", unitCost: 1850, spruceSku: "DOR-ENT-SL" },
  { id: "cat-door-entry-dbl", category: "Entry Doors", name: "Double Entry Door System", unit: "ea", unitCost: 3200, spruceSku: "DOR-ENT-DBL" },
  { id: "cat-door-int-shaker", category: "Interior Doors", name: "Shaker 2-Panel Prehung Interior", unit: "ea", unitCost: 245, spruceSku: "DOR-INT-2P" },
  { id: "cat-door-int-bifold", category: "Interior Doors", name: "Bifold Closet Door 6-Panel", unit: "ea", unitCost: 168, spruceSku: "DOR-INT-BF" },
  { id: "cat-door-patio", category: "Exterior Doors", name: "Sliding Patio Door 6/6", unit: "ea", unitCost: 1680, spruceSku: "DOR-EXT-PAT" },
  { id: "cat-door-french", category: "Exterior Doors", name: "French Exterior Door Pair", unit: "pair", unitCost: 2450, spruceSku: "DOR-EXT-FR" },
  { id: "cat-cab-base", category: "Cabinetry", name: "Base Cabinet 36\" Soft-Close", unit: "ea", unitCost: 520, spruceSku: "CAB-BASE-36" },
  { id: "cat-cab-wall", category: "Cabinetry", name: "Wall Cabinet 30\" Shaker", unit: "ea", unitCost: 310, spruceSku: "CAB-WALL-30" },
  { id: "cat-cab-vanity", category: "Cabinetry", name: "Bath Vanity 48\"", unit: "ea", unitCost: 890, spruceSku: "CAB-VAN-48" },
  { id: "cat-hw-entry", category: "Hardware", name: "Entry Lockset Smart Deadbolt", unit: "ea", unitCost: 285, spruceSku: "HW-LCK-ENT" },
  { id: "cat-hw-passage", category: "Hardware", name: "Passage / Privacy Lever Set", unit: "ea", unitCost: 48, spruceSku: "HW-LVR-PSG" },
  { id: "cat-hw-hinge", category: "Hardware", name: "Residential Hinge Pair 4\"", unit: "pair", unitCost: 12.5, spruceSku: "HW-HNG-4" },
  { id: "cat-mas-veneer", category: "Masonry Stone", name: "Cultured Stone Veneer Flat", unit: "sf", unitCost: 9.75, spruceSku: "MAS-VEN-FLT" },
  { id: "cat-mas-corner", category: "Masonry Stone", name: "Stone Veneer Corners", unit: "lf", unitCost: 14.2, spruceSku: "MAS-VEN-CRN" },
  { id: "cat-mas-mortar", category: "Masonry Stone", name: "Type N Mortar Mix", unit: "bag", unitCost: 11.4, spruceSku: "MAS-MRT-N" },
  { id: "cat-mw-casing", category: "Millwork", name: "Colonial Casing 2-1/4\"", unit: "lf", unitCost: 2.85, spruceSku: "MW-CAS-214" },
  { id: "cat-mw-base", category: "Millwork", name: "Baseboard 5-1/4\" MDF", unit: "lf", unitCost: 1.95, spruceSku: "MW-BASE-514" },
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

/** Per-project saved materials library (orders + takeoff + catalog picks). */
export const MOCK_PROJECT_LIBRARIES: Record<string, ProjectLibraryItem[]> = {
  job_oak_ridge: [
    line("job_oak_ridge", "cat-lum-stud-24", 420, "order"),
    line("job_oak_ridge", "cat-lum-stud-26", 180, "order"),
    line("job_oak_ridge", "cat-lum-osb", 96, "order"),
    line("job_oak_ridge", "cat-trs-common", 24, "order"),
    line("job_oak_ridge", "cat-trs-gable", 2, "order"),
    line("job_oak_ridge", "cat-ijoist-117", 640, "order"),
    line("job_oak_ridge", "cat-rimboard", 180, "order"),
    line("job_oak_ridge", "cat-win-dh", 18, "order"),
    line("job_oak_ridge", "cat-win-fixed", 4, "order"),
    line("job_oak_ridge", "cat-door-entry", 1, "order"),
    line("job_oak_ridge", "cat-door-int-shaker", 14, "order"),
    line("job_oak_ridge", "cat-door-patio", 1, "order"),
    line("job_oak_ridge", "cat-cab-base", 12, "takeoff"),
    line("job_oak_ridge", "cat-cab-wall", 10, "takeoff"),
    line("job_oak_ridge", "cat-hw-entry", 1, "order"),
    line("job_oak_ridge", "cat-hw-passage", 14, "order"),
    line("job_oak_ridge", "cat-mas-veneer", 420, "takeoff"),
    line("job_oak_ridge", "cat-mw-casing", 380, "order"),
    line("job_oak_ridge", "cat-mw-base", 520, "order"),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_lake_house: [
    line("job_lake_house", "cat-lum-stud-24", 210, "order"),
    line("job_lake_house", "cat-ijoist-117", 280, "order"),
    line("job_lake_house", "cat-win-dh", 9, "order"),
    line("job_lake_house", "cat-door-int-shaker", 8, "order"),
    line("job_lake_house", "cat-cab-base", 8, "takeoff"),
    line("job_lake_house", "cat-cab-vanity", 2, "takeoff"),
    line("job_lake_house", "cat-hw-passage", 8, "order"),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_cedar_park: [
    line("job_cedar_park", "cat-lum-stud-24", 360, "order"),
    line("job_cedar_park", "cat-lum-stud-26", 140, "order"),
    line("job_cedar_park", "cat-trs-common", 18, "order"),
    line("job_cedar_park", "cat-trs-hip", 1, "order"),
    line("job_cedar_park", "cat-ijoist-140", 520, "order"),
    line("job_cedar_park", "cat-win-dh", 14, "order"),
    line("job_cedar_park", "cat-win-slider", 3, "order"),
    line("job_cedar_park", "cat-door-entry", 1, "order"),
    line("job_cedar_park", "cat-door-int-shaker", 12, "order"),
    line("job_cedar_park", "cat-door-french", 1, "order"),
    line("job_cedar_park", "cat-cab-base", 10, "order"),
    line("job_cedar_park", "cat-mas-veneer", 280, "order"),
    line("job_cedar_park", "cat-mas-corner", 64, "order"),
  ].filter(Boolean) as ProjectLibraryItem[],
  job_draft_townhomes: [],
  job_mueller: [],
};

export function libraryCategoriesPresent(items: ProjectLibraryItem[]): MaterialLibraryCategory[] {
  const set = new Set(items.map((i) => i.category as MaterialLibraryCategory));
  return MATERIAL_LIBRARY_CATEGORIES.filter((c) => set.has(c));
}
