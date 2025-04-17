/**
 * Agentic Epistemology Framework (AEF)
 * TypeScript Reference Implementation
 * 
 * This implementation provides a comprehensive foundation for the AEF as described
 * in the paper "Agentic Epistemology: A Structured Framework for Reasoning in
 * Autonomous Agents and Synthetic Societies"
 * 
 * @version 1.0.0
 */
/// <reference lib="dom" />

// Re-export all components from their respective modules
// export * from './types'; // Remove this line to avoid duplicate export of deepCopy
export * from './core';
export * from './epistemic';
export * from './action';
export * from './observer';

export const VERSION = '1.0.0';

/**
 * Information about the framework
 */
export const FRAMEWORK_INFO = {
  name: 'Agentic Epistemology Framework',
  version: VERSION,
  description: 'A structured framework for reasoning in autonomous agents and synthetic societies',
  repository: 'https://github.com/jroell/agentic-epistemology-framework',
  license: 'MIT'
};

/**
 * Display framework information
 */
export function displayFrameworkInfo(): void {
  console.log(`${FRAMEWORK_INFO.name} v${FRAMEWORK_INFO.version}`);
  console.log(FRAMEWORK_INFO.description);
  console.log(`Repository: ${FRAMEWORK_INFO.repository}`);
  console.log(`License: ${FRAMEWORK_INFO.license}`);
}

// Create a sample agent instance with basic configuration
import { Agent } from './core/agent';
import { DefaultMemory } from './core/memory';
import { DefaultObserver } from './observer/default-observer';
import { Registry } from './core/registry';
import { EfficiencyFrame } from './epistemic/frame'; // Assuming this is a valid Frame implementation
import { GeminiClient } from './llm/gemini-client';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Create a default agent instance with basic configuration
 * 
 * @param id Agent ID
 * @param name Agent name
 * @returns A configured Agent instance
 */
export function createDefaultAgent(id: string, name: string): Agent {
  const registry = new Registry();
  const memory = new DefaultMemory();
  const observer = new DefaultObserver();
  const frame = new EfficiencyFrame(); // Ensure this frame exists and is correctly implemented

  // Instantiate GeminiClient - Ensure GEMINI_API_KEY is set in your .env file or environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }
  const geminiClient = new GeminiClient(apiKey);

  // Correct argument order: id, name, beliefs, frame, capabilities, registry, geminiClient, memory, observer
  return new Agent(
    id,
    name,
    [], // Initial beliefs
    frame,
    new Set(), // Initial capabilities
    registry,
    geminiClient, // Pass the client instance
    memory,
    observer
    // Confidence thresholds will use default
  );
}
