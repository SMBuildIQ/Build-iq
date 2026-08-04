import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";

export async function GET() {
  try {
    const user = await requirePermission("team:view");
    const members = await prisma.membership.findMany({
      where: { companyId: user.companyId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        userId: m.user.id,
        joinedAt: m.createdAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
