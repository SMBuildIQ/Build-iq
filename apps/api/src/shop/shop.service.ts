import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { cartItemSchema } from "@buildiq/validation";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";
import { findShopPackage, SHOP_PACKAGES } from "./packages";

const TAX_RATE = 0.065;

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  packages() {
    return { packages: SHOP_PACKAGES };
  }

  private async getOrCreateCart(companyId: string) {
    return this.prisma.cart.upsert({
      where: { companyId },
      create: { companyId },
      update: {},
      include: { items: true },
    });
  }

  async getCart(user: AuthUser) {
    const cart = await this.getOrCreateCart(user.companyId);
    const subtotal = cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    return {
      cart: {
        id: cart.id,
        items: cart.items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax,
        total: Math.round((subtotal + tax) * 100) / 100,
      },
    };
  }

  async addToCart(user: AuthUser, body: unknown) {
    const parsed = cartItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { packageId, quantity, projectId } = parsed.data;
    const pkg = findShopPackage(packageId);
    if (!pkg) throw new NotFoundException("Package not found");

    const cart = await this.getOrCreateCart(user.companyId);
    const existing = cart.items.find(
      (i) => i.packageId === pkg.id && (i.projectId ?? null) === (projectId ?? null),
    );

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          packageId: pkg.id,
          quantity,
          projectId: projectId ?? null,
          unitPrice: pkg.unitPrice,
          name: pkg.name,
          category: String(pkg.category),
        },
      });
    }

    return this.getCart(user);
  }

  async checkout(user: AuthUser, body: Record<string, unknown> = {}) {
    const cart = await this.getOrCreateCart(user.companyId);
    if (!cart.items.length) {
      throw new BadRequestException("Cart is empty");
    }

    const subtotal = cart.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          companyId: user.companyId,
          placedById: user.userId,
          subtotal,
          tax,
          total,
          paymentStatus: "stub_pending",
          paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "stub",
          shipToName: typeof body.shipToName === "string" ? body.shipToName : user.name,
          shipToAddress: typeof body.shipToAddress === "string" ? body.shipToAddress : null,
          shipToCity: typeof body.shipToCity === "string" ? body.shipToCity : null,
          shipToState: typeof body.shipToState === "string" ? body.shipToState : null,
          shipToZip: typeof body.shipToZip === "string" ? body.shipToZip : null,
          notes: typeof body.notes === "string" ? body.notes : null,
          items: {
            create: cart.items.map((i) => ({
              name: i.name,
              category: i.category,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: Math.round(i.unitPrice * i.quantity * 100) / 100,
              packageId: i.packageId,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    return {
      order,
      stub: true,
      message: "Checkout stub — Stripe not configured in API scaffold",
    };
  }
}
