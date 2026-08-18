import type { AICompletionRequest, AICompletionResult, AIProvider } from "../types";

// Approximate Claude pricing for cost tracking (brief §26). Update alongside
// AI_MODEL; this is a display/analytics estimate, not a billing source of truth.
const USD_PER_1M_INPUT_TOKENS = 3;
const USD_PER_1M_OUTPUT_TOKENS = 15;

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private apiKey: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content.find((c) => c.type === "text")?.text ?? "";
    const tokensIn = data.usage?.input_tokens ?? 0;
    const tokensOut = data.usage?.output_tokens ?? 0;

    return {
      text,
      tokensIn,
      tokensOut,
      costUsd: (tokensIn / 1_000_000) * USD_PER_1M_INPUT_TOKENS + (tokensOut / 1_000_000) * USD_PER_1M_OUTPUT_TOKENS,
    };
  }
}
