import { prisma } from "@/lib/db";
import { getAIProvider } from "./provider";
import { logAIActivity } from "./log";
import { extractManufacturer } from "./heuristicExtractor";

// brief §25/§30: "Purchasing Intelligence Database... natural-language
// queries over structured purchasing data" — the /intelligence page was a
// PlannedModule stub. This is the real thing, built the same way every other
// AI feature in this codebase is: the AI's job is narrow and bounded
// (translate the question into a structured filter), and every number in the
// answer comes from a real, deterministic Prisma query against actual
// PurchaseOrderLineItem rows — the AI never composes the answer text itself,
// so it can never fabricate a dollar figure that isn't backed by real data.
// Case-insensitive matching is done in application code (not Prisma's
// `mode: "insensitive"`, which SQLite doesn't support) — same convention as
// src/lib/supplierMatching.ts.

export type QueryTimeframe = "all_time" | "last_month" | "last_quarter" | "last_year";

export interface PurchasingQueryFilter {
  manufacturer: string | null;
  category: string | null;
  keyword: string | null;
  timeframe: QueryTimeframe;
}

export interface PurchasingQueryLineItem {
  poNumber: string;
  purchaseOrderDate: Date;
  supplierName: string;
  description: string;
  manufacturer: string | null;
  category: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchasingQueryResult {
  filter: PurchasingQueryFilter;
  lineItems: PurchasingQueryLineItem[];
  totalSpent: number;
  lineItemCount: number;
  avgUnitPrice: number | null;
  answer: string;
  aiActivityLogId: string | null;
}

const PROMPT_VERSION = "purchasing-query-v1";
const MAX_CANDIDATE_ROWS = 500;

function timeframeStartDate(timeframe: QueryTimeframe): Date | null {
  const now = Date.now();
  const days = { last_month: 30, last_quarter: 90, last_year: 365 }[timeframe as "last_month" | "last_quarter" | "last_year"];
  return days ? new Date(now - days * 24 * 60 * 60 * 1000) : null;
}

function timeframeLabel(timeframe: QueryTimeframe): string {
  switch (timeframe) {
    case "last_month":
      return "in the last month";
    case "last_quarter":
      return "in the last quarter";
    case "last_year":
      return "in the last year";
    default:
      return "across all recorded purchase history";
  }
}

// Deterministic, dependency-free extraction — used directly under the mock
// provider (same "mock mode is real logic, not a canned response" approach
// as heuristicExtractor.ts), and as the fallback when a live LLM response
// fails to parse as JSON.
export function heuristicExtractQueryFilter(question: string): PurchasingQueryFilter {
  const manufacturer = extractManufacturer(question);

  const lower = question.toLowerCase();
  const timeframe: QueryTimeframe = /last month/.test(lower)
    ? "last_month"
    : /last quarter|past quarter/.test(lower)
      ? "last_quarter"
      : /last year|past year/.test(lower)
        ? "last_year"
        : "all_time";

  const phraseMatch = question.match(/(?:pay(?:ing)?|spend|spent|bought|buy|purchas\w*)\s+(?:for\s+)?(.+?)(?:\s+(?:last|this|in|since|during|over)\b|\?|$)/i);
  let keyword = phraseMatch ? phraseMatch[1].trim() : null;
  if (keyword && manufacturer) {
    keyword = keyword.replace(new RegExp(manufacturer, "i"), "").trim();
  }

  return { manufacturer, category: null, keyword: keyword || null, timeframe };
}

const SYSTEM_PROMPT = `You translate a natural-language question about purchasing history into a structured
filter. Respond with ONLY a JSON object (no prose, no markdown fences): {"manufacturer": string|null,
"category": string|null, "keyword": string|null (a short phrase to match against line item descriptions, e.g.
"laptops" or "HVAC parts" — not the whole question), "timeframe": "all_time"|"last_month"|"last_quarter"|"last_year"}.
Use null for anything not stated. Do not invent values.`;

function tryParseJson(text: string): Partial<PurchasingQueryFilter> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const VALID_TIMEFRAMES: QueryTimeframe[] = ["all_time", "last_month", "last_quarter", "last_year"];

function normalizeFilter(parsed: Partial<PurchasingQueryFilter> | null, question: string): PurchasingQueryFilter {
  if (!parsed) return heuristicExtractQueryFilter(question);
  return {
    manufacturer: typeof parsed.manufacturer === "string" ? parsed.manufacturer : null,
    category: typeof parsed.category === "string" ? parsed.category : null,
    keyword: typeof parsed.keyword === "string" ? parsed.keyword : null,
    timeframe: VALID_TIMEFRAMES.includes(parsed.timeframe as QueryTimeframe) ? (parsed.timeframe as QueryTimeframe) : "all_time",
  };
}

// A full-phrase substring match is too brittle for a heuristic-extracted
// keyword — "laptops" (the question's wording) failing to match a line item
// literally described as "laptop" (singular) is a false negative that makes
// the manufacturer filter's own narrowing useless. Matching per-word, with a
// trailing-"s" strip on both sides as a cheap singular/plural fold, is much
// closer to what a user actually means.
function keywordMatches(description: string, keyword: string): boolean {
  const descLower = description.toLowerCase();
  const words = keyword
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => (w.endsWith("s") ? w.slice(0, -1) : w));
  if (words.length === 0) return true;
  return words.some((w) => descLower.includes(w));
}

function buildAnswer(filter: PurchasingQueryFilter, count: number, totalSpent: number, avgUnitPrice: number | null): string {
  if (count === 0) {
    return `No purchase history found matching that query ${timeframeLabel(filter.timeframe)}.`;
  }
  const subject = [filter.manufacturer, filter.category, filter.keyword].filter(Boolean).join(" ") || "matching items";
  const avgPart = avgUnitPrice !== null ? `, averaging $${avgUnitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} per unit` : "";
  return `Found ${count} purchase order line item${count === 1 ? "" : "s"} for ${subject} ${timeframeLabel(filter.timeframe)}: total spend $${totalSpent.toLocaleString("en-US", { maximumFractionDigits: 2 })}${avgPart}.`;
}

export async function runPurchasingQuery(organizationId: string, question: string): Promise<PurchasingQueryResult> {
  const provider = getAIProvider();
  let filter: PurchasingQueryFilter;
  let aiActivityLogId: string | null = null;

  if (provider.name === "mock") {
    filter = heuristicExtractQueryFilter(question);
  } else {
    const completion = await provider.complete({ system: SYSTEM_PROMPT, prompt: question, maxTokens: 512 });
    filter = normalizeFilter(tryParseJson(completion.text), question);
    aiActivityLogId = await logAIActivity({
      organizationId,
      feature: "purchasing_query",
      provider,
      promptVersion: PROMPT_VERSION,
      input: question,
      output: completion.text,
      confidence: tryParseJson(completion.text) ? 0.8 : 0.4,
    });
  }

  const startDate = timeframeStartDate(filter.timeframe);
  const candidates = await prisma.purchaseOrderLineItem.findMany({
    where: {
      purchaseOrder: {
        organizationId,
        status: { notIn: ["cancelled"] },
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
    },
    include: { purchaseOrder: { include: { supplier: true } }, rfqLineItem: { include: { sourceLineItem: true } } },
    orderBy: { purchaseOrder: { createdAt: "desc" } },
    take: MAX_CANDIDATE_ROWS,
  });

  const manufacturerLower = filter.manufacturer?.toLowerCase() ?? null;
  const categoryLower = filter.category?.toLowerCase() ?? null;
  const keywordLower = filter.keyword?.toLowerCase() ?? null;

  const matched = candidates.filter((li) => {
    const source = li.rfqLineItem?.sourceLineItem;
    if (manufacturerLower && source?.manufacturer?.toLowerCase() !== manufacturerLower) return false;
    if (categoryLower && source?.category?.toLowerCase() !== categoryLower) return false;
    if (keywordLower && !keywordMatches(li.description, keywordLower)) return false;
    return true;
  });

  const lineItems: PurchasingQueryLineItem[] = matched.map((li) => ({
    poNumber: li.purchaseOrder.poNumber,
    purchaseOrderDate: li.purchaseOrder.createdAt,
    supplierName: li.purchaseOrder.supplier.name,
    description: li.description,
    manufacturer: li.rfqLineItem?.sourceLineItem?.manufacturer ?? null,
    category: li.rfqLineItem?.sourceLineItem?.category ?? null,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    total: li.total,
  }));

  const totalSpent = lineItems.reduce((sum, li) => sum + li.total, 0);
  const avgUnitPrice = lineItems.length > 0 ? lineItems.reduce((sum, li) => sum + li.unitPrice, 0) / lineItems.length : null;

  if (!aiActivityLogId && provider.name === "mock") {
    aiActivityLogId = await logAIActivity({
      organizationId,
      feature: "purchasing_query",
      provider,
      promptVersion: PROMPT_VERSION,
      input: question,
      output: JSON.stringify(filter),
      confidence: 0.5,
    });
  }

  return {
    filter,
    lineItems,
    totalSpent,
    lineItemCount: lineItems.length,
    avgUnitPrice,
    answer: buildAnswer(filter, lineItems.length, totalSpent, avgUnitPrice),
    aiActivityLogId,
  };
}
