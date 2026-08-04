import { PrismaClient } from "@buildiq/prisma-client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@buildiq.app";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const company = await prisma.company.upsert({
    where: { slug: "supply-monkey" },
    create: {
      name: "Supply Monkey",
      slug: "supply-monkey",
      city: "Austin",
      state: "TX",
      phone: "512-555-0100",
      onboarded: true,
    },
    update: {
      name: "Supply Monkey",
      city: "Austin",
      state: "TX",
      onboarded: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Demo Owner",
      passwordHash,
      termsAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
    update: {
      name: "Demo Owner",
      passwordHash,
      deletedAt: null,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_companyId: { userId: user.id, companyId: company.id },
    },
    create: {
      userId: user.id,
      companyId: company.id,
      role: "OWNER",
    },
    update: { role: "OWNER" },
  });

  console.log("Seeded demo user:", email, "/ demo1234");
  console.log("Company:", company.name, `(${company.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
