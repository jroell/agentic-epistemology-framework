/**
 * MockLLMClient - in-memory implementation for testing and offline development.
 *
 * No network calls. Responses are deterministic and configurable. Prefer this
 * over the deprecated MockGeminiClient in new code.
 */
import type { LLMClient } from './llm-client';
import type { Frame } from '../epistemic/frame';
import type { Belief } from '../epistemic/belief';
import type { Goal } from '../action/goal';
import type { JustificationElement } from '../epistemic/justification';
import type { Tool } from '../action/tool';
import { Action, UseTool } from '../action/action';

export interface MockLLMClientOptions {
  /** Default score returned by judge* methods when no override matches. */
  defaultScore?: number;
  /** Optional deterministic override for evidence strength, keyed by proposition. */
  strengthByProposition?: Record<string, number>;
  /** Optional deterministic override for source trust, keyed by source. */
  trustBySource?: Record<string, number>;
  /** Optional deterministic override for saliency, keyed by frame name. */
  saliencyByFrame?: Record<string, number>;
  /** Optional deterministic propositions per frame name. */
  propositionsByFrame?: Record<string, string[]>;
  /** If true, invoke every available tool once during generatePlan. */
  planWithAllTools?: boolean;
  /** Throw from every method when set. Useful for error-path tests. */
  shouldThrow?: boolean;
  /** Simulated latency in ms. */
  latencyMs?: number;
}

export class MockLLMClient implements LLMClient {
  private readonly opts: Required<MockLLMClientOptions>;
  readonly calls: Record<string, number> = {};

  constructor(options: MockLLMClientOptions = {}) {
    this.opts = {
      defaultScore: options.defaultScore ?? 0.6,
      strengthByProposition: options.strengthByProposition ?? {},
      trustBySource: options.trustBySource ?? {},
      saliencyByFrame: options.saliencyByFrame ?? {},
      propositionsByFrame: options.propositionsByFrame ?? {
        Efficiency: [
          'SystemPerformanceIsOptimal',
          'FastResponseTimeIsAchieved',
          'ResourceUtilizationIsEfficient',
        ],
        Thoroughness: [
          'AllCasesAreCovered',
          'TestingIsComprehensive',
          'DocumentationIsComplete',
        ],
        Security: [
          'SystemIsSecureAgainstThreats',
          'DataIsProtected',
          'AccessControlsAreEffective',
        ],
      },
      planWithAllTools: options.planWithAllTools ?? true,
      shouldThrow: options.shouldThrow ?? false,
      latencyMs: options.latencyMs ?? 0,
    };
  }

  private bump(name: string): void {
    this.calls[name] = (this.calls[name] ?? 0) + 1;
  }

  private async wait(): Promise<void> {
    if (this.opts.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.opts.latencyMs));
    }
    if (this.opts.shouldThrow) {
      throw new Error('MockLLMClient configured to throw');
    }
  }

  async interpretPerceptionData(
    data: unknown,
    frame: Frame,
    _agentId: string,
    _agentName: string,
  ): Promise<unknown> {
    this.bump('interpretPerceptionData');
    await this.wait();
    return typeof data === 'object' && data !== null
      ? { ...(data as object), interpretation: `Interpreted through ${frame.name} frame` }
      : `[${frame.name}] ${String(data)}`;
  }

  async extractRelevantPropositions(
    _content: unknown,
    frame: Frame,
  ): Promise<string[]> {
    this.bump('extractRelevantPropositions');
    await this.wait();
    return this.opts.propositionsByFrame[frame.name] ?? [
      'DefaultProposition1',
      'DefaultProposition2',
    ];
  }

  async judgeEvidenceStrength(
    _element: JustificationElement,
    proposition: string,
  ): Promise<number> {
    this.bump('judgeEvidenceStrength');
    await this.wait();
    return this.opts.strengthByProposition[proposition] ?? this.opts.defaultScore;
  }

  async judgeEvidenceSaliencyForFrame(
    _element: JustificationElement,
    frame: Frame,
  ): Promise<number> {
    this.bump('judgeEvidenceSaliencyForFrame');
    await this.wait();
    return this.opts.saliencyByFrame[frame.name] ?? this.opts.defaultScore;
  }

  async judgeSourceTrust(source: string): Promise<number> {
    this.bump('judgeSourceTrust');
    await this.wait();
    return this.opts.trustBySource[source] ?? this.opts.defaultScore;
  }

  async generatePlan(
    _goal: Goal,
    _beliefs: Belief[],
    availableTools: Tool[],
  ): Promise<Action[] | null> {
    this.bump('generatePlan');
    await this.wait();
    if (!this.opts.planWithAllTools || availableTools.length === 0) {
      return null;
    }
    return availableTools.map((t) => new UseTool(t, {}));
  }

  // Extended helpers consumed by agent.ts. Mirrors AiSdkClient's surface so tests
  // can swap them freely.
  async extractFactualPropositions(
    _content: unknown,
    _context?: string,
  ): Promise<string[]> {
    this.bump('extractFactualPropositions');
    await this.wait();
    return ['MockFactualProposition'];
  }

  async scorePropositionRelevance(
    _proposition: string,
    _context: string,
  ): Promise<number> {
    this.bump('scorePropositionRelevance');
    await this.wait();
    return this.opts.defaultScore;
  }

  async extractDebateTopicFromContext(_contextStr: string): Promise<string> {
    this.bump('extractDebateTopicFromContext');
    await this.wait();
    return 'Mock debate topic';
  }
}
