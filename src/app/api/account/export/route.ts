import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";

/** Data portability export for privacy compliance (GDPR / App Store transparency) */
export async function GET() {
  try {
    const session = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const projects = await prisma.project.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        squareFeet: true,
        status: true,
        createdAt: true,
        estimate: { select: { grandTotal: true, version: true } },
        _count: { select: { materials: true, blueprints: true, bidPackages: true } },
      },
    });

    const orders = await prisma.order.findMany({
      where: { companyId: session.companyId },
      select: {
        orderNumber: true,
        status: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        items: { select: { name: true, category: true, quantity: true, lineTotal: true } },
      },
    });

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      user,
      projects,
      orders,
      notice:
        "This export contains your BuildIQ account and company workspace data for portability requests.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
