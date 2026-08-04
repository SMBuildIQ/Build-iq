import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import {
  computeMeasurementValue,
  pixelsPerUnitFromCalibration,
  type PlanPoint,
} from "@/lib/plans/geometry";

type Ctx = { params: Promise<{ id: string; blueprintId: string }> };

const pointSchema = z.object({ x: z.number(), y: z.number() });

const createSchema = z.object({
  type: z.enum(["CALIBRATION", "LENGTH", "AREA", "COUNT", "POLYLINE"]),
  label: z.string().max(120).optional().nullable(),
  points: z.array(pointSchema).min(1).max(200),
  /** Required for CALIBRATION — real-world length of the two-point segment */
  realLength: z.number().positive().optional(),
  unit: z.string().max(16).optional(),
});

async function loadBlueprint(projectId: string, blueprintId: string, companyId: string) {
  await ensureOwnedProject(projectId, companyId);
  const blueprint = await prisma.blueprint.findFirst({
    where: { id: blueprintId, projectId },
  });
  if (!blueprint) return null;
  return blueprint;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("project:read");
    const { id, blueprintId } = await ctx.params;
    const blueprint = await loadBlueprint(id, blueprintId, user.companyId);
    if (!blueprint) return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });

    const measurements = await prisma.planMeasurement.findMany({
      where: { blueprintId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      blueprint: {
        id: blueprint.id,
        originalName: blueprint.originalName,
        mimeType: blueprint.mimeType,
        sheetType: blueprint.sheetType,
        widthPx: blueprint.widthPx,
        heightPx: blueprint.heightPx,
        pixelsPerUnit: blueprint.pixelsPerUnit,
        scaleUnit: blueprint.scaleUnit,
        scaleLabel: blueprint.scaleLabel,
        scanStatus: blueprint.scanStatus,
        scanError: blueprint.scanError,
        scannedAt: blueprint.scannedAt,
        ocrText: blueprint.ocrText,
        ocrJson: blueprint.ocrJson,
        visionJson: blueprint.visionJson,
        previewFilename: blueprint.previewFilename,
      },
      measurements,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("estimate:run");
    const { id, blueprintId } = await ctx.params;
    const blueprint = await loadBlueprint(id, blueprintId, user.companyId);
    if (!blueprint) return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });

    const body = createSchema.parse(await req.json());
    const points = body.points as PlanPoint[];

    if (body.type === "CALIBRATION") {
      if (points.length < 2 || !body.realLength) {
        return NextResponse.json(
          { error: "Calibration needs two points and a positive realLength (in feet)." },
          { status: 400 }
        );
      }
      const ppu = pixelsPerUnitFromCalibration(points[0], points[1], body.realLength);
      if (!ppu) {
        return NextResponse.json({ error: "Invalid calibration segment." }, { status: 400 });
      }
      await prisma.blueprint.update({
        where: { id: blueprintId },
        data: {
          pixelsPerUnit: ppu,
          scaleUnit: body.unit || "ft",
          scaleLabel: body.label || `${body.realLength} ft = calibration`,
        },
      });
      const { value, unit } = computeMeasurementValue("CALIBRATION", points, ppu);
      const measurement = await prisma.planMeasurement.create({
        data: {
          blueprintId,
          type: "CALIBRATION",
          label: body.label || "Scale calibration",
          pointsJson: JSON.stringify(points),
          value,
          unit,
          metaJson: JSON.stringify({ realLength: body.realLength, pixelsPerUnit: ppu }),
        },
      });
      return NextResponse.json({ measurement, pixelsPerUnit: ppu }, { status: 201 });
    }

    const { value, unit } = computeMeasurementValue(
      body.type,
      points,
      blueprint.pixelsPerUnit
    );

    const measurement = await prisma.planMeasurement.create({
      data: {
        blueprintId,
        type: body.type,
        label: body.label || body.type,
        pointsJson: JSON.stringify(points),
        value,
        unit: body.unit || unit,
      },
    });

    return NextResponse.json({ measurement }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("estimate:run");
    const { id, blueprintId } = await ctx.params;
    const blueprint = await loadBlueprint(id, blueprintId, user.companyId);
    if (!blueprint) return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });

    const measurementId = req.nextUrl.searchParams.get("measurementId");
    if (!measurementId) {
      return NextResponse.json({ error: "measurementId required" }, { status: 400 });
    }

    await prisma.planMeasurement.deleteMany({
      where: { id: measurementId, blueprintId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
