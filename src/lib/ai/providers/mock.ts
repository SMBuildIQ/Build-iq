import type { AICompletionRequest, AICompletionResult, AIProvider } from "../types";

/**
 * Deterministic, offline, zero-cost provider. Used automatically when no
 * ANTHROPIC_API_KEY is configured (AI_PROVIDER=mock, the default), and always
 * used in tests. Keeping every AI-backed flow runnable against this provider
 * is what lets tenant-isolation/policy/extraction tests run in CI without
 * network access or API costs.
 *
 * It does not call an LLM — it applies the same lightweight heuristics a
 * feature-specific caller (e.g. purchaseRequestExtraction.ts) supplies via the
 * prompt, echoed back as a best-effort structured guess. Callers that need
 * real language understanding should treat mock output as low-confidence.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock-heuristic-v1";
  readonly supportsDocuments = false;

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    if (req.document) {
      throw new Error(
        "MockProvider cannot process document/vision input — it has no real language understanding. " +
          "Callers must check provider.supportsDocuments before attaching a document, not assume it will work."
      );
    }
    return {
      text: req.prompt,
      tokensIn: Math.ceil(req.prompt.length / 4),
      tokensOut: 0,
      costUsd: 0,
    };
  }
}
