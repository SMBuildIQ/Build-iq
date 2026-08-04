import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createProjectSchema } from "@buildiq/validation";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";
import { ProjectStatus } from "@buildiq/prisma-client";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const projects = await this.prisma.project.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      include: {
        estimate: true,
        _count: { select: { blueprints: true, materials: true } },
      },
    });

    return {
      projects: projects.map((p) => ({
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
        blueprintCount: p._count.blueprints,
        materialCount: p._count.materials,
        bidCount: 0,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async create(user: AuthUser, body: unknown) {
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    const project = await this.prisma.project.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        squareFeet: data.squareFeet,
        stories: data.stories ?? 1,
        notes: data.notes,
        companyId: user.companyId,
        createdById: user.userId,
      },
    });
    return { project };
  }

  async get(user: AuthUser, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        blueprints: true,
        materials: true,
        estimate: true,
      },
    });
    if (!project) throw new NotFoundException("Project not found");
    return { project };
  }

  async update(user: AuthUser, id: string, body: Record<string, unknown>) {
    const existing = await this.prisma.project.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new NotFoundException("Project not found");

    const data: {
      name?: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      squareFeet?: number | null;
      stories?: number;
      notes?: string | null;
      status?: ProjectStatus;
    } = {};

    if (typeof body.name === "string") data.name = body.name;
    if ("address" in body) data.address = (body.address as string) ?? null;
    if ("city" in body) data.city = (body.city as string) ?? null;
    if ("state" in body) data.state = (body.state as string) ?? null;
    if ("zip" in body) data.zip = (body.zip as string) ?? null;
    if ("squareFeet" in body) data.squareFeet = (body.squareFeet as number) ?? null;
    if (typeof body.stories === "number") data.stories = body.stories;
    if ("notes" in body) data.notes = (body.notes as string) ?? null;
    if (typeof body.status === "string" && body.status in ProjectStatus) {
      data.status = body.status as ProjectStatus;
    }

    const project = await this.prisma.project.update({ where: { id }, data });
    return { project };
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new NotFoundException("Project not found");
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }
}
