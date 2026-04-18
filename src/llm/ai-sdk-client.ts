/**
 * AiSdkClient
 *
 * Provider-agnostic implementation of LLMClient that talks through the
 * Vercel AI SDK. Plug in any provider (OpenRouter, OpenAI, Anthropic, Google,
 * or a local gateway) and the rest of the framework keeps working.
 *
 * The client uses:
 *   - generateObject + zod for structured score outputs (strength, saliency, trust)
 *   - generateText for prose (interpretation, proposition extraction)
 *   - generateText with tool-calls for plan generation
 */
import { generateText, generateObject, tool, stepCountIs } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { z } from 'zod';

import type { LLMClient } from './llm-client';
import type { Frame } from '../epistemic/frame';
import type { Belief } from '../epistemic/belief';
import type { Goal } from '../action/goal';
import type { JustificationElement } from '../epistemic/justification';
import { Action, UseTool } from '../action/action';
import type { Tool as AefTool } from '../action/tool';
import type { EntityId } from '../types/common';
import { displayMessage, COLORS, createBox } from '../core/cli-formatter';

/**
 * Options for AiSdkClient.
 */
export interface AiSdkClientOptions {
  /** The AI SDK language model to use. Build one with createLanguageModel(). */
  model: LanguageModelV2;
  /** Optional: temperature (default 0.2 for deterministic scoring). */
  temperature?: number;
  /** Optional: max output tokens (default 800). */
  maxOutputTokens?: number;
  /** Optional: abort signal propagated to every call. */
  abortSignal?: AbortSignal;
  /** Optional: disable pretty logs. Default false. */
  silent?: boolean;
}

const SCORE_SCHEMA = z.object({
  score: z.number().min(0).max(1).describe('A floating point score between 0.0 and 1.0.'),
});

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Default confidence returned when the LLM errors. Chosen to be neutral so
 * belief dynamics do not lean any direction on a single failure.
 */
const DEFAULT_NEUTRAL = 0.5;

export class AiSdkClient implements LLMClient {
  private readonly model: LanguageModelV2;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly abortSignal?: AbortSignal;
  private readonly silent: boolean;

  constructor(opts: AiSdkClientOptions) {
    if (!opts?.model) {
      throw new Error(
        'AiSdkClient requires a LanguageModel. Use createLanguageModel() to build one.',
      );
    }
    this.model = opts.model;
    this.temperature = opts.temperature ?? 0.2;
    this.maxOutputTokens = opts.maxOutputTokens ?? 800;
    this.abortSignal = opts.abortSignal;
    this.silent = opts.silent ?? false;
  }

  /** Public metadata helpers. */
  get providerId(): string {
    return this.model.provider;
  }

  get modelId(): string {
    return this.model.modelId;
  }

  private log(category: string, msg: string, colorFn: (s: string) => string): void {
    if (this.silent) return;
    displayMessage(category, msg, colorFn);
  }

  /**
   * Structured 0..1 scoring via generateObject. Falls back to DEFAULT_NEUTRAL on any error.
   */
  private async score(prompt: string, logCategory: string): Promise<number> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: SCORE_SCHEMA,
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
      return clamp01(object.score);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(logCategory, `Structured score failed: ${msg}. Returning neutral ${DEFAULT_NEUTRAL}.`, COLORS.warning);
      return DEFAULT_NEUTRAL;
    }
  }

  private async generate(prompt: string, logCategory: string, fallback = ''): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
      return text?.trim() ?? fallback;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(logCategory, `Text generation failed: ${msg}.`, COLORS.error);
      return fallback;
    }
  }

  /**
   * Simple passthrough for callers that want a one-off text completion.
   */
  async call(options: {
    prompt: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<{ response: string }> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt: options.prompt,
        temperature: options.temperature ?? this.temperature,
        maxOutputTokens: options.maxOutputTokens ?? this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
      return { response: text?.trim() ?? '' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('AiSdkClient.call', msg, COLORS.error);
      return { response: '' };
    }
  }

  // ---------------------------------------------------------------------------
  // LLMClient interface implementation
  // ---------------------------------------------------------------------------

  async interpretPerceptionData(
    data: unknown,
    frame: Frame,
    agentId: string,
    agentName: string,
  ): Promise<unknown> {
    const perception =
      typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const prompt =
      `You are ${agentName} (ID: ${agentId}), an AI agent with the "${frame.name}" cognitive frame.\n` +
      `Frame description: "${frame.description}".\n\n` +
      `The following event has been perceived:\n---\n${perception}\n---\n\n` +
      `Write a brief, first-person internal monologue summarising your interpretation of this event.\n` +
      `Respond with only the monologue text, no formatting or commentary.`;

    const text = await this.generate(prompt, 'AiSdkClient.interpret', '');
    if (!text) {
      return `Uninterpreted data: ${perception}`;
    }
    if (!this.silent) {
      const header = `INTERNAL INTERPRETATION (Agent: ${agentName}, Frame: ${frame.name})`;
      // eslint-disable-next-line no-console
      console.log(`\n${COLORS.internalInterpretation(header)}`);
      // eslint-disable-next-line no-console
      console.log(createBox(text, COLORS.internalInterpretation));
    }
    return text;
  }

  async extractRelevantPropositions(
    content: unknown,
    frame: Frame,
  ): Promise<string[]> {
    const dataString =
      typeof content === 'string' ? content : JSON.stringify(content);
    const prompt =
      `You are an agent operating under the "${frame.name}" cognitive frame (${frame.description}).\n\n` +
      `Given the following source data:\n` +
      '```\n' +
      dataString +
      '\n```\n\n' +
      `Identify and list the key propositions implied by this data that are relevant to your frame.\n` +
      `Return ONLY a JSON array of strings, with no prose.`;

    try {
      const { object } = await generateObject({
        model: this.model,
        schema: z.object({
          propositions: z
            .array(z.string().min(1))
            .describe('Propositions relevant to the agent frame.'),
        }),
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
      const props = object.propositions.map((p) => p.trim()).filter(Boolean);
      if (!this.silent) {
        const header = `INTERNAL PROPOSITIONS (Frame: ${frame.name})`;
        const body = props.length > 0 ? props.map((p) => `- ${p}`).join('\n') : '<none>';
        // eslint-disable-next-line no-console
        console.log(`\n${COLORS.internalPropositions(header)}`);
        // eslint-disable-next-line no-console
        console.log(createBox(body, COLORS.internalPropositions));
      }
      return props;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('AiSdkClient.extractRelevantPropositions', msg, COLORS.error);
      return [];
    }
  }

  async judgeEvidenceStrength(
    element: JustificationElement,
    proposition: string,
    agentId?: string,
    agentName?: string,
  ): Promise<number> {
    const content = typeof element.content === 'string'
      ? element.content
      : JSON.stringify(element.content);

    const actor = agentId ? `[Agent: ${agentName || agentId}]` : '[Unknown Agent]';
    const prompt =
      `${actor} Evaluate how strongly the following evidence supports or contradicts the proposition.\n\n` +
      `Proposition: "${proposition}"\n\n` +
      `Evidence:\n` +
      `- type: ${element.type}\n` +
      `- source: ${element.source}\n` +
      `- content: ${content}\n\n` +
      `Return { "score": number } between 0.0 and 1.0 where:\n` +
      `  1.0 = strongly supports; 0.0 = strongly contradicts; 0.5 = neutral or unrelated.`;
    return this.score(prompt, 'AiSdkClient.judgeEvidenceStrength');
  }

  async judgeEvidenceSaliencyForFrame(
    element: JustificationElement,
    frame: Frame,
    proposition: string,
    agentName: string,
    context: string,
  ): Promise<number> {
    const content = typeof element.content === 'string'
      ? element.content
      : JSON.stringify(element.content);

    const prompt =
      `You are ${agentName} with the "${frame.name}" cognitive frame (${frame.description}).\n` +
      `Context: ${context}\n\n` +
      `Given the proposition "${proposition}" and its supporting evidence\n` +
      `(type=${element.type}, source=${element.source}, content=${content}),\n` +
      `how salient is this evidence when viewed through the ${frame.name} frame?\n\n` +
      `Return { "score": number } between 0.0 (not salient) and 1.0 (extremely salient).`;
    return this.score(prompt, 'AiSdkClient.judgeEvidenceSaliencyForFrame');
  }

  async judgeSourceTrust(source: string, frame: Frame): Promise<number> {
    const prompt =
      `Consider an agent operating under the "${frame.name}" frame (${frame.description}).\n` +
      `Evaluate how trustworthy the following evidence source should be considered.\n\n` +
      `Source: "${source}"\n\n` +
      `Return { "score": number } between 0.0 (untrustworthy) and 1.0 (highly trustworthy). 0.5 = unknown.`;
    return this.score(prompt, 'AiSdkClient.judgeSourceTrust');
  }

  // ---------------------------------------------------------------------------
  // Extended methods consumed by agent.ts (previously on GeminiClient).
  // Kept on the base client so every implementation supports them uniformly.
  // ---------------------------------------------------------------------------

  /**
   * Extract factual propositions (not tactical commentary) from source content.
   */
  async extractFactualPropositions(
    content: unknown,
    context?: string,
    agentId?: string,
    agentName?: string,
  ): Promise<string[]> {
    const actor = agentId ? `[Agent: ${agentName || agentId}]` : '[System]';
    const dataString =
      typeof content === 'string' ? content : JSON.stringify(content);
    const prompt =
      `${actor} Extract factual propositions from the following content. ` +
      `Ignore speculation, rhetoric, or tactical commentary. ` +
      `Return propositions as a JSON array of strings.\n\n` +
      (context ? `Context: ${context}\n\n` : '') +
      `Content:\n${dataString}`;

    try {
      const { object } = await generateObject({
        model: this.model,
        schema: z.object({
          propositions: z.array(z.string().min(1)),
        }),
        prompt,
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
      return object.propositions.map((p) => p.trim()).filter(Boolean);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('AiSdkClient.extractFactualPropositions', msg, COLORS.error);
      return [];
    }
  }

  /**
   * Score how relevant a proposition is to a given context (0..1).
   */
  async scorePropositionRelevance(
    proposition: string,
    context: string,
    agentId?: string,
    agentName?: string,
  ): Promise<number> {
    const actor = agentId ? `[Agent: ${agentName || agentId}]` : '[System]';
    const prompt =
      `${actor} Score how relevant the following proposition is to the given context.\n\n` +
      `Proposition: "${proposition}"\n` +
      `Context: "${context}"\n\n` +
      `Return { "score": number } in [0, 1]. 1 = highly relevant, 0 = unrelated.`;
    return this.score(prompt, 'AiSdkClient.scorePropositionRelevance');
  }

  /**
   * Distill a debate topic or subject from a free-text agent context.
   */
  async extractDebateTopicFromContext(
    contextStr: string,
    agentId?: string,
    agentName?: string,
  ): Promise<string> {
    const actor = agentId ? `[Agent: ${agentName || agentId}]` : '[System]';
    const prompt =
      `${actor} Identify the primary debate topic or subject from the following agent context. ` +
      `Reply with only the topic, no explanation.\n\n` +
      `Context: ${contextStr}`;
    const text = await this.generate(
      prompt,
      'AiSdkClient.extractDebateTopicFromContext',
      'Generic context',
    );
    return text || 'Generic context';
  }

  async generatePlan(
    goal: Goal,
    beliefs: Belief[],
    availableTools: AefTool[],
    frame: Frame,
  ): Promise<Action[] | null> {
    if (availableTools.length === 0) {
      this.log('AiSdkClient.generatePlan', 'No tools available.', COLORS.warning);
      return null;
    }

    // Build an AI SDK tool-set. Each tool's execute() just records the call;
    // we synthesise Action instances from the recorded tool calls.
    const idToTool = new Map<EntityId, AefTool>();
    availableTools.forEach((t) => idToTool.set(t.id, t));

    type PlannedCall = { toolId: string; args: Record<string, unknown> };
    const planned: PlannedCall[] = [];

    const toolset = Object.fromEntries(
      availableTools.map((t) => {
        const inputSchema = toolParameterToZod(t.parameterSchema);
        return [
          t.id,
          tool({
            description: `${t.name}: ${t.description}`,
            inputSchema,
            execute: async (args: Record<string, unknown>) => {
              planned.push({ toolId: t.id, args });
              return { planned: true };
            },
          }),
        ];
      }),
    );

    const prompt = this.buildPlanPrompt(goal, beliefs, frame, availableTools);

    try {
      await generateText({
        model: this.model,
        prompt,
        tools: toolset,
        toolChoice: 'required',
        stopWhen: stepCountIs(Math.min(8, availableTools.length * 2)),
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        abortSignal: this.abortSignal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log('AiSdkClient.generatePlan', `Planning failed: ${msg}`, COLORS.error);
      return null;
    }

    if (planned.length === 0) {
      return null;
    }

    const actions: Action[] = [];
    for (const call of planned) {
      const t = idToTool.get(call.toolId);
      if (!t) continue;
      actions.push(new UseTool(t, call.args));
    }
    return actions.length > 0 ? actions : null;
  }

  private buildPlanPrompt(
    goal: Goal,
    beliefs: Belief[],
    frame: Frame,
    availableTools: AefTool[],
  ): string {
    let out = `You are an autonomous agent operating under the Agentic Epistemology Framework (AEF).\n`;
    out += `Cognitive frame: "${frame.name}" (${frame.description}).\n`;
    out += `Goal: "${goal.description}".\n\n`;
    out += `Generate a sequence of tool calls to achieve the goal. Only use tools listed below. Call them in execution order.\n\n`;

    if (beliefs.length > 0) {
      out += `Current Relevant Beliefs (proposition: confidence):\n`;
      for (const b of beliefs) {
        out += `- ${b.proposition}: ${b.confidence.toFixed(2)}\n`;
      }
      out += `\n`;
    }

    out += `Available Tools:\n`;
    for (const t of availableTools) {
      out += `- id: ${t.id}\n`;
      out += `  name: ${t.name}\n`;
      out += `  description: ${t.description}\n`;
      if (t.parameterSchema) {
        out += `  parameters: ${JSON.stringify(t.parameterSchema)}\n`;
      }
    }
    out += `\nIssue the tool calls now.`;
    return out;
  }
}

/**
 * Convert an AEF tool's parameterSchema into a zod schema understood by the AI SDK.
 * We accept either an existing zod schema or a JSON-schema-ish object and build
 * a permissive z.object() so the SDK can pass args through unchanged.
 */
function toolParameterToZod(schema: unknown): z.ZodTypeAny {
  // If it's already a zod schema, use it directly.
  if (schema && typeof (schema as { _def?: unknown })._def !== 'undefined') {
    return schema as z.ZodTypeAny;
  }

  // Accept a minimal JSON Schema {type:'object', properties:{...}}.
  if (
    schema &&
    typeof schema === 'object' &&
    'properties' in (schema as Record<string, unknown>)
  ) {
    const properties =
      ((schema as { properties?: Record<string, { type?: string; description?: string }> })
        .properties) ?? {};
    const required = new Set<string>(
      (schema as { required?: string[] }).required ?? [],
    );
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [name, prop] of Object.entries(properties)) {
      let z1: z.ZodTypeAny;
      switch (prop?.type) {
        case 'string':
          z1 = z.string();
          break;
        case 'number':
        case 'integer':
          z1 = z.number();
          break;
        case 'boolean':
          z1 = z.boolean();
          break;
        case 'array':
          z1 = z.array(z.any());
          break;
        case 'object':
          z1 = z.record(z.any());
          break;
        default:
          z1 = z.any();
      }
      if (prop?.description) z1 = z1.describe(prop.description);
      shape[name] = required.has(name) ? z1 : z1.optional();
    }
    return z.object(shape);
  }

  return z.record(z.any());
}
