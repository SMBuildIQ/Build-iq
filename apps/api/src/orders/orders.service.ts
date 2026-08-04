import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const orders = await this.prisma.order.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return { orders };
  }

  async get(user: AuthUser, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return { order };
  }
}
