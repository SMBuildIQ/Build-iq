import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, type AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/permissions/check";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type Handler<T> = (req: NextRequest, ctx: AuthContext, routeParams: T) => Promise<NextResponse>;

/**
 * Wraps every /api/v1 route handler that requires an authenticated, tenant-scoped
 * caller. This is the single choke point that (a) resolves the session, (b) makes
 * ForbiddenError/NotFoundError/ValidationError translate to consistent HTTP
 * responses, and (c) guarantees a handler never runs without ctx.organizationId —
 * which is what every tenant-scoped Prisma query in this codebase filters by.
 */
export function withAuth<T = Record<string, string>>(handler: Handler<T>) {
  return async (req: NextRequest, routeContext: { params: Promise<T> } | undefined) => {
    try {
      const ctx = await getAuthContext();
      if (!ctx) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const params = routeContext ? await routeContext.params : ({} as T);
      return await handler(req, ctx, params);
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      if (err instanceof NotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
