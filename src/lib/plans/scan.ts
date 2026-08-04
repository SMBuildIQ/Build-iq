import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";
import { uploadFilePath } from "@/lib/security/upload-paths";
import { extractPdfText, rasterizeBlueprintFile } from "@/lib/plans/rasterize";
import { mergeOcrWithPdfText, runOcrOnImage, type OcrResult } from "@/lib/plans/ocr";
import { analyzePlanVision, type VisionFinding } from "@/lib/ai/vision-takeoff";

export type ScanOptions = {
  runOcr?: boolean;
  runVision?: boolean;
};

export type ScanResult = {
  blueprintId: string;
  scanStatus: string;
  ocr: OcrResult | null;
  vision: VisionFinding | null;
  visionMaterialsCount: number;
  widthPx: number | null;
  heightPx: number | null;
  pageCount: number;
  usedVision: boolean;
  message: string;
};

/**
 * Full plan scan: rasterize → OCR → optional GPT-4o vision.
 * Persists preview, OCR text, vision JSON, and scan status on the Blueprint.
 */
export async function scanBlueprint(
  blueprintId: string,
  projectMeta: {
    projectName: string;
    squareFeet: number;
    stories: number;
    notes?: string | null;
  },
  options: ScanOptions = { runOcr: true, runVision: true }
): Promise<ScanResult> {
  const blueprint = await prisma.blueprint.findUnique({ where: { id: blueprintId } });
  if (!blueprint) throw new Error("Blueprint not found");

  await prisma.blueprint.update({
    where: { id: blueprintId },
    data: { scanStatus: "SCANNING", scanError: null },
  });

  try {
    const raster = await rasterizeBlueprintFile({
      filename: blueprint.filename,
      mimeType: blueprint.mimeType,
      blueprintId: blueprint.id,
    });

    let ocr: OcrResult | null = null;
    if (options.runOcr !== false) {
      const imageOcr = await runOcrOnImage(raster.png);
      const ext = blueprint.filename.toLowerCase();
      if (blueprint.mimeType === "application/pdf" || ext.endsWith(".pdf")) {
        const buf = await fs.readFile(uploadFilePath(blueprint.filename));
        const pdfText = await extractPdfText(buf);
        ocr = mergeOcrWithPdfText(imageOcr, pdfText.text);
      } else {
        ocr = imageOcr;
      }
    }

    let visionFindings: VisionFinding | null = null;
    let visionMaterialsCount = 0;
    let usedVision = false;
    let message = "OCR scan complete.";

    if (options.runVision !== false && process.env.OPENAI_API_KEY) {
      const vision = await analyzePlanVision({
        png: raster.png,
        projectName: projectMeta.projectName,
        squareFeet: projectMeta.squareFeet,
        stories: projectMeta.stories,
        sheetType: blueprint.sheetType,
        originalName: blueprint.originalName,
        ocrText: ocr?.text,
        notes: projectMeta.notes,
      });
      if (vision) {
        visionFindings = vision.findings;
        visionMaterialsCount = vision.materials.length;
        usedVision = true;
        message = `Vision + OCR complete (${vision.model}). ${visionMaterialsCount} catalog lines grounded in the drawing.`;
      } else {
        message =
          "OCR complete. Vision API unavailable or failed — takeoff will use OCR dimensions + local/catalog estimator.";
      }
    } else if (options.runVision !== false && !process.env.OPENAI_API_KEY) {
      message =
        "OCR complete. Set OPENAI_API_KEY to enable true GPT-4o drawing vision takeoff.";
    }

    const scanStatus =
      usedVision && ocr ? "READY" : ocr || usedVision ? "PARTIAL" : "ERROR";

    await prisma.blueprint.update({
      where: { id: blueprintId },
      data: {
        previewFilename: raster.previewFilename,
        widthPx: raster.width || null,
        heightPx: raster.height || null,
        pageCount: raster.pageCount,
        ocrText: ocr?.text || null,
        ocrJson: ocr
          ? JSON.stringify({
              confidence: ocr.confidence,
              engine: ocr.engine,
              dimensions: ocr.dimensions,
              blockCount: ocr.blocks.length,
            })
          : null,
        visionJson: visionFindings ? JSON.stringify(visionFindings) : null,
        sheetType: visionFindings?.sheetType || blueprint.sheetType,
        scanStatus,
        scanError: null,
        scannedAt: new Date(),
        analysisJson: JSON.stringify({
          scannedAt: new Date().toISOString(),
          usedVision,
          ocrEngine: ocr?.engine,
          dimensionCount: ocr?.dimensions.length || 0,
          visionMaterials: visionMaterialsCount,
          scaleHint: visionFindings?.scaleHint || null,
        }),
      },
    });

    return {
      blueprintId,
      scanStatus,
      ocr,
      vision: visionFindings,
      visionMaterialsCount,
      widthPx: raster.width || null,
      heightPx: raster.height || null,
      pageCount: raster.pageCount,
      usedVision,
      message,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Plan scan failed";
    await prisma.blueprint.update({
      where: { id: blueprintId },
      data: { scanStatus: "ERROR", scanError: msg.slice(0, 500) },
    });
    throw err;
  }
}

/** Merge vision materials from all scanned blueprints (prefer higher confidence). */
export function mergeVisionMaterialsFromBlueprints(
  visionJsonList: (string | null)[]
): { spruceSku: string; quantity: number; confidence: number }[] {
  const bySku = new Map<string, { quantity: number; confidence: number }>();
  for (const raw of visionJsonList) {
    if (!raw) continue;
    try {
      const findings = JSON.parse(raw) as VisionFinding;
      for (const m of findings.materials || []) {
        if (!m.spruceSku || !(m.quantity > 0)) continue;
        const conf = m.confidence ?? 0.7;
        const prev = bySku.get(m.spruceSku);
        if (!prev || conf >= prev.confidence) {
          bySku.set(m.spruceSku, { quantity: m.quantity, confidence: conf });
        }
      }
    } catch {
      // skip bad JSON
    }
  }
  return [...bySku.entries()].map(([spruceSku, v]) => ({
    spruceSku,
    quantity: v.quantity,
    confidence: v.confidence,
  }));
}
