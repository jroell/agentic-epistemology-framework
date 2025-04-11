import { clampConfidence, generateId, negateProp } from '../types/common';
import { Justification } from './justification';

/**
 * A proposition held by an agent with a confidence level and justification
 * 
 * Beliefs are the fundamental epistemic units in AEF, representing propositions
 * that agents hold to be true with varying degrees of confidence
 */
export class Belief {
  /**
   * Unique identifier for the belief
   */
  id: string;
  
  /**
   * The proposition that is believed (e.g., "The sky is blue")
   */
  proposition: string;
  
  /**
   * Confidence level for the belief (0-1)
   */
  confidence: number;
  
  /**
   * Justification supporting the belief
   */
  justification: Justification;
  
  /**
   * Timestamp when the belief was created or last updated
   */
  timestamp: number;

  /**
   * Create a new belief
   * 
   * @param proposition The proposition that is believed
   * @param confidence Confidence level (0-1)
   * @param justification Justification supporting the belief
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    proposition: string,
    confidence: number,
    justification: Justification,
    id?: string
  ) {
    this.id = id || generateId('belief');
    this.proposition = proposition;
    this.confidence = clampConfidence(confidence);
    this.justification = justification;
    this.timestamp = Date.now();
  }

  /**
   * Create a new belief with the negation of this belief's proposition
   * 
   * @returns A new belief with the negated proposition
   */
  negation(): Belief {
    return new Belief(
      negateProp(this.proposition),
      this.confidence,
      this.justification.clone()
    );
  }

  /**
   * Create a copy of this belief with updated confidence
   * 
   * @param newConfidence New confidence level
   * @returns A new belief with the updated confidence
   */
  withConfidence(newConfidence: number): Belief {
    return new Belief(
      this.proposition,
      newConfidence,
      this.justification,
      this.id
    );
  }

  /**
   * Create a copy of this belief with additional justification elements
   * 
   * @param additionalJustification Justification to add
   * @returns A new belief with the updated justification
   */
  withAdditionalJustification(additionalJustification: Justification): Belief {
    const updatedJustification = this.justification.merge(additionalJustification);
    
    return new Belief(
      this.proposition,
      this.confidence,
      updatedJustification,
      this.id
    );
  }

  /**
   * Create a copy of this belief with both updated confidence and justification
   * 
   * @param newConfidence New confidence level
   * @param additionalJustification Justification to add
   * @returns A new belief with the updates
   */
  withUpdates(newConfidence: number, additionalJustification: Justification): Belief {
    const updatedJustification = this.justification.merge(additionalJustification);
    
    return new Belief(
      this.proposition,
      newConfidence,
      updatedJustification,
      this.id
    );
  }

  /**
   * Check if this belief contradicts another belief
   * 
   * @param other The other belief to check against
   * @returns True if the beliefs contradict each other
   */
  contradicts(other: Belief): boolean {
    // Direct contradiction if one proposition is the negation of the other
    if (this.proposition === negateProp(other.proposition) ||
        other.proposition === negateProp(this.proposition)) {
      return true;
    }
    
    // TODO: Add more sophisticated contradiction detection
    // (e.g., logical inference, semantic contradiction, etc.)
    
    return false;
  }

  /**
   * Check if this belief is stronger than another belief
   * 
   * @param other The other belief to compare with
   * @returns True if this belief has higher confidence
   */
  isStrongerThan(other: Belief): boolean {
    return this.confidence > other.confidence;
  }

  /**
   * Calculate the age of this belief in milliseconds
   * 
   * @returns Age in milliseconds
   */
  getAge(): number {
    return Date.now() - this.timestamp;
  }

  /**
   * Create a string representation of the belief
   * 
   * @returns String representation
   */
  toString(): string {
    return `${this.proposition} (conf: ${this.confidence.toFixed(2)})`;
  }

  /**
   * Create a detailed string representation of the belief including justification
   * 
   * @returns Detailed string representation
   */
  toDetailedString(): string {
    return `Belief: ${this.proposition}\nConfidence: ${this.confidence.toFixed(2)}\nJustification: ${this.justification.toString()}`;
  }

  /**
   * Create a deep copy of this belief
   * 
   * @returns A new belief that is a deep copy of this one
   */
  clone(): Belief {
    return new Belief(
      this.proposition,
      this.confidence,
      this.justification.clone(),
      this.id
    );
  }
}