/**
 * Integration Tests for Frame System
 * 
 * Tests the complete frame system working together including:
 * - Frame creation and registry integration
 * - LLM and parameter provider integration
 * - Mathematical formalism end-to-end
 * - Real-world scenario simulation
 * - Cross-component interactions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeFrameSystem,
  getFrameSystemInfo,
  FrameRegistry,
  createFrame,
  createFrameConfig,
  registerAllFrameTypes,
  createEfficiencyFrame,
  createThoroughnessFrame,
  createProDebaterFrame,
  createConDebaterFrame,
  createJudgeFrame,
  createModeratorFrame,
  UpdateStrategyFactory
} from '../../src/epistemic';
import type { 
  IEpistemicFrame, 
  IDebateFrame,
  ConfidenceUpdateContext 
} from '../../src/epistemic/frame-interfaces';
import { MockLLMFactory, MockLLMProvider } from '../fixtures/mock-llm-provider';
import { MockParameterFactory, MockParameterProvider } from '../fixtures/mock-parameter-provider';
import { 
  createTestEvidence, 
  createTestAgentContext,
  createTestDebateContext,
  createTestPerception,
  TEST_EVIDENCE, 
  TEST_CONTEXTS,
  TEST_PROPOSITIONS,
  PERFORMANCE_TEST_DATA
} from '../fixtures/test-data';
import { 
  assertValidConfidence, 
  assertConfidenceEqual, 
  testFrameCompatibilityMatrix,
  cleanupFrameRegistry,
  assertLLMCalled,
  assertParameterUpdated,
  measureExecutionTime,
  runPerformanceTest
} from '../utils/test-helpers';
import { Perception } from '../../src/core/perception';
import { Goal } from '../../src/action/goal';

describe('Frame System Integration', () => {
  let mockLLM: MockLLMProvider;
  let mockParameters: MockParameterProvider;

  beforeEach(() => {
    mockLLM = MockLLMFactory.createFrameSpecificMock();
    mockParameters = MockParameterFactory.createDebateOptimizedProvider();
    cleanupFrameRegistry();
  });

  afterEach(() => {
    mockLLM?.resetCallCounts();
    mockParameters?.clearHistory();
    cleanupFrameRegistry();
  });

  // ==========================================================================
  // SYSTEM INITIALIZATION INTEGRATION
  // ==========================================================================

  describe('System Initialization', () => {
    it('should initialize complete frame system successfully', () => {
      cleanupFrameRegistry();
      
      // Initialize system
      initializeFrameSystem();
      
      // Verify system is ready
      const systemInfo = getFrameSystemInfo();
      
      expect(systemInfo.availableFrameTypes.length).toBeGreaterThan(0);
      expect(systemInfo.availableUpdateStrategies.length).toBeGreaterThan(0);
      expect(systemInfo.mathematicalFormalism.length).toBe(3);
      expect(systemInfo.solidPrinciples.length).toBe(5);
      
      // Verify core frame types are available
      expect(systemInfo.availableFrameTypes).toContain('efficiency');
      expect(systemInfo.availableFrameTypes).toContain('thoroughness');
      expect(systemInfo.availableFrameTypes).toContain('security');
      expect(systemInfo.availableFrameTypes).toContain('pro-debater');
      expect(systemInfo.availableFrameTypes).toContain('con-debater');
      expect(systemInfo.availableFrameTypes).toContain('judge');
      expect(systemInfo.availableFrameTypes).toContain('moderator');
      
      // Verify update strategies are available
      expect(systemInfo.availableUpdateStrategies).toContain('frame-weighted');
      expect(systemInfo.availableUpdateStrategies).toContain('source-trust');
      expect(systemInfo.availableUpdateStrategies).toContain('bayesian');
      expect(systemInfo.availableUpdateStrategies).toContain('hybrid');
    });

    it('should handle multiple initialization calls gracefully', () => {
      cleanupFrameRegistry();
      
      // Initialize multiple times
      initializeFrameSystem();
      initializeFrameSystem();
      initializeFrameSystem();
      
      // Should not cause errors or duplicate registrations
      const systemInfo = getFrameSystemInfo();
      expect(systemInfo.availableFrameTypes.length).toBeGreaterThan(0);
    });

    it('should create frames immediately after initialization', () => {
      cleanupFrameRegistry();
      initializeFrameSystem();
      
      // Should be able to create frames right away
      const efficiencyFrame = createEfficiencyFrame(mockLLM);
      const debateFrame = createProDebaterFrame(mockLLM);
      
      expect(efficiencyFrame).toBeDefined();
      expect(debateFrame).toBeDefined();
      expect(efficiencyFrame.frameType).toBe('efficiency');
      expect(debateFrame.frameType).toBe('pro-debater');
    });
  });

  // ==========================================================================
  // CROSS-FRAME INTEGRATION TESTS
  // ==========================================================================

  describe('Cross-Frame Integration', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should handle frame interactions in multi-agent scenarios', async () => {
      // Create frames representing different agents
      const efficiencyAgent = createEfficiencyFrame(mockLLM, 'efficiency-agent');
      const thoroughnessAgent = createThoroughnessFrame(mockLLM, 'thoroughness-agent');
      const securityAgent = createSecurityFrame(mockLLM, 'security-agent');
      
      // Simulate evidence from different agents
      const performanceEvidence = createTestEvidence('performance', 'System runs 30% faster', 'efficiency-agent');
      const securityEvidence = createTestEvidence('security', 'Vulnerability discovered', 'security-agent');
      const analysisEvidence = createTestEvidence('detailed', 'Comprehensive analysis reveals issues', 'thoroughness-agent');
      
      // Each frame should evaluate evidence from other frames differently
      const efficiencyTrust = await efficiencyAgent.evaluateSourceTrust('security-agent', 'security');
      const securityTrust = await securityAgent.evaluateSourceTrust('efficiency-agent', 'performance');
      const thoroughnessTrust = await thoroughnessAgent.evaluateSourceTrust('efficiency-agent', 'performance');
      
      assertValidConfidence(efficiencyTrust);
      assertValidConfidence(securityTrust);
      assertValidConfidence(thoroughnessTrust);
      
      // Security should be less trusting of efficiency claims
      expect(securityTrust).toBeLessThan(efficiencyTrust);
      
      // Thoroughness should be more accepting of detailed analysis
      const thoroughnessDetailTrust = await thoroughnessAgent.evaluateSourceTrust('thoroughness-agent', 'detailed');
      expect(thoroughnessDetailTrust).toBeGreaterThan(0.5);
    });

    it('should maintain consistency in compatibility calculations', async () => {
      const frames = [
        createEfficiencyFrame(mockLLM),
        createThoroughnessFrame(mockLLM),
        createSecurityFrame(mockLLM),
        createProDebaterFrame(mockLLM),
        createConDebaterFrame(mockLLM),
        createJudgeFrame(mockLLM),
        createModeratorFrame(mockLLM)
      ];
      
      // Test compatibility matrix for consistency
      const matrix = await testFrameCompatibilityMatrix(frames);
      
      // Verify transitivity properties where applicable
      for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames.length; j++) {
          for (let k = 0; k < frames.length; k++) {
            const compat_ij = matrix[i][j];
            const compat_jk = matrix[j][k];
            const compat_ik = matrix[i][k];
            
            // If i and j are highly compatible, and j and k are highly compatible,
            // then i and k should have some compatibility (weak transitivity)
            if (compat_ij > 0.8 && compat_jk > 0.8) {
              expect(compat_ik).toBeGreaterThan(0.3);
            }
          }
        }
      }
    });

    it('should handle belief formation across different frame types', async () => {
      const efficiencyFrame = createEfficiencyFrame(mockLLM);
      const judgeFrame = createJudgeFrame(mockLLM);
      
      // Set up LLM responses for consistent testing
      mockLLM.setEvidenceStrength('performance_system optimization', 0.8);
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.9);
      mockLLM.setEvidenceSaliency('judge_performance', 0.6);
      
      const evidence = [createTestEvidence('performance', 'System optimization successful')];
      const proposition = 'system optimization';
      
      // Both frames should process the same evidence differently
      const efficiencyContext: ConfidenceUpdateContext = {
        evidenceWeights: [await efficiencyFrame.calculateEvidenceWeight(evidence[0], proposition)],
        evidenceConfidences: [await efficiencyFrame.calculateEvidenceConfidence(evidence[0], proposition)]
      };
      
      const judgeContext: ConfidenceUpdateContext = {
        evidenceWeights: [await judgeFrame.calculateEvidenceWeight(evidence[0], proposition)],
        evidenceConfidences: [await judgeFrame.calculateEvidenceConfidence(evidence[0], proposition)]
      };
      
      const efficiencyConfidence = await efficiencyFrame.updateConfidence(0.5, evidence, proposition, efficiencyContext);
      const judgeConfidence = await judgeFrame.updateConfidence(0.5, evidence, proposition, judgeContext);
      
      assertValidConfidence(efficiencyConfidence);
      assertValidConfidence(judgeConfidence);
      
      // Efficiency frame should weight performance evidence higher
      expect(efficiencyContext.evidenceWeights[0]).toBeGreaterThan(judgeContext.evidenceWeights[0]);
    });
  });

  // ==========================================================================
  // LLM PROVIDER INTEGRATION TESTS
  // ==========================================================================

  describe('LLM Provider Integration', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should integrate LLM provider across all frame operations', async () => {
      const frame = createEfficiencyFrame(mockLLM);
      
      // Configure LLM responses
      mockLLM.setEvidenceStrength('performance_test', 0.8);
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.9);
      mockLLM.setInterpretation('efficiency_test perception', 'Efficiency-focused interpretation');
      mockLLM.setPropositions('efficiency', ['Performance is optimal', 'Speed is satisfactory']);
      
      const evidence = createTestEvidence('performance', 'test data');
      const perception = createTestPerception('test perception');
      const agentContext = createTestAgentContext();
      
      // Run all LLM-integrated operations
      const weight = await frame.calculateEvidenceWeight(evidence, 'test');
      const confidence = await frame.calculateEvidenceConfidence(evidence, 'test');
      const interpretedPerception = await frame.interpretPerception(perception, agentContext);
      const propositions = await frame.extractRelevantPropositions(perception);
      
      // Verify LLM was called for each operation
      assertLLMCalled(mockLLM, 'judgeEvidenceSaliency', 1);
      assertLLMCalled(mockLLM, 'judgeEvidenceStrength', 1);
      assertLLMCalled(mockLLM, 'interpretPerceptionData', 1);
      assertLLMCalled(mockLLM, 'extractPropositions', 1);
      
      // Verify results match LLM configuration
      expect(weight).toBeCloseTo(0.9);
      expect(confidence).toBeCloseTo(0.8);
      expect(interpretedPerception.data).toBe('Efficiency-focused interpretation');
      expect(propositions).toEqual(['Performance is optimal', 'Speed is satisfactory']);
    });

    it('should handle LLM provider errors gracefully across the system', async () => {
      const errorLLM = MockLLMFactory.createErrorMock();
      const frames = [
        createEfficiencyFrame(errorLLM),
        createThoroughnessFrame(errorLLM),
        createProDebaterFrame(errorLLM)
      ];
      
      const evidence = createTestEvidence('test', 'error test data');
      const perception = createTestPerception('error test perception');
      const agentContext = createTestAgentContext();
      
      // All operations should complete without throwing errors
      for (const frame of frames) {
        const weight = await frame.calculateEvidenceWeight(evidence, 'test');
        const confidence = await frame.calculateEvidenceConfidence(evidence, 'test');
        const trust = await frame.evaluateSourceTrust('test_source', 'test');
        const interpretedPerception = await frame.interpretPerception(perception, agentContext);
        const propositions = await frame.extractRelevantPropositions(perception);
        
        assertValidConfidence(weight);
        assertValidConfidence(confidence);
        assertValidConfidence(trust);
        expect(interpretedPerception).toBeDefined();
        expect(Array.isArray(propositions)).toBe(true);
      }
    });

    it('should support switching LLM providers without breaking frame functionality', async () => {
      // Create frame with one LLM provider
      const optimisticLLM = MockLLMFactory.createOptimisticMock();
      const pessimisticLLM = MockLLMFactory.createPessimisticMock();
      
      const optimisticFrame = createEfficiencyFrame(optimisticLLM);
      const pessimisticFrame = createEfficiencyFrame(pessimisticLLM);
      
      const evidence = createTestEvidence('performance', 'test performance data');
      
      const optimisticWeight = await optimisticFrame.calculateEvidenceWeight(evidence, 'test');
      const pessimisticWeight = await pessimisticFrame.calculateEvidenceWeight(evidence, 'test');
      
      // Different LLM providers should produce different but valid results
      assertValidConfidence(optimisticWeight);
      assertValidConfidence(pessimisticWeight);
      expect(optimisticWeight).not.toBe(pessimisticWeight);
    });
  });

  // ==========================================================================
  // PARAMETER PROVIDER INTEGRATION TESTS
  // ==========================================================================

  describe('Parameter Provider Integration', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should integrate parameter provider for learning and adaptation', async () => {
      const learningProvider = MockParameterFactory.createLearningProvider();
      const frame = new (await import('../../src/epistemic/frame-base')).ComposableBaseFrame(
        'Learning Test Frame',
        'Frame for testing parameter learning',
        'learning-test',
        mockLLM,
        learningProvider,
        'learning-frame-id',
        'frame-weighted'
      );
      
      // Set initial parameters
      learningProvider.setParameter('learning-frame-id', 'weightPerformance', 0.5);
      
      // Simulate parameter updates through learning
      await learningProvider.updateParameter('learning-frame-id', 'weightPerformance', 0.8);
      
      // Verify parameter was updated
      assertParameterUpdated(learningProvider, 'learning-frame-id', 'weightPerformance', 0.8);
      
      const updatedValue = await learningProvider.getParameter('learning-frame-id', 'weightPerformance');
      expect(updatedValue).toBe(0.8);
    });

    it('should handle parameter provider failures gracefully', async () => {
      const errorProvider = MockParameterFactory.createErrorProvider();
      
      // Frame should still function even with failing parameter provider
      const frame = new (await import('../../src/epistemic/frame-base')).ComposableBaseFrame(
        'Error Test Frame',
        'Frame for testing error handling',
        'error-test',
        mockLLM,
        errorProvider,
        'error-frame-id',
        'frame-weighted'
      );
      
      // Operations should not throw errors
      const evidence = createTestEvidence('test', 'error test data');
      const weight = await frame.calculateEvidenceWeight(evidence, 'test');
      
      assertValidConfidence(weight);
    });

    it('should support different parameter providers for different frames', async () => {
      const staticProvider = MockParameterFactory.createStaticProvider();
      const learningProvider = MockParameterFactory.createLearningProvider();
      
      // Configure different parameters for each provider
      staticProvider.setParameter('static-frame', 'weightPerformance', 0.9);
      learningProvider.setParameter('learning-frame', 'weightPerformance', 0.3);
      
      const staticFrame = new (await import('../../src/epistemic/frame-base')).ComposableBaseFrame(
        'Static Frame',
        'Frame with static parameters',
        'static-test',
        mockLLM,
        staticProvider,
        'static-frame'
      );
      
      const learningFrame = new (await import('../../src/epistemic/frame-base')).ComposableBaseFrame(
        'Learning Frame',
        'Frame with learning parameters',
        'learning-test',
        mockLLM,
        learningProvider,
        'learning-frame'
      );
      
      // Both frames should function independently with their own parameters
      expect(staticFrame).toBeDefined();
      expect(learningFrame).toBeDefined();
    });
  });

  // ==========================================================================
  // MATHEMATICAL FORMALISM END-TO-END TESTS
  // ==========================================================================

  describe('Mathematical Formalism End-to-End', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should implement complete AEF mathematical pipeline', async () => {
      const frame = createEfficiencyFrame(mockLLM);
      
      // Configure for predictable mathematical testing
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.8);
      mockLLM.setEvidenceStrength('performance_optimization', 0.9);
      
      const evidence = [createTestEvidence('performance', 'optimization successful')];
      const proposition = 'optimization';
      
      // Step 1: Calculate w_F(e) - frame-dependent evidence weight
      const evidenceWeight = await frame.calculateEvidenceWeight(evidence[0], proposition);
      expect(evidenceWeight).toBeCloseTo(0.8);
      
      // Step 2: Calculate C(e,P) - evidence confidence
      const evidenceConfidence = await frame.calculateEvidenceConfidence(evidence[0], proposition);
      expect(evidenceConfidence).toBeCloseTo(0.9);
      
      // Step 3: Apply frame-weighted update formula
      const currentConfidence = 0.5;
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [evidenceWeight],
        evidenceConfidences: [evidenceConfidence]
      };
      
      const newConfidence = await frame.updateConfidence(
        currentConfidence,
        evidence,
        proposition,
        updateContext
      );
      
      // Manual calculation: conf_new = (1 - 0.8) * 0.5 + 0.8 * 0.9 = 0.1 + 0.72 = 0.82
      assertConfidenceEqual(newConfidence, 0.82, 0.01);
    });

    it('should handle complex multi-evidence scenarios with mathematical precision', async () => {
      const frame = createJudgeFrame(mockLLM); // Use judge for Bayesian updates
      
      // Configure multiple evidence pieces
      const evidence = [
        createTestEvidence('statistical', 'statistical evidence'),
        createTestEvidence('expert', 'expert opinion'),
        createTestEvidence('observation', 'direct observation')
      ];
      
      mockLLM.setEvidenceStrength('statistical_test', 0.85);
      mockLLM.setEvidenceStrength('expert_test', 0.75);
      mockLLM.setEvidenceStrength('observation_test', 0.65);
      
      mockLLM.setEvidenceSaliency('judge_statistical', 0.9);
      mockLLM.setEvidenceSaliency('judge_expert', 0.8);
      mockLLM.setEvidenceSaliency('judge_observation', 0.6);
      
      // Calculate complete update context
      const evidenceWeights = await Promise.all(
        evidence.map(e => frame.calculateEvidenceWeight(e, 'test'))
      );
      const evidenceConfidences = await Promise.all(
        evidence.map(e => frame.calculateEvidenceConfidence(e, 'test'))
      );
      
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights,
        evidenceConfidences,
        priorLikelihoods: {
          evidenceGivenProposition: 0.8,
          evidenceGivenNegation: 0.3
        }
      };
      
      const result = await frame.updateConfidence(0.5, evidence, 'test', updateContext);
      
      assertValidConfidence(result);
      // With strong supporting evidence, confidence should increase significantly
      expect(result).toBeGreaterThan(0.7);
    });

    it('should maintain mathematical consistency across update strategies', async () => {
      const frameWeightedFrame = createEfficiencyFrame(mockLLM);
      const sourceTrustFrame = createModeratorFrame(mockLLM);
      const bayesianFrame = createJudgeFrame(mockLLM);
      
      const evidence = [createTestEvidence('test', 'consistency test', 'trusted_source')];
      
      // Configure identical LLM responses
      mockLLM.setEvidenceStrength('test_consistency', 0.7);
      mockLLM.setEvidenceSaliency('efficiency_test', 0.6);
      mockLLM.setEvidenceSaliency('moderator_test', 0.6);
      mockLLM.setEvidenceSaliency('judge_test', 0.6);
      
      const baseConfidence = 0.5;
      
      // Test with identical contexts where possible
      const frameWeightedContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.6],
        evidenceConfidences: [0.7]
      };
      
      const sourceTrustContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.6],
        evidenceConfidences: [0.7],
        sourceTrusts: [0.8],
        sensitivity: 0.5
      };
      
      const bayesianContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.6],
        evidenceConfidences: [0.7],
        priorLikelihoods: {
          evidenceGivenProposition: 0.7,
          evidenceGivenNegation: 0.3
        }
      };
      
      const frameWeightedResult = await frameWeightedFrame.updateConfidence(
        baseConfidence, evidence, 'consistency', frameWeightedContext
      );
      const sourceTrustResult = await sourceTrustFrame.updateConfidence(
        baseConfidence, evidence, 'consistency', sourceTrustContext
      );
      const bayesianResult = await bayesianFrame.updateConfidence(
        baseConfidence, evidence, 'consistency', bayesianContext
      );
      
      // All should produce valid results
      assertValidConfidence(frameWeightedResult);
      assertValidConfidence(sourceTrustResult);
      assertValidConfidence(bayesianResult);
      
      // All should increase confidence with positive evidence
      expect(frameWeightedResult).toBeGreaterThan(baseConfidence);
      expect(sourceTrustResult).toBeGreaterThan(baseConfidence);
      expect(bayesianResult).toBeGreaterThan(baseConfidence);
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIO SIMULATION
  // ==========================================================================

  describe('Real-World Scenario Simulation', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should simulate multi-agent debate scenario', async () => {
      // Create debate participants
      const moderator = createModeratorFrame(mockLLM, 'moderator-1');
      const proDebater = createProDebaterFrame(mockLLM, 'pro-1');
      const conDebater = createConDebaterFrame(mockLLM, 'con-1');
      const judge = createJudgeFrame(mockLLM, 'judge-1');
      
      const debateContext = createTestDebateContext(TEST_PROPOSITIONS.STANDARDIZED_TESTING_BENEFICIAL, 'pro');
      
      // Configure debate-specific LLM responses
      mockLLM.setEvidenceStrength('argument_standardized testing', 0.7);
      
      // Simulate argument evaluation
      const argument = 'Standardized testing provides objective measurement';
      
      const proEvaluation = await (proDebater as IDebateFrame).evaluateArgumentStrength(
        argument, 'pro', debateContext
      );
      const conEvaluation = await (conDebater as IDebateFrame).evaluateArgumentStrength(
        argument, 'pro', debateContext
      );
      const judgeEvaluation = await (judge as IDebateFrame).evaluateArgumentStrength(
        argument, 'pro', debateContext
      );
      
      // Pro debater should rate pro arguments higher
      expect(proEvaluation).toBeGreaterThan(conEvaluation);
      
      // Judge should be between pro and con evaluations
      expect(judgeEvaluation).toBeGreaterThan(conEvaluation);
      expect(judgeEvaluation).toBeLessThan(proEvaluation);
      
      // Generate counterarguments
      const proCounters = await (proDebater as IDebateFrame).generateCounterarguments(argument, debateContext);
      const conCounters = await (conDebater as IDebateFrame).generateCounterarguments(argument, debateContext);
      const judgeCounters = await (judge as IDebateFrame).generateCounterarguments(argument, debateContext);
      
      expect(proCounters.length).toBeGreaterThan(0);
      expect(conCounters.length).toBeGreaterThan(0);
      expect(judgeCounters.length).toBe(0); // Judges don't generate counterarguments
    });

    it('should simulate software development team decision-making', async () => {
      // Create team member frames
      const performanceExpert = createEfficiencyFrame(mockLLM, 'perf-expert');
      const securityExpert = createSecurityFrame(mockLLM, 'sec-expert');
      const qualityExpert = createThoroughnessFrame(mockLLM, 'qa-expert');
      
      // Simulate receiving evidence from different sources
      const performanceReport = createTestEvidence(
        'performance', 
        'New caching system improves response time by 40%',
        'performance-team'
      );
      const securityAlert = createTestEvidence(
        'security',
        'Caching system introduces potential data leakage risk',
        'security-team'
      );
      const codeReview = createTestEvidence(
        'detailed',
        'Implementation lacks proper error handling and documentation',
        'qa-team'
      );
      
      // Configure expert-specific LLM responses
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.9);
      mockLLM.setEvidenceSaliency('security_security', 0.9);
      mockLLM.setEvidenceSaliency('thoroughness_detailed', 0.9);
      
      mockLLM.setEvidenceStrength('performance_caching deployment', 0.8);
      mockLLM.setEvidenceStrength('security_caching deployment', 0.7);
      mockLLM.setEvidenceStrength('detailed_caching deployment', 0.6);
      
      const proposition = 'caching deployment';
      
      // Each expert evaluates all evidence through their frame
      const perfWeights = await Promise.all([
        performanceExpert.calculateEvidenceWeight(performanceReport, proposition),
        performanceExpert.calculateEvidenceWeight(securityAlert, proposition),
        performanceExpert.calculateEvidenceWeight(codeReview, proposition)
      ]);
      
      const secWeights = await Promise.all([
        securityExpert.calculateEvidenceWeight(performanceReport, proposition),
        securityExpert.calculateEvidenceWeight(securityAlert, proposition),
        securityExpert.calculateEvidenceWeight(codeReview, proposition)
      ]);
      
      const qaWeights = await Promise.all([
        qualityExpert.calculateEvidenceWeight(performanceReport, proposition),
        qualityExpert.calculateEvidenceWeight(securityAlert, proposition),
        qualityExpert.calculateEvidenceWeight(codeReview, proposition)
      ]);
      
      // Performance expert should weight performance evidence highest
      expect(perfWeights[0]).toBeGreaterThan(perfWeights[1]);
      expect(perfWeights[0]).toBeGreaterThan(perfWeights[2]);
      
      // Security expert should weight security evidence highest
      expect(secWeights[1]).toBeGreaterThan(secWeights[0]);
      expect(secWeights[1]).toBeGreaterThan(secWeights[2]);
      
      // QA expert should weight detailed analysis highest
      expect(qaWeights[2]).toBeGreaterThan(qaWeights[0]);
      expect(qaWeights[2]).toBeGreaterThan(qaWeights[1]);
      
      // Simulate decision formation
      const allEvidence = [performanceReport, securityAlert, codeReview];
      
      const perfConfidence = await performanceExpert.updateConfidenceForEvidence(0.5, allEvidence, proposition);
      const secConfidence = await securityExpert.updateConfidenceForEvidence(0.5, allEvidence, proposition);
      const qaConfidence = await qualityExpert.updateConfidenceForEvidence(0.5, allEvidence, proposition);
      
      assertValidConfidence(perfConfidence);
      assertValidConfidence(secConfidence);
      assertValidConfidence(qaConfidence);
      
      // Performance expert should be most confident (positive performance evidence)
      // Security expert should be less confident (security concerns)
      // This reflects realistic team dynamics
    });

    it('should handle dynamic frame switching scenario', async () => {
      // Simulate agent switching frames based on context
      const initialFrame = createEfficiencyFrame(mockLLM, 'dynamic-agent');
      const emergencyFrame = createSecurityFrame(mockLLM, 'dynamic-agent-emergency');
      
      // Normal operation evidence
      const normalEvidence = createTestEvidence('performance', 'System running smoothly at 95% efficiency');
      
      // Emergency evidence
      const emergencyEvidence = createTestEvidence('security', 'Critical security breach detected');
      
      // Configure different responses for different contexts
      mockLLM.setEvidenceSaliency('efficiency_performance', 0.9);
      mockLLM.setEvidenceSaliency('efficiency_security', 0.4);
      mockLLM.setEvidenceSaliency('security_security', 0.9);
      mockLLM.setEvidenceSaliency('security_performance', 0.3);
      
      // In normal mode, efficiency frame prioritizes performance
      const normalWeight = await initialFrame.calculateEvidenceWeight(normalEvidence, 'system status');
      const normalSecurityWeight = await initialFrame.calculateEvidenceWeight(emergencyEvidence, 'system status');
      
      // In emergency mode, security frame prioritizes security
      const emergencySecurityWeight = await emergencyFrame.calculateEvidenceWeight(emergencyEvidence, 'system status');
      const emergencyNormalWeight = await emergencyFrame.calculateEvidenceWeight(normalEvidence, 'system status');
      
      // Verify frame-specific prioritization
      expect(normalWeight).toBeGreaterThan(normalSecurityWeight);
      expect(emergencySecurityWeight).toBeGreaterThan(emergencyNormalWeight);
      
      // Cross-frame comparison
      expect(emergencySecurityWeight).toBeGreaterThan(normalSecurityWeight);
      expect(normalWeight).toBeGreaterThan(emergencyNormalWeight);
    });
  });

  // ==========================================================================
  // PERFORMANCE AND SCALABILITY INTEGRATION
  // ==========================================================================

  describe('Performance and Scalability', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should handle large-scale frame creation and operations efficiently', async () => {
      const frameCount = 50;
      const operationsPerFrame = 10;
      
      const { result: frames, executionTimeMs } = await measureExecutionTime(async () => {
        const frames: IEpistemicFrame[] = [];
        for (let i = 0; i < frameCount; i++) {
          frames.push(createEfficiencyFrame(mockLLM, `perf-frame-${i}`));
        }
        return frames;
      }, 'Large-scale frame creation');
      
      expect(frames.length).toBe(frameCount);
      expect(executionTimeMs).toBeLessThan(1000); // Should create 50 frames in under 1 second
      
      // Test concurrent operations
      const evidence = createTestEvidence('performance', 'performance test data');
      
      const operations: Promise<number>[] = [];
      for (const frame of frames.slice(0, 10)) { // Use subset for concurrent test
        for (let i = 0; i < operationsPerFrame; i++) {
          operations.push(frame.calculateEvidenceWeight(evidence, `test-${i}`));
        }
      }
      
      const { result: results, executionTimeMs: concurrentTime } = await measureExecutionTime(async () => {
        return Promise.all(operations);
      }, 'Concurrent operations');
      
      expect(results.length).toBe(10 * operationsPerFrame);
      expect(concurrentTime).toBeLessThan(2000); // Should complete in under 2 seconds
      results.forEach(result => assertValidConfidence(result));
    });

    it('should maintain performance with complex evidence sets', async () => {
      const frame = createThoroughnessFrame(mockLLM);
      const largeEvidenceSet = PERFORMANCE_TEST_DATA.LARGE_EVIDENCE_SET;
      
      const { result: weights, executionTimeMs } = await measureExecutionTime(async () => {
        return Promise.all(
          largeEvidenceSet.map(evidence => 
            frame.calculateEvidenceWeight(evidence, 'performance test')
          )
        );
      }, `Processing ${largeEvidenceSet.length} evidence elements`);
      
      expect(weights.length).toBe(largeEvidenceSet.length);
      expect(executionTimeMs).toBeLessThan(5000); // Should process 100 evidence elements in under 5 seconds
      weights.forEach(weight => assertValidConfidence(weight));
    });

    it('should handle memory management efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy many frames
      for (let iteration = 0; iteration < 10; iteration++) {
        const frames: IEpistemicFrame[] = [];
        
        // Create frames
        for (let i = 0; i < 20; i++) {
          frames.push(createEfficiencyFrame(mockLLM, `mem-test-${iteration}-${i}`));
        }
        
        // Use frames
        const evidence = createTestEvidence('memory', 'memory test data');
        await Promise.all(
          frames.map(frame => frame.calculateEvidenceWeight(evidence, 'memory test'))
        );
        
        // Clear frames
        frames.length = 0;
        FrameRegistry.clearInstances();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  // ==========================================================================
  // ERROR RECOVERY AND RESILIENCE INTEGRATION
  // ==========================================================================

  describe('Error Recovery and Resilience', () => {
    beforeEach(() => {
      initializeFrameSystem();
    });

    it('should recover gracefully from cascading failures', async () => {
      const errorLLM = MockLLMFactory.createErrorMock();
      const errorParameters = MockParameterFactory.createErrorProvider();
      
      // Create frame with failing dependencies
      const resilientFrame = new (await import('../../src/epistemic/frame-base')).ComposableBaseFrame(
        'Resilient Frame',
        'Frame for testing error resilience',
        'resilient-test',
        errorLLM,
        errorParameters,
        'resilient-frame-id',
        'frame-weighted'
      );
      
      const evidence = [createTestEvidence('resilience', 'resilience test data', 'test_source')];
      const perception = createTestPerception('resilience test perception');
      const agentContext = createTestAgentContext();
      
      // All operations should complete without throwing errors
      const weight = await resilientFrame.calculateEvidenceWeight(evidence[0], 'test');
      const trust = await resilientFrame.evaluateSourceTrust('test_source', 'resilience');
      const confidence = await resilientFrame.calculateEvidenceConfidence(evidence[0], 'test');
      const interpretedPerception = await resilientFrame.interpretPerception(perception, agentContext);
      const propositions = await resilientFrame.extractRelevantPropositions(perception);
      const updateResult = await resilientFrame.updateConfidenceForEvidence(0.5, evidence, 'test');
      
      // All should return valid fallback values
      assertValidConfidence(weight);
      assertValidConfidence(trust);
      assertValidConfidence(confidence);
      expect(interpretedPerception).toBeDefined();
      expect(Array.isArray(propositions)).toBe(true);
      assertValidConfidence(updateResult);
    });

    it('should maintain system stability under stress', async () => {
      const mixedLLMs = [
        MockLLMFactory.createNeutralMock(),
        MockLLMFactory.createOptimisticMock(),
        MockLLMFactory.createPessimisticMock(),
        MockLLMFactory.createErrorMock(),
        MockLLMFactory.createSlowMock(100)
      ];
      
      const frames = mixedLLMs.map((llm, index) => 
        createEfficiencyFrame(llm, `stress-frame-${index}`)
      );
      
      const evidence = createTestEvidence('stress', 'stress test data');
      
      // Run many concurrent operations with mixed success/failure
      const operations: Promise<number>[] = [];
      
      for (let i = 0; i < 100; i++) {
        const frame = frames[i % frames.length];
        operations.push(frame.calculateEvidenceWeight(evidence, `stress-test-${i}`));
      }
      
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed, some may fail gracefully
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      expect(successes).toBeGreaterThan(failures);
      expect(successes).toBeGreaterThan(80); // At least 80% success rate
      
      // Check successful results
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          assertValidConfidence(result.value);
        }
      });
    });
  });
});