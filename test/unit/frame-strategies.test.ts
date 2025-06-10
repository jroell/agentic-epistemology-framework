/**
 * Unit Tests for Frame Strategies
 * 
 * Tests the mathematical formalism implementations from AEF Paper Section 5.4.3:
 * - Frame-Weighted Update Strategy (Equation 1)
 * - Source-Trust Update Strategy (Equation 2)
 * - Bayesian Update Strategy (Equation 3)
 * - Hybrid Update Strategy
 * - Parameter Learning Algorithms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FrameWeightedUpdateStrategy,
  SourceTrustUpdateStrategy,
  BayesianUpdateStrategy,
  HybridUpdateStrategy,
  ExponentialMovingAverageTrustLearner,
  HeuristicWeightCalculator,
  UpdateStrategyFactory
} from '../../src/epistemic/frame-strategies';
import type { ConfidenceUpdateContext } from '../../src/epistemic/frame-interfaces';
import { MockLLMFactory } from '../fixtures/mock-llm-provider';
import { 
  createTestEvidence, 
  TEST_EVIDENCE, 
  MATHEMATICAL_TEST_CASES 
} from '../fixtures/test-data';
import { 
  assertValidConfidence, 
  assertConfidenceEqual, 
  testMathematicalFormalism,
  assertThrowsError 
} from '../utils/test-helpers';
import { TEST_CONFIG } from '../setup';

describe('Frame Strategies - Mathematical Formalism', () => {
  let mockLLM: any;

  beforeEach(() => {
    mockLLM = MockLLMFactory.createNeutralMock();
  });

  afterEach(() => {
    mockLLM?.resetCallCounts();
  });

  // ==========================================================================
  // FRAME-WEIGHTED UPDATE STRATEGY TESTS
  // ==========================================================================

  describe('FrameWeightedUpdateStrategy', () => {
    let strategy: FrameWeightedUpdateStrategy;

    beforeEach(() => {
      strategy = new FrameWeightedUpdateStrategy(mockLLM);
    });

    it('should implement AEF Equation 1: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)', async () => {
      for (const testCase of MATHEMATICAL_TEST_CASES.FRAME_WEIGHTED_CASES) {
        const evidence = [createTestEvidence('test', 'test content')];
        const updateContext: ConfidenceUpdateContext = {
          evidenceWeights: [testCase.evidenceWeight],
          evidenceConfidences: [testCase.evidenceConfidence]
        };

        const result = await strategy.updateConfidence(
          testCase.currentConfidence,
          evidence,
          'test proposition',
          updateContext
        );

        assertConfidenceEqual(
          result,
          testCase.expectedResult,
          TEST_CONFIG.MATHEMATICAL_PRECISION,
          testCase.name
        );
      }
    });

    it('should handle multiple evidence elements sequentially', async () => {
      const evidence = [
        createTestEvidence('type1', 'evidence 1'),
        createTestEvidence('type2', 'evidence 2'),
        createTestEvidence('type3', 'evidence 3')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.8, 0.6, 0.4],
        evidenceConfidences: [0.9, 0.7, 0.3]
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      // Manual calculation:
      // Step 1: 0.5 * (1-0.8) + 0.9 * 0.8 = 0.1 + 0.72 = 0.82
      // Step 2: 0.82 * (1-0.6) + 0.7 * 0.6 = 0.328 + 0.42 = 0.748
      // Step 3: 0.748 * (1-0.4) + 0.3 * 0.4 = 0.4488 + 0.12 = 0.5688
      const expected = 0.5688;

      assertConfidenceEqual(result, expected, 0.001);
    });

    it('should clamp confidence to valid range [0, 1]', async () => {
      const evidence = [createTestEvidence('extreme', 'extreme evidence')];
      
      // Test case that would exceed 1.0
      const highContext: ConfidenceUpdateContext = {
        evidenceWeights: [1.0],
        evidenceConfidences: [1.0]
      };

      const highResult = await strategy.updateConfidence(
        0.9,
        evidence,
        'test proposition',
        highContext
      );

      assertValidConfidence(highResult);
      expect(highResult).toBeLessThanOrEqual(1.0);

      // Test case that would go below 0.0
      const lowContext: ConfidenceUpdateContext = {
        evidenceWeights: [1.0],
        evidenceConfidences: [0.0]
      };

      const lowResult = await strategy.updateConfidence(
        0.1,
        evidence,
        'test proposition',
        lowContext
      );

      assertValidConfidence(lowResult);
      expect(lowResult).toBeGreaterThanOrEqual(0.0);
    });

    it('should handle empty evidence gracefully', async () => {
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [],
        evidenceConfidences: []
      };

      const result = await strategy.updateConfidence(
        0.6,
        [],
        'test proposition',
        updateContext
      );

      // With no evidence, confidence should remain unchanged
      assertConfidenceEqual(result, 0.6);
    });

    it('should use default values for missing weights or confidences', async () => {
      const evidence = [createTestEvidence('test', 'test evidence')];
      
      const partialContext: ConfidenceUpdateContext = {
        evidenceWeights: [], // Empty - should use defaults
        evidenceConfidences: [0.8]
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        partialContext
      );

      // Should use default weight of 0.5
      // 0.5 * (1-0.5) + 0.8 * 0.5 = 0.25 + 0.4 = 0.65
      assertConfidenceEqual(result, 0.65);
    });
  });

  // ==========================================================================
  // SOURCE-TRUST UPDATE STRATEGY TESTS
  // ==========================================================================

  describe('SourceTrustUpdateStrategy', () => {
    let strategy: SourceTrustUpdateStrategy;

    beforeEach(() => {
      strategy = new SourceTrustUpdateStrategy(mockLLM);
    });

    it('should implement AEF Equation 2: conf_new = (1 - α) * conf_old + α * trust(e_source, F)', async () => {
      for (const testCase of MATHEMATICAL_TEST_CASES.SOURCE_TRUST_CASES) {
        const evidence = [createTestEvidence('test', 'test content', 'test_source')];
        const updateContext: ConfidenceUpdateContext = {
          evidenceWeights: [0.5], // Not used in source-trust strategy
          evidenceConfidences: [0.5], // Not used in source-trust strategy
          sourceTrusts: [testCase.sourceTrust],
          sensitivity: testCase.sensitivity
        };

        const result = await strategy.updateConfidence(
          testCase.currentConfidence,
          evidence,
          'test proposition',
          updateContext
        );

        assertConfidenceEqual(
          result,
          testCase.expectedResult,
          TEST_CONFIG.MATHEMATICAL_PRECISION,
          testCase.name
        );
      }
    });

    it('should handle multiple sources with different trust levels', async () => {
      const evidence = [
        createTestEvidence('type1', 'evidence 1', 'high_trust_source'),
        createTestEvidence('type2', 'evidence 2', 'medium_trust_source'),
        createTestEvidence('type3', 'evidence 3', 'low_trust_source')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5, 0.5, 0.5], // Not used
        evidenceConfidences: [0.5, 0.5, 0.5], // Not used
        sourceTrusts: [0.9, 0.6, 0.2],
        sensitivity: 0.5
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      // Manual calculation with α = 0.5:
      // Step 1: 0.5 * (1-0.5) + 0.9 * 0.5 = 0.25 + 0.45 = 0.7
      // Step 2: 0.7 * (1-0.5) + 0.6 * 0.5 = 0.35 + 0.3 = 0.65
      // Step 3: 0.65 * (1-0.5) + 0.2 * 0.5 = 0.325 + 0.1 = 0.425
      const expected = 0.425;

      assertConfidenceEqual(result, expected, 0.001);
    });

    it('should use default sensitivity when not provided', async () => {
      const evidence = [createTestEvidence('test', 'test content', 'test_source')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5],
        evidenceConfidences: [0.5],
        sourceTrusts: [0.8]
        // No sensitivity provided - should default to 0.5
      };

      const result = await strategy.updateConfidence(
        0.6,
        evidence,
        'test proposition',
        updateContext
      );

      // With default sensitivity of 0.5:
      // 0.6 * (1-0.5) + 0.8 * 0.5 = 0.3 + 0.4 = 0.7
      assertConfidenceEqual(result, 0.7);
    });

    it('should use default trust when source trust not provided', async () => {
      const evidence = [createTestEvidence('test', 'test content')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5],
        evidenceConfidences: [0.5],
        sensitivity: 0.6
        // No sourceTrusts provided - should default to 0.5
      };

      const result = await strategy.updateConfidence(
        0.4,
        evidence,
        'test proposition',
        updateContext
      );

      // With default trust of 0.5 and sensitivity of 0.6:
      // 0.4 * (1-0.6) + 0.5 * 0.6 = 0.16 + 0.3 = 0.46
      assertConfidenceEqual(result, 0.46);
    });
  });

  // ==========================================================================
  // BAYESIAN UPDATE STRATEGY TESTS
  // ==========================================================================

  describe('BayesianUpdateStrategy', () => {
    let strategy: BayesianUpdateStrategy;

    beforeEach(() => {
      strategy = new BayesianUpdateStrategy(mockLLM);
    });

    it('should implement AEF Equation 3: Bayesian posterior update', async () => {
      for (const testCase of MATHEMATICAL_TEST_CASES.BAYESIAN_CASES) {
        const evidence = [createTestEvidence('statistical', 'statistical data')];
        const updateContext: ConfidenceUpdateContext = {
          evidenceWeights: [0.5], // Not used when likelihoods available
          evidenceConfidences: [0.5], // Not used when likelihoods available
          priorLikelihoods: {
            evidenceGivenProposition: testCase.evidenceGivenP,
            evidenceGivenNegation: testCase.evidenceGivenNotP
          }
        };

        const result = await strategy.updateConfidence(
          testCase.currentConfidence,
          evidence,
          'test proposition',
          updateContext
        );

        assertConfidenceEqual(
          result,
          testCase.expectedResult,
          0.001, // Higher precision for Bayesian calculations
          testCase.name
        );
      }
    });

    it('should fallback to frame-weighted update when no likelihoods available', async () => {
      const evidence = [createTestEvidence('observation', 'observational data')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.7],
        evidenceConfidences: [0.8]
        // No priorLikelihoods - should fallback to frame-weighted
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      // Should use frame-weighted calculation:
      // 0.5 * (1-0.7) + 0.8 * 0.7 = 0.15 + 0.56 = 0.71
      assertConfidenceEqual(result, 0.71);
    });

    it('should handle zero denominator gracefully', async () => {
      const evidence = [createTestEvidence('problematic', 'problematic data')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5],
        evidenceConfidences: [0.5],
        priorLikelihoods: {
          evidenceGivenProposition: 0.0,
          evidenceGivenNegation: 0.0 // This creates zero denominator
        }
      };

      const result = await strategy.updateConfidence(
        0.6,
        evidence,
        'test proposition',
        updateContext
      );

      // Should fallback gracefully and return reasonable value
      assertValidConfidence(result);
    });

    it('should handle multiple evidence elements with likelihoods', async () => {
      const evidence = [
        createTestEvidence('statistical1', 'data 1'),
        createTestEvidence('statistical2', 'data 2')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5, 0.5],
        evidenceConfidences: [0.5, 0.5],
        priorLikelihoods: {
          evidenceGivenProposition: 0.8,
          evidenceGivenNegation: 0.3
        }
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
      // Result should be influenced by the likelihood ratios
      expect(result).toBeGreaterThan(0.5); // Supporting evidence should increase confidence
    });
  });

  // ==========================================================================
  // HYBRID UPDATE STRATEGY TESTS
  // ==========================================================================

  describe('HybridUpdateStrategy', () => {
    let strategy: HybridUpdateStrategy;

    beforeEach(() => {
      strategy = new HybridUpdateStrategy(mockLLM);
    });

    it('should route statistical evidence to Bayesian updates', async () => {
      const evidence = [
        createTestEvidence('statistical', 'statistical data'),
        createTestEvidence('observation', 'observational data')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.7, 0.6],
        evidenceConfidences: [0.8, 0.7],
        priorLikelihoods: {
          evidenceGivenProposition: 0.9,
          evidenceGivenNegation: 0.2
        }
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
      // Should prioritize Bayesian update for statistical evidence
    });

    it('should route source-based evidence to source-trust updates', async () => {
      const evidence = [
        createTestEvidence('message', 'agent communication', 'trusted_agent'),
        createTestEvidence('observation', 'direct observation')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.6, 0.7],
        evidenceConfidences: [0.8, 0.6],
        sourceTrusts: [0.9, undefined], // Only first evidence has trust
        sensitivity: 0.5
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
    });

    it('should handle mixed evidence types appropriately', async () => {
      const evidence = [
        createTestEvidence('statistical', 'statistical data'),
        createTestEvidence('message', 'communication', 'agent_source'),
        createTestEvidence('observation', 'observation')
      ];
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.8, 0.7, 0.6],
        evidenceConfidences: [0.9, 0.8, 0.7],
        sourceTrusts: [undefined, 0.8, undefined],
        sensitivity: 0.6,
        priorLikelihoods: {
          evidenceGivenProposition: 0.85,
          evidenceGivenNegation: 0.25
        }
      };

      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
      
      // Result should reflect all three update strategies
      expect(result).toBeGreaterThan(0.5); // All evidence is generally supportive
    });
  });

  // ==========================================================================
  // PARAMETER LEARNING TESTS
  // ==========================================================================

  describe('ExponentialMovingAverageTrustLearner', () => {
    let learner: ExponentialMovingAverageTrustLearner;

    beforeEach(() => {
      learner = new ExponentialMovingAverageTrustLearner(0.1); // Low learning rate for testing
    });

    it('should implement exponential moving average formula from AEF Section 5.4.5.2', () => {
      const sourceId = 'test_source';
      
      // Initial trust should be default (0.5)
      expect(learner.getTrust(sourceId)).toBe(0.5);
      
      // Update with positive outcome
      const trust1 = learner.updateTrust(sourceId, 1.0);
      // trust = (1-0.1) * 0.5 + 0.1 * 1.0 = 0.45 + 0.1 = 0.55
      assertConfidenceEqual(trust1, 0.55);
      
      // Update with negative outcome
      const trust2 = learner.updateTrust(sourceId, 0.0);
      // trust = (1-0.1) * 0.55 + 0.1 * 0.0 = 0.495 + 0 = 0.495
      assertConfidenceEqual(trust2, 0.495);
      
      // Verify getTrust returns latest value
      assertConfidenceEqual(learner.getTrust(sourceId), 0.495);
    });

    it('should handle multiple sources independently', () => {
      learner.updateTrust('source_a', 0.9);
      learner.updateTrust('source_b', 0.2);
      
      expect(learner.getTrust('source_a')).toBeGreaterThan(0.5);
      expect(learner.getTrust('source_b')).toBeLessThan(0.5);
      expect(learner.getTrust('source_c')).toBe(0.5); // Unseen source
    });

    it('should adapt learning rate correctly', () => {
      const fastLearner = new ExponentialMovingAverageTrustLearner(0.5); // High learning rate
      const slowLearner = new ExponentialMovingAverageTrustLearner(0.1); // Low learning rate
      
      const sourceId = 'test_source';
      
      fastLearner.updateTrust(sourceId, 1.0);
      slowLearner.updateTrust(sourceId, 1.0);
      
      // Fast learner should change more
      expect(fastLearner.getTrust(sourceId)).toBeGreaterThan(slowLearner.getTrust(sourceId));
    });
  });

  describe('HeuristicWeightCalculator', () => {
    let calculator: HeuristicWeightCalculator;

    beforeEach(() => {
      calculator = new HeuristicWeightCalculator();
      calculator.initializeDefaults();
    });

    it('should provide frame-specific evidence weights from AEF Section 5.4.5.1', () => {
      // Test efficiency frame weights
      expect(calculator.getWeight('efficiency', 'performance')).toBe(0.8);
      expect(calculator.getWeight('efficiency', 'speed')).toBe(0.9);
      expect(calculator.getWeight('efficiency', 'detailed')).toBe(0.3);
      
      // Test thoroughness frame weights
      expect(calculator.getWeight('thoroughness', 'detailed')).toBe(0.9);
      expect(calculator.getWeight('thoroughness', 'comprehensive')).toBe(0.8);
      expect(calculator.getWeight('thoroughness', 'quick')).toBe(0.2);
      
      // Test security frame weights
      expect(calculator.getWeight('security', 'security')).toBe(0.9);
      expect(calculator.getWeight('security', 'risk')).toBe(0.8);
      expect(calculator.getWeight('security', 'performance')).toBe(0.4);
    });

    it('should allow custom weight rules', () => {
      calculator.setWeightRule('custom_frame', 'custom_evidence', 0.75);
      expect(calculator.getWeight('custom_frame', 'custom_evidence')).toBe(0.75);
    });

    it('should return default weight for unknown combinations', () => {
      expect(calculator.getWeight('unknown_frame', 'unknown_evidence')).toBe(0.5);
    });

    it('should handle debate frame weights correctly', () => {
      expect(calculator.getWeight('pro-debater', 'supporting')).toBe(0.85);
      expect(calculator.getWeight('pro-debater', 'opposing')).toBe(0.3);
      expect(calculator.getWeight('con-debater', 'opposing')).toBe(0.85);
      expect(calculator.getWeight('con-debater', 'supporting')).toBe(0.3);
    });
  });

  // ==========================================================================
  // UPDATE STRATEGY FACTORY TESTS
  // ==========================================================================

  describe('UpdateStrategyFactory', () => {
    it('should create frame-weighted strategy', () => {
      const strategy = UpdateStrategyFactory.createStrategy('frame-weighted', mockLLM);
      expect(strategy).toBeInstanceOf(FrameWeightedUpdateStrategy);
    });

    it('should create source-trust strategy', () => {
      const strategy = UpdateStrategyFactory.createStrategy('source-trust', mockLLM);
      expect(strategy).toBeInstanceOf(SourceTrustUpdateStrategy);
    });

    it('should create bayesian strategy', () => {
      const strategy = UpdateStrategyFactory.createStrategy('bayesian', mockLLM);
      expect(strategy).toBeInstanceOf(BayesianUpdateStrategy);
    });

    it('should create hybrid strategy', () => {
      const strategy = UpdateStrategyFactory.createStrategy('hybrid', mockLLM);
      expect(strategy).toBeInstanceOf(HybridUpdateStrategy);
    });

    it('should list available strategies', () => {
      const strategies = UpdateStrategyFactory.getAvailableStrategies();
      expect(strategies).toContain('frame-weighted');
      expect(strategies).toContain('source-trust');
      expect(strategies).toContain('bayesian');
      expect(strategies).toContain('hybrid');
    });

    it('should allow registering custom strategies', () => {
      class CustomStrategy implements any {
        async updateConfidence(): Promise<number> {
          return 0.5;
        }
      }
      
      UpdateStrategyFactory.registerStrategy('custom', () => new CustomStrategy());
      
      const strategies = UpdateStrategyFactory.getAvailableStrategies();
      expect(strategies).toContain('custom');
      
      const customStrategy = UpdateStrategyFactory.createStrategy('custom');
      expect(customStrategy).toBeInstanceOf(CustomStrategy);
    });

    it('should throw error for unknown strategy', () => {
      expect(() => {
        UpdateStrategyFactory.createStrategy('unknown_strategy');
      }).toThrow('Unknown update strategy: unknown_strategy');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle invalid confidence values gracefully', async () => {
      const strategy = new FrameWeightedUpdateStrategy(mockLLM);
      const evidence = [createTestEvidence('test', 'test')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5],
        evidenceConfidences: [0.5]
      };

      // Test with invalid initial confidence - should clamp to valid range
      const result = await strategy.updateConfidence(
        -0.5, // Invalid confidence
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
    });

    it('should handle LLM provider errors gracefully', async () => {
      const errorLLM = MockLLMFactory.createErrorMock();
      const strategy = new FrameWeightedUpdateStrategy(errorLLM);
      
      const evidence = [createTestEvidence('test', 'test')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.5],
        evidenceConfidences: [0.5]
      };

      // Should not throw error even if LLM fails
      const result = await strategy.updateConfidence(
        0.5,
        evidence,
        'test proposition',
        updateContext
      );

      assertValidConfidence(result);
    });
  });
});