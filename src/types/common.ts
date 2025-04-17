/**
 * Common type definitions for the Agentic Epistemology Framework
 */

/**
 * Unique identifier for entities in the framework
 */
export type EntityId = string;

/**
 * Proposition type alias for strings representing statements
 */
export type Proposition = string;

/**
 * Clamp a value between min and max (inclusive)
 * @param value The value to clamp
 * @param min The minimum value (default: 0)
 * @param max The maximum value (default: 1)
 * @returns The clamped value
 */
export function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp a confidence value to ensure it's between 0 and 1
 * @param value The confidence value to clamp
 * @returns The clamped confidence value
 */
export function clampConfidence(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Negate a proposition string
 * @param proposition The proposition to negate
 * @returns The negated proposition
 */
export function negateProp(proposition: string): string {
  if (proposition.startsWith('¬')) {
    return proposition.substring(1);
  } else {
    return `¬${proposition}`;
  }
}

/**
 * Generate a unique ID with optional prefix
 * @param prefix Optional prefix for the ID (default: "id")
 * @returns A unique ID string
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep copy an object
 * @param obj The object to copy
 * @returns A deep copy of the object
 */
export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Evidence interface for objects that can provide confidence about propositions
 */
export interface Evidence {
  getConfidence(proposition: Proposition): number;
}

// Re-export the justification types from the justification module
export { 
  Justification, 
  JustificationElement, 
  ToolResultJustificationElement,
  TestimonyJustificationElement,
  ObservationJustificationElement,
  InferenceJustificationElement,
  ExternalJustificationElement
} from '../epistemic/justification';
