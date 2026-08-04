import { createCanvas } from "@napi-rs/canvas";
import { promises as fs } from "fs";
import path from "path";
import { uploadDir, uploadFilePath } from "@/lib/security/upload-paths";

export type RasterResult = {
  png: Buffer;
  width: number;
  height: number;
  pageCount: number;
  previewFilename: string;
};

const MAX_EDGE = 2048;

async function rasterizePdf(buffer: Buffer): Promise<Omit<RasterResult, "previewFilename">> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isOffscreenCanvasSupported: false,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(MAX_EDGE / Math.max(base.width, base.height), 2.5);
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  // pdf.js v4+ wants an explicit canvas; napi-rs canvas is compatible enough at runtime.
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const png = Buffer.from(await canvas.encode("png"));
  return {
    png,
    width: canvas.width,
    height: canvas.height,
    pageCount: pdf.numPages,
  };
}

async function rasterizeImage(buffer: Buffer, mimeType: string): Promise<Omit<RasterResult, "previewFilename">> {
  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    const image = sharp(buffer).rotate();
    const meta = await image.metadata();
    const w = meta.width || 1;
    const h = meta.height || 1;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    const png = await image.resize(width, height, { fit: "inside" }).png().toBuffer();
    return { png, width, height, pageCount: 1 };
  } catch {
    if (mimeType === "image/png" || buffer.subarray(0, 8).toString("hex").startsWith("89504e47")) {
      return { png: buffer, width: 0, height: 0, pageCount: 1 };
    }
    throw new Error("Could not rasterize image for vision/OCR. Re-upload as PNG or JPG.");
  }
}

/**
 * Rasterize a blueprint file to PNG for vision/OCR and interactive measuring.
 * Writes `preview-{blueprintId}.png` under uploads/.
 */
export async function rasterizeBlueprintFile(opts: {
  filename: string;
  mimeType: string;
  blueprintId: string;
}): Promise<RasterResult> {
  const filePath = uploadFilePath(opts.filename);
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(opts.filename).toLowerCase();
  const isPdf = opts.mimeType === "application/pdf" || ext === ".pdf";

  let raster: Omit<RasterResult, "previewFilename">;
  if (isPdf) {
    raster = await rasterizePdf(buffer);
  } else if (opts.mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    raster = await rasterizeImage(buffer, opts.mimeType);
  } else {
    throw new Error(
      "Vision/OCR supports PDF and image plans (PNG/JPG/WEBP). DWG requires export to PDF first."
    );
  }

  const previewFilename = `preview-${opts.blueprintId}.png`;
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(uploadFilePath(previewFilename), raster.png);

  return { ...raster, previewFilename };
}

/** Extract embedded text from a PDF (native text layer — not OCR). */
export async function extractPdfText(buffer: Buffer, maxPages = 5): Promise<{ text: string; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isOffscreenCanvasSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pages = Math.min(pdf.numPages, maxPages);
  const chunks: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? String((item as { str: string }).str) : ""))
      .filter(Boolean)
      .join(" ");
    if (pageText.trim()) chunks.push(pageText);
  }
  return { text: chunks.join("\n"), pageCount: pdf.numPages };
}
