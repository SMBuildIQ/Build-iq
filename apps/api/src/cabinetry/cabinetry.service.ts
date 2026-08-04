import { BadRequestException, Injectable } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";
import { CabinetryStage } from "@buildiq/prisma-client";

const createOpportunitySchema = z.object({
  builderName: z.string().max(200).optional(),
  architectName: z.string().max(200).optional(),
  designerName: z.string().max(200).optional(),
  projectAddress: z.string().max(400).optional(),
  constructionType: z.enum(["NEW_CONSTRUCTION", "REMODEL"]).optional(),
  supplyScope: z.enum(["SUPPLY_ONLY", "SUPPLY_AND_INSTALL"]).optional(),
  notes: z.string().max(4000).optional(),
  customerId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  stage: z.nativeEnum(CabinetryStage).optional(),
});

@Injectable()
export class CabinetryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const opportunities = await this.prisma.cabinetryOpportunity.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: true,
        project: { select: { id: true, name: true } },
      },
    });
    return { opportunities };
  }

  async create(user: AuthUser, body: unknown) {
    const parsed = createOpportunitySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;

    if (data.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: data.projectId, companyId: user.companyId },
      });
      if (!project) throw new BadRequestException("Invalid projectId");
    }
    if (data.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: data.customerId, companyId: user.companyId },
      });
      if (!customer) throw new BadRequestException("Invalid customerId");
    }

    const opportunity = await this.prisma.cabinetryOpportunity.create({
      data: {
        companyId: user.companyId,
        createdById: user.userId,
        builderName: data.builderName,
        architectName: data.architectName,
        designerName: data.designerName,
        projectAddress: data.projectAddress,
        constructionType: data.constructionType,
        supplyScope: data.supplyScope,
        notes: data.notes,
        customerId: data.customerId ?? null,
        projectId: data.projectId ?? null,
        stage: data.stage ?? CabinetryStage.NEW,
      },
    });

    return { opportunity };
  }
}
