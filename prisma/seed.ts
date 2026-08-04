import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { MATERIAL_PACKAGES } from "../src/lib/materials/packages";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  for (const pkg of MATERIAL_PACKAGES) {
    await prisma.materialPackage.upsert({
      where: { slug: pkg.slug },
      create: pkg,
      update: {
        name: pkg.name,
        description: pkg.description,
        contents: pkg.contents,
        unitPrice: pkg.unitPrice,
        leadDays: pkg.leadDays,
        spruceSku: pkg.spruceSku,
        sortOrder: pkg.sortOrder,
        active: true,
      },
    });
  }

  let company = await prisma.company.findUnique({ where: { slug: "ridge-homes" } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Ridge Homes",
        slug: "ridge-homes",
        phone: "541-555-0142",
        city: "Bend",
        state: "OR",
        onboarded: true,
        spruceSettings: {
          create: {
            mockMode: true,
            enabled: true,
            branchCode: "MAIN",
            accountNumber: "CUST-1001",
          },
        },
      },
    });
  }

  let user = await prisma.user.findUnique({ where: { email: "demo@buildiq.app" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@buildiq.app",
        name: "Demo Estimator",
        passwordHash,
        termsAcceptedAt: new Date(),
        emailVerifiedAt: new Date(),
        memberships: {
          create: { companyId: company.id, role: "OWNER" },
        },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        termsAcceptedAt: user.termsAcceptedAt || new Date(),
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
      },
    });
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!membership) {
      await prisma.membership.create({
        data: { userId: user.id, companyId: company.id, role: "OWNER" },
      });
    }
  }

  const { PLATFORM_MODULES } = await import("../src/lib/modules/registry");
  for (const mod of PLATFORM_MODULES) {
    await prisma.moduleRegistry.upsert({
      where: { slug: mod.slug },
      create: {
        slug: mod.slug,
        name: mod.name,
        status: mod.status,
        description: mod.description,
      },
      update: {
        name: mod.name,
        status: mod.status,
        description: mod.description,
      },
    });
  }

  const existing = await prisma.project.findFirst({
    where: { companyId: company.id, name: "Cedar Lane Residence" },
  });

  if (!existing) {
    await prisma.project.create({
      data: {
        companyId: company.id,
        createdById: user.id,
        name: "Cedar Lane Residence",
        address: "1847 Cedar Lane",
        city: "Bend",
        state: "OR",
        zip: "97701",
        squareFeet: 2450,
        stories: 2,
        notes: "Crawlspace foundation, fiber cement siding, architectural shingles",
        status: "DRAFT",
      },
    });
  }

  console.log(`Seeded ${MATERIAL_PACKAGES.length} material takeoff packages`);
  console.log("Seeded builder company Ridge Homes");
  console.log("Demo login: demo@buildiq.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
