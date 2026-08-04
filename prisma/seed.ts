import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@fieldline.app" },
    update: {},
    create: {
      email: "demo@fieldline.app",
      name: "Demo Estimator",
      companyName: "Ridge Homes",
      passwordHash,
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

  const existing = await prisma.project.findFirst({
    where: { userId: user.id, name: "Cedar Lane Residence" },
  });

  if (!existing) {
    await prisma.project.create({
      data: {
        userId: user.id,
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

  console.log("Seeded demo user: demo@fieldline.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
