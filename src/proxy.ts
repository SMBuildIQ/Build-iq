import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/api-docs",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/me",
  // Public: the second step of login for an MFA-enrolled account, exchanged
  // for a real session using the short-lived mfaToken from /auth/login — no
  // session cookie exists yet at this point, same as /auth/login itself.
  "/api/v1/auth/mfa/challenge",
  "/api/v1/openapi.json",
];

// Edge-safe presence/signature check only (jose verifies HMAC without touching
// Prisma). Full tenant/permission resolution happens server-side per request via
// getAuthContext() — this proxy only keeps unauthenticated users out of the
// app shell and off /api/v1/* before a DB round-trip. (Next.js 16 renamed
// Middleware to Proxy — same mechanism, see node_modules/next/dist/docs.)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api/v1/portal") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/v1/invites/accept")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/v1")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
