/**
 * Confidence Update Strategies for AEF Frames
 * 
 * Implements the mathematical formalism from AEF Paper Section 5.4.3:
 * - Frame-Weighted Update (Equation 1)
 * - Justification-Source Update (Equation 2) 
 * - Bayesian Update (Equation 3)
 * - Hybrid approaches
 */

import { IConfidenceUpdater, ConfidenceUpdateContext, ILLMProvider } from './frame-interfaces';
import type { JustificationElement } from '../types/common';
import { clampConfidence } from '../types/common';

// ============================================================================
// STRATEGY PATTERN - Confidence Update Algorithms
// ============================================================================

/**
 * Frame-Weighted Update Strategy
 * Implements Equation 1 from AEF Paper: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)
 */
export class FrameWeightedUpdateStrategy implements IConfidenceUpdater {
  constructor(private llmProvider?: ILLMProvider) {}

  async updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number> {
    let updatedConfidence = currentConfidence;
    
    // Apply frame-weighted updates sequentially for each evidence element
    for (let i = 0; i < evidence.length; i++) {
      const evidenceWeight = updateContext.evidenceWeights[i] || 0.5;
      const evidenceConfidence = updateContext.evidenceConfidences[i] || 0.5;
      
      // Frame-Weighted Update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)
      updatedConfidence = (1 - evidenceWeight) * updatedConfidence + evidenceWeight * evidenceConfidence;
    }
    
    return clampConfidence(updatedConfidence);
  }
}

/**
 * Source-Trust Update Strategy  
 * Implements Equation 2 from AEF Paper: conf_new = (1 - α) * conf_old + α * trust(e_source, F)
 */
export class SourceTrustUpdateStrategy implements IConfidenceUpdater {
  constructor(private llmProvider?: ILLMProvider) {}

  async updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number> {
    let updatedConfidence = currentConfidence;
    const sensitivity = updateContext.sensitivity || 0.5; // α parameter
    
    // Apply source-trust updates for each evidence element
    for (let i = 0; i < evidence.length; i++) {
      const sourceTrust = updateContext.sourceTrusts?.[i] || 0.5;
      
      // Source-Trust Update: conf_new = (1 - α) * conf_old + α * trust(e_source, F)
      updatedConfidence = (1 - sensitivity) * updatedConfidence + sensitivity * sourceTrust;
    }
    
    return clampConfidence(updatedConfidence);
  }
}

/**
 * Bayesian Update Strategy
 * Implements Equation 3 from AEF Paper: P(P|e) = P(e|P) * conf_old / [P(e|P) * conf_old + P(e|¬P) * (1 - conf_old)]
 */
export class BayesianUpdateStrategy implements IConfidenceUpdater {
  constructor(private llmProvider?: ILLMProvider) {}

  async updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number> {
    let updatedConfidence = currentConfidence;
    
    // Apply Bayesian updates for each evidence element with known likelihoods
    for (let i = 0; i < evidence.length; i++) {
      const likelihoods = updateContext.priorLikelihoods;
      
      if (likelihoods) {
        const pEvidenceGivenP = likelihoods.evidenceGivenProposition;
        const pEvidenceGivenNotP = likelihoods.evidenceGivenNegation;
        
        // Bayesian Update: P(P|e) = P(e|P) * P(P) / [P(e|P) * P(P) + P(e|¬P) * P(¬P)]
        const numerator = pEvidenceGivenP * updatedConfidence;
        const denominator = pEvidenceGivenP * updatedConfidence + pEvidenceGivenNotP * (1 - updatedConfidence);
        
        if (denominator > 0) {
          updatedConfidence = numerator / denominator;
        }
      } else {
        // Fallback to frame-weighted if no likelihoods available
        const evidenceWeight = updateContext.evidenceWeights[i] || 0.5;
        const evidenceConfidence = updateContext.evidenceConfidences[i] || 0.5;
        updatedConfidence = (1 - evidenceWeight) * updatedConfidence + evidenceWeight * evidenceConfidence;
      }
    }
    
    return clampConfidence(updatedConfidence);
  }
}

/**
 * Hybrid Update Strategy
 * Combines multiple strategies based on evidence type and context
 */
export class HybridUpdateStrategy implements IConfidenceUpdater {
  private frameWeightedStrategy: FrameWeightedUpdateStrategy;
  private sourceTrustStrategy: SourceTrustUpdateStrategy;
  private bayesianStrategy: BayesianUpdateStrategy;

  constructor(llmProvider?: ILLMProvider) {
    this.frameWeightedStrategy = new FrameWeightedUpdateStrategy(llmProvider);
    this.sourceTrustStrategy = new SourceTrustUpdateStrategy(llmProvider);
    this.bayesianStrategy = new BayesianUpdateStrategy(llmProvider);
  }

  async updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number> {
    // Partition evidence by type and apply appropriate strategy
    const bayesianEvidence: JustificationElement[] = [];
    const sourceTrustEvidence: JustificationElement[] = [];
    const frameWeightedEvidence: JustificationElement[] = [];
    
    const bayesianIndices: number[] = [];
    const sourceTrustIndices: number[] = [];
    const frameWeightedIndices: number[] = [];
    
    evidence.forEach((elem, index) => {
      if (updateContext.priorLikelihoods && elem.type === 'statistical') {
        bayesianEvidence.push(elem);
        bayesianIndices.push(index);
      } else if (elem.source && updateContext.sourceTrusts?.[index] !== undefined) {
        sourceTrustEvidence.push(elem);
        sourceTrustIndices.push(index);
      } else {
        frameWeightedEvidence.push(elem);
        frameWeightedIndices.push(index);
      }
    });
    
    let updatedConfidence = currentConfidence;
    
    // Apply Bayesian updates first (most rigorous when applicable)
    if (bayesianEvidence.length > 0) {
      const bayesianContext = this.extractContextForIndices(updateContext, bayesianIndices);
      updatedConfidence = await this.bayesianStrategy.updateConfidence(
        updatedConfidence, bayesianEvidence, proposition, bayesianContext
      );
    }
    
    // Apply source-trust updates for communication evidence
    if (sourceTrustEvidence.length > 0) {
      const sourceTrustContext = this.extractContextForIndices(updateContext, sourceTrustIndices);
      updatedConfidence = await this.sourceTrustStrategy.updateConfidence(
        updatedConfidence, sourceTrustEvidence, proposition, sourceTrustContext
      );
    }
    
    // Apply frame-weighted updates for remaining evidence
    if (frameWeightedEvidence.length > 0) {
      const frameWeightedContext = this.extractContextForIndices(updateContext, frameWeightedIndices);
      updatedConfidence = await this.frameWeightedStrategy.updateConfidence(
        updatedConfidence, frameWeightedEvidence, proposition, frameWeightedContext
      );
    }
    
    return clampConfidence(updatedConfidence);
  }
  
  private extractContextForIndices(context: ConfidenceUpdateContext, indices: number[]): ConfidenceUpdateContext {
    return {
      evidenceWeights: indices.map(i => context.evidenceWeights[i] || 0.5),
      evidenceConfidences: indices.map(i => context.evidenceConfidences[i] || 0.5),
      sourceTrusts: context.sourceTrusts ? indices.map(i => context.sourceTrusts![i]) : undefined,
      sensitivity: context.sensitivity,
      priorLikelihoods: context.priorLikelihoods,
      metadata: context.metadata
    };
  }
}

// ============================================================================
// PARAMETER LEARNING STRATEGIES
// ============================================================================

/**
 * Exponential Moving Average Trust Learning
 * Implements Section 5.4.5.2 from AEF Paper for trust parameter derivation
 */
export class ExponentialMovingAverageTrustLearner {
  private trustHistory: Map<string, number> = new Map();
  private learningRate: number;

  constructor(learningRate: number = 0.1) {
    this.learningRate = learningRate;
  }

  /**
   * Update trust based on verification outcome
   * trust_t = (1 - λ) * trust_(t-1) + λ * outcome_t
   */
  updateTrust(sourceId: string, verificationOutcome: number): number {
    const currentTrust = this.trustHistory.get(sourceId) || 0.5;
    const newTrust = (1 - this.learningRate) * currentTrust + this.learningRate * verificationOutcome;
    this.trustHistory.set(sourceId, newTrust);
    return newTrust;
  }

  getTrust(sourceId: string): number {
    return this.trustHistory.get(sourceId) || 0.5;
  }
}

/**
 * Heuristic Weight Calculator
 * Implements Section 5.4.5.1 from AEF Paper for frame-specific evidence weighting
 */
export class HeuristicWeightCalculator {
  private frameWeightRules: Map<string, Map<string, number>> = new Map();

  /**
   * Set weight rule for frame and evidence type
   */
  setWeightRule(frameType: string, evidenceType: string, weight: number): void {
    if (!this.frameWeightRules.has(frameType)) {
      this.frameWeightRules.set(frameType, new Map());
    }
    this.frameWeightRules.get(frameType)!.set(evidenceType, weight);
  }

  /**
   * Get weight for frame and evidence type
   */
  getWeight(frameType: string, evidenceType: string): number {
    return this.frameWeightRules.get(frameType)?.get(evidenceType) || 0.5;
  }

  /**
   * Initialize default weights for common frame types
   */
  initializeDefaults(): void {
    // Efficiency Frame weights
    this.setWeightRule('efficiency', 'performance', 0.8);
    this.setWeightRule('efficiency', 'speed', 0.9);
    this.setWeightRule('efficiency', 'detailed', 0.3);
    
    // Thoroughness Frame weights  
    this.setWeightRule('thoroughness', 'detailed', 0.9);
    this.setWeightRule('thoroughness', 'comprehensive', 0.8);
    this.setWeightRule('thoroughness', 'quick', 0.2);
    
    // Security Frame weights
    this.setWeightRule('security', 'security', 0.9);
    this.setWeightRule('security', 'risk', 0.8);
    this.setWeightRule('security', 'performance', 0.4);
    
    // Debate Frame weights
    this.setWeightRule('pro-debater', 'supporting', 0.85);
    this.setWeightRule('pro-debater', 'opposing', 0.3);
    this.setWeightRule('con-debater', 'opposing', 0.85);
    this.setWeightRule('con-debater', 'supporting', 0.3);
    this.setWeightRule('judge', 'evidence', 0.7);
    this.setWeightRule('judge', 'logic', 0.8);
    this.setWeightRule('moderator', 'balanced', 0.9);
  }
}

// ============================================================================
// STRATEGY FACTORY - Open/Closed Principle
// ============================================================================

/**
 * Factory for creating confidence update strategies
 * New strategies can be registered without modifying existing code
 */
export class UpdateStrategyFactory {
  private static strategies: Map<string, (llmProvider?: ILLMProvider) => IConfidenceUpdater> = new Map();

  static {
    // Register default strategies
    this.registerStrategy('frame-weighted', (llm) => new FrameWeightedUpdateStrategy(llm));
    this.registerStrategy('source-trust', (llm) => new SourceTrustUpdateStrategy(llm));
    this.registerStrategy('bayesian', (llm) => new BayesianUpdateStrategy(llm));
    this.registerStrategy('hybrid', (llm) => new HybridUpdateStrategy(llm));
  }

  /**
   * Register a new update strategy (Open/Closed Principle)
   */
  static registerStrategy(
    name: string, 
    factory: (llmProvider?: ILLMProvider) => IConfidenceUpdater
  ): void {
    this.strategies.set(name, factory);
  }

  /**
   * Create strategy instance by name
   */
  static createStrategy(name: string, llmProvider?: ILLMProvider): IConfidenceUpdater {
    const factory = this.strategies.get(name);
    if (!factory) {
      throw new Error(`Unknown update strategy: ${name}`);
    }
    return factory(llmProvider);
  }

  /**
   * Get list of available strategies
   */
  static getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}