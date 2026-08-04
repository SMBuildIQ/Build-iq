import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  jsonError,
  sessionFromMembership,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { memberships: true },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.memberships.length) {
      return NextResponse.json({ error: "No builder company linked to this account" }, { status: 403 });
    }

    const session = await sessionFromMembership(user.id, body.companyId);
    if (!session) {
      return NextResponse.json({ error: "Unable to load builder workspace" }, { status: 403 });
    }

    await setSessionCookie(await createSessionToken(session));
    return NextResponse.json({ user: session });
  } catch (error) {
    return jsonError(error);
  }
}
