import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createProjectSchema } from "@buildiq/validation";
import { calculateEstimate } from "@buildiq/pricing";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { AuthUser } from "../auth/auth.decorators";
import { ProjectStatus } from "@buildiq/prisma-client";
import { z } from "zod";
import { MATERIAL_LIBRARY_CATEGORIES } from "@buildiq/types";
import { MATERIAL_CATALOG } from "../materials/catalog";

const blueprintUploadSchema = z.object({
  filename: z.string().min(1).max(260),
  contentType: z.string().min(1).max(120),
  size: z.number().int().nonnegative().optional(),
});

const addMaterialSchema = z.object({
  category: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(40),
  unitCost: z.number().nonnegative(),
  trade: z.string().min(1).max(80).optional(),
  spruceSku: z.string().max(80).optional().nullable(),
  source: z.enum(["catalog", "order", "takeoff", "manual", "ai"]).optional(),
  catalogId: z.string().optional(),
});

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

  private async requireProject(user: AuthUser, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async uploadBlueprint(user: AuthUser, projectId: string, body: unknown) {
    const parsed = blueprintUploadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.requireProject(user, projectId);

    const { filename, contentType, size } = parsed.data;
    const sizeBytes = size ?? 0;
    const storageKey = `projects/${projectId}/blueprints/${randomUUID()}-${filename}`;
    const uploaded = await this.storage.upload(
      storageKey,
      Buffer.alloc(0),
      contentType,
    );

    const blueprint = await this.prisma.blueprint.create({
      data: {
        projectId,
        filename: storageKey,
        originalName: filename,
        mimeType: contentType,
        sizeBytes,
        scanStatus: "IDLE",
      },
    });

    return {
      blueprint,
      storage: uploaded,
    };
  }

  async listMaterials(user: AuthUser, projectId: string) {
    await this.requireProject(user, projectId);
    const materials = await this.prisma.materialItem.findMany({
      where: { projectId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return {
      categories: MATERIAL_LIBRARY_CATEGORIES,
      materials: materials.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        category: m.category,
        name: m.name,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        unitCost: m.unitCost,
        spruceSku: m.spruceSku,
        source: m.source,
        updatedAt: new Date().toISOString(),
      })),
    };
  }

  async addMaterial(user: AuthUser, projectId: string, body: unknown) {
    const parsed = addMaterialSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.requireProject(user, projectId);

    let payload = parsed.data;
    if (payload.catalogId) {
      const catalogItem = MATERIAL_CATALOG.find((c) => c.id === payload.catalogId);
      if (catalogItem) {
        payload = {
          ...payload,
          category: catalogItem.category,
          name: payload.name || catalogItem.name,
          description: payload.description ?? catalogItem.description ?? null,
          unit: payload.unit || catalogItem.unit,
          unitCost: payload.unitCost ?? catalogItem.unitCost,
          spruceSku: payload.spruceSku ?? catalogItem.spruceSku ?? null,
          source: payload.source ?? "catalog",
        };
      }
    }

    const material = await this.prisma.materialItem.create({
      data: {
        projectId,
        category: payload.category,
        trade: payload.trade ?? payload.category,
        name: payload.name,
        description: payload.description ?? null,
        quantity: payload.quantity,
        unit: payload.unit,
        unitCost: payload.unitCost,
        spruceSku: payload.spruceSku ?? null,
        source: payload.source ?? "manual",
      },
    });

    return { material };
  }

  async orchestrate(user: AuthUser, projectId: string) {
    await this.requireProject(user, projectId);
    const runId = randomUUID();

    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ANALYZING },
    });

    // Stub pipeline — flip to ESTIMATED without a full AI worker.
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ESTIMATED },
    });

    return {
      runId,
      status: "completed" as const,
      stub: true,
    };
  }

  async getEstimate(user: AuthUser, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId: user.companyId },
      include: { estimate: true, materials: true },
    });
    if (!project) throw new NotFoundException("Project not found");

    if (project.estimate) {
      return { estimate: project.estimate, source: "prisma" as const };
    }

    if (project.materials.length === 0) {
      throw new NotFoundException("Estimate not found");
    }

    const computed = calculateEstimate(project.materials);
    return {
      estimate: {
        id: null,
        projectId: project.id,
        version: 1,
        ...computed,
        createdAt: null,
        updatedAt: null,
      },
      source: "computed" as const,
      stub: false,
    };
  }
}
