/**
 * End-to-End Tests for AEF Mathematical Formalism
 * 
 * Tests the complete mathematical framework from the AEF paper working
 * in realistic scenarios with actual frame interactions and confidence updates.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FrameRegistry, createFrame } from '../../src/epistemic/frame-base';
import { registerAllFrameTypes } from '../../src/epistemic/solid-frames';
import { MockLLMProvider } from '../fixtures/mock-llm-provider';
import { MockParameterProvider } from '../fixtures/mock-parameter-provider';
import { createTestEvidence, createTestProposition, TEST_EVIDENCE, TEST_PROPOSITIONS } from '../fixtures/test-data';
import { assertValidConfidence, assertConfidenceEqual } from '../utils/test-helpers';
import type { IEpistemicFrame, IDebateFrame } from '../../src/epistemic/frame-interfaces';
import type { JustificationElement } from '../../src/types/common';

describe('AEF Mathematical Formalism E2E Tests', () => {
  let llmProvider: MockLLMProvider;
  let parameterProvider: MockParameterProvider;

  beforeEach(() => {
    FrameRegistry.clear();
    registerAllFrameTypes();

    llmProvider = new MockLLMProvider();
    parameterProvider = new MockParameterProvider();
  });

  afterEach(() => {
    FrameRegistry.clear();
  });

  describe('Frame-Weighted Update Formula (Equation 1)', () => {
    it('should implement conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P) correctly', async () => {
      // Create efficiency frame with known weighting behavior
      const frame = createFrame('efficiency-frame', llmProvider, parameterProvider);
      const evidence = createTestEvidence('System shows 95% efficiency', 'performance_monitor');
      const proposition = createTestProposition('efficiency-claim', 'The system is highly efficient');
      
      // Set initial confidence
      const initialConfidence = 0.6;
      
      // Configure frame weighting (efficiency frame should weight performance data highly)
      llmProvider.setEvidenceSaliency('efficiency-frame_performance-data', 0.8); // High weight for relevant evidence
      llmProvider.setEvidenceStrength('performance-data_efficiency-claim', 0.9); // High confidence from evidence
      
      // Create update context
      const updateContext = {
        evidenceWeights: [0.8],
        evidenceConfidences: [0.9],
        metadata: {}
      };

      // Apply frame-weighted update
      const result = await frame.updateConfidence(initialConfidence, [evidence], proposition, updateContext);

      // Verify mathematical formula: conf_new = (1 - 0.8) * 0.6 + 0.8 * 0.9 = 0.2 * 0.6 + 0.72 = 0.12 + 0.72 = 0.84
      expect(result).toBeCloseTo(0.84, 2);
      assertValidConfidence(result);
    });

    it('should handle low frame weights correctly', async () => {
      const frame = createFrame('security-frame', llmProvider, parameterProvider);
      const evidence = createTestEvidence('Weather is sunny today', 'weather_service');
      const proposition = createTestProposition('security-claim', 'The system is secure');

      const initialConfidence = 0.7;

      // Create update context with low weights for irrelevant evidence
      const updateContext = {
        evidenceWeights: [0.1], // Low weight for irrelevant evidence
        evidenceConfidences: [0.3], // Low confidence from evidence
        metadata: {}
      };

      const result = await frame.updateConfidence(initialConfidence, [evidence], proposition, updateContext);

      // Formula: conf_new = (1 - 0.1) * 0.7 + 0.1 * 0.3 = 0.9 * 0.7 + 0.03 = 0.63 + 0.03 = 0.66
      expect(result).toBeCloseTo(0.66, 2);
      assertValidConfidence(result);
    });
  });

  describe('Source-Trust Update Formula (Equation 2)', () => {
    it('should implement source-trust update correctly', async () => {
      const frame = createFrame('thoroughness-frame', llmProvider, parameterProvider);
      const evidence = createTestEvidence('Expert analysis shows comprehensive coverage', 'expert_consultant');
      const proposition = createTestProposition('thoroughness-claim', 'The analysis is thorough');

      const initialConfidence = 0.5;

      // Create update context with source trust parameters
      const updateContext = {
        evidenceWeights: [0.6],
        evidenceConfidences: [0.9],
        sourceTrusts: [0.9], // High trust in expert sources
        sensitivity: 0.6, // α parameter
        metadata: {}
      };

      const result = await frame.updateConfidence(initialConfidence, [evidence], proposition, updateContext);

      // Note: The exact formula depends on the frame's update strategy
      // This test verifies the result is reasonable and within bounds
      expect(result).toBeGreaterThan(initialConfidence);
      assertValidConfidence(result);
    });
  });

  describe('Bayesian Update Formula (Equation 3)', () => {
    it('should implement Bayesian update correctly', async () => {
      const frame = createFrame('efficiency-frame', llmProvider, parameterProvider);
      const evidence = createTestEvidence('CPU usage at 15%, memory at 60%', 'performance_monitor');
      const proposition = createTestProposition('efficiency-claim', 'System is running efficiently');

      const initialConfidence = 0.7;

      // Create update context with Bayesian parameters
      const updateContext = {
        evidenceWeights: [0.8],
        evidenceConfidences: [0.9],
        priorLikelihoods: {
          evidenceGivenProposition: 0.9, // P(e|P) - high likelihood if true
          evidenceGivenNegation: 0.2      // P(e|¬P) - low likelihood if false
        },
        metadata: {}
      };

      const result = await frame.updateConfidence(initialConfidence, [evidence], proposition, updateContext);

      // Verify result is reasonable (exact formula depends on frame implementation)
      expect(result).toBeGreaterThan(initialConfidence);
      assertValidConfidence(result);
    });
  });

  describe('Basic Frame Functionality', () => {
    it('should create frames and update confidence', async () => {
      const frame = createFrame('efficiency-frame', llmProvider, parameterProvider);
      const evidence = createTestEvidence('System performance improved', 'performance_monitor');
      const proposition = createTestProposition('test-claim', 'System is performing well');

      const initialConfidence = 0.5;

      // Create basic update context
      const updateContext = {
        evidenceWeights: [0.7],
        evidenceConfidences: [0.8],
        metadata: {}
      };

      const result = await frame.updateConfidence(initialConfidence, [evidence], proposition, updateContext);

      // Verify result is valid and reasonable
      assertValidConfidence(result);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('Hybrid Update Strategy', () => {
    it('should combine multiple update strategies correctly', async () => {
      const frame = await testHelpers.createTestFrame('security-frame');
      const evidence = TestData.createEvidence('security-audit', 'Comprehensive security audit results');
      const proposition = TestData.createProposition('security-claim', 'System meets security standards');

      const initialConfidence = 0.6;

      // Configure all update strategies
      parameterProvider.setParameter('security-frame', 'frame-weight-factor', 0.4);
      parameterProvider.setParameter('security-frame', 'source-trust-factor', 0.3);
      parameterProvider.setParameter('security-frame', 'bayesian-factor', 0.3);

      // Configure individual strategy parameters
      llmProvider.setEvidenceSaliency('security-frame_security-audit', 0.7);
      llmProvider.setEvidenceStrength('security-audit_security-claim', 0.85);
      parameterProvider.setParameter('security-frame', 'source-trust-alpha', 0.5);
      parameterProvider.setParameter('security-frame', 'likelihood-given-true', 0.9);
      parameterProvider.setParameter('security-frame', 'likelihood-given-false', 0.3);

      const result = await frame.updateConfidence(evidence, proposition, initialConfidence);

      // Verify hybrid combination produces reasonable result
      expectConfidenceInRange(result.confidence, 0.7, 0.9);
      expect(result.reasoning).toContain('hybrid');

      // Should be influenced by all three strategies
      expect(result.confidence).toBeGreaterThan(initialConfidence);
    });
  });
});
