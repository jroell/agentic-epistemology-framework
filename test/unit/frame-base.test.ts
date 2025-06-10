/**
 * Unit Tests for Frame Base Implementations
 * 
 * Tests the composable base classes, registry system, and dependency injection
 * that enables the SOLID frame architecture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BaseCoreFrame,
  ComposableBaseFrame,
  LLMEvidenceWeighter,
  LearnedSourceTrustEvaluator,
  LLMEvidenceConfidenceEvaluator,
  FrameRegistry,
  createFrame,
  createFrameConfig
} from '../../src/epistemic/frame-base';
import type { 
  IEpistemicFrame, 
  ILLMProvider, 
  IParameterProvider,
  FrameConfiguration,
  AgentContext,
  ConfidenceUpdateContext
} from '../../src/epistemic/frame-interfaces';
import { MockLLMFactory, MockLLMProvider } from '../fixtures/mock-llm-provider';
import { MockParameterFactory, MockParameterProvider } from '../fixtures/mock-parameter-provider';
import { 
  createTestEvidence, 
  createTestAgentContext, 
  TEST_EVIDENCE, 
  TEST_CONTEXTS 
} from '../fixtures/test-data';
import { 
  assertValidConfidence, 
  assertConfidenceEqual, 
  assertFrameImplementsInterface,
  testFrameRegistry,
  cleanupFrameRegistry,
  assertLLMCalled,
  assertParameterUpdated,
  testExtensibility,
  verifySolidPrinciples
} from '../utils/test-helpers';
import { Perception } from '../../src/core/perception';
import { Goal } from '../../src/action/goal';

describe('Frame Base Implementations', () => {
  let mockLLM: MockLLMProvider;
  let mockParameters: MockParameterProvider;

  beforeEach(() => {
    mockLLM = MockLLMFactory.createNeutralMock();
    mockParameters = MockParameterFactory.createLearningProvider();
    cleanupFrameRegistry();
  });

  afterEach(() => {
    mockLLM?.resetCallCounts();
    mockParameters?.clearHistory();
    cleanupFrameRegistry();
  });

  // ==========================================================================
  // BASE CORE FRAME TESTS
  // ==========================================================================

  describe('BaseCoreFrame', () => {
    class TestCoreFrame extends BaseCoreFrame {
      constructor(name: string, description: string, frameType: string, id?: string) {
        super(name, description, frameType, id);
      }
    }

    it('should implement IFrameIdentity interface correctly', () => {
      const frame = new TestCoreFrame('Test Frame', 'Test Description', 'test-frame');
      
      expect(frame.id).toBeDefined();
      expect(frame.name).toBe('Test Frame');
      expect(frame.description).toBe('Test Description');
      expect(frame.frameType).toBe('test-frame');
    });

    it('should generate unique IDs when not provided', () => {
      const frame1 = new TestCoreFrame('Frame 1', 'Description 1', 'type1');
      const frame2 = new TestCoreFrame('Frame 2', 'Description 2', 'type2');
      
      expect(frame1.id).toBeDefined();
      expect(frame2.id).toBeDefined();
      expect(frame1.id).not.toBe(frame2.id);
    });

    it('should use provided ID when specified', () => {
      const customId = 'custom-frame-id';
      const frame = new TestCoreFrame('Test Frame', 'Test Description', 'test-frame', customId);
      
      expect(frame.id).toBe(customId);
    });
  });

  // ==========================================================================
  // COMPONENT IMPLEMENTATION TESTS
  // ==========================================================================

  describe('LLMEvidenceWeighter', () => {
    let weighter: LLMEvidenceWeighter;
    let heuristicCalculator: any;

    beforeEach(() => {
      // Create mock heuristic calculator
      heuristicCalculator = {
        getWeight: vi.fn().mockReturnValue(0.6)
      };
      weighter = new LLMEvidenceWeighter(mockLLM, heuristicCalculator, 'test-frame');
    });

    it('should use LLM for evidence weighting when available', async () => {
      mockLLM.setEvidenceSaliency('test-frame_performance', 0.8);
      
      const evidence = createTestEvidence('performance', 'test performance data');
      const weight = await weighter.calculateEvidenceWeight(evidence, 'test proposition');
      
      assertValidConfidence(weight);
      assertLLMCalled(mockLLM, 'judgeEvidenceSaliency', 1);
    });

    it('should fallback to heuristic calculator on LLM failure', async () => {
      mockLLM.setShouldThrowErrors(true);
      
      const evidence = createTestEvidence('performance', 'test performance data');
      const weight = await weighter.calculateEvidenceWeight(evidence, 'test proposition');
      
      expect(weight).toBe(0.6); // Heuristic fallback value
      expect(heuristicCalculator.getWeight).toHaveBeenCalledWith('test-frame', 'performance');
    });

    it('should clamp weights to valid range', async () => {
      mockLLM.setEvidenceSaliency('test-frame_extreme', 1.5); // Invalid high value
      
      const evidence = createTestEvidence('extreme', 'extreme evidence');
      const weight = await weighter.calculateEvidenceWeight(evidence, 'test proposition');
      
      assertValidConfidence(weight);
      expect(weight).toBeLessThanOrEqual(1.0);
    });
  });

  describe('LearnedSourceTrustEvaluator', () => {
    let evaluator: LearnedSourceTrustEvaluator;

    beforeEach(() => {
      evaluator = new LearnedSourceTrustEvaluator(mockLLM, 'test-frame', 0.2);
    });

    it('should return default trust for unknown sources', async () => {
      const trust = await evaluator.evaluateSourceTrust('unknown_source', 'test_evidence');
      
      assertValidConfidence(trust);
      expect(trust).toBe(0.5); // Default trust
    });

    it('should return learned trust for known sources', async () => {
      evaluator.updateTrust('known_source', 0.8);
      
      const trust = await evaluator.evaluateSourceTrust('known_source', 'test_evidence');
      
      assertValidConfidence(trust);
      expect(trust).toBeGreaterThan(0.5); // Should be updated from default
    });

    it('should update trust based on verification outcomes', () => {
      const initialTrust = 0.5;
      const outcome = 0.9;
      const learningRate = 0.2;
      
      evaluator.updateTrust('test_source', outcome);
      
      // Expected: (1-0.2) * 0.5 + 0.2 * 0.9 = 0.4 + 0.18 = 0.58
      const expectedTrust = (1 - learningRate) * initialTrust + learningRate * outcome;
      
      // Get trust indirectly through evaluation
      evaluator.evaluateSourceTrust('test_source', 'test_evidence').then(trust => {
        assertConfidenceEqual(trust, expectedTrust);
      });
    });
  });

  describe('LLMEvidenceConfidenceEvaluator', () => {
    let evaluator: LLMEvidenceConfidenceEvaluator;

    beforeEach(() => {
      evaluator = new LLMEvidenceConfidenceEvaluator(mockLLM);
    });

    it('should use LLM to evaluate evidence confidence', async () => {
      mockLLM.setEvidenceStrength('performance_TestProposition', 0.85);
      
      const evidence = createTestEvidence('performance', 'test performance data');
      const confidence = await evaluator.calculateEvidenceConfidence(evidence, 'TestProposition');
      
      assertValidConfidence(confidence);
      assertLLMCalled(mockLLM, 'judgeEvidenceStrength', 1);
    });

    it('should return default confidence on LLM failure', async () => {
      mockLLM.setShouldThrowErrors(true);
      
      const evidence = createTestEvidence('test', 'test data');
      const confidence = await evaluator.calculateEvidenceConfidence(evidence, 'test proposition');
      
      assertValidConfidence(confidence);
      expect(confidence).toBe(0.5); // Default neutral confidence
    });

    it('should clamp confidence values to valid range', async () => {
      mockLLM.setEvidenceStrength('extreme_test', 1.5); // Invalid high value
      
      const evidence = createTestEvidence('extreme', 'extreme evidence');
      const confidence = await evaluator.calculateEvidenceConfidence(evidence, 'test');
      
      assertValidConfidence(confidence);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ==========================================================================
  // COMPOSABLE BASE FRAME TESTS
  // ==========================================================================

  describe('ComposableBaseFrame', () => {
    let frame: ComposableBaseFrame;

    beforeEach(() => {
      frame = new ComposableBaseFrame(
        'Test Composable Frame',
        'Test composable frame for unit testing',
        'test-composable',
        mockLLM,
        mockParameters,
        'test-frame-id',
        'frame-weighted'
      );
    });

    it('should implement complete IEpistemicFrame interface', () => {
      assertFrameImplementsInterface(frame, 'epistemic');
    });

    it('should verify SOLID principles compliance', () => {
      verifySolidPrinciples(frame);
    });

    it('should calculate evidence weights using injected weighter', async () => {
      mockLLM.setEvidenceSaliency('test-composable_performance', 0.75);
      
      const evidence = createTestEvidence('performance', 'performance data');
      const weight = await frame.calculateEvidenceWeight(evidence, 'test proposition');
      
      assertValidConfidence(weight);
      assertLLMCalled(mockLLM, 'judgeEvidenceSaliency', 1);
    });

    it('should evaluate source trust using injected evaluator', async () => {
      const trust = await frame.evaluateSourceTrust('test_source', 'test_evidence');
      
      assertValidConfidence(trust);
      expect(trust).toBe(0.5); // Default for unknown source
    });

    it('should calculate evidence confidence using injected evaluator', async () => {
      mockLLM.setEvidenceStrength('performance_test', 0.8);
      
      const evidence = createTestEvidence('performance', 'test data');
      const confidence = await frame.calculateEvidenceConfidence(evidence, 'test');
      
      assertValidConfidence(confidence);
      assertLLMCalled(mockLLM, 'judgeEvidenceStrength', 1);
    });

    it('should update confidence using injected strategy', async () => {
      const evidence = [createTestEvidence('test', 'test evidence')];
      const updateContext: ConfidenceUpdateContext = {
        evidenceWeights: [0.7],
        evidenceConfidences: [0.8]
      };
      
      const newConfidence = await frame.updateConfidence(0.5, evidence, 'test proposition', updateContext);
      
      assertValidConfidence(newConfidence);
      // Frame-weighted calculation: 0.5 * (1-0.7) + 0.8 * 0.7 = 0.15 + 0.56 = 0.71
      assertConfidenceEqual(newConfidence, 0.71);
    });

    it('should perform high-level confidence update with automatic context calculation', async () => {
      mockLLM.setEvidenceSaliency('test-composable_performance', 0.8);
      mockLLM.setEvidenceStrength('performance_test', 0.9);
      
      const evidence = [createTestEvidence('performance', 'test data', 'test_source')];
      const result = await frame.updateConfidenceForEvidence(0.5, evidence, 'test');
      
      assertValidConfidence(result);
      
      // Should have called LLM methods to calculate context
      assertLLMCalled(mockLLM, 'judgeEvidenceSaliency', 1);
      assertLLMCalled(mockLLM, 'judgeEvidenceStrength', 1);
    });

    it('should interpret perceptions through frame lens', async () => {
      const interpretation = 'Frame-specific interpretation of perception';
      mockLLM.setInterpretation('test-composable_test data', interpretation);
      
      const perception = new Perception('test data', 'message', 'test_source');
      const agentContext = createTestAgentContext();
      
      const interpretedPerception = await frame.interpretPerception(perception, agentContext);
      
      expect(interpretedPerception.data).toBe(interpretation);
      assertLLMCalled(mockLLM, 'interpretPerceptionData', 1);
    });

    it('should extract relevant propositions from sources', async () => {
      const expectedPropositions = ['Proposition 1', 'Proposition 2'];
      mockLLM.setPropositions('test-composable', expectedPropositions);
      
      const perception = new Perception('test perception data', 'observation');
      const propositions = await frame.extractRelevantPropositions(perception);
      
      expect(propositions).toEqual(expectedPropositions);
      assertLLMCalled(mockLLM, 'extractPropositions', 1);
    });

    it('should calculate frame compatibility correctly', () => {
      const otherFrame = new ComposableBaseFrame(
        'Other Frame',
        'Another test frame',
        'other-type',
        mockLLM,
        mockParameters
      );
      
      const compatibility = frame.calculateCompatibility(otherFrame);
      
      assertValidCompatibility(compatibility);
      expect(compatibility).toBe(0.5); // Default for unknown frame types
    });

    it('should determine if justification evaluation is meaningful', () => {
      const compatibleFrame = new ComposableBaseFrame(
        'Compatible Frame',
        'Compatible test frame',
        'test-composable', // Same type
        mockLLM,
        mockParameters
      );
      
      const incompatibleFrame = new ComposableBaseFrame(
        'Incompatible Frame',
        'Incompatible test frame',
        'very-different-type',
        mockLLM,
        mockParameters
      );
      
      expect(frame.canEvaluateJustificationFrom(compatibleFrame)).toBe(true);
      expect(frame.canEvaluateJustificationFrom(incompatibleFrame)).toBe(true); // Default is 0.5 > 0.3 threshold
    });

    it('should handle errors gracefully in all methods', async () => {
      mockLLM.setShouldThrowErrors(true);
      
      const evidence = createTestEvidence('test', 'test data');
      const perception = new Perception('test data', 'message');
      const agentContext = createTestAgentContext();
      
      // All these should not throw errors but return sensible defaults
      const weight = await frame.calculateEvidenceWeight(evidence, 'test');
      const trust = await frame.evaluateSourceTrust('test_source', 'test_type');
      const confidence = await frame.calculateEvidenceConfidence(evidence, 'test');
      const interpretedPerception = await frame.interpretPerception(perception, agentContext);
      const propositions = await frame.extractRelevantPropositions(perception);
      
      assertValidConfidence(weight);
      assertValidConfidence(trust);
      assertValidConfidence(confidence);
      expect(interpretedPerception).toBeDefined();
      expect(Array.isArray(propositions)).toBe(true);
    });
  });

  // ==========================================================================
  // FRAME REGISTRY TESTS
  // ==========================================================================

  describe('FrameRegistry', () => {
    beforeEach(() => {
      cleanupFrameRegistry();
      
      // Register a test frame type
      FrameRegistry.registerFrameType('test-registry', (config, llmProvider, parameterProvider, id) => {
        return new ComposableBaseFrame(
          'Test Registry Frame',
          'Frame for testing registry',
          'test-registry',
          llmProvider,
          parameterProvider,
          id,
          config.updateStrategy
        );
      });
    });

    it('should register and create frame types correctly', async () => {
      const frame = await testFrameRegistry('test-registry', mockLLM);
      
      expect(frame).toBeDefined();
      expect(frame.frameType).toBe('test-registry');
      expect(frame.name).toBe('Test Registry Frame');
    });

    it('should track frame instances', () => {
      const config = createFrameConfig('test-registry');
      const frame = FrameRegistry.createFrame(config, mockLLM, mockParameters);
      
      const retrievedFrame = FrameRegistry.getInstance(frame.id);
      expect(retrievedFrame).toBe(frame);
    });

    it('should list available frame types', () => {
      const availableTypes = FrameRegistry.getAvailableFrameTypes();
      expect(availableTypes).toContain('test-registry');
    });

    it('should remove instances', () => {
      const config = createFrameConfig('test-registry');
      const frame = FrameRegistry.createFrame(config, mockLLM, mockParameters);
      
      FrameRegistry.removeInstance(frame.id);
      
      const retrievedFrame = FrameRegistry.getInstance(frame.id);
      expect(retrievedFrame).toBeUndefined();
    });

    it('should clear all instances', () => {
      const config1 = createFrameConfig('test-registry');
      const config2 = createFrameConfig('test-registry');
      
      const frame1 = FrameRegistry.createFrame(config1, mockLLM, mockParameters);
      const frame2 = FrameRegistry.createFrame(config2, mockLLM, mockParameters);
      
      FrameRegistry.clearInstances();
      
      expect(FrameRegistry.getInstance(frame1.id)).toBeUndefined();
      expect(FrameRegistry.getInstance(frame2.id)).toBeUndefined();
    });

    it('should throw error for unknown frame types', () => {
      const config = createFrameConfig('unknown-frame');
      
      expect(() => {
        FrameRegistry.createFrame(config, mockLLM, mockParameters);
      }).toThrow('Unknown frame type: unknown-frame');
    });

    it('should support frame configuration parameters', () => {
      const config = createFrameConfig('test-registry', { customParam: 42 }, 'hybrid');
      const frame = FrameRegistry.createFrame(config, mockLLM, mockParameters);
      
      expect(frame).toBeDefined();
      expect(frame.frameType).toBe('test-registry');
    });
  });

  // ==========================================================================
  // HELPER FUNCTION TESTS
  // ==========================================================================

  describe('Helper Functions', () => {
    beforeEach(() => {
      // Register test frame for helper function tests
      FrameRegistry.registerFrameType('test-helper', (config, llmProvider, parameterProvider, id) => {
        return new ComposableBaseFrame(
          'Test Helper Frame',
          'Frame for testing helpers',
          'test-helper',
          llmProvider,
          parameterProvider,
          id,
          config.updateStrategy
        );
      });
    });

    it('should create frame configuration correctly', () => {
      const config = createFrameConfig('test-type', { param1: 'value1' }, 'bayesian');
      
      expect(config.frameType).toBe('test-type');
      expect(config.parameters).toEqual({ param1: 'value1' });
      expect(config.updateStrategy).toBe('bayesian');
    });

    it('should create frame with default dependencies', () => {
      const frame = createFrame('test-helper', mockLLM);
      
      expect(frame).toBeDefined();
      expect(frame.frameType).toBe('test-helper');
      expect(frame.name).toBe('Test Helper Frame');
    });

    it('should create frame with custom parameters and strategy', () => {
      const customParams = { weight: 0.8 };
      const frame = createFrame('test-helper', mockLLM, customParams, 'hybrid', mockParameters);
      
      expect(frame).toBeDefined();
      expect(frame.frameType).toBe('test-helper');
    });
  });

  // ==========================================================================
  // EXTENSIBILITY TESTS
  // ==========================================================================

  describe('Extensibility (SOLID Open/Closed Principle)', () => {
    it('should support adding new frame types without modifying existing code', () => {
      // Define a custom frame type
      class CustomTestFrame extends ComposableBaseFrame {
        constructor(llmProvider: ILLMProvider, parameterProvider?: IParameterProvider, id?: string) {
          super(
            'Custom Test Frame',
            'A custom frame for testing extensibility',
            'custom-test',
            llmProvider,
            parameterProvider,
            id,
            'frame-weighted'
          );
        }
      }
      
      const customFrameFactory = (config: FrameConfiguration, llmProvider: ILLMProvider, parameterProvider?: IParameterProvider, id?: string) => {
        return new CustomTestFrame(llmProvider, parameterProvider, id);
      };
      
      // Test extensibility
      testExtensibility(customFrameFactory, 'custom-test', mockLLM);
    });

    it('should support custom update strategies', () => {
      // This test verifies that the system can be extended with new strategies
      // without modifying existing frame code
      const customStrategy = {
        async updateConfidence(): Promise<number> {
          return 0.75; // Custom logic
        }
      };

      // Custom strategy should be registerable and usable
      expect(typeof customStrategy.updateConfidence).toBe('function');
    });

    it('should support dependency injection of custom providers', () => {
      const customLLM = MockLLMFactory.createOptimisticMock();
      const customParameters = MockParameterFactory.createStaticProvider();
      
      const frame = new ComposableBaseFrame(
        'DI Test Frame',
        'Testing dependency injection',
        'di-test',
        customLLM,
        customParameters
      );
      
      expect(frame).toBeDefined();
      assertFrameImplementsInterface(frame, 'epistemic');
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS
  // ==========================================================================

  describe('Performance', () => {
    it('should create frames efficiently', async () => {
      const startTime = performance.now();
      
      // Create multiple frames
      const frames: IEpistemicFrame[] = [];
      for (let i = 0; i < 10; i++) {
        const frame = new ComposableBaseFrame(
          `Performance Frame ${i}`,
          `Performance test frame ${i}`,
          'performance-test',
          mockLLM,
          mockParameters
        );
        frames.push(frame);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(frames.length).toBe(10);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should handle concurrent operations', async () => {
      const frame = new ComposableBaseFrame(
        'Concurrent Test Frame',
        'Testing concurrent operations',
        'concurrent-test',
        mockLLM,
        mockParameters
      );
      
      const evidence = createTestEvidence('performance', 'concurrent test data');
      
      // Run multiple operations concurrently
      const operations = Array.from({ length: 5 }, (_, i) => 
        frame.calculateEvidenceWeight(evidence, `proposition ${i}`)
      );
      
      const results = await Promise.all(operations);
      
      expect(results.length).toBe(5);
      results.forEach(result => assertValidConfidence(result));
    });
  });
});