import { createWorker } from "tesseract.js";
import { parseDimensionTokens } from "@/lib/plans/geometry";

export type OcrBlock = {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

export type OcrResult = {
  text: string;
  confidence: number;
  blocks: OcrBlock[];
  dimensions: { raw: string; feet: number }[];
  engine: "tesseract" | "pdf-text" | "hybrid";
};

type TessWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type TessLine = { words?: TessWord[] };
type TessPara = { lines?: TessLine[] };
type TessBlock = { paragraphs?: TessPara[] };

function collectWords(blocks: TessBlock[] | undefined): OcrBlock[] {
  const out: OcrBlock[] = [];
  for (const block of blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        for (const w of line.words || []) {
          if (!w.text || (w.confidence ?? 0) <= 40) continue;
          out.push({
            text: w.text,
            confidence: (w.confidence ?? 0) / 100,
            bbox: w.bbox
              ? { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 }
              : undefined,
          });
          if (out.length >= 400) return out;
        }
      }
    }
  }
  return out;
}

/**
 * Run Tesseract OCR on a PNG/JPEG buffer.
 * Best for scanned drawings; vector PDFs should combine with extractPdfText.
 */
export async function runOcrOnImage(png: Buffer): Promise<OcrResult> {
  const worker = await createWorker("eng", 1, {
    logger: () => undefined,
  });

  try {
    const { data } = await worker.recognize(png);
    const text = String(data.text || "");
    const confidence = Number(data.confidence || 0);
    const blocks = collectWords(data.blocks as TessBlock[] | undefined);

    const cleaned = text.replace(/\s+/g, " ").trim();
    const dimensions = parseDimensionTokens(cleaned);

    return {
      text: cleaned.slice(0, 20000),
      confidence: confidence / 100,
      blocks,
      dimensions,
      engine: "tesseract",
    };
  } finally {
    await worker.terminate();
  }
}

export function mergeOcrWithPdfText(
  ocr: OcrResult | null,
  pdfText: string
): OcrResult {
  const merged = [pdfText.trim(), ocr?.text || ""].filter(Boolean).join("\n\n");
  const dimensions = parseDimensionTokens(merged);
  return {
    text: merged.slice(0, 20000),
    confidence: ocr?.confidence ?? (pdfText.trim() ? 0.9 : 0),
    blocks: ocr?.blocks || [],
    dimensions,
    engine: ocr && pdfText.trim() ? "hybrid" : pdfText.trim() ? "pdf-text" : "tesseract",
  };
}
