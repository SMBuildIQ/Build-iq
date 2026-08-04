import { prisma } from "@/lib/prisma";

export async function getOrCreateCart(companyId: string) {
  return prisma.cart.upsert({
    where: { companyId },
    create: { companyId },
    update: {},
    include: {
      items: {
        include: { package: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export function cartTotals(items: { quantity: number; package: { unitPrice: number } }[]) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.package.unitPrice, 0);
  const tax = Math.round(subtotal * 0.065 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    total,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
