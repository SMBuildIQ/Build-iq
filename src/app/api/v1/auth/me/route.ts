import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: { id: ctx.userId, email: ctx.email, name: ctx.name },
    organization: { id: ctx.organizationId, slug: ctx.organizationSlug },
    roleKeys: ctx.roleKeys,
    permissions: Array.from(ctx.permissions),
  });
}
