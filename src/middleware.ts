import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Lightweight in-memory rate limit for auth endpoints (per-instance). */
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register")
  ) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const result = rateLimit(`${pathname}:${ip}`, 20, 60_000);
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
