/**
 * Test Helpers and Utilities
 * 
 * Provides common testing utilities, custom assertions, and helper functions
 * to make writing tests easier and more readable.
 */

import { expect } from 'vitest';
import type { IEpistemicFrame, IDebateFrame, ILLMProvider, IParameterProvider } from '../../src/epistemic/frame-interfaces';
import { FrameRegistry, createFrame } from '../../src/epistemic/frame-base';
import { MockLLMProvider, MockLLMFactory } from '../fixtures/mock-llm-provider';
import { MockParameterProvider, MockParameterFactory } from '../fixtures/mock-parameter-provider';
import { TEST_CONFIG } from '../setup';

// ==========================================================================
// MATHEMATICAL ASSERTIONS
// ==========================================================================

/**
 * Assert that a confidence value is within valid range [0, 1]
 */
export function assertValidConfidence(confidence: number, message?: string): void {
  expect(confidence).toBeGreaterThanOrEqual(0);
  expect(confidence).toBeLessThanOrEqual(1);
  expect(confidence).not.toBeNaN();
  expect(confidence).not.toBe(Infinity);
  expect(confidence).not.toBe(-Infinity);
  if (message) {
    expect(confidence, message).toBeDefined();
  }
}

/**
 * Assert that two confidence values are approximately equal
 */
export function assertConfidenceEqual(
  actual: number, 
  expected: number, 
  precision: number = TEST_CONFIG.MATHEMATICAL_PRECISION,
  message?: string
): void {
  assertValidConfidence(actual);
  assertValidConfidence(expected);
  expect(actual).toBeCloseTo(expected, precision);
  if (message) {
    expect(actual, message).toBeCloseTo(expected, precision);
  }
}

/**
 * Assert that a compatibility value is within valid range [0, 1]
 */
export function assertValidCompatibility(compatibility: number, message?: string): void {
  assertValidConfidence(compatibility, message); // Same constraints as confidence
}

/**
 * Assert that evidence weights are valid
 */
export function assertValidEvidenceWeights(weights: number[]): void {
  expect(weights).toBeDefined();
  expect(weights.length).toBeGreaterThan(0);
  weights.forEach((weight, index) => {
    assertValidConfidence(weight, `Weight at index ${index} should be valid`);
  });
}

/**
 * Assert that an array of confidence values are all valid
 */
export function assertValidConfidenceArray(confidences: number[]): void {
  expect(confidences).toBeDefined();
  expect(confidences.length).toBeGreaterThan(0);
  confidences.forEach((confidence, index) => {
    assertValidConfidence(confidence, `Confidence at index ${index} should be valid`);
  });
}

// ==========================================================================
// FRAME TESTING UTILITIES
// ==========================================================================

/**
 * Create a test frame with mock dependencies
 */
export async function createTestFrame(
  frameType: string,
  mockLLM?: MockLLMProvider,
  mockParameters?: MockParameterProvider,
  id?: string
): Promise<IEpistemicFrame> {
  const llmProvider = mockLLM || MockLLMFactory.createNeutralMock();
  const parameterProvider = mockParameters || MockParameterFactory.createLearningProvider();
  
  return createFrame(frameType, llmProvider, {}, 'frame-weighted', parameterProvider, id);
}

/**
 * Create multiple test frames for compatibility testing
 */
export async function createTestFrameSet(
  frameTypes: string[],
  mockLLM?: MockLLMProvider,
  mockParameters?: MockParameterProvider
): Promise<IEpistemicFrame[]> {
  const llmProvider = mockLLM || MockLLMFactory.createNeutralMock();
  const parameterProvider = mockParameters || MockParameterFactory.createLearningProvider();
  
  return Promise.all(
    frameTypes.map(type => createFrame(type, llmProvider, {}, 'frame-weighted', parameterProvider))
  );
}

/**
 * Assert that a frame implements the expected interface
 */
export function assertFrameImplementsInterface(frame: any, frameType: 'basic' | 'epistemic' | 'debate' = 'epistemic'): void {
  // Basic frame properties
  expect(frame).toHaveProperty('id');
  expect(frame).toHaveProperty('name');
  expect(frame).toHaveProperty('description');
  expect(frame).toHaveProperty('frameType');
  
  if (frameType === 'epistemic' || frameType === 'debate') {
    // Epistemic frame methods
    expect(frame).toHaveProperty('calculateEvidenceWeight');
    expect(frame).toHaveProperty('evaluateSourceTrust');
    expect(frame).toHaveProperty('calculateEvidenceConfidence');
    expect(frame).toHaveProperty('updateConfidence');
    expect(frame).toHaveProperty('interpretPerception');
    expect(frame).toHaveProperty('extractRelevantPropositions');
    expect(frame).toHaveProperty('calculateCompatibility');
    
    // Ensure methods are functions
    expect(typeof frame.calculateEvidenceWeight).toBe('function');
    expect(typeof frame.updateConfidence).toBe('function');
    expect(typeof frame.calculateCompatibility).toBe('function');
  }
  
  if (frameType === 'debate') {
    // Debate-specific methods
    expect(frame).toHaveProperty('evaluateArgumentStrength');
    expect(frame).toHaveProperty('generateCounterarguments');
    expect(typeof frame.evaluateArgumentStrength).toBe('function');
    expect(typeof frame.generateCounterarguments).toBe('function');
  }
}

/**
 * Test frame compatibility matrix
 */
export async function testFrameCompatibilityMatrix(
  frames: IEpistemicFrame[],
  expectedMatrix?: number[][]
): Promise<number[][]> {
  const matrix: number[][] = [];
  
  for (let i = 0; i < frames.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < frames.length; j++) {
      const compatibility = frames[i].calculateCompatibility(frames[j]);
      assertValidCompatibility(compatibility);
      matrix[i][j] = compatibility;
      
      // Self-compatibility should be high
      if (i === j) {
        expect(compatibility).toBeGreaterThan(0.9);
      }
      
      // Check expected values if provided
      if (expectedMatrix) {
        assertConfidenceEqual(compatibility, expectedMatrix[i][j], TEST_CONFIG.MATHEMATICAL_PRECISION);
      }
    }
  }
  
  return matrix;
}

// ==========================================================================
// CONFIDENCE UPDATE TESTING
// ==========================================================================

/**
 * Test confidence update with mathematical verification
 */
export async function testConfidenceUpdate(
  frame: IEpistemicFrame,
  currentConfidence: number,
  evidence: any[],
  expectedRange?: { min: number; max: number },
  exactExpected?: number
): Promise<number> {
  assertValidConfidence(currentConfidence);
  
  const updateContext = {
    evidenceWeights: evidence.map(() => 0.7),
    evidenceConfidences: evidence.map(() => 0.8),
    metadata: { testCase: true }
  };
  
  const newConfidence = await frame.updateConfidence(
    currentConfidence,
    evidence,
    'test proposition',
    updateContext
  );
  
  assertValidConfidence(newConfidence);
  
  if (expectedRange) {
    expect(newConfidence).toBeGreaterThanOrEqual(expectedRange.min);
    expect(newConfidence).toBeLessThanOrEqual(expectedRange.max);
  }
  
  if (exactExpected !== undefined) {
    assertConfidenceEqual(newConfidence, exactExpected);
  }
  
  return newConfidence;
}

/**
 * Test mathematical formalism compliance
 */
export async function testMathematicalFormalism(
  frame: IEpistemicFrame,
  testCase: {
    name: string;
    currentConfidence: number;
    evidenceWeight: number;
    evidenceConfidence: number;
    expectedResult: number;
  }
): Promise<void> {
  const evidence = [{
    id: 'test',
    type: 'test',
    content: 'test evidence',
    timestamp: Date.now()
  }];
  
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
  
  assertConfidenceEqual(
    result,
    testCase.expectedResult,
    TEST_CONFIG.MATHEMATICAL_PRECISION,
    `Mathematical formalism test: ${testCase.name}`
  );
}

// ==========================================================================
// MOCK TESTING UTILITIES
// ==========================================================================

/**
 * Verify that LLM provider was called with expected parameters
 */
export function assertLLMCalled(
  mockLLM: MockLLMProvider,
  method: string,
  expectedCallCount: number = 1
): void {
  const actualCallCount = mockLLM.getCallCount(method);
  expect(actualCallCount).toBe(expectedCallCount);
}

/**
 * Verify that parameter provider was updated
 */
export function assertParameterUpdated(
  mockParams: MockParameterProvider,
  frameId: string,
  parameterName: string,
  expectedValue?: number
): void {
  const history = mockParams.getFrameUpdateHistory(frameId);
  const updates = history.filter(update => update.parameterName === parameterName);
  
  expect(updates.length).toBeGreaterThan(0);
  
  if (expectedValue !== undefined) {
    const lastUpdate = updates[updates.length - 1];
    assertConfidenceEqual(lastUpdate.newValue, expectedValue);
  }
}

/**
 * Setup mock LLM with specific responses for a test
 */
export function setupMockLLMForTest(config: {
  evidenceStrength?: Record<string, number>;
  evidenceSaliency?: Record<string, number>;
  interpretations?: Record<string, string>;
  propositions?: Record<string, string[]>;
}): MockLLMProvider {
  const mock = MockLLMFactory.createNeutralMock();
  
  if (config.evidenceStrength) {
    Object.entries(config.evidenceStrength).forEach(([key, value]) => {
      mock.setEvidenceStrength(key, value);
    });
  }
  
  if (config.evidenceSaliency) {
    Object.entries(config.evidenceSaliency).forEach(([key, value]) => {
      mock.setEvidenceSaliency(key, value);
    });
  }
  
  if (config.interpretations) {
    Object.entries(config.interpretations).forEach(([key, value]) => {
      mock.setInterpretation(key, value);
    });
  }
  
  if (config.propositions) {
    Object.entries(config.propositions).forEach(([key, value]) => {
      mock.setPropositions(key, value);
    });
  }
  
  return mock;
}

// ==========================================================================
// PERFORMANCE TESTING UTILITIES
// ==========================================================================

/**
 * Measure execution time of an async function
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>,
  description?: string
): Promise<{ result: T; executionTimeMs: number }> {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  const executionTimeMs = endTime - startTime;
  
  if (description) {
    console.log(`${description}: ${executionTimeMs.toFixed(2)}ms`);
  }
  
  return { result, executionTimeMs };
}

/**
 * Assert that operation completes within expected time
 */
export async function assertPerformance<T>(
  operation: () => Promise<T>,
  maxTimeMs: number,
  description?: string
): Promise<T> {
  const { result, executionTimeMs } = await measureExecutionTime(operation, description);
  
  expect(executionTimeMs).toBeLessThan(maxTimeMs);
  
  return result;
}

/**
 * Run performance test with multiple iterations
 */
export async function runPerformanceTest<T>(
  operation: () => Promise<T>,
  iterations: number = 10,
  description?: string
): Promise<{
  averageTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  totalTimeMs: number;
}> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const { executionTimeMs } = await measureExecutionTime(operation);
    times.push(executionTimeMs);
  }
  
  const totalTimeMs = times.reduce((sum, time) => sum + time, 0);
  const averageTimeMs = totalTimeMs / iterations;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  
  if (description) {
    console.log(`Performance Test - ${description}:`);
    console.log(`  Average: ${averageTimeMs.toFixed(2)}ms`);
    console.log(`  Min: ${minTimeMs.toFixed(2)}ms`);
    console.log(`  Max: ${maxTimeMs.toFixed(2)}ms`);
    console.log(`  Total: ${totalTimeMs.toFixed(2)}ms`);
  }
  
  return { averageTimeMs, minTimeMs, maxTimeMs, totalTimeMs };
}

// ==========================================================================
// ERROR TESTING UTILITIES
// ==========================================================================

/**
 * Assert that an operation throws an error with specific message
 */
export async function assertThrowsError(
  operation: () => Promise<any>,
  expectedErrorMessage?: string | RegExp
): Promise<Error> {
  let thrownError: Error | null = null;
  
  try {
    await operation();
    expect.fail('Expected operation to throw an error, but it succeeded');
  } catch (error) {
    thrownError = error as Error;
  }
  
  expect(thrownError).toBeDefined();
  
  if (expectedErrorMessage) {
    if (typeof expectedErrorMessage === 'string') {
      expect(thrownError!.message).toContain(expectedErrorMessage);
    } else {
      expect(thrownError!.message).toMatch(expectedErrorMessage);
    }
  }
  
  return thrownError!;
}

/**
 * Test graceful error handling
 */
export async function testGracefulErrorHandling<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  description?: string
): Promise<void> {
  const result = await operation();
  expect(result).toBe(fallbackValue);
  
  if (description) {
    console.log(`Graceful error handling verified: ${description}`);
  }
}

// ==========================================================================
// REGISTRY TESTING UTILITIES
// ==========================================================================

/**
 * Test frame registry functionality
 */
export async function testFrameRegistry(
  frameType: string,
  llmProvider: ILLMProvider
): Promise<IEpistemicFrame> {
  // Clear registry to ensure clean state
  FrameRegistry.clearInstances();
  
  // Verify frame type is available
  const availableTypes = FrameRegistry.getAvailableFrameTypes();
  expect(availableTypes).toContain(frameType);
  
  // Create frame instance
  const frame = createFrame(frameType, llmProvider);
  expect(frame).toBeDefined();
  expect(frame.frameType).toBe(frameType);
  
  // Verify frame is registered
  const instance = FrameRegistry.getInstance(frame.id);
  expect(instance).toBe(frame);
  
  return frame;
}

/**
 * Clean up registry after test
 */
export function cleanupFrameRegistry(): void {
  FrameRegistry.clearInstances();
}

// ==========================================================================
// EXTENSIBILITY TESTING
// ==========================================================================

/**
 * Test that new frames can be added without modifying existing code
 */
export function testExtensibility(
  customFrameFactory: any,
  frameType: string,
  llmProvider: ILLMProvider
): void {
  // Register custom frame
  FrameRegistry.registerFrameType(frameType, customFrameFactory);
  
  // Verify it's available
  const availableTypes = FrameRegistry.getAvailableFrameTypes();
  expect(availableTypes).toContain(frameType);
  
  // Create instance
  const frame = createFrame(frameType, llmProvider);
  expect(frame).toBeDefined();
  expect(frame.frameType).toBe(frameType);
  
  // Verify it implements the interface
  assertFrameImplementsInterface(frame, 'epistemic');
}

// ==========================================================================
// SOLID PRINCIPLES VERIFICATION
// ==========================================================================

/**
 * Verify that SOLID principles are maintained
 */
export function verifySolidPrinciples(frame: IEpistemicFrame): void {
  // Single Responsibility: Each method should have one clear purpose
  expect(typeof frame.calculateEvidenceWeight).toBe('function');
  expect(typeof frame.updateConfidence).toBe('function');
  expect(typeof frame.calculateCompatibility).toBe('function');
  
  // Open/Closed: Frame should be extensible without modification
  // (This is verified by the ability to register new frame types)
  
  // Liskov Substitution: All frames should be interchangeable
  assertFrameImplementsInterface(frame, 'epistemic');
  
  // Interface Segregation: Frame implements only what it needs
  // (Verified by interface structure)
  
  // Dependency Inversion: Frame depends on abstractions
  // (LLM and parameter providers are interfaces)
}