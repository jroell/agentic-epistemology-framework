/**
 * Simple agent example demonstrating the AEF
 * 
 * This example creates a simple agent with beliefs, perceptions, and actions
 * and demonstrates how they interact in the AEF.
 */
import { Agent } from '../src/core/agent'; // Correct import path
import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { DefaultObserver, LogLevel } from '../src/observer/default-observer'; // Correct import path
import { EfficiencyFrame, ThoroughnessFrame } from '../src/epistemic/frame'; // Correct import path
import { Belief } from '../src/epistemic/belief'; // Correct import path
import { Justification, ObservationJustificationElement } from '../src/epistemic/justification'; // Correct import path
import { ObservationPerception, ToolResultPerception } from '../src/core/perception'; // Correct import path
import { Tool, FunctionTool } from '../src/action/tool'; // Correct import path
import { Capability } from '../src/action/capability'; // Correct import path
// ActionFactory might not be needed
import { Goal, TaskGoal } from '../src/action/goal'; // Correct import path
import { ContextElement } from '../src/core/context'; // Correct import path
import { MessageFactory } from '../src/action/message'; // Correct import path

// Create the registry
const registry = new Registry();

// Create a memory instance
const memory = new DefaultMemory();

// Create an observer with console logging enabled
const observer = new DefaultObserver(1000, LogLevel.Debug, true);

// Create a frame
const efficiencyFrame = new EfficiencyFrame();

// Create an agent
const agent = new Agent(
  'agent_1',
  'ResearchAgent',
  [], // Initial beliefs
  efficiencyFrame,
  new Set([Capability.TextAnalysis, Capability.DataAnalysis]),
  registry,
  memory,
  observer
);

// Create tools
const textAnalysisTool = new FunctionTool(
  (context: any) => {
    console.log('Text analysis tool executed');
    return { sentiment: 'positive', entities: ['data', 'research'] };
  },
  'Text Analyzer',
  'Analyzes text for sentiment and entities',
  new Set([Capability.TextAnalysis])
);

const dataAnalysisTool = new FunctionTool(
  (context: any) => {
    console.log('Data analysis tool executed');
    return { average: 42, trends: ['increasing', 'seasonal'] };
  },
  'Data Analyzer',
  'Performs statistical analysis on data',
  new Set([Capability.DataAnalysis])
);

// Register tools
registry.registerTool(textAnalysisTool);
registry.registerTool(dataAnalysisTool);

// Form initial beliefs
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

// Add the belief to the agent
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

// Create a plan for the goal
console.log(`\n--- Creating a plan for goal: ${researchGoal.description} ---`);
const plan = agent.plan(researchGoal);

// Execute the plan if created
if (plan) {
  console.log(`\n--- Executing plan: ${plan.toString()} ---`);
  agent.executePlan(plan);
  
  // Check if the plan was completed
  console.log(`\n--- Plan status: ${plan.status} ---`);
} else {
  console.log('Failed to create a plan for the goal');
}

// Simulate receiving a message from another agent
console.log(`\n--- Receiving a message from another agent ---`);
const message = MessageFactory.createRequest(
  'agent_1', // recipient
  { query: 'What are the sentiment trends in customer feedback?' },
  'agent_2' // sender
);

agent.perceive(new ObservationPerception(
  'message',
  message,
  'agent_2'
));

// Change the agent's frame
console.log(`\n--- Changing agent's frame to ThoroughnessFrame ---`);
// import { ThoroughnessFrame } from '../src'; // Remove duplicate import
const thoroughnessFrame = new ThoroughnessFrame();
agent.setFrame(thoroughnessFrame);

// Create another belief with the new frame
agent.perceive(new ToolResultPerception(
  'data_analyzer',
  { analysis: { sample_size: 500, confidence_interval: 0.95 } }
));

// Get all beliefs with confidence above 0.5
console.log(`\n--- Agent's beliefs (confidence > 0.5) ---`);
const beliefs = agent.getBeliefs(0.5);
beliefs.forEach((belief: Belief) => { // Add Belief type annotation
  console.log(`- ${belief.toString()}`);
});

// Get event statistics
console.log(`\n--- Event statistics ---`);
// Cast observer to DefaultObserver to access getEventCountByType
const defaultObserver = observer as DefaultObserver; 
const eventStats = defaultObserver.getEventCountByType('agent_1'); 
for (const [type, count] of Object.entries(eventStats)) {
  console.log(`- ${type}: ${count}`);
}

// Export observer data to JSON
const observerData = defaultObserver.exportToJson(); // Use casted observer
console.log(`\n--- Observer data exported (${observerData.length} bytes) ---`);

// Display a timeline of events
console.log(`\n--- Timeline of recent events ---`);
const timeline = defaultObserver.getTimeline(); // Use casted observer
const recentEvents = timeline.slice(-5); // Last 5 events
recentEvents.forEach(event => {
  const time = new Date(event.timestamp).toISOString();
  console.log(`[${time}] [${event.type}] [${event.entityId}]`);
});

console.log('\nSimple agent example completed');
