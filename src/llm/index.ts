/**
 * LLM subsystem entry point.
 *
 * Prefer AiSdkClient + createLanguageModel. The Gemini-named classes are
 * deprecated shims kept for backwards compatibility.
 */
export type { LLMClient } from './llm-client';
export { AiSdkClient, type AiSdkClientOptions } from './ai-sdk-client';
export { MockLLMClient, type MockLLMClientOptions } from './mock-llm-client';
export {
  createLanguageModel,
  defaultOpenRouterModel,
  type LanguageModel,
  type ProviderId,
  type ProviderOptions,
} from './providers';

// Deprecated shims.
export { GeminiClient } from './gemini-client';
export { MockGeminiClient } from './mock-gemini-client';
