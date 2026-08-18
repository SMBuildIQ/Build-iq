import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";
import { readUploadedFile } from "@/lib/documents/storage";

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  const document = await prisma.document.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!document) throw new NotFoundError("Document not found");

  const bytes = await readUploadedFile(document.storageKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": document.mimeType,
      "content-disposition": `attachment; filename="${document.filename.replace(/"/g, "")}"`,
      "content-length": String(document.sizeBytes),
    },
  });
});
