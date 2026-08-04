import type {
  ProjectSummary,
  ProposalSummary,
  ShopPackage,
  UserSession,
} from "@buildiq/types";
import { apiFetch } from "./client";

export type CartApiLine = {
  id?: string;
  packageId: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  projectId?: string | null;
};

export type CartApiResponse = {
  cart: {
    id: string;
    items: CartApiLine[];
    subtotal: number;
    tax: number;
    total: number;
  };
};

export type OrderLine = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  packageId?: string | null;
};

export type OrderStatusStep =
  | "placed"
  | "pulled"
  | "staged"
  | "out"
  | "delivered";

export type OrderSummary = {
  id: string;
  orderNumber: string;
  projectName?: string | null;
  status: OrderStatusStep;
  activeStep: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  items: OrderLine[];
};

/** Try API; return null on network/HTTP failure so callers can fall back to mocks. */
async function tryApi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: UserSession } | null> {
  return tryApi(() =>
    apiFetch<{ token: string; user: UserSession }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    })
  );
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}): Promise<{ token: string; user: UserSession } | null> {
  return tryApi(() =>
    apiFetch<{ token: string; user: UserSession }>("/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    })
  );
}

export async function listProjects(): Promise<ProjectSummary[] | null> {
  const res = await tryApi(() =>
    apiFetch<{ projects: ProjectSummary[] }>("/projects")
  );
  return res?.projects ?? null;
}

export async function createProject(input: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  stories?: number;
}): Promise<ProjectSummary | null> {
  const res = await tryApi(() =>
    apiFetch<{ project: ProjectSummary }>("/projects", {
      method: "POST",
      body: input,
    })
  );
  return res?.project ?? null;
}

export async function getProject(id: string): Promise<ProjectSummary | null> {
  const res = await tryApi(() =>
    apiFetch<{ project: ProjectSummary }>(`/projects/${id}`)
  );
  return res?.project ?? null;
}

export async function orchestrateProject(
  id: string
): Promise<{ runId?: string; status?: string; stub?: boolean } | null> {
  return tryApi(() =>
    apiFetch<{ runId?: string; status?: string; stub?: boolean }>(
      `/projects/${id}/orchestrate`,
      { method: "POST" }
    )
  );
}

export async function getProjectEstimate(
  id: string
): Promise<{ grandTotal?: number; materialCost?: number; laborCost?: number } | null> {
  const res = await tryApi(() =>
    apiFetch<{ estimate: { grandTotal?: number; materialCost?: number; laborCost?: number } }>(
      `/projects/${id}/estimate`
    )
  );
  return res?.estimate ?? null;
}

export type BlueprintSummary = {
  id: string;
  name: string;
  sheets: number;
  uploadedAt: string;
  mimeType?: string;
  sizeBytes?: number;
};

export async function listBlueprints(projectId: string): Promise<BlueprintSummary[] | null> {
  const res = await tryApi(() =>
    apiFetch<{
      project?: {
        blueprints?: Array<{
          id: string;
          originalName?: string;
          filename?: string;
          mimeType?: string;
          sizeBytes?: number;
          createdAt?: string;
          pageCount?: number | null;
        }>;
      };
      blueprints?: BlueprintSummary[];
    }>(`/projects/${projectId}`)
  );
  if (!res) return null;
  if (res.blueprints) return res.blueprints;
  const list = res.project?.blueprints;
  if (!list) return [];
  return list.map((bp) => ({
    id: bp.id,
    name: bp.originalName ?? bp.filename ?? "Drawing set",
    sheets: bp.pageCount ?? 1,
    uploadedAt: bp.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    mimeType: bp.mimeType,
    sizeBytes: bp.sizeBytes,
  }));
}

export async function uploadBlueprint(
  projectId: string,
  input: { filename: string; contentType: string; size?: number }
): Promise<{ id: string; name: string } | null> {
  const res = await tryApi(() =>
    apiFetch<{
      blueprint: {
        id: string;
        originalName?: string;
        filename?: string;
      };
    }>(`/projects/${projectId}/blueprints`, {
      method: "POST",
      body: input,
    })
  );
  if (!res?.blueprint) return null;
  return {
    id: res.blueprint.id,
    name: res.blueprint.originalName ?? res.blueprint.filename ?? input.filename,
  };
}

export async function listProjectMaterials(
  projectId: string
): Promise<{ categories: string[]; materials: import("@buildiq/types").ProjectLibraryItem[] } | null> {
  return tryApi(() =>
    apiFetch<{ categories: string[]; materials: import("@buildiq/types").ProjectLibraryItem[] }>(
      `/projects/${projectId}/materials`
    )
  );
}

export async function addProjectMaterial(
  projectId: string,
  input: {
    category: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    description?: string | null;
    spruceSku?: string | null;
    source?: "catalog" | "order" | "takeoff" | "manual" | "ai";
    catalogId?: string;
  }
): Promise<import("@buildiq/types").ProjectLibraryItem | null> {
  const res = await tryApi(() =>
    apiFetch<{ material: {
      id: string;
      projectId: string;
      category: string;
      name: string;
      description?: string | null;
      quantity: number;
      unit: string;
      unitCost: number;
      spruceSku?: string | null;
      source: string;
    } }>(`/projects/${projectId}/materials`, {
      method: "POST",
      body: input,
    })
  );
  if (!res?.material) return null;
  return {
    ...res.material,
    source: (res.material.source as "catalog" | "order" | "takeoff" | "manual" | "ai") || "manual",
    updatedAt: new Date().toISOString(),
  };
}

export async function listMaterialCatalog(): Promise<{
  categories: string[];
  items: import("@buildiq/types").MaterialCatalogItem[];
} | null> {
  return tryApi(() =>
    apiFetch<{ categories: string[]; items: import("@buildiq/types").MaterialCatalogItem[] }>(
      "/materials/catalog"
    )
  );
}

export async function listProposals(): Promise<ProposalSummary[] | null> {
  const res = await tryApi(() =>
    apiFetch<{ proposals: ProposalSummary[] }>("/proposals")
  );
  return res?.proposals ?? null;
}

export async function listPackages(): Promise<ShopPackage[] | null> {
  const res = await tryApi(() =>
    apiFetch<{ packages: ShopPackage[] }>("/shop/packages")
  );
  return res?.packages ?? null;
}

export async function getCart(): Promise<CartApiResponse["cart"] | null> {
  const res = await tryApi(() => apiFetch<CartApiResponse>("/cart"));
  return res?.cart ?? null;
}

export async function addToCart(input: {
  packageId: string;
  quantity?: number;
  projectId?: string | null;
}): Promise<CartApiResponse["cart"] | null> {
  const res = await tryApi(() =>
    apiFetch<CartApiResponse>("/cart", {
      method: "POST",
      body: {
        packageId: input.packageId,
        quantity: input.quantity ?? 1,
        projectId: input.projectId ?? null,
      },
    })
  );
  return res?.cart ?? null;
}

export async function checkout(body: {
  paymentMethod?: string;
} = {}): Promise<{ order?: unknown; message?: string } | null> {
  return tryApi(() =>
    apiFetch<{ order?: unknown; message?: string }>("/checkout", {
      method: "POST",
      body,
    })
  );
}

export async function listOrders(): Promise<OrderSummary[] | null> {
  const res = await tryApi(() =>
    apiFetch<{
      orders: Array<{
        id: string;
        number?: string;
        orderNumber?: string;
        status: string;
        subtotal?: number;
        tax?: number;
        taxAmount?: number;
        total?: number;
        grandTotal?: number;
        createdAt: string;
        projectId?: string | null;
        items?: OrderLine[];
        timeline?: { key: string; label: string; active: boolean }[];
      }>;
    }>("/orders")
  );
  if (!res?.orders) return null;

  const statusMap: Record<string, OrderStatusStep> = {
    PLACED: "placed",
    CONFIRMED: "pulled",
    FULFILLING: "staged",
    SHIPPED: "out",
    DELIVERED: "delivered",
    placed: "placed",
    pulled: "pulled",
    staged: "staged",
    out: "out",
    delivered: "delivered",
  };

  return res.orders.map((o) => {
    const timelineIdx = o.timeline?.findIndex((s) => s.active) ?? -1;
    const status = statusMap[o.status] ?? "placed";
    const activeStep =
      timelineIdx >= 0
        ? timelineIdx
        : Math.max(
            0,
            ["placed", "pulled", "staged", "out", "delivered"].indexOf(status)
          );
    return {
      id: o.id,
      orderNumber: o.orderNumber ?? o.number ?? o.id.slice(0, 8).toUpperCase(),
      projectName: null,
      status,
      activeStep,
      subtotal: o.subtotal ?? 0,
      tax: o.tax ?? o.taxAmount ?? 0,
      total: o.total ?? o.grandTotal ?? 0,
      createdAt: o.createdAt,
      items: o.items ?? [],
    };
  });
}

export async function getOrder(id: string): Promise<OrderSummary | null> {
  const res = await tryApi(() =>
    apiFetch<{ order: OrderSummary }>(`/orders/${id}`)
  );
  return res?.order ?? null;
}
