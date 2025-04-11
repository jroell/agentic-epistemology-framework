# Agentic Epistemology Framework (AEF)

A TypeScript reference implementation of the Agentic Epistemology Framework as described in the paper "Agentic Epistemology: A Structured Framework for Reasoning in Autonomous Agents and Synthetic Societies".

## Overview

The Agentic Epistemology Framework (AEF) provides a principled approach to modeling the epistemic dimensions of autonomous agents - how they form and justify beliefs, manage uncertainty, revise knowledge, and resolve conflicts. This implementation serves as a reference for researchers and practitioners seeking to incorporate epistemic reasoning into agent architectures.

## Key Features

- **Epistemic Modeling**: Explicit representation of beliefs, justifications, confidence levels, and frames
- **Frame-Based Reasoning**: Support for different cognitive perspectives that influence belief formation and update
- **Multi-Agent Interactions**: Mechanisms for conflict detection and resolution through justification exchange
- **Observer Pattern**: Comprehensive tracing of epistemic events for transparency and debugging
- **Modular Architecture**: Flexible, extensible components that can be integrated into various agent architectures

## Installation

```bash
npm install agentic-epistemology-framework
```

## Basic Usage

```typescript
import { Agent, EfficiencyFrame, Belief, Justification } from 'agentic-epistemology-framework';

// Create a new agent with an efficiency-focused frame
const registry = new Registry();
const efficiencyFrame = new EfficiencyFrame();
const agent = new Agent(
  'agent_1',
  'ResearchAgent',
  [], // Initial beliefs
  efficiencyFrame,
  new Set([Capability.TextAnalysis, Capability.DatabaseQuery]),
  registry
);

// Create and add tools to the registry
const textAnalysisTool = new TextAnalysisTool('text_analyzer');
const databaseTool = new DatabaseQueryTool('db_query');
registry.registerTool(textAnalysisTool);
registry.registerTool(databaseTool);

// Create a goal
const researchGoal = new Goal(
  'research_goal',
  'Find information about X',
  { topic: 'X', minConfidence: 0.7 }
);

// Agent creates a plan to achieve the goal
const plan = agent.plan(researchGoal);

// Execute the plan
if (plan) {
  agent.executePlan(plan);
}

// Inspect the agent's beliefs
const relevantBeliefs = agent.getBeliefs(0.7); // Get beliefs with confidence >= 0.7
console.log(relevantBeliefs);
```

## Advanced Features

### Belief Formation and Update

```typescript
import { Belief, Justification, ObservationJustificationElement } from 'agentic-epistemology-framework';

// Create a new belief with justification
const justification = new Justification([
  new ObservationJustificationElement('sensor_1', { reading: 0.75, timestamp: Date.now() })
]);

const belief = new Belief(
  'RoomTemperatureIsHigh',
  0.8, // Initial confidence
  justification
);

// Update belief with new evidence
const newEvidence = new ToolResultJustificationElement(
  'thermometer',
  { reading: 27, unit: 'celsius', timestamp: Date.now() }
);

// In real usage, the agent would handle this through its perceive() method
// This is just for illustration
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
  belief.proposition,
  updatedConfidence,
  updatedJustification
);
```

### Multi-Agent Interaction

```typescript
import { Agent, ThoroughnessFrame, EfficiencyFrame } from 'agentic-epistemology-framework';

// Create two agents with different frames
const registry = new Registry();
const agentA = new Agent('agent_a', 'Efficiency Agent', [], new EfficiencyFrame(), new Set(), registry);
const agentB = new Agent('agent_b', 'Thoroughness Agent', [], new ThoroughnessFrame(), new Set(), registry);

// Check for epistemic conflicts
const conflicts = agentA.detectConflicts(agentB);

// Resolve conflicts through justification exchange
if (conflicts.length > 0) {
  for (const conflict of conflicts) {
    agentA.exchangeJustifications(conflict, agentB);
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Citation

If you use this framework in your research, please cite:

```
Author, A. (2025). Agentic Epistemology: A Structured Framework for Reasoning in Autonomous Agents and Synthetic Societies. Journal of Artificial Intelligence, XX(X), XXX-XXX.
```
