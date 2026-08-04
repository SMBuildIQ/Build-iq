import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { hasPermission, type Permission } from "@buildiq/permissions";
import { normalizeRole } from "@buildiq/permissions";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser, PERMISSIONS_KEY } from "./auth.decorators";

type JwtPayload = {
  sub: string;
  email: string;
  companyId: string;
  role: string;
  tokenVersion: number;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: {
        memberships: {
          where: { companyId: payload.companyId },
          include: { company: true },
          take: 1,
        },
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException("Session revoked");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException("No company membership");
    }

    const role = normalizeRole(membership.role);
    const authUser: AuthUser = {
      userId: user.id,
      email: user.email,
      name: user.name,
      companyId: membership.companyId,
      companyName: membership.company.name,
      role,
      tokenVersion: user.tokenVersion,
    };
    request.user = authUser;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required?.length) {
      const missing = required.filter((p) => !hasPermission(role, p));
      if (missing.length) {
        throw new ForbiddenException(`Missing permission: ${missing.join(", ")}`);
      }
    }

    return true;
  }
}
