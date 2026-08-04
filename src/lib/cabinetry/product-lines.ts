import { prisma } from "@/lib/prisma";
import { DEFAULT_CABINETRY_LINES } from "@/lib/cabinetry/defaults";

/** Ensure Mesa / Summit / Pinnacle exist for a company (idempotent). */
export async function ensureDefaultProductLines(companyId: string, createdById?: string | null) {
  for (const line of DEFAULT_CABINETRY_LINES) {
    await prisma.cabinetryProductLine.upsert({
      where: { companyId_slug: { companyId, slug: line.slug } },
      create: {
        companyId,
        slug: line.slug,
        name: line.name,
        description: line.description,
        specsJson: JSON.stringify(line.specs),
        sortOrder: line.sortOrder,
        status: "ACTIVE",
        createdById: createdById || null,
      },
      update: {
        name: line.name,
        description: line.description,
        // Do not overwrite specs if already customized — only fill empty
      },
    });
  }
  return prisma.cabinetryProductLine.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
  });
}
