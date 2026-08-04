import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, jsonError, requireUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  confirm: z.literal("DELETE"),
});

/**
 * Apple App Store Guideline 5.1.1(v) — account deletion must be available in-app.
 * Deletes the user membership; if they are the sole owner, deletes the company workspace.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());
    void body;

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { company: { include: { _count: { select: { members: true } } } } },
    });

    for (const m of memberships) {
      if (m.role === "OWNER" && m.company._count.members <= 1) {
        await prisma.company.delete({ where: { id: m.companyId } });
      } else {
        await prisma.membership.delete({ where: { id: m.id } });
      }
    }

    const remaining = await prisma.membership.count({ where: { userId: user.id } });
    if (remaining === 0) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
