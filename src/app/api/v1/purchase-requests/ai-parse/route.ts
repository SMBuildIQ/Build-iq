import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { extractPurchaseRequest } from "@/lib/ai/purchaseRequestExtraction";

const schema = z.object({ description: z.string().min(10).max(4000) });

// brief §5: "The AI should turn this into structured purchasing data ... identify
// missing critical information and request it from the user. Once confirmed, the
// AI creates a formal Purchase Request." This endpoint performs only the extraction
// step — nothing is persisted as a PurchaseRequest until the user confirms via
// POST /api/v1/purchase-requests.
export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "purchase_request:create");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("description must be 10-4000 characters");

  const result = await extractPurchaseRequest(ctx.organizationId, body.data.description);

  return NextResponse.json(result);
});
