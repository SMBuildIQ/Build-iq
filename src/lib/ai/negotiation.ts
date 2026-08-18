import { logAIActivity } from "./log";
import { getAIProvider } from "./provider";

// brief §17: "Design the system now so AI negotiations can eventually happen
// autonomously. For the MVP, negotiation can initially operate in assisted mode."
// This module only ever *drafts* a negotiation ask — nothing is sent to a
// supplier until a human calls the "send" transition (see
// /api/v1/negotiations/[id]/send). There is deliberately no function here that
// both drafts and sends: that separation is what keeps this assisted rather than
// autonomous regardless of what NegotiationAuthority.autoNegotiateEnabled says —
// autonomous execution is a future milestone, not a flag this code respects yet.

export interface NegotiationDraft {
  targetPrice: number;
  targetReductionPct: number;
  requestFreightInclusion: boolean;
  message: string;
  aiActivityLogId: string;
}

const PROMPT_VERSION = "negotiation-draft-v1";

export async function draftNegotiation(params: {
  organizationId: string;
  quoteId: string;
  supplierName: string;
  currentTotal: number;
  lowestQualifiedTotal: number;
  freight: number | null;
  freightIncluded: boolean;
}): Promise<NegotiationDraft> {
  const provider = getAIProvider();
  const gap = params.currentTotal - params.lowestQualifiedTotal;
  const gapPct = gap > 0 ? gap / params.currentTotal : 0;

  // Ask for roughly half the gap to the lowest qualified bid, floored at 3% —
  // a deterministic, explainable starting ask rather than an LLM guess at a number.
  const targetReductionPct = Math.max(0.03, Math.min(0.15, gapPct / 2));
  const targetPrice = Math.round(params.currentTotal * (1 - targetReductionPct));
  const requestFreightInclusion = !params.freightIncluded && (params.freight ?? 0) > 0;

  const message =
    `Thank you for your quote. To move forward, could you offer a ${(targetReductionPct * 100).toFixed(1)}% ` +
    `reduction, bringing the total to approximately $${targetPrice.toLocaleString()}` +
    (requestFreightInclusion ? ", with freight included" : "") +
    `? This would bring your offer in line with other quotes we've received for this request.`;

  const aiActivityLogId = await logAIActivity({
    organizationId: params.organizationId,
    feature: "negotiation_draft",
    provider,
    promptVersion: PROMPT_VERSION,
    input: JSON.stringify({ currentTotal: params.currentTotal, lowestQualifiedTotal: params.lowestQualifiedTotal }),
    output: message,
    entityType: "Quote",
    entityId: params.quoteId,
  });

  return { targetPrice, targetReductionPct, requestFreightInclusion, message, aiActivityLogId };
}
