import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@buildiq/prisma-client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";

export type OrderTimelineStep = {
  key: string;
  label: string;
  at?: string;
  active: boolean;
};

const TIMELINE_STEPS: { key: string; label: string; status: OrderStatus }[] = [
  { key: "placed", label: "Order placed", status: OrderStatus.PLACED },
  { key: "pulled", label: "Yard pull", status: OrderStatus.CONFIRMED },
  { key: "staged", label: "Staged", status: OrderStatus.FULFILLING },
  { key: "out", label: "Out for delivery", status: OrderStatus.SHIPPED },
  { key: "delivered", label: "Delivered", status: OrderStatus.DELIVERED },
];

function statusIndex(status: OrderStatus): number {
  if (status === OrderStatus.CANCELLED) return -1;
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export function buildOrderTimeline(
  status: OrderStatus,
  createdAt: Date,
  updatedAt: Date,
): OrderTimelineStep[] {
  const current = statusIndex(status);
  return TIMELINE_STEPS.map((step, idx) => {
    const reached = current >= 0 && idx <= current;
    const active = current >= 0 && idx === current;
    let at: string | undefined;
    if (reached) {
      at = (idx === 0 ? createdAt : updatedAt).toISOString();
    }
    return {
      key: step.key,
      label: step.label,
      ...(at ? { at } : {}),
      active,
    };
  });
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const orders = await this.prisma.order.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return {
      orders: orders.map((order) => ({
        ...order,
        timeline: buildOrderTimeline(order.status, order.createdAt, order.updatedAt),
      })),
    };
  }

  async get(user: AuthUser, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("Order not found");
    return {
      order: {
        ...order,
        items: order.items,
        timeline: buildOrderTimeline(order.status, order.createdAt, order.updatedAt),
      },
    };
  }
}
