/**
 * Provider factory for the Agentic Epistemology Framework.
 *
 * The framework talks to the Vercel AI SDK through a `LanguageModel` instance,
 * so callers can swap providers without touching agent code.
 *
 * Default: OpenRouter, because one key gives you every major model.
 * You can also use OpenAI, Anthropic, or Google directly.
 */
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type LanguageModel = LanguageModelV2;

/**
 * Known provider ids. Extend this union when you wire a new provider.
 */
export type ProviderId = 'openrouter' | 'openai' | 'anthropic' | 'google';

export interface ProviderOptions {
  provider: ProviderId;
  /** API key. Falls back to the provider's standard env var if omitted. */
  apiKey?: string;
  /** Model slug recognized by the chosen provider. */
  model: string;
  /** Optional: attribution URL for OpenRouter's leaderboards. */
  siteUrl?: string;
  /** Optional: attribution app name for OpenRouter's leaderboards. */
  siteName?: string;
  /** Optional: override base URL (useful for self-hosted proxies). */
  baseURL?: string;
  /** Optional: custom fetch, mainly for testing. */
  fetch?: typeof fetch;
}

function envKey(provider: ProviderId): string | undefined {
  switch (provider) {
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'google':
      return (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        process.env.GEMINI_API_KEY
      );
  }
}

/**
 * Build a `LanguageModel` for the given provider.
 *
 * @example
 *   const model = createLanguageModel({ provider: 'openrouter', model: 'anthropic/claude-sonnet-4' });
 *   const client = new AiSdkClient(model);
 */
export function createLanguageModel(opts: ProviderOptions): LanguageModel {
  const apiKey = opts.apiKey ?? envKey(opts.provider);
  if (!apiKey) {
    throw new Error(
      `Missing API key for provider "${opts.provider}". ` +
        `Pass apiKey explicitly or set the corresponding environment variable.`,
    );
  }

  switch (opts.provider) {
    case 'openrouter': {
      const headers: Record<string, string> = {};
      if (opts.siteUrl) headers['HTTP-Referer'] = opts.siteUrl;
      if (opts.siteName) headers['X-Title'] = opts.siteName;
      const provider = createOpenRouter({
        apiKey,
        baseURL: opts.baseURL,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        fetch: opts.fetch,
      });
      return provider.chat(opts.model);
    }
    case 'openai': {
      const provider = createOpenAI({
        apiKey,
        baseURL: opts.baseURL,
        fetch: opts.fetch,
      });
      return provider(opts.model);
    }
    case 'anthropic': {
      const provider = createAnthropic({
        apiKey,
        baseURL: opts.baseURL,
        fetch: opts.fetch,
      });
      return provider(opts.model);
    }
    case 'google': {
      const provider = createGoogleGenerativeAI({
        apiKey,
        baseURL: opts.baseURL,
        fetch: opts.fetch,
      });
      return provider(opts.model);
    }
    default: {
      const exhaustive: never = opts.provider;
      throw new Error(`Unsupported provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * Convenience: OpenRouter model using env var `OPENROUTER_API_KEY` and
 * a default model from `AEF_DEFAULT_MODEL` or a safe fallback.
 */
export function defaultOpenRouterModel(overrides?: {
  apiKey?: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
}): LanguageModel {
  const model =
    overrides?.model ?? process.env.AEF_DEFAULT_MODEL ?? 'anthropic/claude-sonnet-4';
  return createLanguageModel({
    provider: 'openrouter',
    apiKey: overrides?.apiKey,
    model,
    siteUrl: overrides?.siteUrl ?? process.env.OPENROUTER_SITE_URL,
    siteName: overrides?.siteName ?? process.env.OPENROUTER_SITE_NAME,
  });
}
