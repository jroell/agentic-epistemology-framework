/**
 * MockGeminiClient (deprecated)
 *
 * Kept for backwards compatibility with pre-2.0 examples. Delegates to
 * MockLLMClient under the hood. Prefer MockLLMClient in new code.
 *
 * @deprecated Use MockLLMClient instead.
 */
import { MockLLMClient, type MockLLMClientOptions } from './mock-llm-client';

/** @deprecated Use MockLLMClient. */
export class MockGeminiClient extends MockLLMClient {
  constructor(options: MockLLMClientOptions = {}) {
    super(options);
  }
}
