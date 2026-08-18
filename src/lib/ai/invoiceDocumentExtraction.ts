import { parseCsvRows, parseXlsxRows } from "@/lib/documents/tabularParse";
import { getAIProvider } from "./provider";
import { logAIActivity } from "./log";

// Mirrors quoteDocumentExtraction.ts's architecture, applied to supplier
// invoices instead of quotes: CSV/xlsx parse deterministically (no AI call),
// PDF/image goes through the same vision-capable AIProvider path, and
// everything honestly reports "unavailable" rather than fabricating a value
// when it can't actually read the document. Closes the "invoice entry is
// manual only" gap noted in KNOWN_LIMITATIONS.md.

export interface ExtractedInvoiceLineItem {
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  confidence: number;
}

export interface ExtractedInvoiceFields {
  invoiceNumber: string | null;
  lineItems: ExtractedInvoiceLineItem[];
  freight: number | null;
  tax: number | null;
  amount: number | null; // total invoice amount
  confidence: number;
}

export interface InvoiceExtractionResult {
  available: boolean;
  reason?: string;
  fields: ExtractedInvoiceFields | null;
  aiActivityLogId: string | null;
}

const EMPTY_FIELDS: ExtractedInvoiceFields = {
  invoiceNumber: null,
  lineItems: [],
  freight: null,
  tax: null,
  amount: null,
  confidence: 0,
};

/**
 * Expected columns (header row, order-independent, case-insensitive): sku
 * (optional), description, quantity, unit_price / unitprice, invoice_number
 * (optional, any row — last one wins), freight (optional, any row), tax
 * (optional, any row), amount / total (optional, any row — the invoice's
 * total, not a line total).
 */
function extractFieldsFromRows(rows: string[][]): ExtractedInvoiceFields {
  const dataRows = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (dataRows.length < 2) return EMPTY_FIELDS;

  const header = dataRows[0].map((h) => h.trim().toLowerCase().replace(/[\s_]+/g, ""));
  const col = (name: string) => header.indexOf(name);

  const skuCol = col("sku");
  const descCol = col("description");
  const qtyCol = col("quantity");
  const priceCol = header.indexOf("unitprice");
  const invoiceNumberCol = header.indexOf("invoicenumber");
  const freightCol = col("freight");
  const taxCol = col("tax");
  const amountCol = header.indexOf("amount") !== -1 ? header.indexOf("amount") : header.indexOf("total");

  if (descCol === -1 || qtyCol === -1 || priceCol === -1) return EMPTY_FIELDS;

  const lineItems: ExtractedInvoiceLineItem[] = [];
  let invoiceNumber: string | null = null;
  let freight: number | null = null;
  let tax: number | null = null;
  let amount: number | null = null;

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

    if (invoiceNumberCol !== -1 && cells[invoiceNumberCol]) invoiceNumber = cells[invoiceNumberCol];
    if (freightCol !== -1 && cells[freightCol]) freight = Number(cells[freightCol]) || freight;
    if (taxCol !== -1 && cells[taxCol]) tax = Number(cells[taxCol]) || tax;
    if (amountCol !== -1 && cells[amountCol]) amount = Number(cells[amountCol]) || amount;
  }

  return { invoiceNumber, lineItems, freight, tax, amount, confidence: lineItems.length > 0 ? 1 : 0 };
}

export function parseCsvInvoice(text: string): ExtractedInvoiceFields {
  return extractFieldsFromRows(parseCsvRows(text));
}

export async function parseXlsxInvoice(bytes: Buffer): Promise<ExtractedInvoiceFields> {
  return extractFieldsFromRows(await parseXlsxRows(bytes));
}

const PROMPT_VERSION = "invoice-document-extraction-v1";

const SYSTEM_PROMPT = `You extract structured data from a B2B supplier invoice document (PDF or image). Respond with
ONLY a JSON object (no prose, no markdown fences): {"invoiceNumber": string|null, "lineItems": [{"sku": string|null,
"description": string, "quantity": number, "unitPrice": number, "confidence": number between 0 and 1}],
"freight": number|null, "tax": number|null, "amount": number|null}. "amount" is the invoice's total amount due, not
a line total. Give each line item its own confidence reflecting how legible/unambiguous that specific value was in
the source document — do not default everything to 1. If you cannot read the document at all, return empty lineItems.`;

function tryParseJson(text: string): Partial<ExtractedInvoiceFields> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function extractInvoiceFromDocument(params: {
  organizationId: string;
  documentId: string;
  mimeType: string;
  base64: string;
}): Promise<InvoiceExtractionResult> {
  if (params.mimeType === "text/csv") {
    const text = Buffer.from(params.base64, "base64").toString("utf-8");
    const fields = parseCsvInvoice(text);
    return { available: fields.lineItems.length > 0, fields, aiActivityLogId: null, reason: fields.lineItems.length === 0 ? "No parseable rows found in CSV" : undefined };
  }

  if (params.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    const fields = await parseXlsxInvoice(Buffer.from(params.base64, "base64"));
    return { available: fields.lineItems.length > 0, fields, aiActivityLogId: null, reason: fields.lineItems.length === 0 ? "No parseable rows found in the first worksheet" : undefined };
  }

  if (params.mimeType === "application/vnd.ms-excel") {
    return {
      available: false,
      reason: "Legacy .xls files are not supported — please re-save as .xlsx or .csv, or enter this invoice manually.",
      fields: null,
      aiActivityLogId: null,
    };
  }

  const provider = getAIProvider();
  if (!provider.supportsDocuments) {
    return {
      available: false,
      reason: `AI_PROVIDER=${provider.name} has no vision support — configure AI_PROVIDER=anthropic to extract from PDF/image invoices, or enter this invoice manually.`,
      fields: null,
      aiActivityLogId: null,
    };
  }

  const completion = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: "Extract this supplier invoice.",
    document: { base64: params.base64, mimeType: params.mimeType },
    maxTokens: 2048,
  });

  const parsed = tryParseJson(completion.text);
  const fields: ExtractedInvoiceFields = parsed
    ? {
        invoiceNumber: parsed.invoiceNumber ?? null,
        lineItems: (parsed.lineItems ?? []).map((li) => ({ ...li, confidence: Math.max(0, Math.min(1, li.confidence ?? 0.5)) })),
        freight: parsed.freight ?? null,
        tax: parsed.tax ?? null,
        amount: parsed.amount ?? null,
        confidence: (parsed.lineItems ?? []).length > 0 ? Math.min(...(parsed.lineItems ?? []).map((li) => li.confidence ?? 0.5)) : 0,
      }
    : EMPTY_FIELDS;

  const aiActivityLogId = await logAIActivity({
    organizationId: params.organizationId,
    feature: "invoice_document_extraction",
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
