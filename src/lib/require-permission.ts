import { AuthError, ForbiddenError, requireUser, type SessionUser } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return user;
}

export async function requireAnyPermission(...permissions: Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!permissions.some((p) => hasPermission(user.role, p))) {
    throw new ForbiddenError("You do not have permission to perform this action");
  }
  return user;
}

export { AuthError, ForbiddenError };
