import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
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
