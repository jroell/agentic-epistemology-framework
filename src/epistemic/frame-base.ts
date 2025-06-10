/**
 * Base Frame Implementations and Registry System
 * 
 * Provides reusable base classes and a registry system that follows SOLID principles
 * to make creating new frames extremely easy without modifying existing code.
 */

import { 
  IEpistemicFrame, 
  ICoreFrame, 
  ISimpleFrame,
  IEvidenceWeighter,
  ISourceTrustEvaluator,
  IEvidenceConfidenceEvaluator,
  IConfidenceUpdater,
  IPerceptionInterpreter,
  IPropositionExtractor,
  IFrameCompatibility,
  ILLMProvider,
  IParameterProvider,
  FrameConfiguration,
  AgentContext,
  ConfidenceUpdateContext
} from './frame-interfaces';
import { 
  UpdateStrategyFactory, 
  HeuristicWeightCalculator, 
  ExponentialMovingAverageTrustLearner 
} from './frame-strategies';
import type { Proposition, Justification, JustificationElement } from '../types/common';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { generateId, clampConfidence } from '../types/common';

// ============================================================================
// BASE IMPLEMENTATIONS - Provide sensible defaults
// ============================================================================

/**
 * Minimal core frame implementation
 * Satisfies Single Responsibility Principle - just identity management
 */
export abstract class BaseCoreFrame implements ICoreFrame {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly frameType: string;

  constructor(
    name: string,
    description: string,
    frameType: string,
    id?: string
  ) {
    this.id = id || generateId('frame');
    this.name = name;
    this.description = description;
    this.frameType = frameType;
  }
}

/**
 * Base implementation for evidence weighting
 * Provides LLM-based default with heuristic fallback
 */
export class LLMEvidenceWeighter implements IEvidenceWeighter {
  constructor(
    private llmProvider: ILLMProvider,
    private heuristicCalculator: HeuristicWeightCalculator,
    private frameType: string
  ) {}

  async calculateEvidenceWeight(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    try {
      // Try LLM-based saliency judgment first
      const frameIdentity = { id: '', name: '', description: '', frameType: this.frameType };
      const weight = await this.llmProvider.judgeEvidenceSaliency(evidence, frameIdentity, context);
      return clampConfidence(weight);
    } catch (error) {
      // Fallback to heuristic calculation
      console.warn('LLM evidence weighting failed, using heuristic fallback:', error);
      return this.heuristicCalculator.getWeight(this.frameType, evidence.type);
    }
  }
}

/**
 * Base implementation for source trust evaluation
 * Uses exponential moving average learning with LLM enhancement
 */
export class LearnedSourceTrustEvaluator implements ISourceTrustEvaluator {
  private trustLearner: ExponentialMovingAverageTrustLearner;

  constructor(
    private llmProvider: ILLMProvider,
    private frameType: string,
    learningRate: number = 0.1
  ) {
    this.trustLearner = new ExponentialMovingAverageTrustLearner(learningRate);
  }

  async evaluateSourceTrust(
    source: string,
    evidenceType: string,
    context?: Record<string, any>
  ): Promise<number> {
    // Get learned trust from history
    const learnedTrust = this.trustLearner.getTrust(source);
    
    try {
      // Enhance with LLM-based evaluation if available
      const sourceContext = { ...context, frameType: this.frameType, evidenceType };
      // This would need to be implemented in the LLM provider
      // For now, return learned trust with slight LLM influence
      return clampConfidence(learnedTrust);
    } catch (error) {
      console.warn('LLM trust evaluation failed, using learned trust:', error);
      return learnedTrust;
    }
  }

  /**
   * Update trust based on verification outcome
   */
  updateTrust(source: string, outcome: number): void {
    this.trustLearner.updateTrust(source, outcome);
  }
}

/**
 * Base implementation for evidence confidence evaluation
 * Uses LLM to determine C(e,P) from AEF paper
 */
export class LLMEvidenceConfidenceEvaluator implements IEvidenceConfidenceEvaluator {
  constructor(private llmProvider: ILLMProvider) {}

  async calculateEvidenceConfidence(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    try {
      const confidence = await this.llmProvider.judgeEvidenceStrength(evidence, proposition, context);
      return clampConfidence(confidence);
    } catch (error) {
      console.warn('LLM evidence confidence evaluation failed, using default:', error);
      return 0.5; // Neutral confidence if LLM fails
    }
  }
}

/**
 * Comprehensive base frame implementation
 * Composes all the individual components using Dependency Injection
 */
export class ComposableBaseFrame extends BaseCoreFrame implements IEpistemicFrame {
  protected evidenceWeighter: IEvidenceWeighter;
  protected sourceTrustEvaluator: ISourceTrustEvaluator;
  protected evidenceConfidenceEvaluator: IEvidenceConfidenceEvaluator;
  protected confidenceUpdater: IConfidenceUpdater;
  protected compatibilityMap: Map<string, number> = new Map();

  constructor(
    name: string,
    description: string,
    frameType: string,
    private llmProvider: ILLMProvider,
    private parameterProvider?: IParameterProvider,
    id?: string,
    updateStrategy: string = 'frame-weighted'
  ) {
    super(name, description, frameType, id);
    
    // Initialize components using dependency injection
    const heuristicCalculator = new HeuristicWeightCalculator();
    heuristicCalculator.initializeDefaults();
    
    this.evidenceWeighter = new LLMEvidenceWeighter(llmProvider, heuristicCalculator, frameType);
    this.sourceTrustEvaluator = new LearnedSourceTrustEvaluator(llmProvider, frameType);
    this.evidenceConfidenceEvaluator = new LLMEvidenceConfidenceEvaluator(llmProvider);
    this.confidenceUpdater = UpdateStrategyFactory.createStrategy(updateStrategy, llmProvider);
    
    this.initializeCompatibilityDefaults();
  }

  // ========================================================================
  // EVIDENCE WEIGHTING
  // ========================================================================

  async calculateEvidenceWeight(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    return this.evidenceWeighter.calculateEvidenceWeight(evidence, proposition, context);
  }

  // ========================================================================
  // SOURCE TRUST EVALUATION
  // ========================================================================

  async evaluateSourceTrust(
    source: string,
    evidenceType: string,
    context?: Record<string, any>
  ): Promise<number> {
    return this.sourceTrustEvaluator.evaluateSourceTrust(source, evidenceType, context);
  }

  // ========================================================================
  // EVIDENCE CONFIDENCE EVALUATION
  // ========================================================================

  async calculateEvidenceConfidence(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    return this.evidenceConfidenceEvaluator.calculateEvidenceConfidence(evidence, proposition, context);
  }

  // ========================================================================
  // CONFIDENCE UPDATING
  // ========================================================================

  async updateConfidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    updateContext: ConfidenceUpdateContext
  ): Promise<number> {
    return this.confidenceUpdater.updateConfidence(currentConfidence, evidence, proposition, updateContext);
  }

  /**
   * High-level confidence update that calculates all needed context values
   */
  async updateConfidenceForEvidence(
    currentConfidence: number,
    evidence: JustificationElement[],
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    // Calculate all context values needed for update
    const evidenceWeights = await Promise.all(
      evidence.map(e => this.calculateEvidenceWeight(e, proposition, context))
    );
    
    const evidenceConfidences = await Promise.all(
      evidence.map(e => this.calculateEvidenceConfidence(e, proposition, context))
    );
    
    const sourceTrusts = await Promise.all(
      evidence.map(e => e.source ? this.evaluateSourceTrust(e.source, e.type, context) : Promise.resolve(0.5))
    );

    const updateContext: ConfidenceUpdateContext = {
      evidenceWeights,
      evidenceConfidences,
      sourceTrusts,
      metadata: context
    };

    return this.updateConfidence(currentConfidence, evidence, proposition, updateContext);
  }

  // ========================================================================
  // PERCEPTION INTERPRETATION
  // ========================================================================

  async interpretPerception(
    perception: Perception,
    agentContext: AgentContext
  ): Promise<Perception> {
    try {
      const interpretedData = await this.llmProvider.interpretPerceptionData(
        perception.data,
        this,
        agentContext
      );
      return { ...perception, data: interpretedData };
    } catch (error) {
      console.warn('Perception interpretation failed:', error);
      return perception; // Return original if interpretation fails
    }
  }

  // ========================================================================
  // PROPOSITION EXTRACTION
  // ========================================================================

  async extractRelevantPropositions(
    source: Perception | Goal,
    extractionContext?: Record<string, any>
  ): Promise<string[]> {
    try {
      const sourceText = source instanceof Goal ? source.description : source.data;
      return await this.llmProvider.extractPropositions(sourceText, this, extractionContext);
    } catch (error) {
      console.warn('Proposition extraction failed:', error);
      return []; // Return empty array if extraction fails
    }
  }

  // ========================================================================
  // FRAME COMPATIBILITY
  // ========================================================================

  calculateCompatibility(otherFrame: ICoreFrame): number {
    // Check if we have a specific compatibility mapping
    const specificCompatibility = this.compatibilityMap.get(otherFrame.frameType);
    if (specificCompatibility !== undefined) {
      return specificCompatibility;
    }

    // Default compatibility logic
    if (otherFrame.frameType === this.frameType) {
      return 0.95; // Very high compatibility with same type
    }

    // Return moderate compatibility for unknown types
    return 0.5;
  }

  canEvaluateJustificationFrom(sourceFrame: ICoreFrame): boolean {
    return this.calculateCompatibility(sourceFrame) > 0.3; // Threshold for meaningful evaluation
  }

  /**
   * Set specific compatibility with another frame type
   */
  protected setCompatibility(frameType: string, compatibility: number): void {
    this.compatibilityMap.set(frameType, clampConfidence(compatibility));
  }

  /**
   * Initialize default compatibility mappings
   */
  protected initializeCompatibilityDefaults(): void {
    // Subclasses can override this to set specific compatibilities
  }
}

// ============================================================================
// FRAME REGISTRY SYSTEM - Open/Closed Principle
// ============================================================================

/**
 * Frame factory function type
 */
export type FrameFactory = (
  config: FrameConfiguration,
  llmProvider: ILLMProvider,
  parameterProvider?: IParameterProvider,
  id?: string
) => IEpistemicFrame;

/**
 * Registry for frame types - enables adding new frames without modifying existing code
 */
export class FrameRegistry {
  private static frameFactories: Map<string, FrameFactory> = new Map();
  private static instances: Map<string, IEpistemicFrame> = new Map();

  /**
   * Register a new frame type (Open/Closed Principle)
   */
  static registerFrameType(frameType: string, factory: FrameFactory): void {
    this.frameFactories.set(frameType, factory);
  }

  /**
   * Create a frame instance
   */
  static createFrame(
    config: FrameConfiguration,
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ): IEpistemicFrame {
    const factory = this.frameFactories.get(config.frameType);
    if (!factory) {
      throw new Error(`Unknown frame type: ${config.frameType}. Available types: ${this.getAvailableFrameTypes().join(', ')}`);
    }

    const frameId = id || generateId('frame');
    const instance = factory(config, llmProvider, parameterProvider, frameId);
    this.instances.set(frameId, instance);
    
    return instance;
  }

  /**
   * Get frame instance by ID
   */
  static getInstance(frameId: string): IEpistemicFrame | undefined {
    return this.instances.get(frameId);
  }

  /**
   * Get all available frame types
   */
  static getAvailableFrameTypes(): string[] {
    return Array.from(this.frameFactories.keys());
  }

  /**
   * Remove frame instance
   */
  static removeInstance(frameId: string): void {
    this.instances.delete(frameId);
  }

  /**
   * Clear all instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR FRAME CREATION
// ============================================================================

/**
 * Helper function to create a basic frame configuration
 */
export function createFrameConfig(
  frameType: string,
  parameters: Record<string, any> = {},
  updateStrategy: string = 'frame-weighted'
): FrameConfiguration {
  return {
    frameType,
    parameters,
    updateStrategy
  };
}

/**
 * Helper function to create frame with default dependencies
 */
export function createFrame(
  frameType: string,
  llmProvider: ILLMProvider,
  parameters: Record<string, any> = {},
  updateStrategy: string = 'frame-weighted',
  parameterProvider?: IParameterProvider,
  id?: string
): IEpistemicFrame {
  const config = createFrameConfig(frameType, parameters, updateStrategy);
  return FrameRegistry.createFrame(config, llmProvider, parameterProvider, id);
}