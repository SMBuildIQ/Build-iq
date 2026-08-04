/**
 * Role-based access control — enforced on the server.
 * UI hiding is never sufficient; every mutating API must call requirePermission().
 */

export const ROLES = [
  "OWNER",
  "ADMIN",
  "PROJECT_MANAGER",
  "SUPERINTENDENT",
  "ESTIMATOR",
  "PURCHASING",
  "ACCOUNTANT",
  "DESIGNER",
  "SALES",
  "SUBCONTRACTOR",
  "SUPPLIER",
  "HOMEOWNER",
  "VIEWER",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "company:manage",
  "team:invite",
  "team:view",
  "project:read",
  "project:write",
  "project:delete",
  "blueprint:upload",
  "estimate:run",
  "estimate:approve",
  "bid:manage",
  "shop:browse",
  "cart:manage",
  "order:place",
  "order:view",
  "order:advance",
  "spruce:configure",
  "spruce:sync",
  "account:export",
  "account:delete",
  "settings:view",
  "module:planned:view",
  "cabinetry:view",
  "cabinetry:opportunity:write",
  "cabinetry:catalog:edit",
  "proposal:view",
  "proposal:write",
  "proposal:send",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "account:delete"),
  PROJECT_MANAGER: [
    "team:view",
    "project:read",
    "project:write",
    "blueprint:upload",
    "estimate:run",
    "estimate:approve",
    "bid:manage",
    "shop:browse",
    "cart:manage",
    "order:place",
    "order:view",
    "spruce:sync",
    "account:export",
    "settings:view",
    "module:planned:view",
    "cabinetry:view",
    "cabinetry:opportunity:write",
    "proposal:view",
    "proposal:write",
    "proposal:send",
  ],
  SUPERINTENDENT: [
    "team:view",
    "project:read",
    "project:write",
    "blueprint:upload",
    "shop:browse",
    "order:view",
    "account:export",
    "settings:view",
    "module:planned:view",
    "proposal:view",
  ],
  ESTIMATOR: [
    "team:view",
    "project:read",
    "project:write",
    "blueprint:upload",
    "estimate:run",
    "bid:manage",
    "shop:browse",
    "cart:manage",
    "order:view",
    "spruce:sync",
    "account:export",
    "settings:view",
    "module:planned:view",
    "cabinetry:view",
    "cabinetry:opportunity:write",
    "proposal:view",
    "proposal:write",
    "proposal:send",
  ],
  PURCHASING: [
    "team:view",
    "project:read",
    "shop:browse",
    "cart:manage",
    "order:place",
    "order:view",
    "order:advance",
    "spruce:sync",
    "account:export",
    "settings:view",
    "module:planned:view",
    "proposal:view",
  ],
  ACCOUNTANT: [
    "team:view",
    "project:read",
    "order:view",
    "estimate:approve",
    "account:export",
    "settings:view",
    "module:planned:view",
    "proposal:view",
  ],
  DESIGNER: [
    "team:view",
    "project:read",
    "project:write",
    "blueprint:upload",
    "account:export",
    "settings:view",
    "module:planned:view",
    "cabinetry:view",
    "cabinetry:opportunity:write",
    "proposal:view",
    "proposal:write",
  ],
  SALES: [
    "team:view",
    "project:read",
    "shop:browse",
    "order:view",
    "account:export",
    "settings:view",
    "module:planned:view",
    "cabinetry:view",
    "cabinetry:opportunity:write",
    "proposal:view",
    "proposal:write",
    "proposal:send",
  ],
  SUBCONTRACTOR: [
    "project:read",
    "bid:manage",
    "settings:view",
    "module:planned:view",
  ],
  SUPPLIER: ["order:view", "shop:browse", "settings:view", "module:planned:view"],
  HOMEOWNER: ["project:read", "settings:view", "module:planned:view", "proposal:view"],
  VIEWER: [
    "team:view",
    "project:read",
    "order:view",
    "shop:browse",
    "settings:view",
    "module:planned:view",
    "proposal:view",
  ],
};

export function normalizeRole(role: string | null | undefined): Role {
  const r = (role || "VIEWER").toUpperCase();
  if ((ROLES as readonly string[]).includes(r)) return r as Role;
  // Legacy aliases
  if (r === "GUEST" || r === "READ_ONLY") return "VIEWER";
  return "VIEWER";
}

export function permissionsFor(role: string | null | undefined): Permission[] {
  return ROLE_PERMISSIONS[normalizeRole(role)];
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

/** Auditable matrix for docs / API */
export function permissionsMatrix(): Record<Role, Permission[]> {
  return { ...ROLE_PERMISSIONS };
}
