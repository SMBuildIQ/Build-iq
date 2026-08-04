import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  jsonError,
  setSessionCookie,
  uniqueCompanySlug,
} from "@/lib/auth";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(2).max(120),
    companyName: z.string().optional(),
    phone: z.string().max(40).optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(40).optional(),
    inviteCode: z.string().optional(),
    acceptTerms: z.literal(true),
  })
  .superRefine((val, ctx) => {
    if (!val.inviteCode && (!val.companyName || val.companyName.trim().length < 2)) {
      ctx.addIssue({
        code: "custom",
        message: "Company name is required",
        path: ["companyName"],
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();
    const termsAcceptedAt = new Date();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    if (body.inviteCode) {
      const invite = await prisma.invite.findUnique({
        where: { code: body.inviteCode.toUpperCase() },
        include: { company: true },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 400 });
      }

      const user = await prisma.user.create({
        data: {
          email,
          name: body.name,
          passwordHash: await hashPassword(body.password),
          termsAcceptedAt,
          memberships: {
            create: {
              companyId: invite.companyId,
              role: invite.role,
            },
          },
        },
      });

      await prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), email },
      });

      const session = {
        id: user.id,
        email: user.email,
        name: user.name,
        companyId: invite.companyId,
        companyName: invite.company.name,
        role: invite.role,
        tokenVersion: user.tokenVersion,
      };
      await setSessionCookie(await createSessionToken(session));
      return NextResponse.json({ user: session, joinedExisting: true });
    }

    const companyName = body.companyName!.trim();
    const slug = await uniqueCompanySlug(companyName);
    const company = await prisma.company.create({
      data: {
        name: companyName,
        slug,
        phone: body.phone || null,
        city: body.city || null,
        state: body.state || null,
        onboarded: false,
        spruceSettings: {
          create: {
            mockMode: true,
            enabled: true,
            branchCode: "MAIN",
          },
        },
        members: {
          create: {
            role: "OWNER",
            user: {
              create: {
                email,
                name: body.name,
                passwordHash: await hashPassword(body.password),
                termsAcceptedAt,
              },
            },
          },
        },
      },
      include: { members: { include: { user: true } } },
    });

    const owner = company.members[0].user;
    const session = {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      companyId: company.id,
      companyName: company.name,
      role: "OWNER",
      tokenVersion: owner.tokenVersion,
    };
    await setSessionCookie(await createSessionToken(session));

    return NextResponse.json({
      user: session,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        onboarded: company.onboarded,
      },
      needsOnboarding: true,
    });
  } catch (error) {
    return jsonError(error);
  }
}
