// AI provider abstraction (brief §26): "Do not build the entire product around
// direct calls to a single LLM provider." Every AI-backed feature in this codebase
// depends on this interface, never on a specific vendor SDK/response shape.

export interface AICompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface AICompletionResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(req: AICompletionRequest): Promise<AICompletionResult>;
}
