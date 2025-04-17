import { EfficiencyFrame, ThoroughnessFrame, SecurityFrame, FrameFactory } from './frame';
import { clampConfidence } from '../types/common';
import { Justification, ToolResultJustificationElement } from './justification';

// Mock Evidence implementation for testing
class MockEvidence {
  constructor(public type: string, private conf: number) {}
  getConfidence(): number { return this.conf; }
}

// Mock GeminiClient for testing
const mockGeminiClient = {
  interpretPerceptionData: jest.fn().mockResolvedValue({ data: 'interpreted data' }),
  extractRelevantPropositions: jest.fn().mockResolvedValue(['P1', 'P2']),
  judgeEvidenceStrength: jest.fn().mockResolvedValue(0.7),
  judgeEvidenceSaliency: jest.fn().mockResolvedValue(0.8),
  judgeSourceTrust: jest.fn().mockResolvedValue(0.6),
  generatePlan: jest.fn()
};

describe('Frame.updateConfidence', () => {
  it('EfficiencyFrame applies performance weight correctly', async () => {
    const frame = new EfficiencyFrame();
    const oldConfidence = 0.5;
    const mockElement = {
      type: 'performance',
      id: 'test',
      source: 'test',
      content: {},
      timestamp: Date.now(),
      getConfidence: () => 1.0
    };
    
    const mockJustification = new Justification([]);
    const newConfidence = await frame.updateConfidence('P', oldConfidence, mockJustification, [mockElement as any]);
    
    // Using weightPerformance = 0.8
    const expectedConfidence = (1 - 0.8) * oldConfidence + 0.8 * 1.0;
    expect(newConfidence).toBeCloseTo(expectedConfidence);
  });

  it('ThoroughnessFrame applies detail weight correctly', async () => {
    const frame = new ThoroughnessFrame();
    const oldConfidence = 0.2;
    const mockElement = {
      type: 'detailed',
      id: 'test',
      source: 'test',
      content: {},
      timestamp: Date.now(),
      getConfidence: () => 0.9
    };
    
    const mockJustification = new Justification([]);
    const newConfidence = await frame.updateConfidence('P', oldConfidence, mockJustification, [mockElement as any]);
    
    // Using weightDetail = 0.8
    const expectedConfidence = (1 - 0.8) * oldConfidence + 0.8 * 0.9;
    expect(newConfidence).toBeCloseTo(expectedConfidence);
  });

  it('SecurityFrame applies security weight correctly', async () => {
    const frame = new SecurityFrame();
    const oldConfidence = 0.4;
    const mockElement = {
      type: 'security',
      id: 'test',
      source: 'test',
      content: {},
      timestamp: Date.now(),
      getConfidence: () => 0.6
    };
    
    const mockJustification = new Justification([]);
    const newConfidence = await frame.updateConfidence('P', oldConfidence, mockJustification, [mockElement as any]);
    
    // Using weightSecurity = 0.8
    const expectedConfidence = (1 - 0.8) * oldConfidence + 0.8 * 0.6;
    expect(newConfidence).toBeCloseTo(expectedConfidence);
  });
});

describe('Frame interface methods', () => {
  it('interpretPerception returns a processed perception', async () => {
    const frame = new EfficiencyFrame();
    // Create a mock perception that matches the BaseFrame implementation
    const mockPerception = { 
      data: 'original data', 
      getContextualElements: jest.fn(),
      getJustificationElements: jest.fn()
    };
    
    // Reset the mock before this test
    mockGeminiClient.interpretPerceptionData.mockClear();
    mockGeminiClient.interpretPerceptionData.mockResolvedValue('interpreted data');
    
    const result = await frame.interpretPerception(mockPerception as any, mockGeminiClient as any);
    
    expect(mockGeminiClient.interpretPerceptionData).toHaveBeenCalled();
    expect(result.data).toBe('interpreted data');
  });

  it('getRelevantPropositions extracts propositions', async () => {
    const frame = new ThoroughnessFrame();
    const mockGoal = { description: 'test goal' };
    
    // Reset the mock before this test
    mockGeminiClient.extractRelevantPropositions.mockClear();
    
    const result = await frame.getRelevantPropositions(mockGoal as any, mockGeminiClient as any);
    
    expect(mockGeminiClient.extractRelevantPropositions).toHaveBeenCalled();
    expect(result).toEqual(['P1', 'P2']);
  });

  it('getCompatibility returns correct values between frame types', () => {
    const efficiency = new EfficiencyFrame();
    const thoroughness = new ThoroughnessFrame();
    const security = new SecurityFrame();
    
    // Self-compatibility
    expect(efficiency.getCompatibility(efficiency)).toBe(0.9);
    expect(thoroughness.getCompatibility(thoroughness)).toBe(0.9);
    expect(security.getCompatibility(security)).toBe(0.9);
    
    // Cross-compatibility
    expect(efficiency.getCompatibility(thoroughness)).toBe(0.3);
    expect(efficiency.getCompatibility(security)).toBe(0.5);
    expect(thoroughness.getCompatibility(efficiency)).toBe(0.3);
    expect(thoroughness.getCompatibility(security)).toBe(0.7);
    expect(security.getCompatibility(efficiency)).toBe(0.5);
    expect(security.getCompatibility(thoroughness)).toBe(0.7);
  });
});

describe('FrameFactory', () => {
  it('creates frames of the correct type', () => {
    expect(FrameFactory.create('efficiency')).toBeInstanceOf(EfficiencyFrame);
    expect(FrameFactory.create('thoroughness')).toBeInstanceOf(ThoroughnessFrame);
    expect(FrameFactory.create('security')).toBeInstanceOf(SecurityFrame);
  });
  
  it('throws an error for unknown frame type', () => {
    expect(() => FrameFactory.create('unknown')).toThrow('Unknown frame: unknown');
  });
  
  it('returns the available frame types', () => {
    expect(FrameFactory.available()).toEqual(['efficiency', 'thoroughness', 'security']);
  });
});
