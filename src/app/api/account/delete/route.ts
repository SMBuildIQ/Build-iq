import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, clearSessionCookie, ForbiddenError, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { deleteUploadFiles } from "@/lib/security/upload-paths";
import { sendEmail } from "@/lib/email";
import { LEGAL } from "@/lib/legal";
import { writeAuditLog } from "@/lib/audit";
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
            select: { filename: true, previewFilename: true },
          })
        : [];

    const email = user.email;
    const companyId = user.companyId;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });

      for (const id of companyIdsToDelete) {
        await tx.company.delete({ where: { id } });
      }

      await tx.membership.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    });

    const filesToDelete = blueprints.flatMap((b) =>
      [b.filename, b.previewFilename].filter((f): f is string => !!f)
    );
    await deleteUploadFiles(filesToDelete);
    await clearSessionCookie();

    await writeAuditLog({
      companyId,
      actorUserId: null,
      action: "account.deleted",
      detail: `Account deleted for ${email}`,
    });

    // Confirmation correspondence (best-effort; account already removed)
    try {
      await sendEmail({
        to: email,
        subject: `${LEGAL.productName} account deletion confirmation`,
        text: [
          `This confirms that your ${LEGAL.productName} account (${email}) was deleted as requested.`,
          "",
          `Operator: ${LEGAL.entityName}`,
          LEGAL.addressOneLine,
          "",
          "If you did not request this deletion, or need further privacy assistance, contact:",
          LEGAL.privacyEmail,
          "",
          "Payment processors such as Stripe may retain transaction records as required by law.",
        ].join("\n"),
      });
    } catch (err) {
      console.error("[account-delete-email]", err);
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      supportEmail: LEGAL.supportEmail,
      message: `Account deleted. A confirmation was sent when email delivery is configured. Questions: ${LEGAL.supportEmail}`,
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ForbiddenError) {
      return jsonError(error);
    }
    return jsonError(error, "Unable to delete account");
  }
}
