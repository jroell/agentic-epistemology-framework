/**
 * AiSdkClient unit tests.
 *
 * Exercises every LLMClient surface method with a Vercel AI SDK
 * MockLanguageModelV2 so nothing depends on network or API keys.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MockLanguageModelV2 } from 'ai/test';
import type { LanguageModelV2Content, LanguageModelV2Usage } from '@ai-sdk/provider';

import { AiSdkClient } from '../../../src/llm/ai-sdk-client';
import {
  ExternalJustificationElement,
  InternalReasoningJustificationElement,
} from '../../../src/epistemic/justification';
import { EfficiencyFrame, SecurityFrame } from '../../../src/epistemic/frame';
import { Goal } from '../../../src/action/goal';
import { Belief } from '../../../src/epistemic/belief';
import { Tool } from '../../../src/action/tool';
import { Capability } from '../../../src/action/capability';
import { UseTool } from '../../../src/action/action';
import { SchemaType } from '../../../src/action/tools/schema-types';

const ZERO_USAGE: LanguageModelV2Usage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

function textReply(text: string) {
  return async () => ({
    content: [{ type: 'text', text }] satisfies LanguageModelV2Content[],
    finishReason: 'stop' as const,
    usage: ZERO_USAGE,
    warnings: [],
  });
}

function toolCallReply(
  calls: Array<{ toolName: string; input: Record<string, unknown> }>,
) {
  // Track how many times the model has been called. On the first call, emit
  // the tool-call content; on subsequent calls (follow-up steps after tool
  // execution), emit a terminal text chunk so the agent loop stops. This
  // mirrors real provider behaviour when `toolChoice: 'required'` is used.
  let calledOnce = false;
  return async () => {
    if (!calledOnce) {
      calledOnce = true;
      return {
        content: calls.map((c, i) => ({
          type: 'tool-call' as const,
          toolCallId: `tc-${i}`,
          toolName: c.toolName,
          input: JSON.stringify(c.input),
        })) satisfies LanguageModelV2Content[],
        finishReason: 'tool-calls' as const,
        usage: ZERO_USAGE,
        warnings: [],
      };
    }
    return {
      content: [{ type: 'text', text: 'done' }] satisfies LanguageModelV2Content[],
      finishReason: 'stop' as const,
      usage: ZERO_USAGE,
      warnings: [],
    };
  };
}

function errorReply(message = 'boom') {
  return async () => {
    throw new Error(message);
  };
}

function mkJustificationElement(content: string) {
  // ExternalJustificationElement is a reasonable JustificationElement stand-in.
  return new ExternalJustificationElement('sensor-1', content);
}

function mkTool(id: string, name = 'Tool'): Tool {
  return {
    id,
    name,
    description: `${name} description`,
    capabilities: new Set<Capability>(),
    parameterSchema: {
      type: SchemaType.OBJECT,
      properties: {
        value: { type: SchemaType.STRING, description: 'input value' },
      },
      required: ['value'],
    },
  } as unknown as Tool;
}

describe('AiSdkClient', () => {
  let frame: EfficiencyFrame;

  beforeEach(() => {
    frame = new EfficiencyFrame();
  });

  describe('construction', () => {
    it('throws when no model is provided', () => {
      // @ts-expect-error intentional misuse
      expect(() => new AiSdkClient({})).toThrowError();
    });

    it('exposes providerId and modelId from the underlying model', () => {
      const model = new MockLanguageModelV2({
        provider: 'mock',
        modelId: 'unit-test-model',
        doGenerate: textReply('hi'),
      });
      const client = new AiSdkClient({ model, silent: true });
      expect(client.providerId).toBe('mock');
      expect(client.modelId).toBe('unit-test-model');
    });
  });

  describe('interpretPerceptionData', () => {
    it('returns the model text when given object data', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply('I see a pattern of slow requests.'),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.interpretPerceptionData(
        { metric: 'latency', value: 1200 },
        frame,
        'agent-1',
        'Scout',
      );
      expect(result).toBe('I see a pattern of slow requests.');
    });

    it('falls back to a stringified uninterpreted value on empty text', async () => {
      const model = new MockLanguageModelV2({ doGenerate: textReply('') });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.interpretPerceptionData(
        'raw',
        frame,
        'agent-1',
        'Scout',
      );
      expect(result).toContain('Uninterpreted data');
    });

    it('falls back on model errors', async () => {
      const model = new MockLanguageModelV2({ doGenerate: errorReply() });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.interpretPerceptionData(
        'raw',
        frame,
        'agent-1',
        'Scout',
      );
      expect(result).toContain('Uninterpreted data');
    });
  });

  describe('extractRelevantPropositions', () => {
    it('returns a deduped, trimmed list from structured output', async () => {
      const payload = {
        propositions: [' SystemIsFast ', 'ReducesCosts', 'IsScalable'],
      };
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify(payload)),
      });
      const client = new AiSdkClient({ model, silent: true });
      const props = await client.extractRelevantPropositions(
        'input text',
        frame,
      );
      expect(props).toEqual(['SystemIsFast', 'ReducesCosts', 'IsScalable']);
    });

    it('returns an empty array when the model errors', async () => {
      const model = new MockLanguageModelV2({ doGenerate: errorReply() });
      const client = new AiSdkClient({ model, silent: true });
      const props = await client.extractRelevantPropositions('x', frame);
      expect(props).toEqual([]);
    });
  });

  describe('judgeEvidenceStrength', () => {
    it('clamps scores into [0, 1]', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify({ score: 0.73 })),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.judgeEvidenceStrength(
        mkJustificationElement('benchmark ok'),
        'SystemIsFast',
      );
      expect(result).toBeCloseTo(0.73);
    });

    it('returns neutral 0.5 when the model fails', async () => {
      const model = new MockLanguageModelV2({ doGenerate: errorReply() });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.judgeEvidenceStrength(
        mkJustificationElement('x'),
        'y',
      );
      expect(result).toBe(0.5);
    });
  });

  describe('judgeEvidenceSaliencyForFrame', () => {
    it('returns the model score', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify({ score: 0.91 })),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.judgeEvidenceSaliencyForFrame(
        mkJustificationElement('edge case'),
        new SecurityFrame(),
        'SystemIsSecure',
        'Scout',
        'routine-audit',
      );
      expect(result).toBeCloseTo(0.91);
    });
  });

  describe('judgeSourceTrust', () => {
    it('returns the model score', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify({ score: 0.42 })),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.judgeSourceTrust('sensor-42', frame);
      expect(result).toBeCloseTo(0.42);
    });
  });

  describe('scorePropositionRelevance', () => {
    it('returns the model score', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify({ score: 0.33 })),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.scorePropositionRelevance('p', 'c');
      expect(result).toBeCloseTo(0.33);
    });
  });

  describe('extractFactualPropositions', () => {
    it('returns propositions from structured output', async () => {
      const payload = {
        propositions: ['FactA', 'FactB'],
      };
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify(payload)),
      });
      const client = new AiSdkClient({ model, silent: true });
      const props = await client.extractFactualPropositions('content', 'ctx', 'a-1', 'Scout');
      expect(props).toEqual(['FactA', 'FactB']);
    });
  });

  describe('extractDebateTopicFromContext', () => {
    it('returns the model text', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply('Renewable energy subsidies'),
      });
      const client = new AiSdkClient({ model, silent: true });
      const topic = await client.extractDebateTopicFromContext(
        'We are arguing about...',
      );
      expect(topic).toBe('Renewable energy subsidies');
    });

    it('returns a sensible fallback on empty response', async () => {
      const model = new MockLanguageModelV2({ doGenerate: textReply('') });
      const client = new AiSdkClient({ model, silent: true });
      const topic = await client.extractDebateTopicFromContext('no context');
      expect(topic).toBe('Generic context');
    });
  });

  describe('generatePlan', () => {
    it('returns null when no tools are available', async () => {
      const model = new MockLanguageModelV2({ doGenerate: textReply('') });
      const client = new AiSdkClient({ model, silent: true });
      const plan = await client.generatePlan(
        new Goal('information_gathering', 'collect data', 0.8),
        [],
        [],
        frame,
      );
      expect(plan).toBeNull();
    });

    it('produces UseTool actions from tool-call output', async () => {
      const t = mkTool('tool-alpha', 'Alpha');
      const model = new MockLanguageModelV2({
        doGenerate: toolCallReply([
          { toolName: 'tool-alpha', input: { value: 'hello' } },
        ]),
      });
      const client = new AiSdkClient({ model, silent: true });
      const goal = new Goal('information_gathering', 'do thing', 0.5);
      const plan = await client.generatePlan(goal, [], [t], frame);
      expect(plan).not.toBeNull();
      expect(plan!).toHaveLength(1);
      expect(plan![0]).toBeInstanceOf(UseTool);
    });

    it('returns null when the model errors', async () => {
      const t = mkTool('tool-alpha');
      const model = new MockLanguageModelV2({ doGenerate: errorReply() });
      const client = new AiSdkClient({ model, silent: true });
      const plan = await client.generatePlan(
        new Goal('information_gathering', 'do thing', 0.5),
        [],
        [t],
        frame,
      );
      expect(plan).toBeNull();
    });

    it('uses existing beliefs in the prompt path without error', async () => {
      const t = mkTool('tool-beta');
      const beliefs = [
        new Belief('ServerIsSlow', 0.8),
        new Belief('UsersAreFrustrated', 0.65),
      ];
      const model = new MockLanguageModelV2({
        doGenerate: toolCallReply([
          { toolName: 'tool-beta', input: { value: 'tune' } },
        ]),
      });
      const client = new AiSdkClient({ model, silent: true });
      const plan = await client.generatePlan(
        new Goal('state_change', 'tune the server', 0.9),
        beliefs,
        [t],
        frame,
      );
      expect(plan).not.toBeNull();
      expect(plan!).toHaveLength(1);
    });
  });

  describe('call()', () => {
    it('returns trimmed model text', async () => {
      const model = new MockLanguageModelV2({
        doGenerate: textReply('  hello world  '),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.call({ prompt: 'hi' });
      expect(result.response).toBe('hello world');
    });

    it('returns empty string on error', async () => {
      const model = new MockLanguageModelV2({ doGenerate: errorReply() });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.call({ prompt: 'hi' });
      expect(result.response).toBe('');
    });
  });

  describe('InternalReasoningJustificationElement evidence', () => {
    it('handles non-string evidence content in judgeEvidenceStrength', async () => {
      const element = new InternalReasoningJustificationElement(
        'agent-1',
        { hypothesis: 'compute bound', weight: 0.7 },
      );
      const model = new MockLanguageModelV2({
        doGenerate: textReply(JSON.stringify({ score: 0.8 })),
      });
      const client = new AiSdkClient({ model, silent: true });
      const result = await client.judgeEvidenceStrength(element, 'ServerIsSlow');
      expect(result).toBeCloseTo(0.8);
    });
  });
});
