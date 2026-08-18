import { prisma } from "@/lib/db";
import type { AIProvider } from "./types";

interface LogParams {
  organizationId: string | null;
  feature: string;
  provider: AIProvider;
  promptVersion: string;
  inputRef?: string;
  input?: string;
  output?: string;
  confidence?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  entityType?: string;
  entityId?: string;
}

/**
 * Every AI call in the system must be recorded through this function (brief §26):
 * model, prompt version, input reference, output, confidence, usage, and cost.
 * Returns the log id so callers can later attach human corrections (brief §27)
 * or mark the result accepted/rejected.
 */
export async function logAIActivity(params: LogParams): Promise<string> {
  const log = await prisma.aIActivityLog.create({
    data: {
      organizationId: params.organizationId,
      feature: params.feature,
      provider: params.provider.name,
      model: params.provider.model,
      promptVersion: params.promptVersion,
      inputRef: params.inputRef,
      input: params.input,
      output: params.output,
      confidence: params.confidence,
      tokensIn: params.tokensIn,
      tokensOut: params.tokensOut,
      costUsd: params.costUsd,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });
  return log.id;
}

/** Records a human correction to a previously logged AI result without ever
 * overwriting the original (brief §27). */
export async function recordAICorrection(params: {
  aiActivityLogId: string;
  fieldPath: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctedByUserId: string;
}) {
  await prisma.aICorrection.create({
    data: {
      aiActivityLogId: params.aiActivityLogId,
      fieldPath: params.fieldPath,
      originalValue: JSON.stringify(params.originalValue),
      correctedValue: JSON.stringify(params.correctedValue),
      correctedByUserId: params.correctedByUserId,
    },
  });
  await prisma.aIActivityLog.update({
    where: { id: params.aiActivityLogId },
    data: { acceptedResult: false },
  });
}
