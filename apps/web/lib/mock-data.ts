import type { ProjectSummary, ProposalSummary, ShopPackage, UserSession } from "@buildiq/types";

export const mockSession: UserSession = {
  id: "user_demo",
  email: "alex@ridgelinebuilders.com",
  name: "Alex Rivera",
  companyId: "co_ridge",
  companyName: "Ridgeline Builders",
  role: "PROJECT_MANAGER",
};

export const mockJobs: ProjectSummary[] = [
  {
    id: "job_cedar",
    name: "Cedar Grove Residence",
    address: "1847 Mill Creek Rd",
    city: "Bend",
    state: "OR",
    zip: "97701",
    squareFeet: 4200,
    stories: 2,
    status: "ESTIMATED",
    estimateGrandTotal: 487250,
    blueprintCount: 12,
    materialCount: 186,
    bidCount: 4,
    updatedAt: "2026-08-02T18:20:00.000Z",
  },
  {
    id: "job_harbor",
    name: "Harbor View Townhomes",
    address: "55 Wharf St",
    city: "Astoria",
    state: "OR",
    zip: "97103",
    squareFeet: 9800,
    stories: 3,
    status: "ANALYZING",
    estimateGrandTotal: 1124000,
    blueprintCount: 28,
    materialCount: 0,
    bidCount: 0,
    updatedAt: "2026-08-03T09:10:00.000Z",
  },
  {
    id: "job_pine",
    name: "Pinecrest Kitchen Remodel",
    address: "902 Pinecrest Ave",
    city: "Lake Oswego",
    state: "OR",
    zip: "97034",
    squareFeet: 680,
    stories: 1,
    status: "BIDDING",
    estimateGrandTotal: 64200,
    blueprintCount: 4,
    materialCount: 42,
    bidCount: 3,
    updatedAt: "2026-07-28T14:00:00.000Z",
  },
  {
    id: "job_draft",
    name: "West End Spec — Lot 12",
    address: null,
    city: "Hillsboro",
    state: "OR",
    zip: "97124",
    squareFeet: null,
    stories: 2,
    status: "DRAFT",
    estimateGrandTotal: null,
    blueprintCount: 0,
    materialCount: 0,
    bidCount: 0,
    updatedAt: "2026-08-01T11:30:00.000Z",
  },
];

export interface MockTakeoffLine {
  id: string;
  trade: string;
  item: string;
  qty: number;
  unit: string;
  unitCost: number;
  total: number;
}

export interface MockBlueprint {
  id: string;
  name: string;
  sheets: number;
  uploadedAt: string;
}

export interface MockJobDetail {
  project: ProjectSummary;
  blueprints: MockBlueprint[];
  estimate: {
    materialCost: number;
    laborCost: number;
    contingency: number;
    overhead: number;
    profit: number;
    tax: number;
    grandTotal: number;
  };
  takeoff: MockTakeoffLine[];
  bids: { id: string; vendor: string; amount: number; status: string }[];
}

export const mockJobDetails: Record<string, MockJobDetail> = {
  job_cedar: {
    project: mockJobs[0],
    blueprints: [
      { id: "bp1", name: "Architectural Set A", sheets: 8, uploadedAt: "2026-07-20" },
      { id: "bp2", name: "Structural Framing", sheets: 4, uploadedAt: "2026-07-22" },
    ],
    estimate: {
      materialCost: 218400,
      laborCost: 164800,
      contingency: 19160,
      overhead: 30640,
      profit: 38320,
      tax: 15930,
      grandTotal: 487250,
    },
    takeoff: [
      { id: "t1", trade: "Lumber", item: '2x6 SPF Stud 9\'', qty: 420, unit: "ea", unitCost: 8.4, total: 3528 },
      { id: "t2", trade: "Lumber", item: '2x10 DF Joist 16\'', qty: 86, unit: "ea", unitCost: 42.5, total: 3655 },
      { id: "t3", trade: "Sheathing", item: '7/16" OSB 4x8', qty: 210, unit: "sht", unitCost: 28.9, total: 6069 },
      { id: "t4", trade: "Windows", item: "Andersen 400 Series DH", qty: 18, unit: "ea", unitCost: 640, total: 11520 },
      { id: "t5", trade: "Doors", item: "Therma-Tru Entry 36\"", qty: 2, unit: "ea", unitCost: 1280, total: 2560 },
      { id: "t6", trade: "Millwork", item: "Custom Mantel — White Oak", qty: 1, unit: "ea", unitCost: 2400, total: 2400 },
    ],
    bids: [
      { id: "b1", vendor: "Cascade Framing Co", amount: 148200, status: "Received" },
      { id: "b2", vendor: "Northwest Millwork", amount: 39200, status: "Received" },
      { id: "b3", vendor: "Valley Electric", amount: 58400, status: "Pending" },
      { id: "b4", vendor: "Willamette Plumbing", amount: 41200, status: "Received" },
    ],
  },
};

export const mockProposals: ProposalSummary[] = [
  {
    id: "prop_cg_01",
    number: "P-1042",
    title: "Cedar Grove — Windows & Millwork",
    status: "SENT",
    grandTotal: 86400,
    depositAmount: 25920,
    depositPct: 30,
    sectionCount: 3,
    projectId: "job_cedar",
    customerName: "Chen Family Trust",
    updatedAt: "2026-08-01T16:00:00.000Z",
  },
  {
    id: "prop_pc_01",
    number: "P-1038",
    title: "Pinecrest Cabinetry Package",
    status: "ACCEPTED",
    grandTotal: 48200,
    depositAmount: 14460,
    depositPct: 30,
    sectionCount: 2,
    projectId: "job_pine",
    customerName: "M. Okonkwo",
    updatedAt: "2026-07-25T10:00:00.000Z",
  },
  {
    id: "prop_draft",
    number: "P-1045",
    title: "Harbor View — Phase 1 Materials",
    status: "DRAFT",
    grandTotal: 214800,
    depositAmount: 64440,
    depositPct: 30,
    sectionCount: 4,
    projectId: "job_harbor",
    customerName: "Harbor Dev LLC",
    updatedAt: "2026-08-03T08:00:00.000Z",
  },
];

export interface MockProposalLine {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface MockProposalDetail {
  summary: ProposalSummary;
  sections: { category: string; lines: MockProposalLine[] }[];
  acceptedAt?: string;
}

export const mockProposalDetails: Record<string, MockProposalDetail> = {
  prop_cg_01: {
    summary: mockProposals[0],
    sections: [
      {
        category: "Windows",
        lines: [
          { description: "Andersen 400 Series DH 30x60", qty: 12, unit: "ea", unitPrice: 640, total: 7680 },
          { description: "Andersen 400 Series Picture 48x48", qty: 4, unit: "ea", unitPrice: 890, total: 3560 },
        ],
      },
      {
        category: "Millwork",
        lines: [
          { description: "Custom mantel — white oak", qty: 1, unit: "ea", unitPrice: 2400, total: 2400 },
          { description: "Baseboard — paint-grade MDF 5-1/4\"", qty: 420, unit: "lf", unitPrice: 4.2, total: 1764 },
        ],
      },
      {
        category: "Doors",
        lines: [
          { description: "Interior slab — solid core 6-panel", qty: 14, unit: "ea", unitPrice: 285, total: 3990 },
        ],
      },
    ],
  },
  prop_pc_01: {
    summary: mockProposals[1],
    sections: [
      {
        category: "Cabinetry",
        lines: [
          { description: "Shaker door base cabinets — white oak", qty: 18, unit: "lf", unitPrice: 680, total: 12240 },
          { description: "Wall cabinets — white oak", qty: 14, unit: "lf", unitPrice: 520, total: 7280 },
          { description: "Island — waterfall edge quartz top", qty: 1, unit: "ea", unitPrice: 6400, total: 6400 },
        ],
      },
    ],
    acceptedAt: "2026-07-26T15:30:00.000Z",
  },
};

export const mockShopPackages: ShopPackage[] = [
  {
    id: "pkg_framing",
    slug: "framing-essentials",
    category: "Lumber",
    name: "Framing Essentials",
    description: "Studs, plates, and sheathing for a mid-size residential shell.",
    contents: ["2x4 / 2x6 SPF stud packs", "DF joists & beams", "OSB sheathing", "Hardware kit"],
    unitPrice: 18400,
    leadDays: 5,
    spruceSku: "SM-FRM-01",
  },
  {
    id: "pkg_window",
    slug: "window-package-a",
    category: "Windows",
    name: "Window Package A",
    description: "Andersen 400 series mix for 18 openings.",
    contents: ["12 double-hung", "4 picture", "2 casement", "Nailing fins & flashing"],
    unitPrice: 14800,
    leadDays: 14,
    spruceSku: "SM-WIN-A",
  },
  {
    id: "pkg_cab",
    slug: "kitchen-shaker-oak",
    category: "Cabinetry",
    name: "Kitchen Shaker Oak",
    description: "Full kitchen run with island — millwork studio grade.",
    contents: ["Base & wall cabinets", "Island carcass", "Soft-close hardware", "Toe kicks & fillers"],
    unitPrice: 28600,
    leadDays: 21,
    spruceSku: "SM-CAB-SO",
  },
  {
    id: "pkg_mill",
    slug: "interior-trim-kit",
    category: "Millwork",
    name: "Interior Trim Kit",
    description: "Base, casing, and chair rail for 3,200 sf.",
    contents: ["5-1/4\" baseboard", "3-1/2\" casing", "Chair rail", "Corner blocks"],
    unitPrice: 4200,
    leadDays: 7,
    spruceSku: "SM-MIL-IT",
  },
];

export interface MockOrder {
  id: string;
  number: string;
  status: "Placed" | "Picking" | "In transit" | "Delivered";
  projectName: string;
  total: number;
  placedAt: string;
  items: { name: string; qty: number; price: number }[];
  steps: { label: string; done: boolean; active: boolean; at?: string }[];
}

export const mockOrders: MockOrder[] = [
  {
    id: "ord_1",
    number: "SO-8821",
    status: "In transit",
    projectName: "Cedar Grove Residence",
    total: 18400,
    placedAt: "2026-07-30",
    items: [
      { name: "Framing Essentials", qty: 1, price: 18400 },
    ],
    steps: [
      { label: "Order placed", done: true, active: false, at: "Jul 30" },
      { label: "Yard picking", done: true, active: false, at: "Jul 31" },
      { label: "In transit", done: false, active: true, at: "Aug 2" },
      { label: "Delivered to site", done: false, active: false },
    ],
  },
  {
    id: "ord_2",
    number: "SO-8790",
    status: "Delivered",
    projectName: "Pinecrest Kitchen Remodel",
    total: 28600,
    placedAt: "2026-07-18",
    items: [
      { name: "Kitchen Shaker Oak", qty: 1, price: 28600 },
    ],
    steps: [
      { label: "Order placed", done: true, active: false, at: "Jul 18" },
      { label: "Yard picking", done: true, active: false, at: "Jul 20" },
      { label: "In transit", done: true, active: false, at: "Jul 22" },
      { label: "Delivered to site", done: true, active: false, at: "Jul 24" },
    ],
  },
];

export interface MockCabinetryOpp {
  id: string;
  projectName: string;
  productLine: string;
  stage: string;
  value: number;
  designer: string;
  updatedAt: string;
}

export const mockCabinetryOpps: MockCabinetryOpp[] = [
  {
    id: "cab_1",
    projectName: "Pinecrest Kitchen Remodel",
    productLine: "Shaker Oak — Studio",
    stage: "Proposal accepted",
    value: 48200,
    designer: "S. Park",
    updatedAt: "2026-07-26",
  },
  {
    id: "cab_2",
    projectName: "Cedar Grove Residence",
    productLine: "Paint-grade inset",
    stage: "Measure scheduled",
    value: 31800,
    designer: "S. Park",
    updatedAt: "2026-08-01",
  },
  {
    id: "cab_3",
    projectName: "Harbor View Townhomes — Unit A",
    productLine: "Flat-panel walnut",
    stage: "Lead",
    value: 52000,
    designer: "J. Morales",
    updatedAt: "2026-08-03",
  },
];

export const shopCategories = [
  "All",
  "Lumber",
  "Windows",
  "Doors",
  "Trusses",
  "Cabinetry",
  "Hardware",
  "Masonry Stone",
  "Millwork",
] as const;
