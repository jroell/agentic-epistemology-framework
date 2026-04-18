/**
 * Agentic Epistemology Framework (AEF)
 * TypeScript Reference Implementation
 *
 * Companion implementation for the paper "Agentic Epistemology: A Structured
 * Framework for Reasoning in Autonomous Agents and Synthetic Societies".
 *
 * Version 2.0 introduces a provider-agnostic LLM layer built on the Vercel AI SDK.
 * OpenRouter is the default provider, so one API key grants access to every
 * major model. Swap providers with a one-line call to createLanguageModel().
 *
 * @version 2.0.0
 */
import * as dotenv from 'dotenv';

// Re-export all components from their respective modules
export * from './core';
export * from './epistemic';
export * from './action';
export * from './observer';
export * from './llm';

export const VERSION = '2.0.0';

/**
 * Information about the framework
 */
export const FRAMEWORK_INFO = {
  name: 'Agentic Epistemology Framework',
  version: VERSION,
  description:
    'A structured framework for reasoning in autonomous agents and synthetic societies',
  repository: 'https://github.com/jroell/agentic-epistemology-framework',
  license: 'MIT',
};

/**
 * Display framework information
 */
export function displayFrameworkInfo(): void {
  // eslint-disable-next-line no-console
  console.log(`${FRAMEWORK_INFO.name} v${FRAMEWORK_INFO.version}`);
  // eslint-disable-next-line no-console
  console.log(FRAMEWORK_INFO.description);
  // eslint-disable-next-line no-console
  console.log(`Repository: ${FRAMEWORK_INFO.repository}`);
  // eslint-disable-next-line no-console
  console.log(`License: ${FRAMEWORK_INFO.license}`);
}

// Load env once when the package is imported.
dotenv.config();

import { Agent } from './core/agent';
import { DefaultMemory } from './core/memory';
import { DefaultObserver } from './observer/default-observer';
import { Registry } from './core/registry';
import { EfficiencyFrame } from './epistemic/frame';
import { AiSdkClient } from './llm/ai-sdk-client';
import { defaultOpenRouterModel, createLanguageModel, type ProviderOptions } from './llm/providers';
import type { LLMClient } from './llm/llm-client';

export interface CreateDefaultAgentOptions {
  /** Override the default LLM client. If omitted, OpenRouter is used via env. */
  llmClient?: LLMClient;
  /** Override just the model selection. Passes through to createLanguageModel. */
  provider?: ProviderOptions;
}

/**
 * Build a ready-to-use Agent backed by the default OpenRouter model.
 *
 * @param id Agent ID
 * @param name Agent name
 * @param options Optional overrides
 */
export function createDefaultAgent(
  id: string,
  name: string,
  options: CreateDefaultAgentOptions = {},
): Agent {
  const registry = new Registry();
  const memory = new DefaultMemory();
  const observer = new DefaultObserver();
  const frame = new EfficiencyFrame();

  const llmClient =
    options.llmClient ??
    new AiSdkClient({
      model: options.provider
        ? createLanguageModel(options.provider)
        : defaultOpenRouterModel(),
    });

  return new Agent(
    id,
    name,
    [],
    frame,
    new Set(),
    registry,
    llmClient,
    memory,
    observer,
  );
}
