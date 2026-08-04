import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { PLATFORM_MODULES, getModule } from "@/lib/modules/registry";

export async function GET(req: Request) {
  try {
    await requirePermission("module:planned:view");
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (slug) {
      const mod = getModule(slug);
      if (!mod) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
      return NextResponse.json({ module: mod });
    }
    return NextResponse.json({ modules: PLATFORM_MODULES });
  } catch (error) {
    return jsonError(error);
  }
}
