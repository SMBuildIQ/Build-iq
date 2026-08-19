import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { runPurchasingQuery } from "@/lib/ai/purchasingQuery";

const schema = z.object({ question: z.string().min(1).max(500) });

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "analytics:view");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("question is required");

  const result = await runPurchasingQuery(ctx.organizationId, body.data.question);
  return NextResponse.json(result);
});
