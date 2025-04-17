/**
 * Simple agent example demonstrating the AEF
 * 
 * This example creates a simple agent with beliefs, perceptions, and actions
 * and demonstrates how they interact in the AEF.
 */
import * as dotenv from 'dotenv';
import { Agent } from '../src/core/agent'; 
import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { GeminiClient } from '../src/llm/gemini-client'; // Use the real client
import { DefaultObserver, LogLevel } from '../src/observer/default-observer'; 
import { EfficiencyFrame, ThoroughnessFrame } from '../src/epistemic/frame'; 
import { Belief } from '../src/epistemic/belief'; 
import { Justification, ObservationJustificationElement } from '../src/epistemic/justification'; 
import { ObservationPerception, ToolResultPerception } from '../src/core/perception'; 
import { Tool, FunctionTool } from '../src/action/tool'; 
import { Capability } from '../src/action/capability'; 
// ActionFactory might not be needed
import { Goal, TaskGoal } from '../src/action/goal'; 
import { ContextElement } from '../src/core/context'; 
import { MessageFactory } from '../src/action/message'; 
import { displayMessage, displaySystemMessage, COLORS } from '../src/core/cli-formatter'; // Import shared formatter

// Load environment variables (.env file)
dotenv.config();

const registry = new Registry();
const memory = new DefaultMemory();
const observer = new DefaultObserver(1000, LogLevel.Debug, true);

const efficiencyFrame = new EfficiencyFrame();

// Use GeminiClient and load API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable not set.");
  process.exit(1); // Exit if the key is missing
}
console.log(`Using Gemini API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
const geminiClient = new GeminiClient(apiKey);

const agent = new Agent(
  'agent_1',
  'ResearchAgent',
  [], // Initial beliefs
  efficiencyFrame,
  new Set([Capability.TextAnalysis, Capability.DataAnalysis]),
  registry,
  geminiClient,
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

registry.registerTool(textAnalysisTool);
registry.registerTool(dataAnalysisTool);

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

agent.perceive(new ObservationPerception(
  'memory',
  { observation: 'Previous data analysis tasks required preprocessing' },
  'past_experience'
));

const researchGoal = new TaskGoal(
  'data_analysis',
  { dataset: 'customer_feedback', objective: 'sentiment_trends' },
  0.7
);

// Note: UI Helper functions (chalk, COLORS, createBox, wordWrap, displayMessage, displaySystemMessage)
// have been removed and are now imported from src/core/cli-formatter.ts


async function runAgent() {
  displaySystemMessage(`🚀 Simple Agent Example Starting 🚀`);
  displaySystemMessage(`Creating a plan for goal: ${researchGoal.description}`);
  const plan = await agent.plan(researchGoal);

  if (plan) {
    displaySystemMessage(`Executing plan: ${plan.toString()}`);
    agent.executePlan(plan); // Tool execution logs will still appear normally
    displaySystemMessage(`Plan status: ${plan.status}`);
  } else {
    displayMessage('System', 'Failed to create a plan for the goal', COLORS.error);
  }

  // Simulate receiving a message from another agent
  displaySystemMessage(`Receiving a message from another agent (agent_2)`);
  const message = MessageFactory.createRequest(
    'agent_1', // recipient
    { query: 'What are the sentiment trends in customer feedback?' },
    'agent_2' // sender
  );
  displayMessage('Agent 2', `Sent message: ${JSON.stringify(message.content)}`, COLORS.agent2);

  agent.perceive(new ObservationPerception(
    'message',
    message,
    'agent_2'
  ));

  displaySystemMessage(`Changing agent's frame to ThoroughnessFrame`);
  const thoroughnessFrame = new ThoroughnessFrame();
  agent.setFrame(thoroughnessFrame);
  displayMessage('Agent 1', `Frame changed to: ${agent['frame'].name}`, COLORS.agent1);


  agent.perceive(new ToolResultPerception(
    'data_analyzer',
    { analysis: { sample_size: 500, confidence_interval: 0.95 } }
  ));
  displayMessage('System', `Agent perceived new tool result from 'data_analyzer'`, COLORS.info);


  displaySystemMessage(`Agent's beliefs (confidence > 0.5)`);
  const beliefs = agent.getBeliefs(0.5);
  let beliefText = beliefs.length > 0 ? '' : 'No beliefs with confidence > 0.5';
  beliefs.forEach((belief: Belief) => {
    beliefText += `- ${belief.toString()}\n`;
  });
  displayMessage('Agent 1', beliefText.trim(), COLORS.agent1);


  displaySystemMessage(`Event statistics`);
  // Cast observer to DefaultObserver to access getEventCountByType
  const defaultObserver = observer as DefaultObserver;
  const eventStats = defaultObserver.getEventCountByType('agent_1');
  let statsText = '';
  for (const [type, count] of Object.entries(eventStats)) {
    statsText += `- ${type}: ${count}\n`;
  }
  displayMessage('System', statsText.trim(), COLORS.info);


  const observerData = defaultObserver.exportToJson(); // Use casted observer
  displaySystemMessage(`Observer data exported (${observerData.length} bytes)`);


  displaySystemMessage(`Timeline of recent events`);
  const timeline = defaultObserver.getTimeline(); // Use casted observer
  const recentEvents = timeline.slice(-5); // Last 5 events
  let timelineText = '';
  recentEvents.forEach(event => {
    const time = new Date(event.timestamp).toISOString();
    timelineText += `[${time}] [${event.type}] [${event.entityId}]\n`;
  });
  displayMessage('System', timelineText.trim(), COLORS.info);


  displaySystemMessage('🏁 Simple Agent Example Completed 🏁');
}

runAgent().catch(error => {
  console.error('Error running agent:', error);
});
