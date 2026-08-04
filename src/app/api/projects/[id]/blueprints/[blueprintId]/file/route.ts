import { NextRequest, NextResponse } from "next/server";
import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { uploadFilePath } from "@/lib/security/upload-paths";

type Ctx = { params: Promise<{ id: string; blueprintId: string }> };

/** Auth-gated blueprint file (or raster preview via ?preview=1). */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("project:read");
    const { id, blueprintId } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const blueprint = await prisma.blueprint.findFirst({
      where: { id: blueprintId, projectId: id },
    });
    if (!blueprint) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
    }

    const wantPreview = req.nextUrl.searchParams.get("preview") === "1";
    const filename =
      wantPreview && blueprint.previewFilename ? blueprint.previewFilename : blueprint.filename;
    const mime =
      wantPreview && blueprint.previewFilename
        ? "image/png"
        : blueprint.mimeType || "application/octet-stream";

    const filePath = uploadFilePath(filename);
    await fs.access(filePath);

    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${blueprint.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
