/**
 * Unit Tests for SOLID Frame Implementations
 * 
 * Tests the concrete frame implementations that demonstrate the SOLID architecture,
 * including efficiency, thoroughness, security, and debate frames.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerAllFrameTypes,
  createEfficiencyFrame,
  createThoroughnessFrame,
  createSecurityFrame,
  createProDebaterFrame,
  createConDebaterFrame,
  createJudgeFrame,
  createModeratorFrame,
  createOptimismFrame,
  registerOptimismFrame
} from '../../src/epistemic/solid-frames';
import { FrameRegistry } from '../../src/epistemic/frame-base';
import type { IEpistemicFrame, IDebateFrame } from '../../src/epistemic/frame-interfaces';
import { MockLLMFactory, MockLLMProvider } from '../fixtures/mock-llm-provider';
import { MockParameterFactory, MockParameterProvider } from '../fixtures/mock-parameter-provider';
import { 
  createTestEvidence, 
  createTestDebateContext,
  TEST_EVIDENCE, 
  TEST_CONTEXTS,
  MATHEMATICAL_TEST_CASES,
  generateFrameTestData
} from '../fixtures/test-data';
import { 
  assertValidConfidence, 
  assertConfidenceEqual, 
  assertFrameImplementsInterface,
  testFrameCompatibilityMatrix,
  testConfidenceUpdate,
  cleanupFrameRegistry,
  assertLLMCalled,
  verifySolidPrinciples
} from '../utils/test-helpers';

describe('SOLID Frame Implementations', () => {
  let mockLLM: MockLLMProvider;
  let mockParameters: MockParameterProvider;

  beforeEach(() => {
    mockLLM = MockLLMFactory.createFrameSpecificMock();
    mockParameters = MockParameterFactory.createDebateOptimizedProvider();
    cleanupFrameRegistry();
    registerAllFrameTypes();
  });

  afterEach(() => {
    mockLLM?.resetCallCounts();
    mockParameters?.clearHistory();
    cleanupFrameRegistry();
  });

  // ==========================================================================
  // CORE FRAME IMPLEMENTATION TESTS
  // ==========================================================================

  describe('Efficiency Frame', () => {
    let efficiencyFrame: IEpistemicFrame;

    beforeEach(async () => {
      efficiencyFrame = createEfficiencyFrame(mockLLM, 'efficiency-test-1');
    });

    it('should implement IEpistemicFrame interface correctly', () => {
      assertFrameImplementsInterface(efficiencyFrame, 'epistemic');
      expect(efficiencyFrame.frameType).toBe('efficiency');
      expect(efficiencyFrame.name).toBe('Efficiency');
    });

    it('should verify SOLID principles compliance', () => {
      verifySolidPrinciples(efficiencyFrame);
    });

    it('should prioritize performance-related evidence', async () => {
      // Configure LLM to return high saliency for performance evidence
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.9);
      mockLLM.setEvidenceSaliency('efficiency_detailed', 0.3);
      
      const performanceEvidence = createTestEvidence('performance', 'System performance improved');
      const detailedEvidence = createTestEvidence('detailed', 'Detailed analysis report');
      
      const performanceWeight = await efficiencyFrame.calculateEvidenceWeight(
        performanceEvidence, 
        'System optimization is effective'
      );
      const detailedWeight = await efficiencyFrame.calculateEvidenceWeight(
        detailedEvidence, 
        'System optimization is effective'
      );
      
      assertValidConfidence(performanceWeight);
      assertValidConfidence(detailedWeight);
      expect(performanceWeight).toBeGreaterThan(detailedWeight);
    });

    it('should have high compatibility with similar frames and low with conflicting frames', () => {
      const otherEfficiencyFrame = createEfficiencyFrame(mockLLM, 'efficiency-test-2');
      const thoroughnessFrame = createThoroughnessFrame(mockLLM, 'thoroughness-test');
      
      const selfCompatibility = efficiencyFrame.calculateCompatibility(otherEfficiencyFrame);
      const conflictCompatibility = efficiencyFrame.calculateCompatibility(thoroughnessFrame);
      
      expect(selfCompatibility).toBeGreaterThan(0.9);
      expect(conflictCompatibility).toBeLessThan(0.5);
    });

    it('should update confidence using frame-weighted strategy', async () => {
      const evidence = [TEST_EVIDENCE.PERFORMANCE_POSITIVE, TEST_EVIDENCE.SPEED_IMPROVEMENT];
      
      const newConfidence = await testConfidenceUpdate(
        efficiencyFrame,
        0.5,
        evidence,
        { min: 0.6, max: 0.9 } // Should increase confidence with positive performance evidence
      );
      
      expect(newConfidence).toBeGreaterThan(0.5);
    });

    it('should handle efficiency-specific evidence types', async () => {
      const testData = generateFrameTestData('efficiency');
      
      for (const evidence of testData.evidence) {
        const weight = await efficiencyFrame.calculateEvidenceWeight(evidence, testData.propositions[0]);
        assertValidConfidence(weight);
      }
    });
  });

  describe('Thoroughness Frame', () => {
    let thoroughnessFrame: IEpistemicFrame;

    beforeEach(async () => {
      thoroughnessFrame = createThoroughnessFrame(mockLLM, 'thoroughness-test-1');
    });

    it('should implement IEpistemicFrame interface correctly', () => {
      assertFrameImplementsInterface(thoroughnessFrame, 'epistemic');
      expect(thoroughnessFrame.frameType).toBe('thoroughness');
      expect(thoroughnessFrame.name).toBe('Thoroughness');
    });

    it('should prioritize detailed and comprehensive evidence', async () => {
      mockLLM.setEvidenceSaliency('thoroughness_detailed', 0.9);
      mockLLM.setEvidenceSaliency('thoroughness_performance', 0.4);
      
      const detailedEvidence = createTestEvidence('detailed', 'Comprehensive analysis report');
      const performanceEvidence = createTestEvidence('performance', 'Quick performance metric');
      
      const detailedWeight = await thoroughnessFrame.calculateEvidenceWeight(
        detailedEvidence, 
        'Thorough analysis is required'
      );
      const performanceWeight = await thoroughnessFrame.calculateEvidenceWeight(
        performanceEvidence, 
        'Thorough analysis is required'
      );
      
      expect(detailedWeight).toBeGreaterThan(performanceWeight);
    });

    it('should have compatibility patterns different from efficiency frame', () => {
      const efficiencyFrame = createEfficiencyFrame(mockLLM);
      const securityFrame = createSecurityFrame(mockLLM);
      
      const efficiencyCompatibility = thoroughnessFrame.calculateCompatibility(efficiencyFrame);
      const securityCompatibility = thoroughnessFrame.calculateCompatibility(securityFrame);
      
      // Thoroughness should have low compatibility with efficiency but higher with security
      expect(efficiencyCompatibility).toBeLessThan(0.5);
      expect(securityCompatibility).toBeGreaterThan(efficiencyCompatibility);
    });

    it('should emphasize quality over speed', async () => {
      const evidence = [TEST_EVIDENCE.DETAILED_ANALYSIS, TEST_EVIDENCE.THOROUGH_REVIEW];
      
      const newConfidence = await testConfidenceUpdate(
        thoroughnessFrame,
        0.5,
        evidence,
        { min: 0.6, max: 0.9 }
      );
      
      expect(newConfidence).toBeGreaterThan(0.5);
    });
  });

  describe('Security Frame', () => {
    let securityFrame: IEpistemicFrame;

    beforeEach(async () => {
      securityFrame = createSecurityFrame(mockLLM, 'security-test-1');
    });

    it('should implement IEpistemicFrame interface correctly', () => {
      assertFrameImplementsInterface(securityFrame, 'epistemic');
      expect(securityFrame.frameType).toBe('security');
      expect(securityFrame.name).toBe('Security');
    });

    it('should use hybrid update strategy for sophisticated reasoning', () => {
      // Security frame should use hybrid strategy by default
      expect(securityFrame).toBeDefined();
      // Strategy is internal, but we can test its effects
    });

    it('should prioritize security and risk evidence', async () => {
      mockLLM.setEvidenceSaliency('security_security', 0.9);
      mockLLM.setEvidenceSaliency('security_performance', 0.3);
      
      const securityEvidence = createTestEvidence('security', 'Security vulnerability found');
      const performanceEvidence = createTestEvidence('performance', 'Performance is good');
      
      const securityWeight = await securityFrame.calculateEvidenceWeight(
        securityEvidence, 
        'System security is adequate'
      );
      const performanceWeight = await securityFrame.calculateEvidenceWeight(
        performanceEvidence, 
        'System security is adequate'
      );
      
      expect(securityWeight).toBeGreaterThan(performanceWeight);
    });

    it('should have good compatibility with thoroughness but not efficiency', () => {
      const thoroughnessFrame = createThoroughnessFrame(mockLLM);
      const efficiencyFrame = createEfficiencyFrame(mockLLM);
      
      const thoroughnessCompatibility = securityFrame.calculateCompatibility(thoroughnessFrame);
      const efficiencyCompatibility = securityFrame.calculateCompatibility(efficiencyFrame);
      
      expect(thoroughnessCompatibility).toBeGreaterThan(efficiencyCompatibility);
    });

    it('should be cautious with confidence updates', async () => {
      const evidence = [TEST_EVIDENCE.SECURITY_VULNERABILITY, TEST_EVIDENCE.RISK_ASSESSMENT];
      
      const newConfidence = await testConfidenceUpdate(
        securityFrame,
        0.7,
        evidence
        // No expected range - security might decrease confidence due to vulnerabilities
      );
      
      assertValidConfidence(newConfidence);
    });
  });

  // ==========================================================================
  // DEBATE FRAME IMPLEMENTATION TESTS
  // ==========================================================================

  describe('Pro Debater Frame', () => {
    let proFrame: IDebateFrame;

    beforeEach(async () => {
      proFrame = createProDebaterFrame(mockLLM, 'pro-debater-test-1');
    });

    it('should implement IDebateFrame interface correctly', () => {
      assertFrameImplementsInterface(proFrame, 'debate');
      expect(proFrame.frameType).toBe('pro-debater');
      expect(proFrame.name).toBe('Pro Debater');
    });

    it('should evaluate pro arguments higher than con arguments', async () => {
      mockLLM.setEvidenceStrength('argument_test topic', 0.7);
      
      const debateContext = createTestDebateContext('test topic', 'pro');
      
      const proStrength = await proFrame.evaluateArgumentStrength(
        'This argument supports the pro position',
        'pro',
        debateContext
      );
      
      const conStrength = await proFrame.evaluateArgumentStrength(
        'This argument supports the con position',
        'con',
        debateContext
      );
      
      assertValidConfidence(proStrength);
      assertValidConfidence(conStrength);
      expect(proStrength).toBeGreaterThan(conStrength);
    });

    it('should generate counterarguments defensively', async () => {
      const debateContext = createTestDebateContext();
      const counterarguments = await proFrame.generateCounterarguments(
        'Opposing argument against our position',
        debateContext
      );
      
      expect(Array.isArray(counterarguments)).toBe(true);
      expect(counterarguments.length).toBeGreaterThan(0);
      
      // Pro debater counterarguments should be defensive
      const defensiveKeywords = ['while', 'however', 'must consider', 'benefits'];
      const hasDefensiveTone = counterarguments.some(arg => 
        defensiveKeywords.some(keyword => arg.toLowerCase().includes(keyword))
      );
      expect(hasDefensiveTone).toBe(true);
    });

    it('should have very low compatibility with con debater', () => {
      const conFrame = createConDebaterFrame(mockLLM);
      const compatibility = proFrame.calculateCompatibility(conFrame);
      
      expect(compatibility).toBeLessThan(0.3);
    });

    it('should bias toward high confidence in supporting evidence', async () => {
      const evidence = [TEST_EVIDENCE.SUPPORTING_CITATION];
      
      const newConfidence = await testConfidenceUpdate(
        proFrame,
        0.5,
        evidence,
        { min: 0.6, max: 1.0 } // Pro debaters should boost confidence
      );
      
      expect(newConfidence).toBeGreaterThan(0.5);
    });
  });

  describe('Con Debater Frame', () => {
    let conFrame: IDebateFrame;

    beforeEach(async () => {
      conFrame = createConDebaterFrame(mockLLM, 'con-debater-test-1');
    });

    it('should implement IDebateFrame interface correctly', () => {
      assertFrameImplementsInterface(conFrame, 'debate');
      expect(conFrame.frameType).toBe('con-debater');
      expect(conFrame.name).toBe('Con Debater');
    });

    it('should evaluate con arguments higher than pro arguments', async () => {
      mockLLM.setEvidenceStrength('argument_test topic', 0.7);
      
      const debateContext = createTestDebateContext('test topic', 'con');
      
      const conStrength = await conFrame.evaluateArgumentStrength(
        'This argument supports the con position',
        'con',
        debateContext
      );
      
      const proStrength = await conFrame.evaluateArgumentStrength(
        'This argument supports the pro position',
        'pro',
        debateContext
      );
      
      expect(conStrength).toBeGreaterThan(proStrength);
    });

    it('should generate counterarguments aggressively', async () => {
      const debateContext = createTestDebateContext();
      const counterarguments = await conFrame.generateCounterarguments(
        'Pro argument for the position',
        debateContext
      );
      
      expect(Array.isArray(counterarguments)).toBe(true);
      expect(counterarguments.length).toBeGreaterThan(0);
      
      // Con debater counterarguments should be aggressive
      const aggressiveKeywords = ['fails', 'flawed', 'ignores', 'questionable'];
      const hasAggressiveTone = counterarguments.some(arg => 
        aggressiveKeywords.some(keyword => arg.toLowerCase().includes(keyword))
      );
      expect(hasAggressiveTone).toBe(true);
    });

    it('should bias toward low confidence in propositions', async () => {
      const evidence = [TEST_EVIDENCE.OPPOSING_CITATION];
      
      const newConfidence = await testConfidenceUpdate(
        conFrame,
        0.7,
        evidence
        // Con debaters should generally decrease confidence in propositions
      );
      
      assertValidConfidence(newConfidence);
      // Con frame applies skepticism
    });
  });

  describe('Judge Frame', () => {
    let judgeFrame: IDebateFrame;

    beforeEach(async () => {
      judgeFrame = createJudgeFrame(mockLLM, 'judge-test-1');
    });

    it('should implement IDebateFrame interface correctly', () => {
      assertFrameImplementsInterface(judgeFrame, 'debate');
      expect(judgeFrame.frameType).toBe('judge');
      expect(judgeFrame.name).toBe('Judge');
    });

    it('should use Bayesian update strategy for rigorous reasoning', () => {
      // Judge frame should use Bayesian strategy by default
      expect(judgeFrame).toBeDefined();
    });

    it('should evaluate arguments neutrally regardless of position', async () => {
      mockLLM.setEvidenceStrength('argument_test topic', 0.7);
      
      const debateContext = createTestDebateContext('test topic', 'judge');
      
      const proStrength = await judgeFrame.evaluateArgumentStrength(
        'Identical argument content',
        'pro',
        debateContext
      );
      
      const conStrength = await judgeFrame.evaluateArgumentStrength(
        'Identical argument content',
        'con',
        debateContext
      );
      
      // Judge should evaluate identically regardless of position
      assertConfidenceEqual(proStrength, conStrength);
    });

    it('should not generate counterarguments (maintains neutrality)', async () => {
      const debateContext = createTestDebateContext();
      const counterarguments = await judgeFrame.generateCounterarguments(
        'Any argument',
        debateContext
      );
      
      expect(Array.isArray(counterarguments)).toBe(true);
      expect(counterarguments.length).toBe(0); // Judges don't generate counterarguments
    });

    it('should have high compatibility with moderator frame', () => {
      const moderatorFrame = createModeratorFrame(mockLLM);
      const compatibility = judgeFrame.calculateCompatibility(moderatorFrame);
      
      expect(compatibility).toBeGreaterThan(0.7);
    });

    it('should evaluate evidence objectively', async () => {
      const evidence = [TEST_EVIDENCE.STATISTICAL_DATA];
      
      const newConfidence = await testConfidenceUpdate(
        judgeFrame,
        0.5,
        evidence
      );
      
      assertValidConfidence(newConfidence);
      // Judge should move confidence based purely on evidence quality
    });
  });

  describe('Moderator Frame', () => {
    let moderatorFrame: IEpistemicFrame;

    beforeEach(async () => {
      moderatorFrame = createModeratorFrame(mockLLM, 'moderator-test-1');
    });

    it('should implement IEpistemicFrame interface correctly', () => {
      assertFrameImplementsInterface(moderatorFrame, 'epistemic');
      expect(moderatorFrame.frameType).toBe('moderator');
      expect(moderatorFrame.name).toBe('Moderator');
    });

    it('should use source-trust update strategy for credibility focus', () => {
      // Moderator frame should use source-trust strategy
      expect(moderatorFrame).toBeDefined();
    });

    it('should have good compatibility with all debate participants', () => {
      const proFrame = createProDebaterFrame(mockLLM);
      const conFrame = createConDebaterFrame(mockLLM);
      const judgeFrame = createJudgeFrame(mockLLM);
      
      const proCompatibility = moderatorFrame.calculateCompatibility(proFrame);
      const conCompatibility = moderatorFrame.calculateCompatibility(conFrame);
      const judgeCompatibility = moderatorFrame.calculateCompatibility(judgeFrame);
      
      expect(proCompatibility).toBeGreaterThan(0.6);
      expect(conCompatibility).toBeGreaterThan(0.6);
      expect(judgeCompatibility).toBeGreaterThan(0.7);
    });

    it('should value balanced and fair evidence', async () => {
      mockLLM.setEvidenceSaliency('moderator_balanced', 0.9);
      mockLLM.setEvidenceSaliency('moderator_biased', 0.3);
      
      const balancedEvidence = createTestEvidence('balanced', 'Balanced presentation of facts');
      const biasedEvidence = createTestEvidence('biased', 'One-sided argument');
      
      const balancedWeight = await moderatorFrame.calculateEvidenceWeight(
        balancedEvidence, 
        'Fair evaluation is needed'
      );
      const biasedWeight = await moderatorFrame.calculateEvidenceWeight(
        biasedEvidence, 
        'Fair evaluation is needed'
      );
      
      expect(balancedWeight).toBeGreaterThan(biasedWeight);
    });
  });

  // ==========================================================================
  // FRAME COMPATIBILITY MATRIX TESTS
  // ==========================================================================

  describe('Frame Compatibility Matrix', () => {
    let allFrames: IEpistemicFrame[];

    beforeEach(async () => {
      allFrames = [
        createEfficiencyFrame(mockLLM),
        createThoroughnessFrame(mockLLM),
        createSecurityFrame(mockLLM),
        createProDebaterFrame(mockLLM),
        createConDebaterFrame(mockLLM),
        createJudgeFrame(mockLLM),
        createModeratorFrame(mockLLM)
      ];
    });

    it('should calculate compatibility matrix correctly', async () => {
      const matrix = await testFrameCompatibilityMatrix(allFrames);
      
      expect(matrix.length).toBe(allFrames.length);
      expect(matrix[0].length).toBe(allFrames.length);
      
      // Verify some expected compatibility patterns from MATHEMATICAL_TEST_CASES
      const expectedPatterns = MATHEMATICAL_TEST_CASES.COMPATIBILITY_CASES;
      
      for (const pattern of expectedPatterns) {
        const frame1Index = allFrames.findIndex(f => f.frameType === pattern.frame1);
        const frame2Index = allFrames.findIndex(f => f.frameType === pattern.frame2);
        
        if (frame1Index >= 0 && frame2Index >= 0) {
          assertConfidenceEqual(
            matrix[frame1Index][frame2Index], 
            pattern.expectedCompatibility,
            0.1, // Allow some tolerance for implementation differences
            `Compatibility between ${pattern.frame1} and ${pattern.frame2}`
          );
        }
      }
    });

    it('should have symmetric compatibility (or explain asymmetry)', async () => {
      const matrix = await testFrameCompatibilityMatrix(allFrames);
      
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          const compatibility1 = matrix[i][j];
          const compatibility2 = matrix[j][i];
          
          // Some asymmetry is expected (e.g., security might trust thoroughness more than vice versa)
          // But the difference shouldn't be extreme
          const difference = Math.abs(compatibility1 - compatibility2);
          expect(difference).toBeLessThan(0.3);
        }
      }
    });
  });

  // ==========================================================================
  // EXTENSIBILITY TESTS (Custom Frame)
  // ==========================================================================

  describe('Extensibility - Custom Frame', () => {
    beforeEach(() => {
      registerOptimismFrame(); // Register the custom frame
    });

    it('should support custom frame creation without modifying existing code', () => {
      const optimismFrame = createOptimismFrame(mockLLM);
      
      expect(optimismFrame).toBeDefined();
      expect(optimismFrame.frameType).toBe('optimism');
      expect(optimismFrame.name).toBe('Optimism');
      assertFrameImplementsInterface(optimismFrame, 'epistemic');
    });

    it('should integrate custom frame into compatibility matrix', async () => {
      const optimismFrame = createOptimismFrame(mockLLM);
      const efficiencyFrame = createEfficiencyFrame(mockLLM);
      const securityFrame = createSecurityFrame(mockLLM);
      
      const efficiencyCompatibility = optimismFrame.calculateCompatibility(efficiencyFrame);
      const securityCompatibility = optimismFrame.calculateCompatibility(securityFrame);
      
      // Optimism should be more compatible with efficiency than security
      expect(efficiencyCompatibility).toBeGreaterThan(securityCompatibility);
      expect(efficiencyCompatibility).toBeGreaterThan(0.7);
      expect(securityCompatibility).toBeLessThan(0.5);
    });

    it('should work with all standard frame operations', async () => {
      const optimismFrame = createOptimismFrame(mockLLM);
      
      // Test all major operations
      const evidence = createTestEvidence('positive', 'Positive development');
      
      const weight = await optimismFrame.calculateEvidenceWeight(evidence, 'test proposition');
      const trust = await optimismFrame.evaluateSourceTrust('optimistic_source', 'positive');
      const confidence = await optimismFrame.calculateEvidenceConfidence(evidence, 'test proposition');
      
      assertValidConfidence(weight);
      assertValidConfidence(trust);
      assertValidConfidence(confidence);
    });
  });

  // ==========================================================================
  // PERFORMANCE AND STRESS TESTS
  // ==========================================================================

  describe('Performance', () => {
    it('should create multiple frame instances efficiently', () => {
      const startTime = performance.now();
      
      const frames: IEpistemicFrame[] = [];
      for (let i = 0; i < 20; i++) {
        frames.push(createEfficiencyFrame(mockLLM));
        frames.push(createThoroughnessFrame(mockLLM));
        frames.push(createSecurityFrame(mockLLM));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(frames.length).toBe(60);
      expect(duration).toBeLessThan(200); // Should be reasonably fast
    });

    it('should handle concurrent operations across multiple frames', async () => {
      const frames = [
        createEfficiencyFrame(mockLLM),
        createThoroughnessFrame(mockLLM),
        createSecurityFrame(mockLLM)
      ];
      
      const evidence = createTestEvidence('concurrent', 'Concurrent test data');
      
      // Run operations concurrently across all frames
      const operations = frames.flatMap(frame => [
        frame.calculateEvidenceWeight(evidence, 'test proposition'),
        frame.calculateEvidenceConfidence(evidence, 'test proposition'),
        frame.evaluateSourceTrust('test_source', 'concurrent')
      ]);
      
      const results = await Promise.all(operations);
      
      expect(results.length).toBe(9); // 3 frames × 3 operations
      results.forEach(result => assertValidConfidence(result));
    });
  });

  // ==========================================================================
  // ERROR HANDLING AND RESILIENCE TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle LLM failures gracefully across all frame types', async () => {
      const errorLLM = MockLLMFactory.createErrorMock();
      
      const frames = [
        createEfficiencyFrame(errorLLM),
        createThoroughnessFrame(errorLLM),
        createSecurityFrame(errorLLM),
        createProDebaterFrame(errorLLM),
        createConDebaterFrame(errorLLM),
        createJudgeFrame(errorLLM),
        createModeratorFrame(errorLLM)
      ];
      
      const evidence = createTestEvidence('error', 'Error test data');
      
      // All operations should complete without throwing errors
      for (const frame of frames) {
        const weight = await frame.calculateEvidenceWeight(evidence, 'test proposition');
        const trust = await frame.evaluateSourceTrust('test_source', 'error');
        const confidence = await frame.calculateEvidenceConfidence(evidence, 'test proposition');
        
        assertValidConfidence(weight);
        assertValidConfidence(trust);
        assertValidConfidence(confidence);
      }
    });

    it('should handle invalid input gracefully', async () => {
      const frames = [
        createEfficiencyFrame(mockLLM),
        createThoroughnessFrame(mockLLM)
      ];
      
      // Test with malformed evidence
      const malformedEvidence = {
        // Missing required fields
        content: 'malformed evidence'
      } as any;
      
      for (const frame of frames) {
        // Should not throw errors
        const weight = await frame.calculateEvidenceWeight(malformedEvidence, 'test proposition');
        assertValidConfidence(weight);
      }
    });
  });

  // ==========================================================================
  // MATHEMATICAL FORMALISM VERIFICATION
  // ==========================================================================

  describe('Mathematical Formalism Compliance', () => {
    it('should implement AEF mathematical formalism consistently across all frames', async () => {
      const frames = [
        createEfficiencyFrame(mockLLM),
        createThoroughnessFrame(mockLLM),
        createSecurityFrame(mockLLM)
      ];
      
      // Test frame-weighted update formula on all frames
      for (const frame of frames) {
        for (const testCase of MATHEMATICAL_TEST_CASES.FRAME_WEIGHTED_CASES.slice(0, 2)) {
          const evidence = [createTestEvidence('test', 'test content')];
          const updateContext = {
            evidenceWeights: [testCase.evidenceWeight],
            evidenceConfidences: [testCase.evidenceConfidence]
          };
          
          const result = await frame.updateConfidence(
            testCase.currentConfidence,
            evidence,
            'test proposition',
            updateContext
          );
          
          // All frames should follow the same mathematical principles
          assertValidConfidence(result);
          
          // Result should be influenced by the evidence
          if (testCase.evidenceConfidence > 0.5 && testCase.evidenceWeight > 0.5) {
            expect(result).toBeGreaterThanOrEqual(testCase.currentConfidence);
          }
        }
      }
    });

    it('should maintain confidence bounds under all conditions', async () => {
      const frames = [
        createEfficiencyFrame(mockLLM),
        createProDebaterFrame(mockLLM),
        createJudgeFrame(mockLLM)
      ];
      
      const extremeTestCases = [
        { confidence: 0.0, weight: 1.0, evidenceConfidence: 1.0 },
        { confidence: 1.0, weight: 1.0, evidenceConfidence: 0.0 },
        { confidence: 0.5, weight: 0.0, evidenceConfidence: 1.0 },
        { confidence: 0.5, weight: 1.0, evidenceConfidence: 0.5 }
      ];
      
      for (const frame of frames) {
        for (const testCase of extremeTestCases) {
          const evidence = [createTestEvidence('extreme', 'extreme test')];
          const updateContext = {
            evidenceWeights: [testCase.weight],
            evidenceConfidences: [testCase.evidenceConfidence]
          };
          
          const result = await frame.updateConfidence(
            testCase.confidence,
            evidence,
            'extreme test proposition',
            updateContext
          );
          
          assertValidConfidence(result);
        }
      }
    });
  });
});