import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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
    await ensureOwnedProject(id, user.id);

    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const created = [];
    for (const file of files) {
      const ext = path.extname(file.name) || ".bin";
      const filename = `${id}-${randomUUID()}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

      const blueprint = await prisma.blueprint.create({
        data: {
          projectId: id,
          filename,
          originalName: file.name,
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
