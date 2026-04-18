/**
 * Tests for MockLLMClient. This mock is the recommended way to exercise agent
 * flow in tests without hitting a network.
 */
import { describe, it, expect } from 'vitest';
import { MockLLMClient } from '../../../src/llm/mock-llm-client';
import { MockGeminiClient } from '../../../src/llm/mock-gemini-client';
import {
  EfficiencyFrame,
  SecurityFrame,
  ThoroughnessFrame,
} from '../../../src/epistemic/frame';
import { Goal } from '../../../src/action/goal';
import { Belief } from '../../../src/epistemic/belief';
import { ExternalJustificationElement } from '../../../src/epistemic/justification';
import { Tool } from '../../../src/action/tool';
import { Capability } from '../../../src/action/capability';
import { UseTool } from '../../../src/action/action';

function mkTool(id: string): Tool {
  return {
    id,
    name: id,
    description: 'test tool',
    capabilities: new Set<Capability>(),
  } as unknown as Tool;
}

describe('MockLLMClient', () => {
  it('returns default score 0.6 for judge methods', async () => {
    const c = new MockLLMClient();
    const el = new ExternalJustificationElement('x', 'y');
    expect(await c.judgeEvidenceStrength(el, 'p')).toBe(0.6);
    expect(
      await c.judgeEvidenceSaliencyForFrame(el, new EfficiencyFrame(), 'p', 'n', 'c'),
    ).toBe(0.6);
    expect(await c.judgeSourceTrust('src', new EfficiencyFrame())).toBe(0.6);
  });

  it('honours explicit overrides', async () => {
    const c = new MockLLMClient({
      strengthByProposition: { p: 0.95 },
      trustBySource: { src: 0.1 },
      saliencyByFrame: { Security: 0.88 },
      defaultScore: 0.1,
    });
    const el = new ExternalJustificationElement('src', 'y');
    expect(await c.judgeEvidenceStrength(el, 'p')).toBe(0.95);
    expect(await c.judgeSourceTrust('src', new EfficiencyFrame())).toBe(0.1);
    expect(
      await c.judgeEvidenceSaliencyForFrame(el, new SecurityFrame(), 'p', 'n', 'c'),
    ).toBe(0.88);
  });

  it('returns frame-specific default propositions', async () => {
    const c = new MockLLMClient();
    const props = await c.extractRelevantPropositions('x', new ThoroughnessFrame());
    expect(props).toContain('AllCasesAreCovered');
  });

  it('plans by wrapping each available tool in a UseTool action', async () => {
    const c = new MockLLMClient();
    const tools = [mkTool('t1'), mkTool('t2')];
    const plan = await c.generatePlan(
      new Goal('state_change', 'do', 0.5),
      [],
      tools,
      new EfficiencyFrame(),
    );
    expect(plan).not.toBeNull();
    expect(plan!).toHaveLength(2);
    expect(plan![0]).toBeInstanceOf(UseTool);
  });

  it('returns null when planWithAllTools is disabled', async () => {
    const c = new MockLLMClient({ planWithAllTools: false });
    const plan = await c.generatePlan(
      new Goal('state_change', 'do', 0.5),
      [],
      [mkTool('t1')],
      new EfficiencyFrame(),
    );
    expect(plan).toBeNull();
  });

  it('throws when shouldThrow is set', async () => {
    const c = new MockLLMClient({ shouldThrow: true });
    await expect(
      c.judgeSourceTrust('src', new EfficiencyFrame()),
    ).rejects.toThrowError();
  });

  it('tracks call counts for each method', async () => {
    const c = new MockLLMClient();
    await c.extractRelevantPropositions('x', new EfficiencyFrame());
    await c.extractRelevantPropositions('y', new EfficiencyFrame());
    expect(c.calls.extractRelevantPropositions).toBe(2);
  });

  it('surfaces domain-extension helpers used by the Agent', async () => {
    const c = new MockLLMClient();
    expect(await c.extractFactualPropositions('content')).toEqual([
      'MockFactualProposition',
    ]);
    expect(await c.scorePropositionRelevance('p', 'c')).toBe(0.6);
    expect(await c.extractDebateTopicFromContext('...')).toBe(
      'Mock debate topic',
    );
  });

  it('is structurally compatible with the interpretPerceptionData contract', async () => {
    const c = new MockLLMClient();
    const result = (await c.interpretPerceptionData(
      { kind: 'sensor', value: 42 },
      new EfficiencyFrame(),
      'a',
      'b',
    )) as { interpretation?: string };
    expect(result.interpretation).toContain('Efficiency');
  });

  it('simulates latency when configured', async () => {
    const c = new MockLLMClient({ latencyMs: 20 });
    const start = Date.now();
    await c.judgeSourceTrust('src', new EfficiencyFrame());
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('MockGeminiClient is a drop-in for MockLLMClient', () => {
    expect(new MockGeminiClient()).toBeInstanceOf(MockLLMClient);
  });

  it('handles Belief passthrough in generatePlan', async () => {
    const c = new MockLLMClient();
    const plan = await c.generatePlan(
      new Goal('state_change', 'do', 0.5),
      [new Belief('p', 0.5)],
      [mkTool('t1')],
      new EfficiencyFrame(),
    );
    expect(plan).toHaveLength(1);
  });
});
