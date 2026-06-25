/**
 * SOLID-Compliant Frame Implementations
 * 
 * Demonstrates how to create new frames using the SOLID architecture.
 * Each frame can be created without modifying existing code.
 */

import { 
  IEpistemicFrame, 
  IDebateFrame, 
  ILLMProvider,
  IParameterProvider,
  FrameConfiguration,
  AgentContext,
  DebateContext
} from './frame-interfaces';
import { 
  ComposableBaseFrame,
  FrameRegistry,
  FrameFactory,
  createFrameConfig
} from './frame-base';
import { clampConfidence } from '../types/common';
import { ObservationJustificationElement } from './justification';

// ============================================================================
// CONCRETE FRAME IMPLEMENTATIONS - Built on SOLID Foundation
// ============================================================================

/**
 * Efficiency Frame - Prioritizes speed and performance
 * Uses frame-weighted updates with high weight for performance evidence
 */
class EfficiencyFrameImpl extends ComposableBaseFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Efficiency',
      'Prioritizes speed, performance metrics, and resource optimization',
      'efficiency',
      llmProvider,
      parameterProvider,
      id,
      'frame-weighted' // Uses frame-weighted update strategy
    );
    
    this.initializeEfficiencyCompatibility();
  }

  private initializeEfficiencyCompatibility(): void {
    // Set compatibility with other frame types
    this.setCompatibility('efficiency', 0.95);      // High compatibility with same type
    this.setCompatibility('thoroughness', 0.3);    // Low compatibility - conflicting priorities  
    this.setCompatibility('security', 0.5);        // Moderate compatibility
    this.setCompatibility('pro-debater', 0.6);     // Moderate compatibility
    this.setCompatibility('con-debater', 0.6);     // Moderate compatibility
    this.setCompatibility('judge', 0.7);           // Good compatibility with objective evaluation
    this.setCompatibility('moderator', 0.8);       // Good compatibility with balanced approach
  }
}

/**
 * Thoroughness Frame - Prioritizes completeness and detail
 * Uses frame-weighted updates with high weight for detailed evidence
 */
class ThoroughnessFrameImpl extends ComposableBaseFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Thoroughness',
      'Prioritizes completeness, detail, and comprehensive analysis',
      'thoroughness',
      llmProvider,
      parameterProvider,
      id,
      'frame-weighted'
    );
    
    this.initializeThoroughnessCompatibility();
  }

  private initializeThoroughnessCompatibility(): void {
    this.setCompatibility('thoroughness', 0.95);   // High compatibility with same type
    this.setCompatibility('efficiency', 0.3);      // Low compatibility - conflicting priorities
    this.setCompatibility('security', 0.7);        // Good compatibility - security benefits from thoroughness
    this.setCompatibility('pro-debater', 0.5);     // Moderate compatibility
    this.setCompatibility('con-debater', 0.5);     // Moderate compatibility  
    this.setCompatibility('judge', 0.8);           // High compatibility - judges value thoroughness
    this.setCompatibility('moderator', 0.7);       // Good compatibility
  }
}

/**
 * Security Frame - Prioritizes safety and risk minimization
 * Uses hybrid update strategy combining frame-weighted and source-trust
 */
class SecurityFrameImpl extends ComposableBaseFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Security',
      'Prioritizes safety, risk minimization, and threat assessment',
      'security',
      llmProvider,
      parameterProvider,
      id,
      'hybrid' // Uses hybrid strategy - important for security context
    );
    
    this.initializeSecurityCompatibility();
  }

  private initializeSecurityCompatibility(): void {
    this.setCompatibility('security', 0.95);       // High compatibility with same type
    this.setCompatibility('efficiency', 0.5);      // Moderate compatibility - some tension
    this.setCompatibility('thoroughness', 0.7);    // Good compatibility - thoroughness aids security
    this.setCompatibility('pro-debater', 0.4);     // Lower compatibility - security is cautious
    this.setCompatibility('con-debater', 0.6);     // Moderate compatibility - critical thinking valued
    this.setCompatibility('judge', 0.7);           // Good compatibility
    this.setCompatibility('moderator', 0.6);       // Moderate compatibility
  }
}

/**
 * Pro Debater Frame - Prioritizes supporting evidence and advocacy
 * Implements IDebateFrame with debate-specific capabilities
 */
class ProDebaterFrameImpl extends ComposableBaseFrame implements IDebateFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Pro Debater',
      'Prioritizes supporting evidence, persuasive arguments, and advocacy',
      'pro-debater',
      llmProvider,
      parameterProvider,
      id,
      'frame-weighted'
    );
    
    this.initializeProDebaterCompatibility();
  }

  private initializeProDebaterCompatibility(): void {
    this.setCompatibility('pro-debater', 0.95);    // High compatibility with same type
    this.setCompatibility('con-debater', 0.2);     // Very low compatibility - adversarial
    this.setCompatibility('judge', 0.5);           // Moderate compatibility
    this.setCompatibility('moderator', 0.6);       // Moderate compatibility
    this.setCompatibility('efficiency', 0.6);      // Moderate compatibility
    this.setCompatibility('thoroughness', 0.5);    // Moderate compatibility
    this.setCompatibility('security', 0.4);        // Lower compatibility
  }

  async evaluateArgumentStrength(
    argument: string,
    position: 'pro' | 'con',
    debateContext: DebateContext
  ): Promise<number> {
    try {
      // Pro debaters evaluate arguments based on how well they support the pro position
      const baseStrength = await this.llmProvider.judgeEvidenceStrength(
        new ObservationJustificationElement('debate', { argument }),
        debateContext.topic
      );
      
      // Boost strength if argument supports pro position, reduce if con
      const positionMultiplier = position === 'pro' ? 1.2 : 0.8;
      return clampConfidence(baseStrength * positionMultiplier);
    } catch (error) {
      console.warn('Argument strength evaluation failed:', error);
      return 0.5;
    }
  }

  async generateCounterarguments(
    argument: string,
    debateContext: DebateContext
  ): Promise<string[]> {
    // Pro debaters generate counterarguments defensively - to prepare for rebuttals
    // This would typically use the LLM to generate responses
    try {
      // Simplified implementation - would use LLM in practice
      return [
        `While the opposing argument raises a point about ${argument.substring(0, 50)}..., we must consider...`,
        `The evidence presented fails to account for...`,
        `This argument overlooks the fundamental benefits of...`
      ];
    } catch (error) {
      console.warn('Counterargument generation failed:', error);
      return [];
    }
  }
}

/**
 * Con Debater Frame - Prioritizes opposing evidence and critical analysis
 */
class ConDebaterFrameImpl extends ComposableBaseFrame implements IDebateFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Con Debater',
      'Prioritizes opposing evidence, critical analysis, and refutation',
      'con-debater',
      llmProvider,
      parameterProvider,
      id,
      'frame-weighted'
    );
    
    this.initializeConDebaterCompatibility();
  }

  private initializeConDebaterCompatibility(): void {
    this.setCompatibility('con-debater', 0.95);    // High compatibility with same type
    this.setCompatibility('pro-debater', 0.2);     // Very low compatibility - adversarial
    this.setCompatibility('judge', 0.5);           // Moderate compatibility
    this.setCompatibility('moderator', 0.6);       // Moderate compatibility
    this.setCompatibility('efficiency', 0.6);      // Moderate compatibility
    this.setCompatibility('thoroughness', 0.5);    // Moderate compatibility
    this.setCompatibility('security', 0.6);        // Good compatibility - both are cautious
  }

  async evaluateArgumentStrength(
    argument: string,
    position: 'pro' | 'con',
    debateContext: DebateContext
  ): Promise<number> {
    try {
      // Con debaters evaluate arguments based on how well they support the con position
      const baseStrength = await this.llmProvider.judgeEvidenceStrength(
        new ObservationJustificationElement('debate', { argument }),
        debateContext.topic
      );
      
      // Boost strength if argument supports con position, reduce if pro
      const positionMultiplier = position === 'con' ? 1.2 : 0.8;
      return clampConfidence(baseStrength * positionMultiplier);
    } catch (error) {
      console.warn('Argument strength evaluation failed:', error);
      return 0.5;
    }
  }

  async generateCounterarguments(
    argument: string,
    debateContext: DebateContext
  ): Promise<string[]> {
    // Con debaters generate counterarguments aggressively - to attack pro position
    try {
      // Simplified implementation - would use LLM in practice
      return [
        `This argument fails to consider the negative consequences...`,
        `The evidence cited is flawed because...`,
        `This position ignores crucial data showing...`,
        `The methodology underlying this claim is questionable...`
      ];
    } catch (error) {
      console.warn('Counterargument generation failed:', error);
      return [];
    }
  }
}

/**
 * Judge Frame - Prioritizes logical analysis and fair evaluation
 * Uses Bayesian updates when statistical evidence is available
 */
class JudgeFrameImpl extends ComposableBaseFrame implements IDebateFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Judge',
      'Prioritizes logical analysis, evidence quality, and fair evaluation',
      'judge',
      llmProvider,
      parameterProvider,
      id,
      'bayesian' // Judges prefer rigorous statistical reasoning when possible
    );
    
    this.initializeJudgeCompatibility();
  }

  private initializeJudgeCompatibility(): void {
    this.setCompatibility('judge', 0.95);          // High compatibility with same type
    this.setCompatibility('moderator', 0.8);       // High compatibility - both value fairness
    this.setCompatibility('pro-debater', 0.5);     // Moderate compatibility - judges are neutral
    this.setCompatibility('con-debater', 0.5);     // Moderate compatibility - judges are neutral
    this.setCompatibility('efficiency', 0.7);      // Good compatibility - judges value clear reasoning
    this.setCompatibility('thoroughness', 0.8);    // High compatibility - judges value completeness
    this.setCompatibility('security', 0.7);        // Good compatibility
  }

  async evaluateArgumentStrength(
    argument: string,
    position: 'pro' | 'con',
    debateContext: DebateContext
  ): Promise<number> {
    try {
      // Judges evaluate arguments neutrally regardless of position
      return await this.llmProvider.judgeEvidenceStrength(
        new ObservationJustificationElement('debate', { argument }),
        debateContext.topic
      );
    } catch (error) {
      console.warn('Argument strength evaluation failed:', error);
      return 0.5;
    }
  }

  async generateCounterarguments(
    argument: string,
    debateContext: DebateContext
  ): Promise<string[]> {
    // Judges don't generate counterarguments - they evaluate objectively
    return [];
  }
}

/**
 * Moderator Frame - Prioritizes balance and fairness
 * Uses source-trust updates to weight credible sources highly
 */
class ModeratorFrameImpl extends ComposableBaseFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Moderator',
      'Prioritizes balance, fairness, and maintaining productive discourse',
      'moderator',
      llmProvider,
      parameterProvider,
      id,
      'source-trust' // Moderators care about credible sources
    );
    
    this.initializeModeratorCompatibility();
  }

  private initializeModeratorCompatibility(): void {
    this.setCompatibility('moderator', 0.95);      // High compatibility with same type
    this.setCompatibility('judge', 0.8);           // High compatibility - both value fairness
    this.setCompatibility('pro-debater', 0.7);     // Good compatibility - moderators facilitate
    this.setCompatibility('con-debater', 0.7);     // Good compatibility - moderators facilitate
    this.setCompatibility('efficiency', 0.8);      // Good compatibility
    this.setCompatibility('thoroughness', 0.7);    // Good compatibility
    this.setCompatibility('security', 0.6);        // Moderate compatibility
  }
}

// ============================================================================
// FRAME REGISTRATION - Open/Closed Principle in Action
// ============================================================================

/**
 * Factory functions for each frame type
 * These enable the registry system to create frames without hardcoded dependencies
 */

const efficiencyFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new EfficiencyFrameImpl(llmProvider, parameterProvider, id);
};

const thoroughnessFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new ThoroughnessFrameImpl(llmProvider, parameterProvider, id);
};

const securityFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new SecurityFrameImpl(llmProvider, parameterProvider, id);
};

const proDebaterFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new ProDebaterFrameImpl(llmProvider, parameterProvider, id);
};

const conDebaterFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new ConDebaterFrameImpl(llmProvider, parameterProvider, id);
};

const judgeFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new JudgeFrameImpl(llmProvider, parameterProvider, id);
};

const moderatorFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new ModeratorFrameImpl(llmProvider, parameterProvider, id);
};

/**
 * Register all frame types with the registry
 * This is the ONLY place where frame types need to be registered
 * New frames can be added here without modifying any other code
 */
export function registerAllFrameTypes(): void {
  FrameRegistry.registerFrameType('efficiency', efficiencyFrameFactory);
  FrameRegistry.registerFrameType('thoroughness', thoroughnessFrameFactory);
  FrameRegistry.registerFrameType('security', securityFrameFactory);
  FrameRegistry.registerFrameType('pro-debater', proDebaterFrameFactory);
  FrameRegistry.registerFrameType('con-debater', conDebaterFrameFactory);
  FrameRegistry.registerFrameType('judge', judgeFrameFactory);
  FrameRegistry.registerFrameType('moderator', moderatorFrameFactory);
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR EASY FRAME CREATION
// ============================================================================

/**
 * Create frame instances easily without dealing with registry directly
 */
export function createEfficiencyFrame(llmProvider: ILLMProvider, id?: string): IEpistemicFrame {
  const config = createFrameConfig('efficiency');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id);
}

export function createThoroughnessFrame(llmProvider: ILLMProvider, id?: string): IEpistemicFrame {
  const config = createFrameConfig('thoroughness');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id);
}

export function createSecurityFrame(llmProvider: ILLMProvider, id?: string): IEpistemicFrame {
  const config = createFrameConfig('security');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id);
}

export function createProDebaterFrame(llmProvider: ILLMProvider, id?: string): IDebateFrame {
  const config = createFrameConfig('pro-debater');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id) as IDebateFrame;
}

export function createConDebaterFrame(llmProvider: ILLMProvider, id?: string): IDebateFrame {
  const config = createFrameConfig('con-debater');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id) as IDebateFrame;
}

export function createJudgeFrame(llmProvider: ILLMProvider, id?: string): IDebateFrame {
  const config = createFrameConfig('judge');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id) as IDebateFrame;
}

export function createModeratorFrame(llmProvider: ILLMProvider, id?: string): IEpistemicFrame {
  const config = createFrameConfig('moderator');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id);
}

// ============================================================================
// EXAMPLE: CREATING A CUSTOM FRAME (Shows how easy it is to extend)
// ============================================================================

/**
 * Example custom frame - Optimism Frame
 * This demonstrates how easy it is to create new frames without modifying existing code
 */
class OptimismFrameImpl extends ComposableBaseFrame {
  constructor(
    llmProvider: ILLMProvider,
    parameterProvider?: IParameterProvider,
    id?: string
  ) {
    super(
      'Optimism',
      'Prioritizes positive evidence and hopeful interpretations',
      'optimism',
      llmProvider,
      parameterProvider,
      id,
      'frame-weighted'
    );
    
    // Optimism frame is compatible with most other frames
    this.setCompatibility('optimism', 0.95);
    this.setCompatibility('efficiency', 0.8);
    this.setCompatibility('thoroughness', 0.6);
    this.setCompatibility('security', 0.4);        // Lower compatibility - security is cautious
    this.setCompatibility('pro-debater', 0.7);
    this.setCompatibility('con-debater', 0.3);     // Lower compatibility - con is critical
    this.setCompatibility('judge', 0.6);
    this.setCompatibility('moderator', 0.7);
  }
}

/**
 * Factory for optimism frame
 */
const optimismFrameFactory: FrameFactory = (config, llmProvider, parameterProvider, id) => {
  return new OptimismFrameImpl(llmProvider, parameterProvider, id);
};

/**
 * Register the custom frame (just add this one line!)
 */
export function registerOptimismFrame(): void {
  FrameRegistry.registerFrameType('optimism', optimismFrameFactory);
}

/**
 * Convenience function for creating optimism frame
 */
export function createOptimismFrame(llmProvider: ILLMProvider, id?: string): IEpistemicFrame {
  const config = createFrameConfig('optimism');
  return FrameRegistry.createFrame(config, llmProvider, undefined, id);
}