import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Lightweight in-memory rate limit for sensitive endpoints (per-instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { ok: true, remaining: limit - entry.count };
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  const authSensitive =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password");
  const accountDelete = pathname.startsWith("/api/account/delete");
  const checkout = pathname.startsWith("/api/checkout");

  if (authSensitive || accountDelete || checkout) {
    const limit = pathname.includes("forgot-password")
      ? 5
      : authSensitive
        ? 20
        : accountDelete
          ? 5
          : 30;
    const result = rateLimit(`${pathname}:${ip}`, limit, 60_000);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Request-Id", crypto.randomUUID());
  return res;
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/checkout/:path*", "/api/account/:path*"],
};
