/**
 * Mock LLM Provider for Testing
 * 
 * Provides predictable, controllable responses for testing the frame system
 * without depending on external LLM services.
 */

import { ILLMProvider, IFrameIdentity, AgentContext } from '../../src/epistemic/frame-interfaces';
import type { JustificationElement } from '../../src/types/common';

export interface MockLLMConfig {
  evidenceStrengthMap?: Map<string, number>;
  evidenceSaliencyMap?: Map<string, number>;
  interpretationMap?: Map<string, string>;
  propositionMap?: Map<string, string[]>;
  defaultStrength?: number;
  defaultSaliency?: number;
  shouldThrowErrors?: boolean;
  latencyMs?: number;
}

/**
 * Mock LLM Provider with configurable responses
 */
export class MockLLMProvider implements ILLMProvider {
  private config: Required<MockLLMConfig>;
  private callCount: Map<string, number> = new Map();

  constructor(config: MockLLMConfig = {}) {
    this.config = {
      evidenceStrengthMap: config.evidenceStrengthMap || new Map(),
      evidenceSaliencyMap: config.evidenceSaliencyMap || new Map(),
      interpretationMap: config.interpretationMap || new Map(),
      propositionMap: config.propositionMap || new Map(),
      defaultStrength: config.defaultStrength ?? 0.5,
      defaultSaliency: config.defaultSaliency ?? 0.5,
      shouldThrowErrors: config.shouldThrowErrors ?? false,
      latencyMs: config.latencyMs ?? 0
    };
  }

  /**
   * Mock evidence strength judgment with configurable responses
   */
  async judgeEvidenceStrength(
    evidence: JustificationElement,
    proposition: string,
    context?: Record<string, any>
  ): Promise<number> {
    this.incrementCallCount('judgeEvidenceStrength');
    
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock LLM error for testing');
    }

    await this.simulateLatency();

    // Create key for lookup
    const key = `${evidence.type}_${proposition}_${evidence.content || ''}`;
    
    // Return configured response or default
    const strength = this.config.evidenceStrengthMap.get(key) ?? 
                    this.config.evidenceStrengthMap.get(evidence.type) ??
                    this.config.evidenceStrengthMap.get(proposition) ??
                    this.config.defaultStrength;

    return Math.max(0, Math.min(1, strength));
  }

  /**
   * Mock evidence saliency judgment with configurable responses
   */
  async judgeEvidenceSaliency(
    evidence: JustificationElement,
    frame: IFrameIdentity,
    context?: Record<string, any>
  ): Promise<number> {
    this.incrementCallCount('judgeEvidenceSaliency');
    
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock LLM error for testing');
    }

    await this.simulateLatency();

    // Create key for lookup
    const key = `${frame.frameType}_${evidence.type}_${evidence.content || ''}`;
    
    // Return configured response or default
    const saliency = this.config.evidenceSaliencyMap.get(key) ?? 
                    this.config.evidenceSaliencyMap.get(`${frame.frameType}_${evidence.type}`) ??
                    this.config.evidenceSaliencyMap.get(frame.frameType) ??
                    this.config.defaultSaliency;

    return Math.max(0, Math.min(1, saliency));
  }

  /**
   * Mock perception interpretation with configurable responses
   */
  async interpretPerceptionData(
    data: string,
    frame: IFrameIdentity,
    agentContext: AgentContext
  ): Promise<string> {
    this.incrementCallCount('interpretPerceptionData');
    
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock LLM error for testing');
    }

    await this.simulateLatency();

    // Create key for lookup
    const key = `${frame.frameType}_${data}`;
    
    // Return configured response or frame-modified interpretation
    return this.config.interpretationMap.get(key) ?? 
           this.config.interpretationMap.get(frame.frameType) ??
           `[${frame.name} interpretation] ${data}`;
  }

  /**
   * Mock proposition extraction with configurable responses
   */
  async extractPropositions(
    text: string,
    frame: IFrameIdentity,
    context?: Record<string, any>
  ): Promise<string[]> {
    this.incrementCallCount('extractPropositions');
    
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock LLM error for testing');
    }

    await this.simulateLatency();

    // Create key for lookup
    const key = `${frame.frameType}_${text}`;
    
    // Return configured response or default extraction
    return this.config.propositionMap.get(key) ?? 
           this.config.propositionMap.get(frame.frameType) ??
           [`Proposition extracted from: ${text.substring(0, 50)}...`];
  }

  // ==========================================================================
  // TEST UTILITIES
  // ==========================================================================

  /**
   * Configure response for evidence strength judgment
   */
  setEvidenceStrength(key: string, strength: number): void {
    this.config.evidenceStrengthMap.set(key, strength);
  }

  /**
   * Configure response for evidence saliency judgment
   */
  setEvidenceSaliency(key: string, saliency: number): void {
    this.config.evidenceSaliencyMap.set(key, saliency);
  }

  /**
   * Configure response for perception interpretation
   */
  setInterpretation(key: string, interpretation: string): void {
    this.config.interpretationMap.set(key, interpretation);
  }

  /**
   * Configure response for proposition extraction
   */
  setPropositions(key: string, propositions: string[]): void {
    this.config.propositionMap.set(key, propositions);
  }

  /**
   * Get number of calls to a specific method
   */
  getCallCount(method: string): number {
    return this.callCount.get(method) || 0;
  }

  /**
   * Get total number of calls across all methods
   */
  getTotalCallCount(): number {
    return Array.from(this.callCount.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Reset all call counts
   */
  resetCallCounts(): void {
    this.callCount.clear();
  }

  /**
   * Get all method call counts
   */
  getAllCallCounts(): Record<string, number> {
    return Object.fromEntries(this.callCount.entries());
  }

  /**
   * Configure to throw errors for testing error handling
   */
  setShouldThrowErrors(shouldThrow: boolean): void {
    this.config.shouldThrowErrors = shouldThrow;
  }

  /**
   * Set simulated latency for performance testing
   */
  setLatency(ms: number): void {
    this.config.latencyMs = ms;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private incrementCallCount(method: string): void {
    const current = this.callCount.get(method) || 0;
    this.callCount.set(method, current + 1);
  }

  private async simulateLatency(): Promise<void> {
    if (this.config.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.latencyMs));
    }
  }
}

/**
 * Factory for creating common mock LLM configurations
 */
export class MockLLMFactory {
  /**
   * Create a mock LLM that returns high strength for positive evidence
   */
  static createOptimisticMock(): MockLLMProvider {
    const mock = new MockLLMProvider({ defaultStrength: 0.8, defaultSaliency: 0.8 });
    
    // Configure optimistic responses
    mock.setEvidenceStrength('positive', 0.9);
    mock.setEvidenceStrength('supporting', 0.9);
    mock.setEvidenceStrength('favorable', 0.85);
    mock.setEvidenceStrength('negative', 0.3);
    mock.setEvidenceStrength('opposing', 0.3);
    
    return mock;
  }

  /**
   * Create a mock LLM that returns low strength for all evidence (pessimistic)
   */
  static createPessimisticMock(): MockLLMProvider {
    const mock = new MockLLMProvider({ defaultStrength: 0.3, defaultSaliency: 0.6 });
    
    // Configure pessimistic responses
    mock.setEvidenceStrength('positive', 0.4);
    mock.setEvidenceStrength('supporting', 0.4);
    mock.setEvidenceStrength('negative', 0.7);
    mock.setEvidenceStrength('opposing', 0.7);
    
    return mock;
  }

  /**
   * Create a mock LLM that always returns neutral values
   */
  static createNeutralMock(): MockLLMProvider {
    return new MockLLMProvider({ 
      defaultStrength: 0.5, 
      defaultSaliency: 0.5 
    });
  }

  /**
   * Create a mock LLM that throws errors for testing error handling
   */
  static createErrorMock(): MockLLMProvider {
    return new MockLLMProvider({ shouldThrowErrors: true });
  }

  /**
   * Create a mock LLM with high latency for performance testing
   */
  static createSlowMock(latencyMs: number = 1000): MockLLMProvider {
    return new MockLLMProvider({ latencyMs });
  }

  /**
   * Create a mock LLM with specific frame-based responses
   */
  static createFrameSpecificMock(): MockLLMProvider {
    const mock = new MockLLMProvider();
    
    // Efficiency frame favors performance evidence
    mock.setEvidenceSaliency('efficiency_performance', 0.9);
    mock.setEvidenceSaliency('efficiency_speed', 0.9);
    mock.setEvidenceSaliency('efficiency_detailed', 0.3);
    
    // Thoroughness frame favors detailed evidence
    mock.setEvidenceSaliency('thoroughness_detailed', 0.9);
    mock.setEvidenceSaliency('thoroughness_comprehensive', 0.8);
    mock.setEvidenceSaliency('thoroughness_performance', 0.4);
    
    // Security frame favors security evidence
    mock.setEvidenceSaliency('security_security', 0.9);
    mock.setEvidenceSaliency('security_risk', 0.8);
    mock.setEvidenceSaliency('security_performance', 0.3);
    
    return mock;
  }
}