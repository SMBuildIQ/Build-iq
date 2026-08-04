import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Permission } from "@buildiq/permissions";
import type { Role } from "@buildiq/types";

export const PERMISSIONS_KEY = "permissions";

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export type AuthUser = {
  userId: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string | null;
  role: Role;
  tokenVersion: number;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user;
  },
);
