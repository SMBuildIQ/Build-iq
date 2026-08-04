import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";
import { validateUploadBuffer, validateUploadFile } from "@/lib/security/uploads";
import { uploadDir } from "@/lib/security/upload-paths";

type Ctx = { params: Promise<{ id: string }> };

function inferSheetType(filename: string) {
  const n = filename.toLowerCase();
  if (/floor|plan|arch/.test(n)) return "Floor Plan";
  if (/elev/.test(n)) return "Elevation";
  if (/found|struct|slab/.test(n)) return "Foundation";
  if (/roof/.test(n)) return "Roof Plan";
  if (/elec/.test(n)) return "Electrical";
  if (/plumb/.test(n)) return "Plumbing";
  if (/hvac|mech/.test(n)) return "Mechanical";
  if (/site/.test(n)) return "Site Plan";
  return "General";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }
    if (files.length > 20) {
      return NextResponse.json({ error: "Maximum 20 files per upload" }, { status: 400 });
    }

    for (const file of files) {
      const invalid = validateUploadFile(file);
      if (invalid) {
        return NextResponse.json({ error: `${file.name}: ${invalid}` }, { status: 400 });
      }
    }

    const dir = uploadDir();
    await fs.mkdir(dir, { recursive: true });

    const created = [];
    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase() || ".bin";
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentError = validateUploadBuffer(buffer, ext);
      if (contentError) {
        return NextResponse.json({ error: `${file.name}: ${contentError}` }, { status: 400 });
      }

      const filename = `${id}-${randomUUID()}${ext}`;
      await fs.writeFile(path.join(dir, filename), buffer);

      const blueprint = await prisma.blueprint.create({
        data: {
          projectId: id,
          filename,
          originalName: file.name.slice(0, 255),
          mimeType: file.type || "application/octet-stream",
          sizeBytes: buffer.length,
          sheetType: inferSheetType(file.name),
        },
      });
      created.push(blueprint);
    }

    return NextResponse.json({ blueprints: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
