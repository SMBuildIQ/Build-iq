// Deterministic, dependency-free extraction used (a) as the mock provider's
// extraction path so the whole "describe what you need" flow is testable and
// demoable with zero API key, and (b) as a fallback when a live LLM response
// fails to parse as JSON. It is intentionally simple regex/keyword matching —
// it does not pretend to understand language, which is why mock-mode results
// are always tagged with lower confidence than a real LLM extraction.

import type { ExtractedPurchaseFields } from "./purchaseRequestExtraction";

const KNOWN_MANUFACTURERS = [
  "Lenovo", "Dell", "HP", "Apple", "Microsoft", "Cisco", "Samsung", "LG",
  "Bosch", "Caterpillar", "DeWalt", "Milwaukee", "3M", "Honeywell", "Panasonic",
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function extractBudget(text: string): number | null {
  const match = text.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function extractQuantity(text: string): number | null {
  const match = text.match(/\b(\d[\d,]*)\s+(?:x\s+)?[a-zA-Z]/);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function extractManufacturer(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of KNOWN_MANUFACTURERS) {
    if (lower.includes(m.toLowerCase())) return m;
  }
  return null;
}

function extractDeliveryDate(text: string): string | null {
  const monthPattern = MONTHS.join("|");
  const re = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, "i");
  const match = text.match(re);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  const day = Number(match[2]);
  const year = match[3] ? Number(match[3]) : new Date().getFullYear();
  const date = new Date(Date.UTC(year, month, day));
  return date.toISOString();
}

function extractDeliveryLocation(text: string): string | null {
  const match = text.match(/(?:delivered to|deliver to|ship(?:ped)? to|to)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  return match ? match[1] : null;
}

function extractSubstitutions(text: string): string[] {
  const match = text.match(/([A-Z][a-zA-Z]+)\s+(?:models?|equivalents?)\s+(?:are|is)\s+acceptable/i);
  return match ? [match[1]] : [];
}

export function heuristicExtract(description: string): ExtractedPurchaseFields {
  return {
    productDescription: description.trim(),
    quantity: extractQuantity(description),
    specifications: null,
    manufacturer: extractManufacturer(description),
    modelOrSku: null,
    acceptableSubstitutions: extractSubstitutions(description),
    budget: extractBudget(description),
    requiredDeliveryDate: extractDeliveryDate(description),
    deliveryLocation: extractDeliveryLocation(description),
    warrantyRequirement: null,
    paymentTermsRequirement: null,
    certificationRequirement: null,
    preferredVendors: [],
    restrictedVendors: [],
    additionalInstructions: null,
  };
}
