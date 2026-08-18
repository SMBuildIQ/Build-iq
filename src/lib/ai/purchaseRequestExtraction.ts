import { getAIProvider } from "./provider";
import { logAIActivity } from "./log";
import { heuristicExtract } from "./heuristicExtractor";

// brief §5: turn a plain-English purchase description into structured data,
// and flag what's missing so the user is asked rather than the AI guessing.

export interface ExtractedPurchaseFields {
  productDescription: string;
  quantity: number | null;
  specifications: string | null;
  manufacturer: string | null;
  modelOrSku: string | null;
  acceptableSubstitutions: string[];
  budget: number | null;
  requiredDeliveryDate: string | null; // ISO date
  deliveryLocation: string | null;
  warrantyRequirement: string | null;
  paymentTermsRequirement: string | null;
  certificationRequirement: string | null;
  preferredVendors: string[];
  restrictedVendors: string[];
  additionalInstructions: string | null;
}

export interface ExtractionResult {
  fields: ExtractedPurchaseFields;
  missingCriticalFields: string[];
  confidence: number;
  aiActivityLogId: string;
}

const PROMPT_VERSION = "purchase-request-extraction-v1";

const CRITICAL_FIELDS: (keyof ExtractedPurchaseFields)[] = [
  "productDescription",
  "quantity",
  "requiredDeliveryDate",
  "deliveryLocation",
];

function findMissingCriticalFields(fields: ExtractedPurchaseFields): string[] {
  return CRITICAL_FIELDS.filter((key) => {
    const value = fields[key];
    return value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
}

const SYSTEM_PROMPT = `You are the purchasing intake assistant for a B2B procurement platform.
Extract a structured purchase request from the buyer's plain-English description.
Respond with ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
productDescription (string), quantity (number|null), specifications (string|null),
manufacturer (string|null), modelOrSku (string|null), acceptableSubstitutions (string[]),
budget (number|null), requiredDeliveryDate (ISO date string|null), deliveryLocation (string|null),
warrantyRequirement (string|null), paymentTermsRequirement (string|null),
certificationRequirement (string|null), preferredVendors (string[]), restrictedVendors (string[]),
additionalInstructions (string|null).
If a value is not stated, use null (or an empty array for list fields). Do not invent values.`;

function tryParseJson(text: string): Partial<ExtractedPurchaseFields> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function extractPurchaseRequest(
  organizationId: string,
  description: string
): Promise<ExtractionResult> {
  const provider = getAIProvider();

  let fields: ExtractedPurchaseFields;
  let confidence: number;
  let output: string;

  if (provider.name === "mock") {
    fields = heuristicExtract(description);
    confidence = 0.5;
    output = JSON.stringify(fields);
  } else {
    const completion = await provider.complete({
      system: SYSTEM_PROMPT,
      prompt: description,
      maxTokens: 1024,
    });
    const parsed = tryParseJson(completion.text);
    if (parsed) {
      fields = { ...heuristicExtract(description), ...parsed };
      confidence = 0.85;
    } else {
      fields = heuristicExtract(description);
      confidence = 0.4;
    }
    output = completion.text;
  }

  const missingCriticalFields = findMissingCriticalFields(fields);

  const aiActivityLogId = await logAIActivity({
    organizationId,
    feature: "purchase_request_extraction",
    provider,
    promptVersion: PROMPT_VERSION,
    input: description,
    output,
    confidence,
    entityType: "PurchaseRequest",
  });

  return { fields, missingCriticalFields, confidence, aiActivityLogId };
}
