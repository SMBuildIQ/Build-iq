import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  jsonError,
  setSessionCookie,
} from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  companyName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        companyName: body.companyName || null,
        passwordHash: await hashPassword(body.password),
        spruceSettings: {
          create: {
            mockMode: true,
            enabled: true,
            branchCode: "MAIN",
          },
        },
      },
    });

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
