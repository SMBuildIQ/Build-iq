import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { MATERIAL_PACKAGES } from "@/lib/materials/packages";

export async function GET() {
  try {
    await requirePermission("shop:browse");
    let packages = await prisma.materialPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });

    if (!packages.length) {
      await prisma.materialPackage.createMany({
        data: MATERIAL_PACKAGES.map((p) => ({ ...p })),
      });
      packages = await prisma.materialPackage.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      });
    }

    return NextResponse.json({
      packages: packages.map((p) => ({
        ...p,
        contents: JSON.parse(p.contents || "[]") as string[],
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
