# Agentic Epistemology Framework (AEF)

A TypeScript reference implementation of the Agentic Epistemology Framework from the paper *"Agentic Epistemology: A Structured Framework for Reasoning in Autonomous Agents and Synthetic Societies."*

> **v2.0 refactor note.** The framework is now provider-agnostic. All LLM calls go through the [Vercel AI SDK](https://ai-sdk.dev) (`ai@^5`) and default to [OpenRouter](https://openrouter.ai), which means you can swap between Claude, GPT, Gemini, Llama, or a local gateway by changing a single config line. The legacy `GeminiClient` still works as a thin backwards-compat shim on top of the new `AiSdkClient`.

## Overview

AEF provides a principled way to model the epistemic dimensions of autonomous agents: how they form and justify beliefs, manage uncertainty, revise knowledge, and resolve conflicts. This implementation is a reference for researchers and practitioners who want to bolt epistemic reasoning onto an agent architecture.

## Key Features

- **Epistemic Modeling**: Explicit beliefs, justifications, confidence levels, frames.
- **Frame-Based Reasoning**: Cognitive perspectives that shape how evidence is weighed.
- **Multi-Agent Interactions**: Conflict detection and justification exchange.
- **Observer Pattern**: Traceable epistemic events for debugging and transparency.
- **Provider-Agnostic LLM Layer**: Swap OpenRouter / OpenAI / Anthropic / Google in one line.
- **Modular Architecture**: Compose components into whatever agent setup you need.

## Requirements

- Node.js **>= 22**
- npm, pnpm, or yarn
- An API key for at least one LLM provider (OpenRouter is the simplest: it fronts them all)

## Installation

```bash
git clone https://github.com/jroell/agentic-epistemology-framework.git
cd agentic-epistemology-framework
npm install
npm run build
```

## Environment Setup

Copy the template and drop in a key for whichever provider you want to use:

```bash
cp .env.example .env
```

OpenRouter is the default and is the easiest path because one key gives you access to every supported model. Set any of the following in `.env` as needed:

```
# Recommended: OpenRouter (one key, all providers)
OPENROUTER_API_KEY=sk-or-...

# Optional override: pick any OpenRouter model slug
AEF_DEFAULT_MODEL=anthropic/claude-sonnet-4

# Optional: attribution headers shown on openrouter.ai
OPENROUTER_SITE_URL=https://your.app
OPENROUTER_SITE_NAME=Your App

# Or go direct to a single provider
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...   # legacy GEMINI_API_KEY also works
```

## Quickstart

### Default: OpenRouter + Claude Sonnet

```ts
import { createDefaultAgent } from 'agentic-epistemology-framework';

// Uses OPENROUTER_API_KEY + AEF_DEFAULT_MODEL (falls back to anthropic/claude-sonnet-4)
const agent = createDefaultAgent('agent_1', 'ResearchAgent');
```

### Pick a specific provider / model

```ts
import { AiSdkClient, createLanguageModel, createDefaultAgent } from 'agentic-epistemology-framework';

const model = createLanguageModel({
  provider: 'openrouter',
  model: 'openai/gpt-4.1-mini',
});

const agent = createDefaultAgent('agent_1', 'ResearchAgent', {
  llmClient: new AiSdkClient({ model }),
});
```

Switch the provider without touching anything else:

```ts
// Anthropic direct
const model = createLanguageModel({ provider: 'anthropic', model: 'claude-sonnet-4-20250514' });

// OpenAI direct
const model = createLanguageModel({ provider: 'openai', model: 'gpt-4.1-mini' });

// Google direct
const model = createLanguageModel({ provider: 'google', model: 'gemini-2.5-pro' });
```

### Use your own Vercel AI SDK model

Already have a configured `LanguageModelV2` (custom provider, gateway, proxy, local model)? Drop it in:

```ts
import { AiSdkClient } from 'agentic-epistemology-framework';
import { myCustomModel } from './my-model';

const llmClient = new AiSdkClient({ model: myCustomModel, temperature: 0.3 });
```

### Testing without a network

`MockLLMClient` returns deterministic, configurable responses:

```ts
import { Agent, MockLLMClient, EfficiencyFrame } from 'agentic-epistemology-framework';

const llmClient = new MockLLMClient({
  defaultScore: 0.7,
  strengthByProposition: { DataIsReliable: 0.9 },
  planWithAllTools: true,
});
```

## Basic Usage

```ts
import 'dotenv/config';
import {
  Agent,
  createDefaultAgent,
  Registry,
  DefaultMemory,
  DefaultObserver,
  LogLevel,
  EfficiencyFrame,
  Belief,
  Justification,
  ObservationJustificationElement,
  ObservationPerception,
  FunctionTool,
  Capability,
  TaskGoal,
  displayMessage,
  displaySystemMessage,
  COLORS,
} from 'agentic-epistemology-framework';

const agent = createDefaultAgent('agent_1', 'ResearchAgent');

// Register a tool the agent can call
agent.registry.registerTool(new FunctionTool(
  () => ({ summary: 'Analysis complete', trends: ['increasing', 'seasonal'] }),
  'Data Analyzer',
  'Performs statistical analysis on data',
  new Set([Capability.DataAnalysis]),
));

// Seed a belief
agent.perceive(new ObservationPerception(
  'past_experience',
  { observation: 'Previous data analysis tasks required preprocessing' },
  'past_experience',
));

const goal = new TaskGoal(
  'data_analysis',
  { dataset: 'customer_feedback', objective: 'sentiment_trends' },
  0.7,
);

const plan = await agent.plan(goal);
if (plan) {
  await agent.executePlan(plan);
  displaySystemMessage(`Plan status: ${plan.status}`);
}
```

## Advanced Features

### Belief Formation and Update

The `Frame` uses the configured `LLMClient` (by default `AiSdkClient`) to score how strongly new evidence supports or contradicts existing beliefs, and how salient that evidence is through the frame's lens. You don't call the LLM directly:

```ts
import { ObservationPerception, ToolResultPerception } from 'agentic-epistemology-framework';

agent.perceive(new ObservationPerception(
  'sensor_A',
  { reading: 0.75, timestamp: Date.now() },
  'Sensor A reading detected',
));

agent.perceive(new ToolResultPerception(
  'thermometer_tool',
  { reading: 28, unit: 'celsius', timestamp: Date.now() },
));
```

Each `perceive` call triggers the frame to re-evaluate affected beliefs, producing new confidence scores and an extended `Justification` chain.

### Planning with Tool Calls

`generatePlan` uses the AI SDK's native tool-calling (`generateText` + `tools` + `toolChoice: 'required'`) so the planner actually emits structured tool invocations instead of free-form text that gets regex-parsed. Tools you register in the `Registry` are automatically exposed to the planner with their `parameterSchema` converted to zod for validation.

## Examples

Run the debate simulation:

```bash
# Let the LLM pick the topic
npx tsx examples/debate-simulation.ts

# Or provide your own
npx tsx examples/debate-simulation.ts "AI should be regulated by international law"
```

The debate simulation features:

- A moderator that guides the debate and can generate topics
- Pro and con debaters with opposing frames
- A judge that evaluates argument quality
- Multiple rounds with dynamic question generation
- Coloured terminal UI

## Testing

Tests run under [Vitest](https://vitest.dev):

```bash
npm test             # run once
npm run test:watch   # watch mode
npm run coverage     # with coverage report
```

## Migrating from v1.x (Gemini-only)

v1.x imports keep working. `GeminiClient` and `MockGeminiClient` are now thin deprecated shims that delegate to `AiSdkClient` and `MockLLMClient`. For new code, prefer the provider-agnostic imports:

| v1.x | v2.x |
| --- | --- |
| `new GeminiClient(apiKey, 'gemini-2.0-flash')` | `new AiSdkClient({ model: createLanguageModel({ provider: 'google', apiKey, model: 'gemini-2.0-flash' }) })` |
| `new MockGeminiClient()` | `new MockLLMClient()` |
| `GEMINI_API_KEY` env var | `OPENROUTER_API_KEY` (preferred) or `GOOGLE_GENERATIVE_AI_API_KEY` |

## Documentation

See `documentation.md` for the conceptual architecture and component walkthroughs. Source files carry JSDoc for the public API.

## Contributing

Issues and PRs welcome.

## License

MIT. See `LICENSE`.

## Citation

If you use this framework or the underlying concepts in your research, please cite the original paper and/or this repository.
