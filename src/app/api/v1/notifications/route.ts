import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/handler";

export const GET = withAuth(async (_req, ctx) => {
  const notifications = await prisma.notification.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  return NextResponse.json({ notifications, unreadCount });
});
