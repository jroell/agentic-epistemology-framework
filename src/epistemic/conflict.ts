import { EntityId, generateId } from '../types/common';
import { Belief } from './belief';

/**
 * Represents an epistemic conflict between two beliefs
 * 
 * An epistemic conflict occurs when two agents (or the same agent) hold
 * contradictory beliefs with confidence exceeding a threshold
 */
export class EpistemicConflict {
  /**
   * Unique identifier for the conflict
   */
  id: string;
  
  /**
   * ID of the first agent involved in the conflict
   */
  agentId: EntityId;
  
  /**
   * ID of the second agent involved in the conflict
   */
  otherAgentId: EntityId;
  
  /**
   * Proposition held by the first agent
   */
  proposition: string;
  
  /**
   * Belief held by the first agent
   */
  belief: Belief;
  
  /**
   * Contradictory belief held by the second agent
   */
  contradictoryBelief: Belief;
  
  /**
   * Timestamp when the conflict was detected
   */
  timestamp: number;
  
  /**
   * Resolution status of the conflict
   */
  status: ConflictStatus;
  
  /**
   * Resolution details if the conflict has been resolved
   */
  resolution?: ConflictResolution;

  /**
   * Create a new epistemic conflict
   * 
   * @param agentId ID of the first agent involved
   * @param otherAgentId ID of the second agent involved
   * @param proposition Proposition held by the first agent
   * @param belief Belief held by the first agent
   * @param contradictoryBelief Contradictory belief held by the second agent
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    agentId: EntityId,
    otherAgentId: EntityId,
    proposition: string,
    belief: Belief,
    contradictoryBelief: Belief,
    id?: string
  ) {
    this.id = id || generateId('conflict');
    this.agentId = agentId;
    this.otherAgentId = otherAgentId;
    this.proposition = proposition;
    this.belief = belief;
    this.contradictoryBelief = contradictoryBelief;
    this.timestamp = Date.now();
    this.status = ConflictStatus.Detected;
  }

  /**
   * Mark the conflict as being in process of resolution
   */
  markInProgress(): void {
    this.status = ConflictStatus.InProgress;
  }

  /**
   * Mark the conflict as resolved with the specified resolution
   * 
   * @param resolution Resolution of the conflict
   */
  markResolved(resolution: ConflictResolution): void {
    this.status = ConflictStatus.Resolved;
    this.resolution = resolution;
  }

  /**
   * Mark the conflict as persistent (irreconcilable)
   * 
   * @param reason Reason why the conflict couldn't be resolved
   */
  markPersistent(reason: string): void {
    this.status = ConflictStatus.Persistent;
    this.resolution = {
      type: ResolutionType.Persistent,
      reason,
      timestamp: Date.now()
    };
  }

  /**
   * Create a string representation of the conflict
   * 
   * @returns String representation
   */
  toString(): string {
    return `Conflict between Agent ${this.agentId} and Agent ${this.otherAgentId}: "${this.proposition}" (${this.status})`;
  }
}

/**
 * Status of an epistemic conflict
 */
export enum ConflictStatus {
  /**
   * Conflict has been detected but no resolution attempt has been made
   */
  Detected = 'detected',
  
  /**
   * Resolution attempt is in progress
   */
  InProgress = 'in_progress',
  
  /**
   * Conflict has been resolved
   */
  Resolved = 'resolved',
  
  /**
   * Conflict is persistent and cannot be resolved
   */
  Persistent = 'persistent'
}

/**
 * Type of conflict resolution
 */
export enum ResolutionType {
  /**
   * First agent revised its belief
   */
  FirstAgentRevision = 'first_agent_revision',
  
  /**
   * Second agent revised its belief
   */
  SecondAgentRevision = 'second_agent_revision',
  
  /**
   * Both agents revised their beliefs
   */
  MutualRevision = 'mutual_revision',
  
  /**
   * Conflict was deemed to be due to frame differences
   */
  FrameDifference = 'frame_difference',
  
  /**
   * Conflict is persistent and irreconcilable
   */
  Persistent = 'persistent'
}

/**
 * Details of a conflict resolution
 */
export interface ConflictResolution {
  /**
   * Type of resolution
   */
  type: ResolutionType;
  
  /**
   * Reason for the resolution
   */
  reason: string;
  
  /**
   * Timestamp when the conflict was resolved
   */
  timestamp: number;
  
  /**
   * Updated belief of the first agent (if applicable)
   */
  updatedBelief?: Belief;
  
  /**
   * Updated belief of the second agent (if applicable)
   */
  updatedContradictoryBelief?: Belief;
}

/**
 * Strategy for resolving epistemic conflicts
 */
export interface ConflictResolutionStrategy {
  /**
   * Attempt to resolve a conflict
   * 
   * @param conflict The conflict to resolve
   * @returns Resolution result
   */
  resolveConflict(conflict: EpistemicConflict): Promise<ConflictResolutionResult>;
}

/**
 * Result of a conflict resolution attempt
 */
export interface ConflictResolutionResult {
  /**
   * Whether the resolution was successful
   */
  success: boolean;
  
  /**
   * Type of resolution
   */
  type: ResolutionType;
  
  /**
   * Reason for the resolution
   */
  reason: string;
  
  /**
   * Updated belief of the first agent (if applicable)
   */
  updatedBelief?: Belief;
  
  /**
   * Updated belief of the second agent (if applicable)
   */
  updatedContradictoryBelief?: Belief;
}

/**
 * Strategy that resolves conflicts through justification exchange
 */
export class JustificationExchangeStrategy implements ConflictResolutionStrategy {
  /**
   * Confidence threshold for belief revisions
   */
  confidenceRevisionThreshold: number;

  /**
   * Create a new justification exchange strategy
   * 
   * @param confidenceRevisionThreshold Confidence threshold for belief revisions
   */
  constructor(confidenceRevisionThreshold: number = 0.1) {
    this.confidenceRevisionThreshold = confidenceRevisionThreshold;
  }

  /**
   * Attempt to resolve a conflict through justification exchange
   * 
   * @param conflict The conflict to resolve
   * @returns Resolution result
   */
  async resolveConflict(conflict: EpistemicConflict): Promise<ConflictResolutionResult> {
    // This would be a more complex implementation in a real system
    // Here we provide a simplified version
    
    // Simulate confidence adjustments based on justification exchange
    const belief1ConfidenceDelta = this.simulateConfidenceAdjustment(
      conflict.belief, 
      conflict.contradictoryBelief.justification
    );
    
    const belief2ConfidenceDelta = this.simulateConfidenceAdjustment(
      conflict.contradictoryBelief,
      conflict.belief.justification
    );
    
    // Calculate new confidence values
    const newBelief1Confidence = conflict.belief.confidence + belief1ConfidenceDelta;
    const newBelief2Confidence = conflict.contradictoryBelief.confidence + belief2ConfidenceDelta;
    
    // Create updated beliefs
    const updatedBelief1 = conflict.belief.withConfidence(newBelief1Confidence);
    const updatedBelief2 = conflict.contradictoryBelief.withConfidence(newBelief2Confidence);
    
    // Determine resolution type based on confidence changes
    if (Math.abs(belief1ConfidenceDelta) >= this.confidenceRevisionThreshold &&
        Math.abs(belief2ConfidenceDelta) >= this.confidenceRevisionThreshold) {
      // Both agents revised their beliefs
      return {
        success: true,
        type: ResolutionType.MutualRevision,
        reason: "Both agents adjusted their confidence based on shared justifications",
        updatedBelief: updatedBelief1,
        updatedContradictoryBelief: updatedBelief2
      };
    } else if (Math.abs(belief1ConfidenceDelta) >= this.confidenceRevisionThreshold) {
      // Only first agent revised belief
      return {
        success: true,
        type: ResolutionType.FirstAgentRevision,
        reason: "First agent adjusted confidence based on second agent's justification",
        updatedBelief: updatedBelief1
      };
    } else if (Math.abs(belief2ConfidenceDelta) >= this.confidenceRevisionThreshold) {
      // Only second agent revised belief
      return {
        success: true,
        type: ResolutionType.SecondAgentRevision,
        reason: "Second agent adjusted confidence based on first agent's justification",
        updatedContradictoryBelief: updatedBelief2
      };
    } else {
      // Neither agent revised belief significantly
      return {
        success: false,
        type: ResolutionType.Persistent,
        reason: "Justification exchange did not result in significant confidence changes"
      };
    }
  }

  /**
   * Simulate confidence adjustment based on justification exchange
   * 
   * @param belief The belief to adjust
   * @param otherJustification Justification from the other agent
   * @returns Confidence delta
   */
  private simulateConfidenceAdjustment(
    belief: Belief, 
    otherJustification: any
  ): number {
    // This is a simplified simulation
    // In a real implementation, this would involve semantic analysis
    // of the justifications and more complex belief revision logic
    
    // Check justification strength
    const otherJustificationStrength = otherJustification.elements.length;
    const ownJustificationStrength = belief.justification.elements.length;
    
    // Calculate relative strength
    const relativeStrength = otherJustificationStrength - ownJustificationStrength;
    
    // Adjust confidence based on relative strength
    let confidenceDelta = 0;
    
    if (relativeStrength > 0) {
      // Other justification is stronger, reduce confidence
      confidenceDelta = -0.1 * Math.min(relativeStrength, 5) / 5;
    } else if (relativeStrength < 0) {
      // Own justification is stronger, increase confidence
      confidenceDelta = 0.05 * Math.min(-relativeStrength, 5) / 5;
    }
    
    // Add some randomness to simulate nuanced evaluation
    confidenceDelta += (Math.random() - 0.5) * 0.05;
    
    return confidenceDelta;
  }
}
