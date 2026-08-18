import type { AICompletionRequest, AICompletionResult, AIProvider } from "../types";

// Approximate Claude pricing for cost tracking (brief §26). Update alongside
// AI_MODEL; this is a display/analytics estimate, not a billing source of truth.
const USD_PER_1M_INPUT_TOKENS = 3;
const USD_PER_1M_OUTPUT_TOKENS = 15;

const SUPPORTED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  readonly supportsDocuments = true;
  private apiKey: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResult> {
    let content: string | Array<Record<string, unknown>> = req.prompt;

    if (req.document) {
      if (!SUPPORTED_DOCUMENT_MIME_TYPES.has(req.document.mimeType)) {
        throw new Error(`Unsupported document type for vision extraction: ${req.document.mimeType}`);
      }
      const blockType = req.document.mimeType === "application/pdf" ? "document" : "image";
      content = [
        {
          type: blockType,
          source: { type: "base64", media_type: req.document.mimeType, data: req.document.base64 },
        },
        { type: "text", text: req.prompt },
      ];
    }

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
        messages: [{ role: "user", content }],
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
