/**
 * Test Data Fixtures
 * 
 * Provides consistent test data for evidence, propositions, contexts,
 * and other components used across the test suite.
 */

import type { JustificationElement, Proposition } from '../../src/types/common';
import { generateId } from '../../src/types/common';
import { Justification, ObservationJustificationElement } from '../../src/epistemic/justification';
import { ObservationPerception } from '../../src/core/perception';
import { Goal } from '../../src/action/goal';
import type { AgentContext, DebateContext, ConfidenceUpdateContext } from '../../src/epistemic/frame-interfaces';

// ==========================================================================
// EVIDENCE AND JUSTIFICATION FIXTURES
// ==========================================================================

export const createTestEvidence = (
  content: string = 'Test evidence content',
  source: string = 'test_source',
  _tag?: string,
): JustificationElement => new ObservationJustificationElement(source, content);

/**
 * Build a lightweight ObservationPerception for frame-system tests.
 * The third positional argument is tolerated for legacy callers that
 * passed a narrative summary.
 */
export const createTestPerception = (
  content: string = 'Test perception content',
  source: string = 'test_source',
  _summary?: string,
): ObservationPerception => new ObservationPerception(source, content, content);

export const TEST_EVIDENCE = {
  // Performance-related evidence
  PERFORMANCE_POSITIVE: createTestEvidence('System response time improved by 25%', 'performance_monitor'),
  PERFORMANCE_NEGATIVE: createTestEvidence('System response time degraded by 15%', 'performance_monitor'),
  SPEED_IMPROVEMENT: createTestEvidence('Processing speed increased to 1000 ops/sec', 'benchmark_tool'),

  // Detailed analysis evidence
  DETAILED_ANALYSIS: createTestEvidence('Comprehensive 50-page analysis reveals multiple concerns', 'analyst_report'),
  THOROUGH_REVIEW: createTestEvidence('In-depth code review identified 12 potential issues', 'code_reviewer'),
  QUICK_ASSESSMENT: createTestEvidence('Rapid assessment shows no immediate problems', 'quick_scanner'),

  // Security-related evidence
  SECURITY_VULNERABILITY: createTestEvidence('SQL injection vulnerability discovered in login form', 'security_scanner'),
  SECURITY_IMPROVEMENT: createTestEvidence('Multi-factor authentication successfully implemented', 'security_team'),
  RISK_ASSESSMENT: createTestEvidence('High risk of data breach due to weak encryption', 'risk_analyst'),

  // Debate evidence
  SUPPORTING_CITATION: createTestEvidence('Brookings Institution study shows standardized tests improve equity', 'academic_source'),
  OPPOSING_CITATION: createTestEvidence('Harvard research indicates standardized tests increase inequality', 'academic_source'),
  STATISTICAL_DATA: createTestEvidence('Test score gaps correlate with socioeconomic status (r=0.7)', 'research_data'),

  // Communication evidence
  AGENT_MESSAGE: createTestEvidence('Agent A reports high confidence in efficiency approach', 'agent_a'),
  EXPERT_OPINION: createTestEvidence('Domain expert recommends thorough analysis before proceeding', 'expert_consultant'),
  USER_FEEDBACK: createTestEvidence('Users report satisfaction with current system performance', 'user_survey'),

  // Novel/Creative evidence
  NOVEL_APPROACH: createTestEvidence('Innovative machine learning approach shows 40% improvement', 'research_lab'),
  CREATIVE_SOLUTION: createTestEvidence('Unconventional design pattern reduces complexity by 60%', 'engineer'),
  CONVENTIONAL_METHOD: createTestEvidence('Standard industry practice recommends established protocols', 'industry_guide')
};

export const createTestProposition = (
  id: string = 'test-proposition',
  content: string = 'Test proposition content'
): Proposition => content;

export const createTestJustification = (elements: JustificationElement[]): Justification =>
  new Justification(elements);

export const TEST_JUSTIFICATIONS = {
  EFFICIENCY_SUPPORTING: createTestJustification([
    TEST_EVIDENCE.PERFORMANCE_POSITIVE,
    TEST_EVIDENCE.SPEED_IMPROVEMENT,
    TEST_EVIDENCE.USER_FEEDBACK
  ]),
  
  THOROUGHNESS_SUPPORTING: createTestJustification([
    TEST_EVIDENCE.DETAILED_ANALYSIS,
    TEST_EVIDENCE.THOROUGH_REVIEW,
    TEST_EVIDENCE.EXPERT_OPINION
  ]),
  
  SECURITY_SUPPORTING: createTestJustification([
    TEST_EVIDENCE.SECURITY_VULNERABILITY,
    TEST_EVIDENCE.RISK_ASSESSMENT,
    TEST_EVIDENCE.SECURITY_IMPROVEMENT
  ]),
  
  MIXED_EVIDENCE: createTestJustification([
    TEST_EVIDENCE.PERFORMANCE_POSITIVE,
    TEST_EVIDENCE.DETAILED_ANALYSIS,
    TEST_EVIDENCE.SECURITY_VULNERABILITY
  ])
};

// ==========================================================================
// PROPOSITION FIXTURES
// ==========================================================================

export const TEST_PROPOSITIONS = {
  // General propositions
  EFFICIENCY_IS_OPTIMAL: 'Efficiency-focused approach is optimal for this task',
  THOROUGHNESS_IS_OPTIMAL: 'Thoroughness-focused approach is optimal for this task',
  SECURITY_IS_OPTIMAL: 'Security-focused approach is optimal for this task',
  
  // System propositions
  SYSTEM_PERFORMANCE_GOOD: 'System performance is satisfactory',
  SYSTEM_SECURITY_ADEQUATE: 'System security measures are adequate',
  SYSTEM_NEEDS_IMPROVEMENT: 'System requires significant improvements',
  
  // Debate propositions
  STANDARDIZED_TESTING_BENEFICIAL: 'Standardized testing is a net positive for educational equity',
  STANDARDIZED_TESTING_HARMFUL: 'Standardized testing increases educational inequality',
  BALANCED_APPROACH_OPTIMAL: 'A balanced approach combining multiple strategies is optimal',
  
  // Technical propositions
  PERFORMANCE_OPTIMIZATION_NEEDED: 'Performance optimization is the highest priority',
  SECURITY_AUDIT_REQUIRED: 'A comprehensive security audit is required',
  CODE_REVIEW_SUFFICIENT: 'Current code review practices are sufficient',
  
  // Innovation propositions
  INNOVATION_DRIVES_SUCCESS: 'Innovation is the primary driver of long-term success',
  STABILITY_PREFERRED: 'Stability and reliability should be prioritized over innovation',
  DISRUPTIVE_CHANGE_NEEDED: 'Disruptive change is necessary to remain competitive'
};

// ==========================================================================
// CONTEXT FIXTURES
// ==========================================================================

export const createTestAgentContext = (
  id: string = 'test_agent',
  name: string = 'Test Agent',
  goals?: Goal[]
): AgentContext => ({
  id,
  name,
  currentGoals: goals,
  metadata: { testData: true }
});

export const createTestDebateContext = (
  topic: string = TEST_PROPOSITIONS.STANDARDIZED_TESTING_BENEFICIAL,
  position: 'pro' | 'con' | 'judge' | 'moderator' = 'pro'
): DebateContext => ({
  topic,
  position,
  currentArguments: [
    'Standardized tests provide a common yardstick for evaluating student performance',
    'They help identify achievement gaps that need to be addressed'
  ],
  opponentArguments: [
    'Standardized tests reflect socioeconomic disparities rather than ability',
    'They lead to teaching to the test, narrowing curriculum'
  ],
  metadata: { testData: true }
});

export const createTestConfidenceUpdateContext = (
  evidenceWeights: number[] = [0.8, 0.6, 0.7],
  evidenceConfidences: number[] = [0.9, 0.5, 0.8],
  sourceTrusts?: number[],
  sensitivity?: number
): ConfidenceUpdateContext => ({
  evidenceWeights,
  evidenceConfidences,
  sourceTrusts,
  sensitivity,
  metadata: { testData: true }
});

export const TEST_CONTEXTS = {
  EFFICIENCY_AGENT: createTestAgentContext('efficiency_agent', 'Efficiency Agent'),
  THOROUGHNESS_AGENT: createTestAgentContext('thoroughness_agent', 'Thoroughness Agent'),
  SECURITY_AGENT: createTestAgentContext('security_agent', 'Security Agent'),
  
  PRO_DEBATE: createTestDebateContext(TEST_PROPOSITIONS.STANDARDIZED_TESTING_BENEFICIAL, 'pro'),
  CON_DEBATE: createTestDebateContext(TEST_PROPOSITIONS.STANDARDIZED_TESTING_BENEFICIAL, 'con'),
  JUDGE_DEBATE: createTestDebateContext(TEST_PROPOSITIONS.STANDARDIZED_TESTING_BENEFICIAL, 'judge'),
  
  HIGH_WEIGHT_UPDATE: createTestConfidenceUpdateContext([0.9, 0.8, 0.7], [0.9, 0.8, 0.7]),
  LOW_WEIGHT_UPDATE: createTestConfidenceUpdateContext([0.3, 0.2, 0.1], [0.6, 0.5, 0.4]),
  MIXED_UPDATE: createTestConfidenceUpdateContext([0.8, 0.2, 0.7], [0.9, 0.3, 0.8])
};

// ==========================================================================
// PERCEPTION AND GOAL FIXTURES
// ==========================================================================

// Note: Perception and Goal creation functions removed due to constructor complexity
// Use the concrete classes directly in tests when needed

// TEST_PERCEPTIONS and TEST_GOALS removed due to constructor complexity
// Create these directly in tests when needed

// ==========================================================================
// MATHEMATICAL TEST DATA
// ==========================================================================

export const MATHEMATICAL_TEST_CASES = {
  // Frame-weighted update test cases
  FRAME_WEIGHTED_CASES: [
    {
      name: 'High weight, high confidence evidence',
      currentConfidence: 0.5,
      evidenceWeight: 0.8,
      evidenceConfidence: 0.9,
      expectedResult: 0.5 * (1 - 0.8) + 0.9 * 0.8 // = 0.1 + 0.72 = 0.82
    },
    {
      name: 'Low weight, high confidence evidence',
      currentConfidence: 0.6,
      evidenceWeight: 0.2,
      evidenceConfidence: 0.9,
      expectedResult: 0.6 * (1 - 0.2) + 0.9 * 0.2 // = 0.48 + 0.18 = 0.66
    },
    {
      name: 'High weight, low confidence evidence',
      currentConfidence: 0.7,
      evidenceWeight: 0.8,
      evidenceConfidence: 0.2,
      expectedResult: 0.7 * (1 - 0.8) + 0.2 * 0.8 // = 0.14 + 0.16 = 0.30
    }
  ],
  
  // Source-trust update test cases
  SOURCE_TRUST_CASES: [
    {
      name: 'High sensitivity, high trust',
      currentConfidence: 0.5,
      sensitivity: 0.8,
      sourceTrust: 0.9,
      expectedResult: 0.5 * (1 - 0.8) + 0.9 * 0.8 // = 0.1 + 0.72 = 0.82
    },
    {
      name: 'Low sensitivity, low trust',
      currentConfidence: 0.6,
      sensitivity: 0.2,
      sourceTrust: 0.3,
      expectedResult: 0.6 * (1 - 0.2) + 0.3 * 0.2 // = 0.48 + 0.06 = 0.54
    }
  ],
  
  // Bayesian update test cases
  BAYESIAN_CASES: [
    {
      name: 'Strong supporting evidence',
      currentConfidence: 0.5,
      evidenceGivenP: 0.8,
      evidenceGivenNotP: 0.2,
      expectedResult: (0.8 * 0.5) / (0.8 * 0.5 + 0.2 * 0.5) // = 0.4 / 0.5 = 0.8
    },
    {
      name: 'Strong contradicting evidence',
      currentConfidence: 0.7,
      evidenceGivenP: 0.2,
      evidenceGivenNotP: 0.8,
      expectedResult: (0.2 * 0.7) / (0.2 * 0.7 + 0.8 * 0.3) // = 0.14 / 0.38 ≈ 0.368
    }
  ],
  
  // Compatibility test cases
  COMPATIBILITY_CASES: [
    {
      frame1: 'efficiency',
      frame2: 'efficiency',
      expectedCompatibility: 0.95
    },
    {
      frame1: 'efficiency',
      frame2: 'thoroughness',
      expectedCompatibility: 0.3
    },
    {
      frame1: 'pro-debater',
      frame2: 'con-debater',
      expectedCompatibility: 0.2
    },
    {
      frame1: 'judge',
      frame2: 'moderator',
      expectedCompatibility: 0.8
    }
  ]
};

// ==========================================================================
// ERROR TEST CASES
// ==========================================================================

export const ERROR_TEST_CASES = {
  INVALID_CONFIDENCE_VALUES: [-0.1, 1.1, NaN, Infinity, -Infinity],
  INVALID_WEIGHT_VALUES: [-0.5, 1.5, NaN, Infinity],
  EMPTY_EVIDENCE_ARRAYS: [[], null, undefined],
  MALFORMED_EVIDENCE: [
    { /* missing required fields */ },
    { id: 'test', /* missing type */ },
    { type: 'test', /* missing id */ }
  ]
};

// ==========================================================================
// PERFORMANCE TEST DATA
// ==========================================================================

export const PERFORMANCE_TEST_DATA = {
  LARGE_EVIDENCE_SET: Array.from({ length: 100 }, (_, i) =>
    createTestEvidence(`Evidence content ${i}`, `source_${i % 5}`)
  ),

  COMPLEX_JUSTIFICATION: createTestJustification(
    Array.from({ length: 50 }, (_, i) =>
      createTestEvidence(`Complex evidence ${i}`, `complex_source_${i}`)
    )
  ),

  MANY_PROPOSITIONS: Array.from({ length: 20 }, (_, i) =>
    `Test proposition ${i} with various complexity levels`
  )
};

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Create a set of evidence with specific types and confidences
 */
export function createEvidenceSet(
  types: string[],
  baseContent: string = 'Test evidence'
): JustificationElement[] {
  return types.map((type, index) =>
    createTestEvidence(
      `${baseContent} for ${type}`,
      `source_${index}`
    )
  );
}

/**
 * Create a confidence update context with specific parameters
 */
export function createUpdateContext(
  weights: number[],
  confidences: number[],
  options: Partial<ConfidenceUpdateContext> = {}
): ConfidenceUpdateContext {
  return {
    evidenceWeights: weights,
    evidenceConfidences: confidences,
    ...options
  };
}

/**
 * Generate test data for specific frame types
 */
export function generateFrameTestData(frameType: string): {
  evidence: JustificationElement[];
  propositions: string[];
  contexts: Record<string, any>;
} {
  const frameSpecificData: Record<string, any> = {
    efficiency: {
      evidence: [TEST_EVIDENCE.PERFORMANCE_POSITIVE, TEST_EVIDENCE.SPEED_IMPROVEMENT],
      propositions: [TEST_PROPOSITIONS.EFFICIENCY_IS_OPTIMAL, TEST_PROPOSITIONS.PERFORMANCE_OPTIMIZATION_NEEDED],
      contexts: { focus: 'performance', priority: 'speed' }
    },
    thoroughness: {
      evidence: [TEST_EVIDENCE.DETAILED_ANALYSIS, TEST_EVIDENCE.THOROUGH_REVIEW],
      propositions: [TEST_PROPOSITIONS.THOROUGHNESS_IS_OPTIMAL, TEST_PROPOSITIONS.CODE_REVIEW_SUFFICIENT],
      contexts: { focus: 'completeness', priority: 'quality' }
    },
    security: {
      evidence: [TEST_EVIDENCE.SECURITY_VULNERABILITY, TEST_EVIDENCE.RISK_ASSESSMENT],
      propositions: [TEST_PROPOSITIONS.SECURITY_IS_OPTIMAL, TEST_PROPOSITIONS.SECURITY_AUDIT_REQUIRED],
      contexts: { focus: 'safety', priority: 'risk_mitigation' }
    }
  };

  return frameSpecificData[frameType] || {
    evidence: [TEST_EVIDENCE.AGENT_MESSAGE],
    propositions: [TEST_PROPOSITIONS.BALANCED_APPROACH_OPTIMAL],
    contexts: { focus: 'general', priority: 'balanced' }
  };
}
