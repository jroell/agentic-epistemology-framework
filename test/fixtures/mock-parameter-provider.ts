/**
 * Mock Parameter Provider for Testing
 * 
 * Provides controllable parameter management for testing frame behavior
 * and parameter learning algorithms.
 */

import { IParameterProvider } from '../../src/epistemic/frame-interfaces';

export interface MockParameterConfig {
  parameters?: Map<string, Map<string, number>>;
  shouldThrowErrors?: boolean;
  latencyMs?: number;
  learningEnabled?: boolean;
}

/**
 * Mock Parameter Provider with configurable behavior
 */
export class MockParameterProvider implements IParameterProvider {
  private parameters: Map<string, Map<string, number>> = new Map();
  private config: Required<MockParameterConfig>;
  private updateHistory: Array<{
    frameId: string;
    parameterName: string;
    oldValue: number;
    newValue: number;
    timestamp: number;
    context?: Record<string, any>;
  }> = [];

  constructor(config: MockParameterConfig = {}) {
    this.config = {
      parameters: config.parameters || new Map(),
      shouldThrowErrors: config.shouldThrowErrors ?? false,
      latencyMs: config.latencyMs ?? 0,
      learningEnabled: config.learningEnabled ?? true
    };
    
    // Initialize with provided parameters
    if (config.parameters) {
      this.parameters = new Map(config.parameters);
    }
    
    this.initializeDefaultParameters();
  }

  /**
   * Get parameter value for frame and context
   */
  async getParameter(
    frameId: string,
    parameterName: string,
    context?: Record<string, any>
  ): Promise<number> {
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock parameter provider error for testing');
    }

    await this.simulateLatency();

    const frameParams = this.parameters.get(frameId);
    if (!frameParams) {
      // Return sensible defaults for common parameters
      return this.getDefaultParameterValue(parameterName);
    }

    return frameParams.get(parameterName) ?? this.getDefaultParameterValue(parameterName);
  }

  /**
   * Update parameter based on experience/learning
   */
  async updateParameter(
    frameId: string,
    parameterName: string,
    newValue: number,
    context?: Record<string, any>
  ): Promise<void> {
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock parameter provider error for testing');
    }

    if (!this.config.learningEnabled) {
      return; // Learning disabled for testing
    }

    await this.simulateLatency();

    // Get current value for history
    const oldValue = await this.getParameter(frameId, parameterName, context);

    // Ensure frame parameter map exists
    if (!this.parameters.has(frameId)) {
      this.parameters.set(frameId, new Map());
    }

    // Update parameter
    const frameParams = this.parameters.get(frameId)!;
    frameParams.set(parameterName, Math.max(0, Math.min(1, newValue)));

    // Record update history
    this.updateHistory.push({
      frameId,
      parameterName,
      oldValue,
      newValue,
      timestamp: Date.now(),
      context
    });
  }

  /**
   * Get all parameters for frame
   */
  async getFrameParameters(frameId: string): Promise<Record<string, number>> {
    if (this.config.shouldThrowErrors) {
      throw new Error('Mock parameter provider error for testing');
    }

    await this.simulateLatency();

    const frameParams = this.parameters.get(frameId);
    if (!frameParams) {
      return this.getDefaultFrameParameters();
    }

    return Object.fromEntries(frameParams.entries());
  }

  // ==========================================================================
  // TEST UTILITIES
  // ==========================================================================

  /**
   * Set specific parameter value
   */
  setParameter(frameId: string, parameterName: string, value: number): void {
    if (!this.parameters.has(frameId)) {
      this.parameters.set(frameId, new Map());
    }
    this.parameters.get(frameId)!.set(parameterName, value);
  }

  /**
   * Set multiple parameters for a frame
   */
  setFrameParameters(frameId: string, parameters: Record<string, number>): void {
    const frameParams = new Map(Object.entries(parameters));
    this.parameters.set(frameId, frameParams);
  }

  /**
   * Get parameter update history
   */
  getUpdateHistory(): Array<{
    frameId: string;
    parameterName: string;
    oldValue: number;
    newValue: number;
    timestamp: number;
    context?: Record<string, any>;
  }> {
    return [...this.updateHistory];
  }

  /**
   * Get updates for specific frame
   */
  getFrameUpdateHistory(frameId: string): Array<{
    parameterName: string;
    oldValue: number;
    newValue: number;
    timestamp: number;
    context?: Record<string, any>;
  }> {
    return this.updateHistory
      .filter(update => update.frameId === frameId)
      .map(({ frameId, ...rest }) => rest);
  }

  /**
   * Clear all parameters
   */
  clearParameters(): void {
    this.parameters.clear();
    this.updateHistory = [];
  }

  /**
   * Clear history while keeping parameters
   */
  clearHistory(): void {
    this.updateHistory = [];
  }

  /**
   * Enable/disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.config.learningEnabled = enabled;
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

  /**
   * Get statistics about parameter updates
   */
  getUpdateStatistics(): {
    totalUpdates: number;
    framesUpdated: number;
    parametersUpdated: number;
    averageUpdateValue: number;
  } {
    const uniqueFrames = new Set(this.updateHistory.map(u => u.frameId));
    const uniqueParameters = new Set(this.updateHistory.map(u => u.parameterName));
    const averageValue = this.updateHistory.length > 0
      ? this.updateHistory.reduce((sum, u) => sum + u.newValue, 0) / this.updateHistory.length
      : 0;

    return {
      totalUpdates: this.updateHistory.length,
      framesUpdated: uniqueFrames.size,
      parametersUpdated: uniqueParameters.size,
      averageUpdateValue: averageValue
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getDefaultParameterValue(parameterName: string): number {
    // Provide sensible defaults based on parameter name
    const defaults: Record<string, number> = {
      'weightPerformance': 0.5,
      'weightDetail': 0.5,
      'weightSecurity': 0.5,
      'weightFairness': 0.7,
      'weightSupportive': 0.6,
      'weightCritical': 0.6,
      'weightEvidence': 0.7,
      'weightLogic': 0.8,
      'weightStructure': 0.6,
      'trustLearningRate': 0.1,
      'sensitivityAlpha': 0.5,
      'confidenceThreshold': 0.7
    };

    return defaults[parameterName] ?? 0.5;
  }

  private getDefaultFrameParameters(): Record<string, number> {
    return {
      'weightPerformance': 0.5,
      'weightDetail': 0.5,
      'weightSecurity': 0.5,
      'weightFairness': 0.7,
      'weightSupportive': 0.6,
      'weightCritical': 0.6,
      'weightEvidence': 0.7,
      'weightLogic': 0.8,
      'weightStructure': 0.6
    };
  }

  private initializeDefaultParameters(): void {
    // Initialize common frame types with their typical parameters
    this.setFrameParameters('efficiency', {
      'weightPerformance': 0.8,
      'weightSpeed': 0.9,
      'weightDetail': 0.3
    });

    this.setFrameParameters('thoroughness', {
      'weightDetail': 0.8,
      'weightComprehensive': 0.8,
      'weightSpeed': 0.2
    });

    this.setFrameParameters('security', {
      'weightSecurity': 0.8,
      'weightRisk': 0.8,
      'weightPerformance': 0.4
    });

    this.setFrameParameters('pro-debater', {
      'weightSupportive': 0.85,
      'weightOpposing': 0.3
    });

    this.setFrameParameters('con-debater', {
      'weightCritical': 0.85,
      'weightSupportive': 0.3
    });

    this.setFrameParameters('judge', {
      'weightEvidence': 0.6,
      'weightLogic': 0.7,
      'weightStructure': 0.5
    });

    this.setFrameParameters('moderator', {
      'weightFairness': 0.9,
      'weightBalance': 0.8
    });
  }

  private async simulateLatency(): Promise<void> {
    if (this.config.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.latencyMs));
    }
  }
}

/**
 * Factory for creating common mock parameter provider configurations
 */
export class MockParameterFactory {
  /**
   * Create a parameter provider with learning enabled
   */
  static createLearningProvider(): MockParameterProvider {
    return new MockParameterProvider({ learningEnabled: true });
  }

  /**
   * Create a parameter provider with learning disabled
   */
  static createStaticProvider(): MockParameterProvider {
    return new MockParameterProvider({ learningEnabled: false });
  }

  /**
   * Create a parameter provider that throws errors
   */
  static createErrorProvider(): MockParameterProvider {
    return new MockParameterProvider({ shouldThrowErrors: true });
  }

  /**
   * Create a slow parameter provider for performance testing
   */
  static createSlowProvider(latencyMs: number = 500): MockParameterProvider {
    return new MockParameterProvider({ latencyMs });
  }

  /**
   * Create a parameter provider with custom parameters
   */
  static createCustomProvider(parameters: Map<string, Map<string, number>>): MockParameterProvider {
    return new MockParameterProvider({ parameters });
  }

  /**
   * Create a parameter provider optimized for efficiency frames
   */
  static createEfficiencyOptimizedProvider(): MockParameterProvider {
    const provider = new MockParameterProvider();
    
    provider.setFrameParameters('efficiency', {
      'weightPerformance': 0.9,
      'weightSpeed': 0.95,
      'weightDetail': 0.2,
      'weightThorough': 0.1
    });
    
    return provider;
  }

  /**
   * Create a parameter provider optimized for debate frames
   */
  static createDebateOptimizedProvider(): MockParameterProvider {
    const provider = new MockParameterProvider();
    
    provider.setFrameParameters('pro-debater', {
      'weightSupportive': 0.9,
      'weightOpposing': 0.2,
      'argumentStrengthMultiplier': 1.2
    });
    
    provider.setFrameParameters('con-debater', {
      'weightCritical': 0.9,
      'weightSupportive': 0.2,
      'skepticalAdjustment': 0.8
    });
    
    provider.setFrameParameters('judge', {
      'weightEvidence': 0.8,
      'weightLogic': 0.9,
      'weightStructure': 0.7,
      'neutralityBonus': 1.0
    });
    
    return provider;
  }
}