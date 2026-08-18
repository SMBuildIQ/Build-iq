import { getAIProvider } from "./provider";
import { logAIActivity } from "./log";

// brief §15-16: the recommendation must weigh more than price and must always be
// explainable — the UI renders `rationale` verbatim next to the underlying quote
// data so a buyer can check the AI's reasoning against the real numbers.

export interface QuoteForRecommendation {
  quoteId: string;
  supplierName: string;
  totalLandedCost: number;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  warranty: string | null;
  supplierPerformanceScore: number | null;
}

export interface QuoteRecommendation {
  recommendedQuoteId: string;
  rationale: string;
  aiActivityLogId: string;
}

const PROMPT_VERSION = "quote-recommendation-v1";

const SYSTEM_PROMPT = `You are a B2B purchasing recommendation assistant. Given a list of supplier quotes
(each with total landed cost, lead time, payment terms, warranty, and a supplier performance score),
recommend the single best quote considering total landed cost, delivery timing, payment terms,
warranty, and supplier reliability — not price alone. Respond with ONLY a JSON object:
{"recommendedQuoteId": string, "rationale": string}. The rationale must explicitly name the
tradeoffs (e.g. "recommended despite being $X more because...").`;

function heuristicRecommendation(quotes: QuoteForRecommendation[]): { recommendedQuoteId: string; rationale: string } {
  const sorted = [...quotes].sort((a, b) => a.totalLandedCost - b.totalLandedCost);
  const cheapest = sorted[0];

  // Prefer a quote with a materially better performance score or terms even at a
  // modest cost premium — mirrors the brief §15 worked example — but only within
  // a small band, since this heuristic has no real language understanding.
  const better = sorted.find(
    (q) =>
      q.quoteId !== cheapest.quoteId &&
      q.totalLandedCost <= cheapest.totalLandedCost * 1.03 &&
      ((q.supplierPerformanceScore ?? 0) > (cheapest.supplierPerformanceScore ?? 0) + 10 ||
        (q.leadTimeDays !== null && cheapest.leadTimeDays !== null && q.leadTimeDays < cheapest.leadTimeDays - 2))
  );

  const winner = better ?? cheapest;
  const premium = winner.totalLandedCost - cheapest.totalLandedCost;
  const rationale =
    winner.quoteId === cheapest.quoteId
      ? `${winner.supplierName} has the lowest total landed cost ($${winner.totalLandedCost.toLocaleString()}) among ${quotes.length} quotes.`
      : `${winner.supplierName} is recommended despite being $${premium.toLocaleString()} more than the lowest bid ` +
        `(${cheapest.supplierName}) because of stronger terms: ${winner.leadTimeDays ?? "unknown"}-day lead time, ` +
        `${winner.paymentTerms ?? "unstated"} payment terms, and a supplier performance score of ` +
        `${winner.supplierPerformanceScore ?? "unrated"}.`;

  return { recommendedQuoteId: winner.quoteId, rationale };
}

function tryParseJson(text: string): { recommendedQuoteId: string; rationale: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (typeof parsed.recommendedQuoteId === "string" && typeof parsed.rationale === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function generateQuoteRecommendation(
  organizationId: string,
  purchaseRequestId: string,
  quotes: QuoteForRecommendation[]
): Promise<QuoteRecommendation> {
  const provider = getAIProvider();
  let result: { recommendedQuoteId: string; rationale: string };
  let output: string;

  if (provider.name === "mock") {
    result = heuristicRecommendation(quotes);
    output = JSON.stringify(result);
  } else {
    const completion = await provider.complete({
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(quotes),
      maxTokens: 512,
    });
    result = tryParseJson(completion.text) ?? heuristicRecommendation(quotes);
    output = completion.text;
  }

  const aiActivityLogId = await logAIActivity({
    organizationId,
    feature: "quote_recommendation",
    provider,
    promptVersion: PROMPT_VERSION,
    input: JSON.stringify(quotes),
    output,
    entityType: "PurchaseRequest",
    entityId: purchaseRequestId,
  });

  return { ...result, aiActivityLogId };
}
