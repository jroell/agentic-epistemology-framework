# AEF Examples

This directory contains examples demonstrating the Agentic Epistemology Framework (AEF) in action.

## Running the Examples

To run the examples, you'll need to compile the TypeScript files first:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run an example
node dist/examples/simple-agent.js
```

## Available Examples

### Simple Agent (simple-agent.ts)

This basic example shows how to create a single agent with beliefs, perceptions, and actions. It demonstrates:

- Creating an agent with a specific frame
- Adding tools to the registry
- Forming beliefs based on perceptions
- Creating and executing plans
- Observing and logging agent events

Run with:
```bash
node dist/examples/simple-agent.js
```

### Multi-Agent Negotiation (multi-agent-negotiation.ts)

This more complex example demonstrates multiple agents with different frames interacting to resolve conflicts. It shows:

- Creating multiple agents with different frames
- Exchanging messages between agents
- Detecting and resolving epistemic conflicts
- Finding consensus among conflicting beliefs
- Tracking belief changes during negotiation

Run with:
```bash
node dist/examples/multi-agent-negotiation.js
```

### Frame Switching (frame-switching.ts)

This example demonstrates how an agent can adapt to different situations by switching frames. It illustrates:

- How frames influence belief formation and confidence
- The process of changing frames based on new information
- How the same evidence is evaluated differently across frames
- Frame-specific task execution strategies
- Comparing belief confidence between frames

Run with:
```bash
node dist/examples/frame-switching.js
```

## Creating Your Own Examples

You can use these examples as templates for creating your own AEF applications. The key components to experiment with include:

1. **Frames**: Create custom frames to model specific cognitive perspectives or reasoning styles
2. **Beliefs and Justifications**: Experiment with different belief formation mechanisms and confidence calculations
3. **Multi-Agent Interaction**: Design more complex agent societies with various interaction patterns
4. **Observer Analytics**: Use the Observer pattern to gather insights about agent behavior

Here's a simple template to get started:

```typescript
import {
  Agent,
  Registry,
  DefaultMemory,
  DefaultObserver,
  EfficiencyFrame,
  Capability
} from '../src';

// Create the registry
const registry = new Registry();

// Create an agent
const agent = new Agent(
  'my_agent',
  'My Custom Agent',
  [], // Initial beliefs
  new EfficiencyFrame(),
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
  registry,
  new DefaultMemory(),
  new DefaultObserver()
);

// Add your agent logic here
```

## Documentation

For more detailed information about the AEF, please refer to the main README file in the project root and the source code documentation.
