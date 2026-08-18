import ExcelJS from "exceljs";
import { getAIProvider } from "./provider";
import { logAIActivity } from "./log";

// brief §13: ingest supplier quotes from PDF/Excel/CSV/email and extract
// structured line items, pricing, freight, terms — every extracted value keeps
// its confidence and (via the caller, which owns document/quote linkage)
// traceability back to the source document. Low-confidence values must be
// flagged for human verification, never silently trusted.

export interface ExtractedQuoteLineItem {
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  confidence: number;
}

export interface ExtractedQuoteFields {
  lineItems: ExtractedQuoteLineItem[];
  freight: number | null;
  tax: number | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  warranty: string | null;
  confidence: number; // overall — the minimum of the confidences below, so a
  // single shaky field can't hide inside a high average
}

export interface QuoteExtractionResult {
  available: boolean;
  reason?: string; // set when available is false
  fields: ExtractedQuoteFields | null;
  aiActivityLogId: string | null;
}

const EMPTY_FIELDS: ExtractedQuoteFields = {
  lineItems: [],
  freight: null,
  tax: null,
  leadTimeDays: null,
  paymentTerms: null,
  warranty: null,
  confidence: 0,
};

/**
 * CSV is genuinely structured data, not a language-understanding problem —
 * this is a real, deterministic parser, not an AI heuristic, and every value
 * it produces is exact (confidence 1.0) because there's no interpretation
 * involved. Expected columns (header row, order-independent, case-insensitive):
 * sku (optional), description, quantity, unit_price / unitprice, freight
 * (optional, on any row — last one wins), lead_time_days (optional),
 * payment_terms (optional).
 */
/**
 * Shared column semantics for both CSV and Excel: each format is just a
 * different way of getting to a grid of string cells, and once it's a grid
 * the header-matching/row-parsing logic is identical. Same expected columns
 * as documented on parseCsvQuote/parseXlsxQuote below.
 */
function extractFieldsFromRows(rows: string[][]): ExtractedQuoteFields {
  const dataRows = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (dataRows.length < 2) return EMPTY_FIELDS;

  const header = dataRows[0].map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, ""));
  const col = (name: string) => header.indexOf(name);

  const skuCol = col("sku");
  const descCol = col("description");
  const qtyCol = col("quantity");
  const priceCol = header.indexOf("unitprice");
  const freightCol = col("freight");
  const leadTimeCol = header.indexOf("leadtimedays");
  const termsCol = header.indexOf("paymentterms");

  if (descCol === -1 || qtyCol === -1 || priceCol === -1) return EMPTY_FIELDS;

  const lineItems: ExtractedQuoteLineItem[] = [];
  let freight: number | null = null;
  let leadTimeDays: number | null = null;
  let paymentTerms: string | null = null;

  for (const cells of dataRows.slice(1)) {
    const quantity = Number(cells[qtyCol]);
    const unitPrice = Number(cells[priceCol]);
    if (!cells[descCol] || Number.isNaN(quantity) || Number.isNaN(unitPrice)) continue;

    lineItems.push({
      sku: skuCol !== -1 ? cells[skuCol] || null : null,
      description: cells[descCol],
      quantity,
      unitPrice,
      confidence: 1,
    });

    if (freightCol !== -1 && cells[freightCol]) freight = Number(cells[freightCol]) || freight;
    if (leadTimeCol !== -1 && cells[leadTimeCol]) leadTimeDays = Number(cells[leadTimeCol]) || leadTimeDays;
    if (termsCol !== -1 && cells[termsCol]) paymentTerms = cells[termsCol];
  }

  return { lineItems, freight, tax: null, leadTimeDays, paymentTerms, warranty: null, confidence: lineItems.length > 0 ? 1 : 0 };
}

/**
 * CSV is genuinely structured data, not a language-understanding problem —
 * this is a real, deterministic parser, not an AI heuristic, and every value
 * it produces is exact (confidence 1.0) because there's no interpretation
 * involved. Expected columns (header row, order-independent, case-insensitive):
 * sku (optional), description, quantity, unit_price / unitprice, freight
 * (optional, on any row — last one wins), lead_time_days (optional),
 * payment_terms (optional).
 */
export function parseCsvQuote(text: string): ExtractedQuoteFields {
  const rows = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((line) => line.split(",").map((c) => c.trim()));
  return extractFieldsFromRows(rows);
}

function excelCellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text; // hyperlink
    if ("result" in value) return excelCellText((value as { result: ExcelJS.CellValue }).result); // formula
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if (value instanceof Date) return value.toISOString();
  }
  return String(value).trim();
}

/**
 * Same deterministic, no-AI parsing as CSV — an .xlsx quote is structured
 * data, not a document a vision model should have to read. Uses the first
 * worksheet only and the same expected header columns as parseCsvQuote.
 */
export async function parseXlsxQuote(bytes: Buffer): Promise<ExtractedQuoteFields> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  } catch {
    return EMPTY_FIELDS;
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return EMPTY_FIELDS;

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(excelCellText(cell.value));
    });
    rows.push(cells);
  });

  return extractFieldsFromRows(rows);
}

const PROMPT_VERSION = "quote-document-extraction-v1";

const SYSTEM_PROMPT = `You extract structured data from a B2B supplier quote document (PDF or image). Respond with
ONLY a JSON object (no prose, no markdown fences): {"lineItems": [{"sku": string|null, "description": string,
"quantity": number, "unitPrice": number, "confidence": number between 0 and 1}], "freight": number|null,
"tax": number|null, "leadTimeDays": number|null, "paymentTerms": string|null, "warranty": string|null}.
Give each line item its own confidence reflecting how legible/unambiguous that specific value was in the source
document — do not default everything to 1. If you cannot read the document at all, return empty lineItems.`;

function tryParseJson(text: string): Partial<ExtractedQuoteFields> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Routes by mime type. CSV is parsed deterministically (no AI call, no
 * dependency on AI_PROVIDER). PDF/image requires a vision-capable provider —
 * under the mock provider (the default, and what CI/tests run against) this
 * honestly reports unavailable rather than fabricating extracted values; the
 * caller falls back to manual entry, exactly as if no document existed.
 */
export async function extractQuoteFromDocument(params: {
  organizationId: string;
  documentId: string;
  mimeType: string;
  base64: string;
}): Promise<QuoteExtractionResult> {
  if (params.mimeType === "text/csv") {
    const text = Buffer.from(params.base64, "base64").toString("utf-8");
    const fields = parseCsvQuote(text);
    return { available: fields.lineItems.length > 0, fields, aiActivityLogId: null, reason: fields.lineItems.length === 0 ? "No parseable rows found in CSV" : undefined };
  }

  if (params.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const fields = await parseXlsxQuote(Buffer.from(params.base64, "base64"));
    return { available: fields.lineItems.length > 0, fields, aiActivityLogId: null, reason: fields.lineItems.length === 0 ? "No parseable rows found in the first worksheet" : undefined };
  }

  if (params.mimeType === "application/vnd.ms-excel") {
    // Legacy binary .xls (pre-2007 format) — a different, non-OOXML binary
    // layout that the .xlsx parser above cannot read. Report honestly rather
    // than silently misparsing or routing to vision, which doesn't support
    // spreadsheets either.
    return {
      available: false,
      reason: "Legacy .xls files are not supported — please re-save as .xlsx or .csv, or enter this quote manually.",
      fields: null,
      aiActivityLogId: null,
    };
  }

  const provider = getAIProvider();
  if (!provider.supportsDocuments) {
    return {
      available: false,
      reason: `AI_PROVIDER=${provider.name} has no vision support — configure AI_PROVIDER=anthropic to extract from PDF/image quotes, or enter this quote manually.`,
      fields: null,
      aiActivityLogId: null,
    };
  }

  const completion = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: "Extract this supplier quote.",
    document: { base64: params.base64, mimeType: params.mimeType },
    maxTokens: 2048,
  });

  const parsed = tryParseJson(completion.text);
  const fields: ExtractedQuoteFields = parsed
    ? {
        lineItems: (parsed.lineItems ?? []).map((li) => ({ ...li, confidence: Math.max(0, Math.min(1, li.confidence ?? 0.5)) })),
        freight: parsed.freight ?? null,
        tax: parsed.tax ?? null,
        leadTimeDays: parsed.leadTimeDays ?? null,
        paymentTerms: parsed.paymentTerms ?? null,
        warranty: parsed.warranty ?? null,
        confidence: (parsed.lineItems ?? []).length > 0 ? Math.min(...(parsed.lineItems ?? []).map((li) => li.confidence ?? 0.5)) : 0,
      }
    : EMPTY_FIELDS;

  const aiActivityLogId = await logAIActivity({
    organizationId: params.organizationId,
    feature: "quote_document_extraction",
    provider,
    promptVersion: PROMPT_VERSION,
    inputRef: params.documentId,
    output: completion.text,
    confidence: fields.confidence,
    entityType: "Document",
    entityId: params.documentId,
  });

  return { available: fields.lineItems.length > 0, fields, aiActivityLogId, reason: fields.lineItems.length === 0 ? "The AI could not extract any line items from this document" : undefined };
}
