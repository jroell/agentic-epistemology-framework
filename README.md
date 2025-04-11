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
git clone https://github.com/yourusername/agentic-epistemology-framework.git # Replace with actual URL if available
cd agentic-epistemology-framework
npm install
npm run build
```

## Basic Usage

```typescript
// Import necessary components directly from their modules
import { Agent } from './src/core/agent';
import { Registry } from './src/core/registry';
import { DefaultMemory } from './src/core/memory';
import { DefaultObserver, LogLevel } from './src/observer/default-observer';
import { EfficiencyFrame } from './src/epistemic/frame';
import { Belief } from './src/epistemic/belief';
import { Justification, ObservationJustificationElement } from './src/epistemic/justification';
import { ObservationPerception } from './src/core/perception';
import { Tool, FunctionTool } from './src/action/tool';
import { Capability } from './src/action/capability';
import { Goal, TaskGoal } from './src/action/goal';

// Create the registry, memory, and observer
const registry = new Registry();
const memory = new DefaultMemory();
const observer = new DefaultObserver(1000, LogLevel.Info, true); // Log info level and above to console

// Create a frame
const efficiencyFrame = new EfficiencyFrame();

// Create an agent
const agent = new Agent(
  'agent_1',
  'SimpleAgent',
  [], // Initial beliefs
  efficiencyFrame,
  new Set([Capability.DataAnalysis]), // Agent capabilities
  registry,
  memory,
  observer
);

// Create and register a tool
const dataAnalysisTool = new FunctionTool(
  (context: any) => {
    console.log('Data analysis tool executed with context:', context);
    // Simulate analysis based on context
    const data = context.getElementByType('dataset')?.content || {};
    return { summary: `Analyzed ${data.name || 'data'}`, trends: ['stable'] };
  },
  'Data Analyzer',
  'Performs statistical analysis on data',
  new Set([Capability.DataAnalysis])
);
registry.registerTool(dataAnalysisTool);

// Agent perceives an observation
agent.perceive(new ObservationPerception(
  'system_log',
  { event: 'Data processing started', timestamp: Date.now() }
));

// Create a goal
const analysisGoal = new TaskGoal(
  'data_analysis', // Corresponds to FunctionTool taskName
  { dataset: { name: 'sales_data', size: '10MB' }, objective: 'find_trends' },
  0.7 // Priority
);

// Agent creates a plan
console.log(`\n--- Creating plan for: ${analysisGoal.description} ---`);
const plan = agent.plan(analysisGoal);

// Execute the plan
if (plan) {
  console.log(`--- Executing plan: ${plan.id} ---`);
  agent.executePlan(plan);
  console.log(`--- Plan ${plan.id} status: ${plan.status} ---`);
} else {
  console.log('--- Failed to create plan ---');
}

// Inspect the agent's beliefs
console.log("\n--- Agent's final beliefs (confidence > 0.5) ---");
const beliefs = agent.getBeliefs(0.5);
beliefs.forEach((belief: Belief) => {
  console.log(`- ${belief.toString()}`);
});
```

## Advanced Features

### Belief Formation and Update

```typescript
import { Belief, Justification, ObservationJustificationElement, ToolResultJustificationElement } from './src'; // Assuming index re-exports

// Create a new belief with justification
const justification = new Justification([
  new ObservationJustificationElement('sensor_1', { reading: 0.75, timestamp: Date.now() })
]);

const belief = new Belief(
  'RoomTemperatureIsAcceptable',
  0.6, // Initial confidence
  justification
);

// Agent perceives new evidence (e.g., from a tool)
const newEvidence = new ToolResultJustificationElement(
  'thermometer_tool',
  { reading: 28, unit: 'celsius', timestamp: Date.now() }
);

// In a real scenario, the agent's perceive method handles belief updates internally
// based on its current frame. For illustration:

// 1. Agent perceives the tool result
// agent.perceive(new ToolResultPerception('thermometer_tool', newEvidence.content));

// 2. The agent's internal updateBeliefs method would be triggered,
//    using its current frame (e.g., efficiencyFrame) to potentially update
//    the 'RoomTemperatureIsAcceptable' belief or form a new one like 'RoomTemperatureIsHigh'.
//    The confidence update depends on the frame's parameters and logic.

// Example manual update (for illustration only):
const updatedConfidence = agent.frame.updateConfidence(
  belief.confidence,
  belief.justification,
  [newEvidence]
);
const updatedJustification = new Justification([
  ...belief.justification.elements,
  newEvidence
]);
const updatedBelief = new Belief(
  belief.proposition, // Proposition might change based on frame interpretation
  updatedConfidence,
  updatedJustification
);
console.log(`\nIllustrative updated belief: ${updatedBelief.toString()}`);

```

### Multi-Agent Interaction

See `examples/multi-agent.ts` for a detailed demonstration of conflict detection and resolution between agents with different frames.

```typescript
// Simplified snippet from multi-agent example
import { Agent, ThoroughnessFrame, EfficiencyFrame, EpistemicConflict } from './src'; // Assuming index re-exports

// ... (Agent creation as in the example)

// Agent A detects conflicts with Agent B
const conflicts = agentA.detectConflicts(agentB);

// Resolve conflicts using a strategy (e.g., JustificationExchangeStrategy)
if (conflicts.length > 0) {
  const conflictResolver = new JustificationExchangeStrategy(0.1); // Example strategy
  for (const conflict of conflicts) {
    console.log(`\nResolving conflict: ${conflict.proposition}`);
    await conflictResolver.resolveConflict(conflict);
    // Beliefs of agentA and agentB might be updated based on resolution
  }
}
```

## Examples

Run the examples using Node.js after building the project:

```bash
npm run build
node dist/examples/simple-agent.js
node dist/examples/frame-switching.js
node dist/examples/multi-agent.js
```

## Documentation

Further details on the framework's concepts and API can be found within the source code documentation (JSDoc comments).

## Contributing

Contributions are welcome! Please feel free to submit issues or Pull Requests to the repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Citation

If you use this framework or the underlying concepts in your research, please consider citing the original paper (if applicable) or the repository.

*(Placeholder for actual citation if available)*
