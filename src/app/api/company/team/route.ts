import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
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
