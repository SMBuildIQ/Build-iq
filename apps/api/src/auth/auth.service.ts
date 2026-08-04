import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { z } from "zod";
import { loginSchema, registerSchema } from "@buildiq/validation";
import { normalizeRole, permissionsFor } from "@buildiq/permissions";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./auth.decorators";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(body: unknown) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { name, email, password, companyName } = parsed.data;

    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let base = slugify(companyName) || "company";
    let slug = base;
    let n = 1;
    while (await this.prisma.company.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        termsAcceptedAt: new Date(),
        memberships: {
          create: {
            role: "OWNER",
            company: {
              create: {
                name: companyName,
                slug,
                onboarded: true,
              },
            },
          },
        },
      },
      include: {
        memberships: { include: { company: true }, take: 1 },
      },
    });

    const membership = user.memberships[0];
    const token = await this.signToken({
      userId: user.id,
      email: user.email,
      companyId: membership.companyId,
      role: membership.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      token,
      user: this.toSession(user.id, user.email, user.name, membership.companyId, membership.company.name, membership.role),
    };
  }

  async login(body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { email, password } = parsed.data;

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: {
        memberships: { include: { company: true }, take: 1, orderBy: { createdAt: "asc" } },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException("No company membership");
    }

    const token = await this.signToken({
      userId: user.id,
      email: user.email,
      companyId: membership.companyId,
      role: membership.role,
      tokenVersion: user.tokenVersion,
    });

    return {
      token,
      user: this.toSession(
        user.id,
        user.email,
        user.name,
        membership.companyId,
        membership.company.name,
        membership.role,
      ),
    };
  }

  async logout(user: AuthUser) {
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { ok: true };
  }

  /**
   * Apple Guideline 5.1.1(v) / Play account-deletion — soft-delete user,
   * revoke tokens, remove sole-owner company when no other members.
   */
  async deleteAccount(user: AuthUser, body: unknown) {
    const parsed = z
      .object({ confirm: z.literal("DELETE") })
      .safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Send { "confirm": "DELETE" } to confirm account deletion.');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.userId },
      include: {
        company: { include: { _count: { select: { members: true } } } },
      },
    });

    for (const m of memberships) {
      if (m.role === "OWNER" && m.company._count.members > 1) {
        throw new ForbiddenException(
          "Transfer ownership or remove other team members before deleting your owner account."
        );
      }
    }

    const companyIdsToDelete = memberships
      .filter((m) => m.role === "OWNER" && m.company._count.members <= 1)
      .map((m) => m.companyId);

    await this.prisma.$transaction(async (tx) => {
      for (const id of companyIdsToDelete) {
        await tx.company.delete({ where: { id } });
      }
      await tx.membership.deleteMany({ where: { userId: user.userId } });
      await tx.user.update({
        where: { id: user.userId },
        data: {
          deletedAt: new Date(),
          tokenVersion: { increment: 1 },
          email: `deleted+${user.userId}@deleted.invalid`,
          name: "Deleted User",
          passwordHash: await bcrypt.hash(`deleted-${user.userId}-${Date.now()}`, 10),
        },
      });
    });

    return { ok: true as const };
  }

  async me(user: AuthUser) {
    return {
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        companyId: user.companyId,
        companyName: user.companyName,
        role: user.role,
        permissions: permissionsFor(user.role),
      },
    };
  }

  private toSession(
    id: string,
    email: string,
    name: string,
    companyId: string,
    companyName: string | null,
    role: string,
  ) {
    return {
      id,
      email,
      name,
      companyId,
      companyName,
      role: normalizeRole(role),
    };
  }

  private signToken(input: {
    userId: string;
    email: string;
    companyId: string;
    role: string;
    tokenVersion: number;
  }) {
    return this.jwt.signAsync({
      sub: input.userId,
      email: input.email,
      companyId: input.companyId,
      role: input.role,
      tokenVersion: input.tokenVersion,
    });
  }
}
