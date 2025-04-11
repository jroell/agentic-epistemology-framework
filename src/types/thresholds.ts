/**
 * Configuration for various confidence thresholds used in the AEF
 */
export interface ConfidenceThresholds {
  /**
   * Minimum confidence required to take an action based on a belief
   */
  action: number;
  
  /**
   * Minimum confidence required to identify a belief conflict
   */
  conflict: number;
  
  /**
   * Minimum confidence required to communicate a belief to another agent
   */
  communication: number;
  
  /**
   * Minimum confidence required to store a belief in long-term memory
   */
  memory: number;
}

/**
 * Default confidence thresholds for belief-related operations
 */
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  action: 0.7,       // Minimum confidence to take action
  conflict: 0.6,     // Minimum confidence to identify a conflict
  communication: 0.5, // Minimum confidence to communicate a belief
  memory: 0.3        // Minimum confidence to store in long-term memory
};
