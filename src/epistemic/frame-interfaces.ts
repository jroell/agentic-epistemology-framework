/**
 * SOLID-Compliant Frame Architecture for Agentic Epistemology Framework (AEF)
 * 
 * This file implements the mathematical formalism from AEF Paper Section 5.4.3
 * using SOLID principles to maximize extensibility and maintainability.
 * 
 * Key Mathematical Functions Implemented:
 * - w_F(e): Frame-dependent evidence weight ∈ [0,1]
 * - trust(e_source, F): Source trust ∈ [0,1] 
 * - C(e,P): Evidence confidence calculation ∈ [0,1]
 * - Frame-Weighted Update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)
 * - Source-Trust Update: conf_new = (1 - α) * conf_old + α * trust(e_source, F)
 * - Bayesian Update: P(P|e) = P(e|P) * conf_old / [P(e|P) * conf_old + P(e|¬P) * (1 - conf_old)]
 */

import type { Proposition, Justification, JustificationElement } from '../types/common';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';

// ============================================================================
// SINGLE RESPONSIBILITY PRINCIPLE (SRP) - Focused Interfaces
// ============================================================================

/**
 * Basic frame identity and metadata
 * Responsibility: Just frame identification and description
 */
export interface IFrameIdentity {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly frameType: string; // For categorization and registry
}

/**
 * Frame-dependent evidence weighting function w_F(e) from AEF Paper Section 5.4.2
 * Responsibility: Calculate how much attention/weight a frame assigns to evidence
 */
export interface IEvidenceWeighter {
  /**
   * Calculate frame-dependent evidence weight w_F(e) ∈ [0,1]
   * High weight = frame considers evidence highly relevant
   * Low weight = frame discounts or ignores evidence
   * 
   * @param evidence Evidence element to weight
   * @param proposition Proposition being evaluated
   * @param context Additional context for weighting decision
   * @returns Promise resolving to weight value ∈ [0,1]
   */
  calculateEvidenceWeight(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number>;
}

/**
 * Source trust evaluation function trust(e_source, F) from AEF Paper Section 5.4.3.B
 * Responsibility: Evaluate trustworthiness of evidence sources under this frame
 */
export interface ISourceTrustEvaluator {
  /**
   * Calculate trust(e_source, F) ∈ [0,1] for evidence source
   * 
   * @param source Source identifier or descriptor
   * @param evidenceType Type of evidence from this source
   * @param context Additional context for trust evaluation
   * @returns Promise resolving to trust level ∈ [0,1]
   */
  evaluateSourceTrust(
    source: string,
    evidenceType: string,
    context?: Record<string, any>
  ): Promise<number>;
}

/**
 * Evidence confidence calculation C(e,P) from AEF Paper Section 5.4.1
 * Responsibility: Determine how strongly evidence supports/contradicts proposition
 */
export interface IEvidenceConfidenceEvaluator {
  /**
   * Calculate C(e,P) ∈ [0,1] - confidence evidence suggests for proposition
   * C(e,P) ≈ 1: evidence strongly supports P
   * C(e,P) ≈ 0: evidence strongly contradicts P
   * C(e,P) ≈ 0.5: evidence is ambiguous/neutral
   * 
   * @param evidence Evidence element to evaluate
   * @param proposition Proposition being evaluated
   * @param context Additional context for confidence calculation
   * @returns Promise resolving to confidence level ∈ [0,1]
   */
  calculateEvidenceConfidence(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number>;
}

/**
 * Confidence update strategies from AEF Paper Section 5.4.3
 * Responsibility: Apply mathematical update functions to revise belief confidence
 */
export interface IConfidenceUpdater {
  /**
   * Update confidence using frame-specific strategy
   * 
   * @param currentConfidence Current belief confidence ∈ [0,1]
   * @param evidence New evidence to incorporate
   * @param proposition Proposition being updated
   * @param updateContext Context including weights, trust values, etc.
   * @returns Promise resolving to updated confidence ∈ [0,1]
   */
  updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number>;
}

/**
 * Context for confidence updates containing all necessary parameters
 */
export interface ConfidenceUpdateContext {
  evidenceWeights: number[];     // w_F(e) values for each evidence element
  evidenceConfidences: number[]; // C(e,P) values for each evidence element
  sourceTrusts?: number[];       // trust(e_source, F) values if applicable
  sensitivity?: number;          // α parameter for source-trust updates
  priorLikelihoods?: {          // For Bayesian updates when available
    evidenceGivenProposition: number;    // P(e|P)
    evidenceGivenNegation: number;       // P(e|¬P)
  };
  metadata?: Record<string, any>; // Additional frame-specific parameters
}

/**
 * Perception interpretation through frame lens
 * Responsibility: Transform raw perceptions based on frame perspective
 */
export interface IPerceptionInterpreter {
  /**
   * Interpret perception data through this frame's cognitive lens
   * 
   * @param perception Raw perception to interpret
   * @param agentContext Agent context (id, name, current state)
   * @returns Promise resolving to frame-interpreted perception
   */
  interpretPerception(
    perception: Perception,
    agentContext: AgentContext
  ): Promise<Perception>;
}

/**
 * Proposition extraction from perceptions/goals
 * Responsibility: Extract frame-relevant propositions from input data
 */
export interface IPropositionExtractor {
  /**
   * Extract propositions relevant to this frame from source data
   * 
   * @param source Source data (perception or goal)
   * @param extractionContext Context for extraction
   * @returns Promise resolving to relevant propositions
   */
  extractRelevantPropositions(
    source: Perception | Goal,
    extractionContext?: Record<string, any>
  ): Promise<string[]>;
}

/**
 * Frame compatibility and relationships
 * Responsibility: Determine how frames relate to and trust each other
 */
export interface IFrameCompatibility {
  /**
   * Calculate compatibility with another frame ∈ [0,1]
   * High compatibility = frames interpret evidence similarly
   * Low compatibility = frames have conflicting perspectives
   * 
   * @param otherFrame Frame to compare with
   * @returns Compatibility score ∈ [0,1]
   */
  calculateCompatibility(otherFrame: IFrameIdentity): number;
  
  /**
   * Determine if this frame can effectively evaluate justifications from another frame
   * 
   * @param sourceFrame Frame that generated the justification
   * @returns True if evaluation is meaningful, false if frames are too incompatible
   */
  canEvaluateJustificationFrom(sourceFrame: IFrameIdentity): boolean;
}

// ============================================================================
// INTERFACE SEGREGATION PRINCIPLE (ISP) - Composable Frame Capabilities
// ============================================================================

/**
 * Core frame interface - minimal required capabilities
 * Frames implement only the interfaces they actually need
 */
export interface ICoreFrame extends IFrameIdentity {}

/**
 * Full epistemic frame with all capabilities
 * Most frames will implement this, but it's composed of smaller interfaces
 */
export interface IEpistemicFrame extends 
  ICoreFrame,
  IEvidenceWeighter,
  ISourceTrustEvaluator,
  IEvidenceConfidenceEvaluator,
  IConfidenceUpdater,
  IPerceptionInterpreter,
  IPropositionExtractor,
  IFrameCompatibility {}

/**
 * Minimal frame for simple use cases
 * Only needs basic evidence weighting and confidence updating
 */
export interface ISimpleFrame extends 
  ICoreFrame,
  IEvidenceWeighter,
  IConfidenceUpdater {}

/**
 * Debate-specific frame interface
 * Adds debate-specific capabilities while maintaining core functionality
 */
export interface IDebateFrame extends IEpistemicFrame {
  /**
   * Evaluate argument strength in debate context
   * 
   * @param argument Argument text
   * @param position Position being argued (pro/con)
   * @param debateContext Context of the debate
   * @returns Promise resolving to argument strength ∈ [0,1]
   */
  evaluateArgumentStrength(
    argument: string,
    position: 'pro' | 'con',
    debateContext: DebateContext
  ): Promise<number>;
  
  /**
   * Generate frame-specific counterarguments
   * 
   * @param argument Argument to counter
   * @param debateContext Context of the debate
   * @returns Promise resolving to counterargument strategies
   */
  generateCounterarguments(
    argument: string,
    debateContext: DebateContext
  ): Promise<string[]>;
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

/**
 * Agent context for frame operations
 */
export interface AgentContext {
  id: string;
  name: string;
  currentGoals?: Goal[];
  metadata?: Record<string, any>;
}

/**
 * Debate context for debate-specific frames
 */
export interface DebateContext {
  topic: string;
  position: 'pro' | 'con' | 'judge' | 'moderator';
  currentArguments: string[];
  opponentArguments: string[];
  metadata?: Record<string, any>;
}

/**
 * Frame configuration for parameterization
 * Enables domain-specific customization without modifying frame code
 */
export type UpdateStrategy = 'frame-weighted' | 'source-trust' | 'bayesian' | 'hybrid';

export interface FrameConfiguration {
  frameType: string;
  parameters: Record<string, any>;
  updateStrategy: UpdateStrategy;
  llmProvider?: string;
  customStrategies?: Record<string, any>;
}

// ============================================================================
// DEPENDENCY INVERSION PRINCIPLE (DIP) - Abstract Dependencies
// ============================================================================

/**
 * Abstract LLM provider interface
 * Frames depend on this abstraction, not concrete implementations
 */
export interface ILLMProvider {
  /**
   * Judge evidence strength for proposition
   */
  judgeEvidenceStrength(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number>;
  
  /**
   * Judge evidence saliency for frame
   */
  judgeEvidenceSaliency(
    evidence: JustificationElement,
    frame: IFrameIdentity,
    context?: Record<string, any>
  ): Promise<number>;
  
  /**
   * Interpret perception data through frame
   */
  interpretPerceptionData(
    data: string,
    frame: IFrameIdentity,
    agentContext: AgentContext
  ): Promise<string>;
  
  /**
   * Extract propositions from text
   */
  extractPropositions(
    text: string,
    frame: IFrameIdentity,
    context?: Record<string, any>
  ): Promise<string[]>;
}

/**
 * Abstract parameter provider interface
 * Enables flexible parameter management and learning
 */
export interface IParameterProvider {
  /**
   * Get parameter value for frame and context
   */
  getParameter(
    frameId: string,
    parameterName: string,
    context?: Record<string, any>
  ): Promise<number>;
  
  /**
   * Update parameter based on experience/learning
   */
  updateParameter(
    frameId: string,
    parameterName: string,
    newValue: number,
    context?: Record<string, any>
  ): Promise<void>;
  
  /**
   * Get all parameters for frame
   */
  getFrameParameters(frameId: string): Promise<Record<string, number>>;
}