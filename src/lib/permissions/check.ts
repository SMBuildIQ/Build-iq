import type { AuthContext } from "@/lib/auth/context";
import type { PermissionKey } from "./catalog";

export class ForbiddenError extends Error {
  constructor(permission: PermissionKey) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function hasPermission(ctx: AuthContext, permission: PermissionKey): boolean {
  return ctx.permissions.has(permission);
}

/** Throws ForbiddenError (caught centrally by API route wrappers → 403) if missing. */
export function requirePermission(ctx: AuthContext, permission: PermissionKey): void {
  if (!hasPermission(ctx, permission)) {
    throw new ForbiddenError(permission);
  }
}
