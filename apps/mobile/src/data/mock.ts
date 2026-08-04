import type {
  ProjectSummary,
  ProposalSummary,
  ShopPackage,
  UserSession,
} from "@buildiq/types";

export const MOCK_SESSION: UserSession = {
  id: "user_demo",
  email: "estimator@northridge.build",
  name: "Alex Rivera",
  companyId: "co_northridge",
  companyName: "Northridge Builders",
  role: "ESTIMATOR",
};

export const MOCK_JOBS: ProjectSummary[] = [
  {
    id: "job_oak_ridge",
    name: "Oak Ridge Residence",
    address: "1847 Millwork Lane",
    city: "Austin",
    state: "TX",
    zip: "78704",
    squareFeet: 4200,
    stories: 2,
    status: "ESTIMATED",
    estimateGrandTotal: 284650,
    blueprintCount: 12,
    materialCount: 186,
    bidCount: 3,
    updatedAt: "2026-08-02T14:22:00.000Z",
  },
  {
    id: "job_lake_house",
    name: "Lake House Remodel",
    address: "92 Shoreline Dr",
    city: "Lakeway",
    state: "TX",
    zip: "78734",
    squareFeet: 2800,
    stories: 1,
    status: "ANALYZING",
    estimateGrandTotal: null,
    blueprintCount: 6,
    materialCount: 42,
    bidCount: 0,
    updatedAt: "2026-08-03T09:10:00.000Z",
  },
  {
    id: "job_cedar_park",
    name: "Cedar Park Spec",
    address: "4410 Cypress Bend",
    city: "Cedar Park",
    state: "TX",
    zip: "78613",
    squareFeet: 3100,
    stories: 2,
    status: "BIDDING",
    estimateGrandTotal: 196420,
    blueprintCount: 9,
    materialCount: 154,
    bidCount: 5,
    updatedAt: "2026-07-28T16:45:00.000Z",
  },
  {
    id: "job_draft_townhomes",
    name: "Mueller Townhomes",
    address: "1200 Manor Rd",
    city: "Austin",
    state: "TX",
    zip: "78723",
    squareFeet: 1800,
    stories: 3,
    status: "DRAFT",
    estimateGrandTotal: null,
    blueprintCount: 0,
    materialCount: 0,
    bidCount: 0,
    updatedAt: "2026-08-01T11:00:00.000Z",
  },
];

export const MOCK_PROPOSALS: ProposalSummary[] = [
  {
    id: "prop_001",
    number: "BQ-2026-0142",
    title: "Oak Ridge — Windows & Millwork",
    status: "SENT",
    grandTotal: 68420,
    depositAmount: 20526,
    depositPct: 0.3,
    sectionCount: 3,
    projectId: "job_oak_ridge",
    customerName: "Chen Family Trust",
    updatedAt: "2026-08-01T18:00:00.000Z",
  },
  {
    id: "prop_002",
    number: "BQ-2026-0138",
    title: "Cedar Park — Full Package",
    status: "VIEWED",
    grandTotal: 142880,
    depositAmount: 42864,
    depositPct: 0.3,
    sectionCount: 5,
    projectId: "job_cedar_park",
    customerName: "Vista Spec LLC",
    updatedAt: "2026-07-29T12:30:00.000Z",
  },
  {
    id: "prop_003",
    number: "BQ-2026-0121",
    title: "Lake House — Cabinetry Deposit",
    status: "DRAFT",
    grandTotal: 31200,
    depositAmount: 9360,
    depositPct: 0.3,
    sectionCount: 2,
    projectId: "job_lake_house",
    customerName: "Patel Residence",
    updatedAt: "2026-07-22T08:15:00.000Z",
  },
  {
    id: "prop_004",
    number: "BQ-2026-0110",
    title: "Oak Ridge — Doors & Hardware",
    status: "ACCEPTED",
    grandTotal: 24890,
    depositAmount: 7467,
    depositPct: 0.3,
    sectionCount: 2,
    projectId: "job_oak_ridge",
    customerName: "Chen Family Trust",
    updatedAt: "2026-07-10T15:40:00.000Z",
  },
];

export const MOCK_PACKAGES: ShopPackage[] = [
  {
    id: "pkg_window_std",
    slug: "standard-window-package",
    category: "Windows",
    name: "Standard Window Package",
    description: "Clad wood windows sized for production residential.",
    contents: ["Andersen 100 Series", "Flashing kit", "Interior casings"],
    unitPrice: 12400,
    leadDays: 21,
    spruceSku: "SM-WIN-STD",
  },
  {
    id: "pkg_door_entry",
    slug: "entry-door-system",
    category: "Doors",
    name: "Entry Door System",
    description: "Fiberglass entry with sidelights and hardware.",
    contents: ["Therma-Tru Pulse", "Schlage Encode", "Threshold set"],
    unitPrice: 3850,
    leadDays: 14,
    spruceSku: "SM-DOOR-ENT",
  },
  {
    id: "pkg_lumber_framing",
    slug: "framing-lumber-bundle",
    category: "Lumber",
    name: "Framing Lumber Bundle",
    description: "Dimensional lumber package for mid-size residential.",
    contents: ["2x4 / 2x6 SPF", "LVL headers", "OSB sheathing"],
    unitPrice: 18600,
    leadDays: 5,
    spruceSku: "SM-LUM-FRM",
  },
  {
    id: "pkg_cabinetry_kitchen",
    slug: "kitchen-cabinetry-mid",
    category: "Cabinetry",
    name: "Kitchen Cabinetry Mid-Line",
    description: "Shaker doors, soft-close, quartz-ready boxes.",
    contents: ["Base & wall cabinets", "Soft-close hardware", "Toe kicks"],
    unitPrice: 22400,
    leadDays: 28,
    spruceSku: "SM-CAB-KIT",
  },
  {
    id: "pkg_millwork_trim",
    slug: "interior-millwork-trim",
    category: "Millwork",
    name: "Interior Millwork Trim",
    description: "Base, casing, and crown for 3,000 sf.",
    contents: ["Base 5-1/4\"", "Casing 3-1/2\"", "Crown 4-5/8\""],
    unitPrice: 6200,
    leadDays: 10,
    spruceSku: "SM-MIL-TRIM",
  },
  {
    id: "pkg_truss_std",
    slug: "roof-truss-set",
    category: "Trusses",
    name: "Roof Truss Set",
    description: "Engineered truss package with bracing schedule.",
    contents: ["Common trusses", "Gable ends", "Hardware kit"],
    unitPrice: 9800,
    leadDays: 18,
    spruceSku: "SM-TRS-STD",
  },
];

export const MOCK_TAKEOFF = [
  { trade: "Framing", name: "2x6 SPF Stud", qty: 420, unit: "ea", unitCost: 8.4 },
  { trade: "Framing", name: "LVL 1.75x11.875", qty: 48, unit: "lf", unitCost: 12.2 },
  { trade: "Windows", name: "Clad DH 36x60", qty: 18, unit: "ea", unitCost: 620 },
  { trade: "Doors", name: "Interior 3068 hollow", qty: 14, unit: "ea", unitCost: 185 },
  { trade: "Millwork", name: "Base 5-1/4 primed", qty: 860, unit: "lf", unitCost: 2.15 },
];

export type MockOrderStep =
  | "placed"
  | "pulled"
  | "staged"
  | "out"
  | "delivered";

export type MockOrderLine = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type MockOrder = {
  id: string;
  orderNumber: string;
  projectName: string;
  status: MockOrderStep;
  /** Index into TRACK_STEPS (0–4) for the current active step */
  activeStep: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  items: MockOrderLine[];
};

export const TRACK_STEPS = [
  { key: "placed" as const, label: "Order placed" },
  { key: "pulled" as const, label: "Yard pull" },
  { key: "staged" as const, label: "Staged" },
  { key: "out" as const, label: "Out for delivery" },
  { key: "delivered" as const, label: "Delivered" },
];

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "ord_8841",
    orderNumber: "BQ-ORD-8841",
    projectName: "Oak Ridge Residence",
    status: "staged",
    activeStep: 2,
    subtotal: 16250,
    tax: 1056,
    total: 17306,
    createdAt: "2026-08-01T10:00:00.000Z",
    items: [
      {
        id: "oli_1",
        name: "Standard Window Package",
        category: "Windows",
        quantity: 1,
        unitPrice: 12400,
        lineTotal: 12400,
      },
      {
        id: "oli_2",
        name: "Entry Door System",
        category: "Doors",
        quantity: 1,
        unitPrice: 3850,
        lineTotal: 3850,
      },
    ],
  },
  {
    id: "ord_8790",
    orderNumber: "BQ-ORD-8790",
    projectName: "Cedar Park Spec",
    status: "out",
    activeStep: 3,
    subtotal: 18600,
    tax: 1209,
    total: 19809,
    createdAt: "2026-07-28T14:30:00.000Z",
    items: [
      {
        id: "oli_3",
        name: "Framing Lumber Bundle",
        category: "Lumber",
        quantity: 1,
        unitPrice: 18600,
        lineTotal: 18600,
      },
    ],
  },
];

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function projectStatusTone(
  status: ProjectSummary["status"]
): "draft" | "progress" | "success" | "danger" {
  switch (status) {
    case "ANALYZING":
    case "BIDDING":
      return "progress";
    case "ESTIMATED":
    case "SYNCED":
      return "success";
    case "ARCHIVED":
      return "danger";
    default:
      return "draft";
  }
}

export function proposalStatusTone(
  status: ProposalSummary["status"]
): "draft" | "progress" | "success" | "danger" {
  switch (status) {
    case "SENT":
    case "VIEWED":
      return "progress";
    case "ACCEPTED":
      return "success";
    case "DECLINED":
    case "EXPIRED":
      return "danger";
    default:
      return "draft";
  }
}

export type MockBlueprint = {
  id: string;
  name: string;
  sheets: number;
  uploadedAt: string;
  mimeType?: string;
  sizeBytes?: number;
};

/** Seed drawings per job for offline demo. */
export const MOCK_BLUEPRINTS: Record<string, MockBlueprint[]> = {
  job_oak_ridge: [
    {
      id: "bp_oak_arch",
      name: "Architectural Set A.pdf",
      sheets: 8,
      uploadedAt: "2026-07-20",
      mimeType: "application/pdf",
      sizeBytes: 24_500_000,
    },
    {
      id: "bp_oak_struct",
      name: "Structural Framing.pdf",
      sheets: 4,
      uploadedAt: "2026-07-22",
      mimeType: "application/pdf",
      sizeBytes: 12_200_000,
    },
  ],
  job_lake_house: [
    {
      id: "bp_lake_1",
      name: "Remodel Plans.pdf",
      sheets: 6,
      uploadedAt: "2026-07-28",
      mimeType: "application/pdf",
      sizeBytes: 18_000_000,
    },
  ],
  job_cedar_park: [
    {
      id: "bp_cedar_1",
      name: "Spec House Set.pdf",
      sheets: 9,
      uploadedAt: "2026-07-15",
      mimeType: "application/pdf",
      sizeBytes: 31_000_000,
    },
  ],
  job_mueller: [],
};

