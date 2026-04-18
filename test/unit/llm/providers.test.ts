/**
 * Tests for the provider factory module.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createLanguageModel,
  defaultOpenRouterModel,
} from '../../../src/llm/providers';

describe('providers', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AEF_DEFAULT_MODEL;
    delete process.env.OPENROUTER_SITE_URL;
    delete process.env.OPENROUTER_SITE_NAME;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws a helpful error when the provider key is missing', () => {
    expect(() =>
      createLanguageModel({ provider: 'openai', model: 'gpt-4o-mini' }),
    ).toThrowError(/Missing API key/);
  });

  it('builds an OpenRouter chat model with explicit key', () => {
    const model = createLanguageModel({
      provider: 'openrouter',
      apiKey: 'test-key',
      model: 'anthropic/claude-sonnet-4',
    });
    expect(model.modelId).toBe('anthropic/claude-sonnet-4');
    expect(model.specificationVersion).toBe('v2');
  });

  it('reads OPENAI_API_KEY from env for openai provider', () => {
    process.env.OPENAI_API_KEY = 'oa-key';
    const model = createLanguageModel({
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    expect(model.modelId).toBe('gpt-4o-mini');
  });

  it('reads ANTHROPIC_API_KEY from env for anthropic provider', () => {
    process.env.ANTHROPIC_API_KEY = 'an-key';
    const model = createLanguageModel({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });
    expect(model.modelId).toBe('claude-sonnet-4-20250514');
  });

  it('reads GOOGLE_GENERATIVE_AI_API_KEY from env for google provider', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'g-key';
    const model = createLanguageModel({
      provider: 'google',
      model: 'gemini-2.0-flash',
    });
    expect(model.modelId).toBe('gemini-2.0-flash');
  });

  it('falls back to GEMINI_API_KEY for google provider', () => {
    process.env.GEMINI_API_KEY = 'g-legacy';
    const model = createLanguageModel({
      provider: 'google',
      model: 'gemini-2.0-flash',
    });
    expect(model.modelId).toBe('gemini-2.0-flash');
  });

  it('defaultOpenRouterModel uses AEF_DEFAULT_MODEL when provided', () => {
    process.env.OPENROUTER_API_KEY = 'or-key';
    process.env.AEF_DEFAULT_MODEL = 'openai/gpt-4.1-mini';
    const model = defaultOpenRouterModel();
    expect(model.modelId).toBe('openai/gpt-4.1-mini');
  });

  it('defaultOpenRouterModel falls back to a safe default', () => {
    process.env.OPENROUTER_API_KEY = 'or-key';
    const model = defaultOpenRouterModel();
    expect(model.modelId).toBe('anthropic/claude-sonnet-4');
  });

  it('defaultOpenRouterModel throws when no OpenRouter key is set', () => {
    expect(() => defaultOpenRouterModel()).toThrowError(/Missing API key/);
  });
});
