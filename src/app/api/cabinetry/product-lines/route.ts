import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { ensureDefaultProductLines } from "@/lib/cabinetry/product-lines";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requirePermission("cabinetry:view");
    const lines = await ensureDefaultProductLines(user.companyId, user.id);
    return NextResponse.json({ productLines: lines });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  description: z.string().max(2000).optional(),
  specsJson: z.string().max(20000).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/** Admin edit of product-line specs (no hard-coded prices in source). */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission("cabinetry:catalog:edit");
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.cabinetryProductLine.findFirst({
      where: { id: body.id, companyId: user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product line not found" }, { status: 404 });
    }
    if (body.specsJson) {
      JSON.parse(body.specsJson); // validate JSON
    }
    const productLine = await prisma.cabinetryProductLine.update({
      where: { id: body.id },
      data: {
        description: body.description ?? undefined,
        specsJson: body.specsJson ?? undefined,
        status: body.status ?? undefined,
      },
    });
    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "cabinetry.product_line.updated",
      entityType: "CabinetryProductLine",
      entityId: productLine.id,
    });
    return NextResponse.json({ productLine });
  } catch (error) {
    return jsonError(error);
  }
}
