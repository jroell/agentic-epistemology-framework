# Agentic Epistemology Framework (AEF)

A TypeScript reference implementation of the Agentic Epistemology Framework as described in the paper "Agentic Epistemology: A Structured Framework for Reasoning in Autonomous Agents and Synthetic Societies".

## Overview

The Agentic Epistemology Framework (AEF) provides a principled approach to modeling the epistemic dimensions of autonomous agents - how they form and justify beliefs, manage uncertainty, revise knowledge, and resolve conflicts. This implementation serves as a reference for researchers and practitioners seeking to incorporate epistemic reasoning into agent architectures.

## Key Features

- **Epistemic Modeling**: Explicit representation of beliefs, justifications, confidence levels, and frames.
- **Frame-Based Reasoning**: Support for different cognitive perspectives that influence belief formation and update.
- **Multi-Agent Interactions**: Mechanisms for conflict detection and resolution through justification exchange.
- **Observer Pattern**: Comprehensive tracing of epistemic events for transparency and debugging.
- **Modular Architecture**: Flexible, extensible components that can be integrated into various agent architectures.

## Installation

Currently, this is a reference implementation. To use it, clone the repository and build the project:

```bash
git clone https://github.com/yourusername/agentic-epistemology-framework.git
cd agentic-epistemology-framework
npm install
npm run build
```

## Getting Started

Clone the repository and run the Debate Simulation using ts-node:

### macOS / Linux
```bash
cd agentic-epistemology-framework
npx ts-node examples/debate-simulation.ts
```

### Windows (PowerShell)
```powershell
cd agentic-epistemology-framework
npx ts-node examples/debate-simulation.ts
```

## Basic Usage

```typescript
/**
 * Simple agent example demonstrating the AEF
 */
import * as dotenv from 'dotenv';
import { Agent } from './src/core/agent';
import { Registry } from './src/core/registry';
import { DefaultMemory } from './src/core/memory';
import { GeminiClient } from './src/llm/gemini-client';
import { DefaultObserver, LogLevel } from './src/observer/default-observer';
import { EfficiencyFrame } from './src/epistemic/frame';
import { Belief } from './src/epistemic/belief';
import { Justification, ObservationJustificationElement } from './src/epistemic/justification';
import { ObservationPerception } from './src/core/perception';
import { FunctionTool } from './src/action/tool';
import { Capability } from './src/action/capability';
import { TaskGoal } from './src/action/goal';
import { displayMessage, displaySystemMessage, COLORS } from './src/core/cli-formatter';

// Load environment variables
dotenv.config();

// Setup components
const registry = new Registry();
const memory = new DefaultMemory();
const observer = new DefaultObserver(1000, LogLevel.Debug, true);

// Create a frame
const efficiencyFrame = new EfficiencyFrame();

// Load API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}
const geminiClient = new GeminiClient(apiKey);

// Create an agent
const agent = new Agent(
  'agent_1',                                // Agent ID
  'ResearchAgent',                          // Agent Name
  [],                                       // Initial beliefs
  efficiencyFrame,                          // Initial Frame
  new Set([Capability.DataAnalysis]),       // Agent capabilities
  registry,                                 // Registry instance
  geminiClient,                             // GeminiClient instance
  memory,                                   // Memory instance
  observer                                  // Observer instance
);

// Create and register a tool
const dataAnalysisTool = new FunctionTool(
  (context: any) => {
    displayMessage('System', 'Data analysis tool executed', COLORS.info);
    return { summary: 'Analysis complete', trends: ['increasing', 'seasonal'] };
  },
  'Data Analyzer',
  'Performs statistical analysis on data',
  new Set([Capability.DataAnalysis])
);
registry.registerTool(dataAnalysisTool);

// Add initial belief
const initialBelief = new Belief(
  'DataAnalysisRequiresPreprocessing',
  0.8,
  new Justification([
    new ObservationJustificationElement(
      'past_experience',
      { observation: 'Previous data analysis tasks required preprocessing' }
    )
  ])
);

// Agent perceives an observation
agent.perceive(new ObservationPerception(
  'memory',
  { observation: 'Previous data analysis tasks required preprocessing' },
  'past_experience'
));

// Create a goal
const researchGoal = new TaskGoal(
  'data_analysis',
  { dataset: 'customer_feedback', objective: 'sentiment_trends' },
  0.7
);

// Run agent
async function runAgent() {
  displaySystemMessage(`Creating a plan for goal: ${researchGoal.description}`);
  const plan = await agent.plan(researchGoal);

  if (plan) {
    displaySystemMessage(`Executing plan: ${plan.toString()}`);
    await agent.executePlan(plan);
    displaySystemMessage(`Plan status: ${plan.status}`);
  } else {
    displayMessage('System', 'Failed to create a plan for the goal', COLORS.error);
  }

  // Inspect the agent's beliefs
  displaySystemMessage(`Agent's beliefs (confidence > 0.5)`);
  const beliefs = agent.getBeliefs(0.5);
  let beliefText = beliefs.length > 0 ? '' : 'No beliefs with confidence > 0.5';
  beliefs.forEach((belief: Belief) => {
    beliefText += `- ${belief.toString()}\n`;
  });
  displayMessage('Agent', beliefText.trim(), COLORS.agent1);
}

runAgent().catch(error => {
  console.error('Error running agent:', error);
});
```

## Advanced Features

### Belief Formation and Update

```typescript
import { Belief, Justification, ObservationJustificationElement, ToolResultJustificationElement, JustificationElement } from './src/epistemic'; // Import from epistemic index
import { ObservationPerception, ToolResultPerception } from './src/core/perception'; // Import from core index
import { GeminiClient } from './src/llm/gemini-client'; // Ensure GeminiClient is imported
import { Frame } from './src/epistemic/frame'; // Ensure Frame is imported

// Assume agent and geminiClient are already initialized as in Basic Usage

// --- Belief Formation ---
// Agent perceives an observation
agent.perceive(new ObservationPerception(
  'sensor_A',
  { reading: 0.75, timestamp: Date.now() },
  'Sensor A reading detected'
));
// Internally, the agent uses its Frame and GeminiClient to potentially form a belief
// like 'SensorAReadingIsHigh' based on this perception and its justification.


// --- Belief Update ---
// Later, the agent perceives conflicting evidence, e.g., from a tool result
const toolResultData = { reading: 28, unit: 'celsius', timestamp: Date.now() };
const conflictingEvidence = new ToolResultJustificationElement(
  'thermometer_tool',
  toolResultData
);

// Agent perceives the tool result
agent.perceive(new ToolResultPerception('thermometer_tool', toolResultData));

// Internally, agent.updateBeliefs is called.
// The Frame (e.g., efficiencyFrame) uses GeminiClient to evaluate the new evidence
// (conflictingEvidence) against existing beliefs (e.g., 'SensorAReadingIsHigh' or a
// belief derived from it like 'RoomTemperatureIsAcceptable'). The agent automatically
// handles the confidence updates based on its frame's logic, which leverages the LLM.

// The following shows the *conceptual* internal update logic for illustration:
async function illustrateInternalUpdateLogic(existingBelief: Belief, newElement: JustificationElement, frame: Frame, client: GeminiClient) {
  // This logic is inside agent.updateBeliefs / frame.updateConfidence
  const updatedConfidence = await frame.updateConfidence(
    existingBelief.proposition, // The proposition being updated
    existingBelief.confidence,
    existingBelief.justification,
    [newElement],
    client // Pass the GeminiClient
  );

  const updatedJustification = new Justification([
    ...existingBelief.justification.elements,
    newElement
  ]);

  const updatedBelief = new Belief(
    existingBelief.proposition, // Proposition might change based on frame interpretation
    updatedConfidence,
    updatedJustification
  );
  console.log(`\nIllustrative internal result: ${updatedBelief.toString()}`);
  // The agent would then store this updated belief.
}

// You don't call illustrateInternalUpdateLogic directly; the agent handles it via perceive().
```

## Example: Debate Simulation

Run the Debate Simulation example directly with ts-node in one of two ways:

### Let AI choose the debate topic (default)
```bash
npx ts-node examples/debate-simulation.ts
```

### Specify your own debate topic
```bash
npx ts-node examples/debate-simulation.ts "Artificial Intelligence should be regulated by international law"
```

The debate-simulation example features:
- A moderator that guides the debate (and generates topics when none are provided)
- Pro and con debaters that argue opposing viewpoints
- A judge that evaluates the quality of arguments
- Multiple debate rounds with dynamic question generation
- Colorful terminal UI for improved readability

## Documentation

Comprehensive documentation covering concepts, architecture, component details, and data flow diagrams can be found in `documentation.md`. Further API details are available within the source code documentation (JSDoc comments).

## Contributing

Contributions are welcome! Please feel free to submit issues or Pull Requests to the repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this framework or the underlying concepts in your research, please consider citing the original paper (if applicable) or the repository.

*(Placeholder for actual citation if available)*
