import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, clearSessionCookie, ForbiddenError, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { deleteUploadFiles } from "@/lib/security/upload-paths";
import { z } from "zod";

const schema = z.object({
  confirm: z.literal("DELETE"),
});

/**
 * Apple App Store Guideline 5.1.1(v) — account deletion must be available in-app.
 * Purges company workspace when sole owner; otherwise requires ownership transfer first.
 * Deletes blueprint files on disk and invalidates sessions.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requirePermission("account:delete");
    schema.parse(await req.json());

    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: {
        company: { include: { _count: { select: { members: true } } } },
      },
    });

    for (const m of memberships) {
      if (m.role === "OWNER" && m.company._count.members > 1) {
        throw new ForbiddenError(
          "Transfer ownership or remove other team members before deleting your owner account."
        );
      }
    }

    const companyIdsToDelete = memberships
      .filter((m) => m.role === "OWNER" && m.company._count.members <= 1)
      .map((m) => m.companyId);

    const blueprints =
      companyIdsToDelete.length > 0
        ? await prisma.blueprint.findMany({
            where: { project: { companyId: { in: companyIdsToDelete } } },
            select: { filename: true },
          })
        : [];

    await prisma.$transaction(async (tx) => {
      // Invalidate any outstanding JWTs first
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });

      for (const companyId of companyIdsToDelete) {
        await tx.company.delete({ where: { id: companyId } });
      }

      // Remove leftover memberships (invite-join paths with no company wipe)
      await tx.membership.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    await deleteUploadFiles(blueprints.map((b) => b.filename));
    await clearSessionCookie();

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ForbiddenError) {
      return jsonError(error);
    }
    return jsonError(error, "Unable to delete account");
  }
}
