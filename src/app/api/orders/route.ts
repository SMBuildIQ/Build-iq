import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";

export async function GET() {
  try {
    const user = await requirePermission("order:view");
    const orders = await prisma.order.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: "asc" } },
      },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    return jsonError(error);
  }
}
