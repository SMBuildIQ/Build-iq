import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  squareFeet: z.number().int().positive().optional(),
  stories: z.number().int().min(1).max(4).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        estimate: true,
        _count: { select: { blueprints: true, materials: true, bidPackages: true } },
      },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        squareFeet: body.squareFeet || null,
        stories: body.stories || 1,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
