/**
 * GeminiClient (deprecated)
 *
 * Thin backwards-compatibility wrapper around AiSdkClient that targets
 * Google's Gemini models through the Vercel AI SDK. New code should use
 * AiSdkClient directly with `createLanguageModel({ provider: 'google', ... })`
 * or any other provider.
 *
 * @deprecated Use AiSdkClient + createLanguageModel instead.
 */
import { AiSdkClient, type AiSdkClientOptions } from './ai-sdk-client';
import { createLanguageModel } from './providers';

export interface GeminiClientOptions extends Omit<AiSdkClientOptions, 'model'> {
  apiKey?: string;
  modelName?: string;
}

/**
 * @deprecated Prefer AiSdkClient. Left in place to avoid breaking older examples.
 */
export class GeminiClient extends AiSdkClient {
  constructor(apiKey?: string, modelName = 'gemini-2.0-flash', options: GeminiClientOptions = {}) {
    const key =
      apiKey ??
      options.apiKey ??
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
      process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        'GeminiClient requires a Google API key. Set GOOGLE_GENERATIVE_AI_API_KEY or pass apiKey explicitly.',
      );
    }
    const model = createLanguageModel({
      provider: 'google',
      apiKey: key,
      model: options['modelName' as keyof GeminiClientOptions] as string ?? modelName,
    });
    super({
      model,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      abortSignal: options.abortSignal,
      silent: options.silent,
    });
  }
}
