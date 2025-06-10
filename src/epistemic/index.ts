/**
 * Agentic Epistemology Framework - Epistemic Components
 * 
 * This module provides a complete implementation of the AEF epistemic system including:
 * - Beliefs, Justifications, and Conflicts (original AEF components)
 * - SOLID-compliant Frame system with mathematical formalism from Section 5.4.3
 * - Plugin architecture for maximum extensibility
 */

// ============================================================================
// CORE EPISTEMIC COMPONENTS (Original AEF)
// ============================================================================

export * from './belief';
export * from './justification';
export * from './conflict';

// ============================================================================
// LEGACY FRAME SYSTEM (for backward compatibility)
// ============================================================================

export * from './frame';
export * from './debate-frames';

// ============================================================================
// NEW SOLID FRAME SYSTEM - Enhanced Extensibility
// ============================================================================

// Core interfaces following SOLID principles
export type {
  // Core frame interfaces
  IFrameIdentity,
  ICoreFrame,
  ISimpleFrame,
  IEpistemicFrame,
  IDebateFrame,
  
  // Capability interfaces (Interface Segregation Principle)
  IEvidenceWeighter,
  ISourceTrustEvaluator,
  IEvidenceConfidenceEvaluator,
  IConfidenceUpdater,
  IPerceptionInterpreter,
  IPropositionExtractor,
  IFrameCompatibility,
  
  // Context and configuration
  ConfidenceUpdateContext,
  AgentContext,
  DebateContext,
  FrameConfiguration,
  
  // Dependency abstractions (Dependency Inversion Principle)
  ILLMProvider,
  IParameterProvider
} from './frame-interfaces';

// Strategy pattern implementations (Open/Closed Principle)
export {
  // Mathematical update strategies from AEF Paper Section 5.4.3
  FrameWeightedUpdateStrategy,      // Eq. 1: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)
  SourceTrustUpdateStrategy,        // Eq. 2: conf_new = (1 - α) * conf_old + α * trust(e_source, F)
  BayesianUpdateStrategy,           // Eq. 3: Bayesian posterior update
  HybridUpdateStrategy,             // Intelligent combination of strategies
  
  // Parameter learning (Section 5.4.5)
  ExponentialMovingAverageTrustLearner,
  HeuristicWeightCalculator,
  
  // Factory for extensibility
  UpdateStrategyFactory
} from './frame-strategies';

// Base implementations using composition (Single Responsibility Principle)
export {
  BaseCoreFrame,
  ComposableBaseFrame,
  LLMEvidenceWeighter,
  LearnedSourceTrustEvaluator,
  LLMEvidenceConfidenceEvaluator,
  FrameRegistry,
  createFrameConfig,
  createFrame
} from './frame-base';

export type { FrameFactory } from './frame-base';

// Concrete frame implementations
export {
  registerAllFrameTypes,
  registerOptimismFrame,
  
  // Easy-to-use factory functions
  createEfficiencyFrame,
  createThoroughnessFrame,
  createSecurityFrame,
  createProDebaterFrame,
  createConDebaterFrame,
  createJudgeFrame,
  createModeratorFrame,
  createOptimismFrame
} from './solid-frames';

// ============================================================================
// SYSTEM INITIALIZATION
// ============================================================================

/**
 * Initialize the SOLID frame system with all default frame types
 * Call this once at application startup
 */
export function initializeFrameSystem(): void {
  try {
    const { registerAllFrameTypes } = require('./solid-frames');
    registerAllFrameTypes();
    console.log('✅ AEF Frame System initialized successfully');
  } catch (error) {
    console.warn('⚠️  Frame system initialization failed:', error);
  }
}

/**
 * Get comprehensive information about the frame system
 */
export function getFrameSystemInfo(): {
  availableFrameTypes: string[];
  availableUpdateStrategies: string[];
  mathematicalFormalism: string[];
  solidPrinciples: string[];
} {
  try {
    const { FrameRegistry } = require('./frame-base');
    const { UpdateStrategyFactory } = require('./frame-strategies');
    
    return {
      availableFrameTypes: FrameRegistry.getAvailableFrameTypes(),
      availableUpdateStrategies: UpdateStrategyFactory.getAvailableStrategies(),
      mathematicalFormalism: [
        'Frame-Weighted Update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)',
        'Source-Trust Update: conf_new = (1 - α) * conf_old + α * trust(e_source, F)',
        'Bayesian Update: P(P|e) = P(e|P) * conf_old / [P(e|P) * conf_old + P(e|¬P) * (1 - conf_old)]'
      ],
      solidPrinciples: [
        'Single Responsibility: Each interface has one focused purpose',
        'Open/Closed: New frames can be added without modifying existing code',
        'Liskov Substitution: All frames are truly interchangeable',
        'Interface Segregation: Frames implement only needed capabilities',
        'Dependency Inversion: Depends on abstractions, not concrete implementations'
      ]
    };
  } catch (error) {
    console.warn('Frame system info unavailable:', error);
    return {
      availableFrameTypes: [],
      availableUpdateStrategies: [],
      mathematicalFormalism: [],
      solidPrinciples: []
    };
  }
}
