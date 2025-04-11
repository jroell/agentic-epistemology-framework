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

// Re-export all components from their respective modules
export * from './types';
export * from './core';
export * from './epistemic';
export * from './action';
export * from './observer';

// Export a version constant
export const VERSION = '1.0.0';

/**
 * Information about the framework
 */
export const FRAMEWORK_INFO = {
  name: 'Agentic Epistemology Framework',
  version: VERSION,
  description: 'A structured framework for reasoning in autonomous agents and synthetic societies',
  repository: 'https://github.com/yourusername/agentic-epistemology-framework',
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
import { EfficiencyFrame } from './epistemic/frame';

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
  const frame = new EfficiencyFrame();
  
  return new Agent(
    id,
    name,
    [], // Initial beliefs
    frame,
    new Set(), // Initial capabilities
    registry,
    memory,
    observer
  );
}
