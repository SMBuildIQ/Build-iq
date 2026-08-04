import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  // Wipe demo if schema changed - upsert company
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
        memberships: {
          create: { companyId: company.id, role: "OWNER" },
        },
      },
    });
  } else {
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!membership) {
      await prisma.membership.create({
        data: { userId: user.id, companyId: company.id, role: "OWNER" },
      });
    }
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
