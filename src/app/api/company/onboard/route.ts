import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  complete: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "ESTIMATOR") {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

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
