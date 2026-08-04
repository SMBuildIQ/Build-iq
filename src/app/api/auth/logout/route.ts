import { NextResponse } from "next/server";
import { bumpTokenVersion, clearSessionCookie, getSession, jsonError } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      await bumpTokenVersion(session.id);
      await writeAuditLog({
        companyId: session.companyId,
        actorUserId: session.id,
        action: "auth.logout",
      });
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await clearSessionCookie();
    return jsonError(error);
  }
}
