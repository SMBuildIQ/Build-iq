import { MATERIAL_CATALOG } from "@/lib/materials/catalog";
import type { DetectedMaterial } from "@/lib/ai/blueprint-analyzer";

export type VisionFinding = {
  sheetType?: string;
  scaleHint?: string;
  rooms?: string[];
  notes?: string[];
  measuredHints?: { label: string; quantity: number; unit: string; confidence?: number }[];
  materials?: { spruceSku: string; quantity: number; confidence?: number; reason?: string }[];
  rawSummary?: string;
};

export type VisionTakeoffResult = {
  findings: VisionFinding;
  materials: DetectedMaterial[];
  model: string;
  usedVision: boolean;
};

function mapMaterials(
  rows: { spruceSku: string; quantity: number; confidence?: number }[],
  source: DetectedMaterial["source"]
): DetectedMaterial[] {
  const bySku = new Map(MATERIAL_CATALOG.map((c) => [c.spruceSku, c]));
  const results: DetectedMaterial[] = [];
  for (const row of rows) {
    const item = bySku.get(row.spruceSku);
    if (!item || !row.quantity || row.quantity <= 0) continue;
    const qty = Math.round(row.quantity * 10) / 10;
    results.push({
      category: item.category,
      trade: item.trade,
      name: item.name,
      description: item.description,
      quantity: qty,
      unit: item.unit,
      unitCost: item.unitCost,
      laborHours: Math.round(qty * item.laborHoursPerUnit * 10) / 10,
      laborRate: item.laborRate,
      wasteFactor: item.wasteFactor,
      spruceSku: item.spruceSku,
      source,
      confidence: row.confidence ?? 0.8,
    });
  }
  return results;
}

/**
 * True drawing vision takeoff via OpenAI multimodal (gpt-4o).
 * Requires OPENAI_API_KEY. Sends a rasterized plan page as an image.
 */
export async function analyzePlanVision(opts: {
  png: Buffer;
  projectName: string;
  squareFeet: number;
  stories: number;
  sheetType?: string | null;
  originalName: string;
  ocrText?: string | null;
  notes?: string | null;
}): Promise<VisionTakeoffResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const catalogSummary = MATERIAL_CATALOG.map(
    (c) => `${c.spruceSku}|${c.name}|${c.unit}|$${c.unitCost}|${c.trade}`
  ).join("\n");

  const prompt = `You are a residential construction estimator performing TRUE drawing vision takeoff.
Inspect the attached plan image carefully. Use visible rooms, walls, openings, notes, and dimensions.
OCR/extracted text from the sheet (may be noisy):
${(opts.ocrText || "(none)").slice(0, 6000)}

Project: ${opts.projectName}
Declared square feet: ${opts.squareFeet}
Stories: ${opts.stories}
Sheet type hint: ${opts.sheetType || "unknown"}
Filename: ${opts.originalName}
Notes: ${opts.notes || "none"}

Catalog (sku|name|unit|cost|trade):
${catalogSummary}

Return JSON only:
{
  "sheetType": string,
  "scaleHint": string | null,
  "rooms": string[],
  "notes": string[],
  "measuredHints": [{ "label": string, "quantity": number, "unit": string, "confidence": number }],
  "materials": [{ "spruceSku": string, "quantity": number, "confidence": number, "reason": string }],
  "rawSummary": string
}

Rules:
- Prefer quantities grounded in what you see (wall lengths, openings, roof outline, notes).
- If a catalog item is not evidenced on this sheet, omit it or set low confidence.
- Include measuredHints for doors/windows/counts/lengths you can see.
- Do not invent unreachable precision; confidence reflects visual certainty.`;

  const b64 = opts.png.toString("base64");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o",
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: "You are a construction plan reader. Output valid JSON only.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${b64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Vision API error", res.status, errText.slice(0, 400));
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const findings = JSON.parse(content) as VisionFinding;
    const materials = mapMaterials(findings.materials || [], "ai-vision");

    return {
      findings: {
        ...findings,
        rawSummary: findings.rawSummary || data.choices?.[0]?.message?.content?.slice?.(0, 500),
      },
      materials,
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o",
      usedVision: true,
    };
  } catch (err) {
    console.error("Vision takeoff failed", err);
    return null;
  }
}
