import "dotenv/config";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";

async function main() {
  const email = "demo@buildiq.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed data already present — skipping.");
    return;
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword("demo12345"), name: "Demo Owner" },
  });

  const { organization } = await createOrganizationWithOwner({
    name: "Acme Manufacturing",
    slug: "acme-manufacturing",
    ownerUserId: user.id,
  });

  await prisma.supplier.createMany({
    data: [
      { organizationId: organization.id, name: "Global Tech Distributors", status: "approved", city: "Chicago", state: "IL", country: "US", paymentTerms: "Net 30" },
      { organizationId: organization.id, name: "Midwest Supply Co", status: "approved", city: "Detroit", state: "MI", country: "US", paymentTerms: "Net 15" },
      { organizationId: organization.id, name: "Pacific Hardware Partners", status: "active", city: "Seattle", state: "WA", country: "US", paymentTerms: "Net 45" },
    ],
  });

  const suppliers = await prisma.supplier.findMany({ where: { organizationId: organization.id } });
  await Promise.all(
    suppliers.map((s) =>
      prisma.supplierContact.create({
        data: { supplierId: s.id, name: "Sales Team", email: `sales@${s.name.toLowerCase().replace(/[^a-z]+/g, "")}.example.com`, isPrimary: true },
      })
    )
  );

  console.log(`Seeded organization "${organization.name}" (${organization.slug})`);
  console.log(`Demo login: ${email} / demo12345`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
