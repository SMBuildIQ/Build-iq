// AI provider abstraction (brief §26): "Do not build the entire product around
// direct calls to a single LLM provider." Every AI-backed feature in this codebase
// depends on this interface, never on a specific vendor SDK/response shape.

export interface AICompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Attach a document (PDF or image) for providers that support vision input.
   * Providers without vision support should throw rather than silently
   * ignoring it — see MockProvider. */
  document?: { base64: string; mimeType: string };
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
  /** Whether this provider can process an AICompletionRequest.document (PDF/image vision). */
  readonly supportsDocuments: boolean;
  complete(req: AICompletionRequest): Promise<AICompletionResult>;
}
