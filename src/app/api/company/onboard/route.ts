import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { z } from "zod";

const schema = z.object({
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  complete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("company:manage");

    const body = schema.parse(await req.json());
    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: {
        phone: body.phone || undefined,
        city: body.city || undefined,
        state: body.state || undefined,
        onboarded: body.complete ?? true,
      },
    });

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        onboarded: company.onboarded,
        phone: company.phone,
        city: company.city,
        state: company.state,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
