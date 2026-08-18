import type { AIProvider } from "./types";
import { MockProvider } from "./providers/mock";
import { AnthropicProvider } from "./providers/anthropic";

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const kind = process.env.AI_PROVIDER ?? "mock";
  if (kind === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    cached = new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.AI_MODEL ?? "claude-sonnet-4-5");
  } else {
    cached = new MockProvider();
  }
  return cached;
}

/** Test-only escape hatch; production code should never call this. */
export function __setAIProviderForTests(provider: AIProvider | null) {
  cached = provider;
}
