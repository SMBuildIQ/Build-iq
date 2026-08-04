import type { ProjectSummary, ProposalSummary, ShopPackage, UserSession } from "@buildiq/types";
import { apiFetch, ApiError } from "./api";
import {
  mockCabinetryOpps,
  mockJobDetails,
  mockJobs,
  mockOrders,
  mockProposalDetails,
  mockProposals,
  mockSession,
  mockShopPackages,
  type MockCabinetryOpp,
  type MockJobDetail,
  type MockOrder,
} from "./mock-data";

export type DataResult<T> = {
  data: T;
  demo: boolean;
};

/** Read bq_token from a cookie header string or Next cookies().get value. */
export function tokenFromCookieHeader(cookieHeader?: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  // Plain token value (from cookies().get("bq_token")?.value)
  if (!cookieHeader.includes("=") && !cookieHeader.includes(";")) {
    return cookieHeader || undefined;
  }
  const match = cookieHeader.match(/(?:^|;\s*)bq_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function tryApi<T>(
  path: string,
  token?: string,
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { token, cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError || err instanceof TypeError || err instanceof Error) {
      return null;
    }
    return null;
  }
}

export async function fetchJobs(token?: string): Promise<DataResult<ProjectSummary[]>> {
  const res = await tryApi<{ projects: ProjectSummary[] }>("/projects", token);
  if (res?.projects) return { data: res.projects, demo: false };
  return { data: mockJobs, demo: true };
}

export async function fetchJobDetail(
  id: string,
  token?: string,
): Promise<DataResult<MockJobDetail | null>> {
  const res = await tryApi<{
    project: {
      id: string;
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      squareFeet?: number | null;
      stories: number;
      status: ProjectSummary["status"];
      updatedAt: string;
      blueprints?: {
        id: string;
        originalName?: string;
        filename?: string;
        pageCount?: number;
        createdAt?: string;
      }[];
      materials?: {
        id: string;
        trade: string;
        name: string;
        quantity: number;
        unit: string;
        unitCost: number;
      }[];
      estimate?: {
        materialCost: number;
        laborCost: number;
        contingencyCost: number;
        overheadCost: number;
        profitAmount: number;
        taxAmount: number;
        grandTotal: number;
      } | null;
    };
  }>(`/projects/${id}`, token);

  if (res?.project) {
    const p = res.project;
    const estimate = p.estimate
      ? {
          materialCost: p.estimate.materialCost,
          laborCost: p.estimate.laborCost,
          contingency: p.estimate.contingencyCost,
          overhead: p.estimate.overheadCost,
          profit: p.estimate.profitAmount,
          tax: p.estimate.taxAmount,
          grandTotal: p.estimate.grandTotal,
        }
      : {
          materialCost: 0,
          laborCost: 0,
          contingency: 0,
          overhead: 0,
          profit: 0,
          tax: 0,
          grandTotal: 0,
        };

    return {
      demo: false,
      data: {
        project: {
          id: p.id,
          name: p.name,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          squareFeet: p.squareFeet,
          stories: p.stories,
          status: p.status,
          estimateGrandTotal: p.estimate?.grandTotal ?? null,
          blueprintCount: p.blueprints?.length ?? 0,
          materialCount: p.materials?.length ?? 0,
          bidCount: 0,
          updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : String(p.updatedAt),
        },
        blueprints: (p.blueprints ?? []).map((bp) => ({
          id: bp.id,
          name: bp.originalName ?? bp.filename ?? "Blueprint",
          sheets: bp.pageCount ?? 1,
          uploadedAt: bp.createdAt?.slice(0, 10) ?? "",
        })),
        estimate,
        takeoff: (p.materials ?? []).map((m) => ({
          id: m.id,
          trade: m.trade,
          item: m.name,
          qty: m.quantity,
          unit: m.unit,
          unitCost: m.unitCost,
          total: Math.round(m.quantity * m.unitCost * 100) / 100,
        })),
        bids: [],
      },
    };
  }

  const mock =
    mockJobDetails[id] ??
    (mockJobs.find((j) => j.id === id)
      ? {
          project: mockJobs.find((j) => j.id === id)!,
          blueprints: [] as MockJobDetail["blueprints"],
          estimate: {
            materialCost: 0,
            laborCost: 0,
            contingency: 0,
            overhead: 0,
            profit: 0,
            tax: 0,
            grandTotal: mockJobs.find((j) => j.id === id)!.estimateGrandTotal ?? 0,
          },
          takeoff: [] as MockJobDetail["takeoff"],
          bids: [] as MockJobDetail["bids"],
        }
      : null);

  return { data: mock, demo: true };
}

export async function fetchProposals(token?: string): Promise<DataResult<ProposalSummary[]>> {
  const res = await tryApi<{ proposals: ProposalSummary[] }>("/proposals", token);
  if (res?.proposals) return { data: res.proposals, demo: false };
  return { data: mockProposals, demo: true };
}

export async function fetchProposalDetail(
  id: string,
  token?: string,
): Promise<
  DataResult<{
    summary: ProposalSummary;
    sections: { category: string; lines: { description: string; qty: number; unit: string; unitPrice: number; total: number }[] }[];
    acceptedAt?: string;
  } | null>
> {
  const res = await tryApi<{
    proposal: {
      id: string;
      number: string;
      title: string;
      status: ProposalSummary["status"];
      grandTotal: number;
      depositAmount: number;
      depositPct: number;
      projectId?: string | null;
      customerName?: string | null;
      updatedAt: string;
      acceptedAt?: string | null;
      sections?: {
        title: string;
        category: string;
        lines: {
          name: string;
          description?: string | null;
          quantity: number;
          unit: string;
          unitPrice: number;
          lineTotal: number;
        }[];
      }[];
      acceptance?: { createdAt: string } | null;
    };
  }>(`/proposals/${id}`, token);

  if (res?.proposal) {
    const p = res.proposal;
    return {
      demo: false,
      data: {
        summary: {
          id: p.id,
          number: p.number,
          title: p.title,
          status: p.status,
          grandTotal: p.grandTotal,
          depositAmount: p.depositAmount,
          depositPct: p.depositPct,
          sectionCount: p.sections?.length ?? 0,
          projectId: p.projectId,
          customerName: p.customerName,
          updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : String(p.updatedAt),
        },
        sections: (p.sections ?? []).map((s) => ({
          category: s.title || s.category,
          lines: s.lines.map((l) => ({
            description: l.description || l.name,
            qty: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            total: l.lineTotal,
          })),
        })),
        acceptedAt: p.acceptedAt ?? p.acceptance?.createdAt ?? undefined,
      },
    };
  }

  const mock =
    mockProposalDetails[id] ??
    (mockProposals.find((p) => p.id === id)
      ? { summary: mockProposals.find((p) => p.id === id)!, sections: [] }
      : null);

  return { data: mock, demo: true };
}

export async function fetchShopPackages(token?: string): Promise<DataResult<ShopPackage[]>> {
  const res = await tryApi<{ packages: ShopPackage[] }>("/shop/packages", token);
  if (res?.packages) return { data: res.packages, demo: false };
  return { data: mockShopPackages, demo: true };
}

export type OrderTimelineStep = {
  key: string;
  label: string;
  at?: string;
  active: boolean;
};

export type OrderView = {
  id: string;
  number: string;
  status: string;
  projectName: string;
  total: number;
  placedAt: string;
  items: { name: string; qty: number; price: number }[];
  timeline: OrderTimelineStep[];
};

function mockOrderToView(order: MockOrder): OrderView {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    projectName: order.projectName,
    total: order.total,
    placedAt: order.placedAt,
    items: order.items,
    timeline: order.steps.map((s, idx) => ({
      key: `step_${idx}`,
      label: s.label,
      at: s.at,
      active: s.active,
    })),
  };
}

export async function fetchOrders(token?: string): Promise<DataResult<OrderView[]>> {
  const res = await tryApi<{
    orders: {
      id: string;
      orderNumber: string;
      status: string;
      total: number;
      createdAt: string;
      projectId?: string | null;
      items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
      timeline: OrderTimelineStep[];
    }[];
  }>("/orders", token);

  if (res?.orders) {
    return {
      demo: false,
      data: res.orders.map((o) => ({
        id: o.id,
        number: o.orderNumber,
        status: o.status,
        projectName: o.projectId ? `Project ${o.projectId.slice(0, 8)}` : "Yard order",
        total: o.total,
        placedAt: o.createdAt.slice(0, 10),
        items: o.items.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: i.unitPrice,
        })),
        timeline: o.timeline,
      })),
    };
  }

  return { data: mockOrders.map(mockOrderToView), demo: true };
}

export async function fetchCabinetry(
  token?: string,
): Promise<DataResult<MockCabinetryOpp[]>> {
  const res = await tryApi<{
    opportunities: {
      id: string;
      stage: string;
      designerName?: string | null;
      projectAddress?: string | null;
      project?: { name?: string } | null;
      updatedAt: string;
    }[];
  }>("/cabinetry/opportunities", token);

  if (res?.opportunities) {
    return {
      demo: false,
      data: res.opportunities.map((o) => ({
        id: o.id,
        projectName: o.project?.name ?? o.projectAddress ?? "Opportunity",
        productLine: "—",
        stage: o.stage.replace(/_/g, " "),
        value: 0,
        designer: o.designerName ?? "—",
        updatedAt: o.updatedAt.slice(0, 10),
      })),
    };
  }

  return { data: mockCabinetryOpps, demo: true };
}

export async function fetchSession(token?: string): Promise<DataResult<UserSession>> {
  const res = await tryApi<{ user: UserSession }>("/auth/me", token);
  if (res?.user) return { data: res.user, demo: false };
  return { data: mockSession, demo: true };
}
