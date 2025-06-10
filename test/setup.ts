/**
 * Test setup file - runs before all tests
 * Configures global test environment and utilities
 */

import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { FrameRegistry } from '../src/epistemic/frame-base';

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Configure console for test environment
  console.log('🧪 AEF Test Suite Initializing...');
  
  // Any global setup needed
});

beforeEach(() => {
  // Clear frame registry before each test to ensure isolation
  FrameRegistry.clearInstances();
});

afterEach(() => {
  // Clean up after each test
  FrameRegistry.clearInstances();
});

afterAll(() => {
  console.log('✅ AEF Test Suite Completed');
});

// Global test utilities available in all tests
declare global {
  interface Window {
    testUtils: any;
  }
}

// Export test configuration
export const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 5000,
  MATHEMATICAL_PRECISION: 0.0001,
  CONFIDENCE_RANGE: { min: 0, max: 1 },
  DEFAULT_FRAME_COMPATIBILITY: 0.5
} as const;