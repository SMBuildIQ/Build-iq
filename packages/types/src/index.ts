/** Shared domain types for BuildIQ API · mobile · web */

export type Role =
  | "OWNER"
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "SUPERINTENDENT"
  | "ESTIMATOR"
  | "PURCHASING"
  | "ACCOUNTANT"
  | "DESIGNER"
  | "SALES"
  | "SUBCONTRACTOR"
  | "SUPPLIER"
  | "HOMEOWNER"
  | "VIEWER";

export type ProjectStatus =
  | "DRAFT"
  | "ANALYZING"
  | "ESTIMATED"
  | "BIDDING"
  | "SYNCED"
  | "ARCHIVED";

export type ProposalStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "SUPERSEDED";

export type ProposalCategory =
  | "Windows"
  | "Doors"
  | "Lumber"
  | "Trusses"
  | "Cabinetry"
  | "Masonry Stone"
  | "Door Hardware"
  | "Millwork"
  | "Other";

export interface Company {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName?: string | null;
  role: Role;
}

export interface ProjectSummary {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  squareFeet?: number | null;
  stories: number;
  status: ProjectStatus;
  estimateGrandTotal?: number | null;
  blueprintCount: number;
  materialCount: number;
  bidCount: number;
  updatedAt: string;
}

export interface MaterialLine {
  id: string;
  category: string;
  trade: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unitCost: number;
  laborHours: number;
  laborRate: number;
  wasteFactor: number;
  spruceSku?: string | null;
  confidence?: number | null;
}

export interface EstimateTotals {
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
  version: number;
}

export interface ProposalSummary {
  id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  grandTotal: number;
  depositAmount: number;
  depositPct: number;
  sectionCount: number;
  projectId?: string | null;
  customerName?: string | null;
  updatedAt: string;
}

export interface ShopPackage {
  id: string;
  slug: string;
  category: ProposalCategory | string;
  name: string;
  description: string;
  contents: string[];
  unitPrice: number;
  leadDays: number;
  spruceSku?: string | null;
}
