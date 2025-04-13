/**
 * Multi-agent negotiation example
 * 
 * This example demonstrates how multiple agents with different frames
 * can negotiate and resolve conflicts using the AEF.
 */
import { Agent } from '../src/core/agent';
import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { DefaultObserver, LogLevel } from '../src/observer/default-observer';
import { EfficiencyFrame, ThoroughnessFrame, SecurityFrame, Frame } from '../src/epistemic/frame'; 
import { Belief } from '../src/epistemic/belief';
import { Justification, ToolResultJustificationElement, TestimonyJustificationElement } from '../src/epistemic/justification'; // Correct import path
import { MessagePerception } from '../src/core/perception';
import { Tool, FunctionTool } from '../src/action/tool';
import { Capability } from '../src/action/capability'; 
import { Goal, CommunicationGoal } from '../src/action/goal';
import { MessageFactory, Message } from '../src/action/message';
import { EpistemicConflict } from '../src/epistemic/conflict'; 
import { JustificationExchangeStrategy } from '../src/epistemic/conflict';
import { Context, ContextElement } from '../src/core/context';
import { GeminiClient } from '../src/llm/gemini-client'; // Import GeminiClient
import * as dotenv from 'dotenv';

dotenv.config();

const registry = new Registry();

// Instantiate GeminiClient (ensure GEMINI_API_KEY is set)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable not set for example.");
}
const geminiClient = new GeminiClient(apiKey);

const conflictResolver = new JustificationExchangeStrategy(0.1);

const agentA = createAgent('agent_a', 'Efficiency Agent', new EfficiencyFrame(), geminiClient);
const agentB = createAgent('agent_b', 'Thoroughness Agent', new ThoroughnessFrame(), geminiClient);
const agentC = createAgent('agent_c', 'Security Agent', new SecurityFrame(), geminiClient);

// Initialize agents with different beliefs about a resource allocation problem
initializeBeliefs();

// Simulate communication between agents
simulateNegotiation();

// Display final beliefs
displayFinalBeliefs();

/**
 * Create an agent with specific frame and Gemini client
 */
function createAgent(id: string, name: string, frame: Frame, client: GeminiClient): Agent { // Add client parameter, type Frame
  const memory = new DefaultMemory();
  const observer = new DefaultObserver(1000, LogLevel.Info, true); // Assuming LogLevel is defined

  // Correct argument order: id, name, beliefs, frame, capabilities, registry, geminiClient, memory, observer
  return new Agent(
    id,
    name,
    [], // Initial beliefs
    frame,
    new Set([
      Capability.LogicalReasoning,
      Capability.DataAnalysis,
      Capability.TextGeneration
    ]), // Capabilities
    registry,
    client, // Pass the gemini client
    memory,
    observer
    // Confidence thresholds will use default
  );
}

/**
 * Initialize agents with different beliefs
 */
function initializeBeliefs(): void {
  console.log('--- Initializing agent beliefs ---');
  
  // Agent A believes efficiency is most important
  const beliefA = new Belief(
    'EfficiencyIsOptimalStrategy',
    0.85,
    new Justification([
      new ToolResultJustificationElement(
        'efficiency_analyzer',
        { 
          analysis: { 
            execution_time: '120ms', 
            resource_usage: 'minimal',
            completion_rate: '98%' 
          }
        }
      )
    ])
  );
  
  // Agent B believes thoroughness is most important
  const beliefB = new Belief(
    'ThoroughnessIsOptimalStrategy',
    0.75,
    new Justification([
      new ToolResultJustificationElement(
        'thoroughness_analyzer',
        { 
          analysis: { 
            accuracy: '99.7%', 
            error_rate: '0.3%',
            verification_level: 'comprehensive' 
          }
        }
      )
    ])
  );
  
  // Agent C believes security is most important
  const beliefC = new Belief(
    'SecurityIsOptimalStrategy',
    0.80,
    new Justification([
      new ToolResultJustificationElement(
        'security_analyzer',
        { 
          analysis: { 
            vulnerability_count: 0, 
            threat_level: 'minimal',
            compliance_level: 'full' 
          }
        }
      )
    ])
  );
  
  // Create context elements
  const contextA = {
    type: 'analysis_result',
    content: { 
      execution_time: '120ms', 
      resource_usage: 'minimal',
      completion_rate: '98%' 
    },
    source: 'efficiency_analyzer'
  };
  
  const contextB = {
    type: 'analysis_result',
    content: { 
      accuracy: '99.7%', 
      error_rate: '0.3%',
      verification_level: 'comprehensive' 
    },
    source: 'thoroughness_analyzer'
  };
  
  const contextC = {
    type: 'analysis_result',
    content: { 
      vulnerability_count: 0, 
      threat_level: 'minimal',
      compliance_level: 'full' 
    },
    source: 'security_analyzer'
  };
  
  // Add beliefs to agents
  const contextA1 = new Context([new ContextElement(
    contextA.type, contextA.content, contextA.source
  )]);
  const contextB1 = new Context([new ContextElement(
    contextB.type, contextB.content, contextB.source
  )]);
  const contextC1 = new Context([new ContextElement(
    contextC.type, contextC.content, contextC.source
  )]);
  
  // For demonstration, we'll directly manipulate the beliefs
  // In a real implementation, these would come through perception events
  agentA['beliefs'].set(beliefA.proposition, beliefA);
  agentB['beliefs'].set(beliefB.proposition, beliefB);
  agentC['beliefs'].set(beliefC.proposition, beliefC);
  
  console.log(`Agent A belief: ${beliefA.toString()}`);
  console.log(`Agent B belief: ${beliefB.toString()}`);
  console.log(`Agent C belief: ${beliefC.toString()}`);
}

/**
 * Simulate negotiation between agents
 */
async function simulateNegotiation(): Promise<void> {
  console.log('\n--- Starting negotiation simulation ---');
  
  // Step 1: Agents exchange initial positions
  console.log('\n- Step 1: Initial positions -');
  exchangeInitialPositions();
  
  // Step 2: Detect and resolve conflicts
  console.log('\n- Step 2: Conflict detection and resolution -');
  await detectAndResolveConflicts();
  
  // Step 3: Find a consensus
  console.log('\n- Step 3: Finding consensus -');
  findConsensus();
}

/**
 * Exchange initial positions between agents
 */
function exchangeInitialPositions(): void {
  // Agent A sends its position to B
  const messageAtoB = MessageFactory.createRequest(
    agentB.id,
    { belief: 'EfficiencyIsOptimalStrategy', confidence: 0.85 },
    agentA.id
  );
  agentB.perceive(new MessagePerception(messageAtoB));
  console.log(`Agent A to B: ${messageAtoB.content.belief} (conf: ${messageAtoB.content.confidence})`);
  
  // Agent B sends its position to A
  const messageBtoA = MessageFactory.createRequest(
    agentA.id,
    { belief: 'ThoroughnessIsOptimalStrategy', confidence: 0.75 },
    agentB.id
  );
  agentA.perceive(new MessagePerception(messageBtoA));
  console.log(`Agent B to A: ${messageBtoA.content.belief} (conf: ${messageBtoA.content.confidence})`);
  
  // Agent C sends its position to both A and B
  const messageCtoA = MessageFactory.createRequest(
    agentA.id,
    { belief: 'SecurityIsOptimalStrategy', confidence: 0.80 },
    agentC.id
  );
  agentA.perceive(new MessagePerception(messageCtoA));
  console.log(`Agent C to A: ${messageCtoA.content.belief} (conf: ${messageCtoA.content.confidence})`);
  
  const messageCtoB = MessageFactory.createRequest(
    agentB.id,
    { belief: 'SecurityIsOptimalStrategy', confidence: 0.80 },
    agentC.id
  );
  agentB.perceive(new MessagePerception(messageCtoB));
  console.log(`Agent C to B: ${messageCtoB.content.belief} (conf: ${messageCtoB.content.confidence})`);
}

/**
 * Detect and resolve conflicts between agents
 */
async function detectAndResolveConflicts(): Promise<void> {
  // For simplicity, we'll create explicit conflicts
  // In a real implementation, these would be detected by the agents
  
  // Create a conflict between Agent A and Agent B
  const conflictAB = new EpistemicConflict(
    agentA.id,
    agentB.id,
    'EfficiencyIsOptimalStrategy',
    agentA.getBelief('EfficiencyIsOptimalStrategy')!,
    new Belief(
      'ThoroughnessIsOptimalStrategy',
      0.75,
      new Justification([
        new ToolResultJustificationElement(
          'thoroughness_analyzer',
          { 
            analysis: { 
              accuracy: '99.7%', 
              error_rate: '0.3%',
              verification_level: 'comprehensive' 
            }
          }
        )
      ])
    )
  );
  
  console.log(`Conflict detected between Agent A and Agent B: "${conflictAB.proposition}"`);

  const resolutionAB = await conflictResolver.resolveConflict(conflictAB);

  console.log(`Conflict resolution result: ${resolutionAB.success ? 'Success' : 'Failure'}`);
  console.log(`Resolution type: ${resolutionAB.type}`);
  console.log(`Reason: ${resolutionAB.reason}`);
  
  if (resolutionAB.updatedBelief) {
    console.log(`Agent A updated belief confidence: ${resolutionAB.updatedBelief.confidence.toFixed(2)}`);
    agentA['beliefs'].set(
      resolutionAB.updatedBelief.proposition,
      resolutionAB.updatedBelief
    );
  }
  
  if (resolutionAB.updatedContradictoryBelief) {
    console.log(`Agent B updated belief confidence: ${resolutionAB.updatedContradictoryBelief.confidence.toFixed(2)}`);
    agentB['beliefs'].set(
      'ThoroughnessIsOptimalStrategy',
      resolutionAB.updatedContradictoryBelief
    );
  }
  
  // Create a conflict between Agent A and Agent C
  const conflictAC = new EpistemicConflict(
    agentA.id,
    agentC.id,
    'EfficiencyIsOptimalStrategy',
    agentA.getBelief('EfficiencyIsOptimalStrategy')!,
    new Belief(
      'SecurityIsOptimalStrategy',
      0.80,
      new Justification([
        new ToolResultJustificationElement(
          'security_analyzer',
          { 
            analysis: { 
              vulnerability_count: 0, 
              threat_level: 'minimal',
              compliance_level: 'full' 
            }
          }
        )
      ])
    )
  );
  
  console.log(`\nConflict detected between Agent A and Agent C: "${conflictAC.proposition}"`);

  const resolutionAC = await conflictResolver.resolveConflict(conflictAC);

  console.log(`Conflict resolution result: ${resolutionAC.success ? 'Success' : 'Failure'}`);
  console.log(`Resolution type: ${resolutionAC.type}`);
  console.log(`Reason: ${resolutionAC.reason}`);
  
  if (resolutionAC.updatedBelief) {
    console.log(`Agent A updated belief confidence: ${resolutionAC.updatedBelief.confidence.toFixed(2)}`);
    agentA['beliefs'].set(
      resolutionAC.updatedBelief.proposition,
      resolutionAC.updatedBelief
    );
  }
  
  if (resolutionAC.updatedContradictoryBelief) {
    console.log(`Agent C updated belief confidence: ${resolutionAC.updatedContradictoryBelief.confidence.toFixed(2)}`);
    agentC['beliefs'].set(
      'SecurityIsOptimalStrategy',
      resolutionAC.updatedContradictoryBelief
    );
  }
}

/**
 * Find a consensus between agents
 */
function findConsensus(): void {
  // Create a composite belief that combines all three perspectives
  const consensusBelief = new Belief(
    'BalancedApproachIsOptimal',
    0.85,
    new Justification([
      new TestimonyJustificationElement(
        agentA.id,
        { belief: 'EfficiencyIsOptimalStrategy', confidence: agentA.getBelief('EfficiencyIsOptimalStrategy')!.confidence }
      ),
      new TestimonyJustificationElement(
        agentB.id,
        { belief: 'ThoroughnessIsOptimalStrategy', confidence: agentB.getBelief('ThoroughnessIsOptimalStrategy')!.confidence }
      ),
      new TestimonyJustificationElement(
        agentC.id,
        { belief: 'SecurityIsOptimalStrategy', confidence: agentC.getBelief('SecurityIsOptimalStrategy')!.confidence }
      )
    ])
  );
  
  // Share the consensus with all agents
  console.log(`\nReached consensus: ${consensusBelief.proposition} (conf: ${consensusBelief.confidence.toFixed(2)})`);

  agentA['beliefs'].set(consensusBelief.proposition, consensusBelief);
  agentB['beliefs'].set(consensusBelief.proposition, consensusBelief);
  agentC['beliefs'].set(consensusBelief.proposition, consensusBelief);
  
  console.log('All agents have adopted the consensus belief.');
}

/**
 * Display final beliefs of all agents
 */
function displayFinalBeliefs(): void {
  console.log('\n--- Final beliefs ---');
  
  console.log('\nAgent A beliefs:');
  const beliefsA = agentA.getBeliefs();
  beliefsA.forEach((belief: Belief) => { // Add Belief type annotation
    console.log(`- ${belief.toString()}`);
  });
  
  console.log('\nAgent B beliefs:');
  const beliefsB = agentB.getBeliefs();
  beliefsB.forEach((belief: Belief) => { // Add Belief type annotation
    console.log(`- ${belief.toString()}`);
  });
  
  console.log('\nAgent C beliefs:');
  const beliefsC = agentC.getBeliefs();
  beliefsC.forEach((belief: Belief) => { // Add Belief type annotation
    console.log(`- ${belief.toString()}`);
  });
  
  // Display event statistics
  console.log('\n--- Event statistics ---');
  
  // Cast observer to DefaultObserver to access getEventCountByType
  const observerA = agentA['observer'] as DefaultObserver; 
  const eventStatsA = observerA.getEventCountByType(agentA.id);
  console.log('\nAgent A events:');
  for (const [type, count] of Object.entries(eventStatsA)) {
    console.log(`- ${type}: ${count}`);
  }
  
  const observerB = agentB['observer'] as DefaultObserver;
  const eventStatsB = observerB.getEventCountByType(agentB.id);
  console.log('\nAgent B events:');
  for (const [type, count] of Object.entries(eventStatsB)) {
    console.log(`- ${type}: ${count}`);
  }
  
  const observerC = agentC['observer'] as DefaultObserver;
  const eventStatsC = observerC.getEventCountByType(agentC.id);
  console.log('\nAgent C events:');
  for (const [type, count] of Object.entries(eventStatsC)) {
    console.log(`- ${type}: ${count}`);
  }
}

console.log('\nMulti-agent negotiation example started');
simulateNegotiation().then(() => {
  console.log('\nMulti-agent negotiation example completed');
}).catch(error => {
  console.error('Error running simulation:', error);
});
