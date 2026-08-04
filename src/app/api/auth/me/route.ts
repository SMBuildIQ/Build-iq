import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    include: {
      _count: { select: { projects: true, members: true } },
    },
  });

  return NextResponse.json({
    user,
    company: company
      ? {
          id: company.id,
          name: company.name,
          slug: company.slug,
          onboarded: company.onboarded,
          phone: company.phone,
          city: company.city,
          state: company.state,
          projectCount: company._count.projects,
          memberCount: company._count.members,
        }
      : null,
  });
}
