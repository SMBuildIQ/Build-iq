import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { cartTotals, getOrCreateCart } from "@/lib/commerce/cart";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requirePermission("cart:manage");
    const cart = await getOrCreateCart(user.companyId);
    const totals = cartTotals(cart.items);
    return NextResponse.json({ cart, totals });
  } catch (error) {
    return jsonError(error);
  }
}

const addSchema = z.object({
  packageId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
  projectId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("cart:manage");
    const body = addSchema.parse(await req.json());
    const cart = await getOrCreateCart(user.companyId);

    const pkg = await prisma.materialPackage.findFirst({
      where: { id: body.packageId, active: true },
    });
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

    const projectId = body.projectId || null;
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        packageId: pkg.id,
        projectId,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + body.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          packageId: pkg.id,
          quantity: body.quantity,
          projectId,
        },
      });
    }

    const refreshed = await getOrCreateCart(user.companyId);
    return NextResponse.json({ cart: refreshed, totals: cartTotals(refreshed.items) });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(0).max(99),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission("cart:manage");
    const body = patchSchema.parse(await req.json());
    const cart = await getOrCreateCart(user.companyId);
    const item = await prisma.cartItem.findFirst({
      where: { id: body.itemId, cartId: cart.id },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (body.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: body.quantity },
      });
    }

    const refreshed = await getOrCreateCart(user.companyId);
    return NextResponse.json({ cart: refreshed, totals: cartTotals(refreshed.items) });
  } catch (error) {
    return jsonError(error);
  }
}

const deleteSchema = z.object({ itemId: z.string() });

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission("cart:manage");
    const body = deleteSchema.parse(await req.json());
    const cart = await getOrCreateCart(user.companyId);
    await prisma.cartItem.deleteMany({
      where: { id: body.itemId, cartId: cart.id },
    });
    const refreshed = await getOrCreateCart(user.companyId);
    return NextResponse.json({ cart: refreshed, totals: cartTotals(refreshed.items) });
  } catch (error) {
    return jsonError(error);
  }
}
