import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";

export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  const notification = await prisma.notification.findFirst({
    where: { id, organizationId: ctx.organizationId, userId: ctx.userId },
  });
  if (!notification) throw new NotFoundError("Notification not found");

  const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ notification: updated });
});
