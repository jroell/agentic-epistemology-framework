/**
 * Frame switching example
 * 
 * This example demonstrates how an agent can switch frames to adapt
 * to different situations, affecting its belief formation and decision-making.
 */
import * as dotenv from 'dotenv';
import { Agent } from '../src/core/agent'; // Correct import path
import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { GeminiClient } from '../src/llm/gemini-client'; // Use the real client
import { DefaultObserver, LogLevel } from '../src/observer/default-observer'; // Correct import path
import { EfficiencyFrame, ThoroughnessFrame, SecurityFrame, Frame, FrameFactory } from '../src/epistemic/frame'; // Correct import path
import { Belief } from '../src/epistemic/belief'; // Correct import path
import { Justification, ToolResultJustificationElement, ObservationJustificationElement } from '../src/epistemic/justification'; // Correct import path
import { Perception, ToolResultPerception, ObservationPerception } from '../src/core/perception'; // Correct import path
import { Capability } from '../src/action/capability'; // Correct import path
// ActionFactory might not be exported or needed directly, assuming Goal subclasses are sufficient
import { Goal, TaskGoal, FrameAdaptationGoal } from '../src/action/goal'; // Correct import path
import { Plan, PlanStatus } from '../src/action/plan'; // Correct import path
import { Context, ContextElement } from '../src/core/context'; // Correct import path
import { displayMessage, displaySystemMessage, COLORS } from '../src/core/cli-formatter'; // Import shared formatter

// Create a registry
const registry = new Registry();

// Create a memory instance
const memory = new DefaultMemory();

// Create an observer with console logging enabled
const observer = new DefaultObserver(1000, LogLevel.Debug, true);

// Load environment variables (.env file)
dotenv.config();

// Create an agent starting with the efficiency frame
const efficiencyFrame = new EfficiencyFrame();

// Use GeminiClient and load API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable not set.");
  process.exit(1); // Exit if the key is missing
}
console.log(`Using Gemini API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
const geminiClient = new GeminiClient(apiKey);

// Create agent with the GeminiClient
const agent = new Agent(
  'adaptive_agent',
  'Adaptive Decision Agent',
  [], // Initial beliefs
  efficiencyFrame,
  new Set([
    Capability.DataAnalysis,
    Capability.LogicalReasoning,
    Capability.SelfMonitoring
  ]),
  registry,
  geminiClient,
  memory,
  observer
);

// Main execution
async function main() {
  displaySystemMessage('🚀 Frame Switching Example Started 🚀');

  // Phase 1: Agent operates with Efficiency frame
  displaySystemMessage('--- Phase 1: Efficiency Frame ---');
  await operateWithEfficiencyFrame();

  // Phase 2: Agent switches to Thoroughness frame
  displaySystemMessage('--- Phase 2: Switching to Thoroughness Frame ---');
  await switchToThoroughnessFrame();

  // Phase 3: Agent switches to Security frame based on new information
  displaySystemMessage('--- Phase 3: Switching to Security Frame ---');
  await switchToSecurityFrame();

  // Phase 4: Compare beliefs across frames
  displaySystemMessage('--- Phase 4: Comparing Belief Confidence Across Frames ---');
  await compareBeliefConfidence();

  displaySystemMessage('🏁 Frame Switching Example Completed 🏁');
}

/**
 * Phase 1: Agent operates with Efficiency frame
 */
async function operateWithEfficiencyFrame() {
  displayMessage('Adaptive Agent', `Current frame: ${agent['frame'].name}`, COLORS.agent1);

  // Create some initial beliefs under Efficiency frame
  displayMessage('System', 'Agent perceiving performance monitor results', COLORS.info);
  agent.perceive(new ToolResultPerception(
    'performance_monitor',
    {
      execution_time: '50ms',
      throughput: '1000 items/sec',
      resource_utilization: '30%'
    }
  ));

  displayMessage('System', 'Agent perceiving system metrics', COLORS.info);
  agent.perceive(new ObservationPerception(
    'system_metrics',
    {
      latency: 'low',
      response_time: 'fast',
      user_satisfaction: 'high'
    }
  ));

  // Show current beliefs
  displaySystemMessage('Beliefs formed under Efficiency frame:');
  const beliefsEfficiency = agent.getBeliefs();
  let beliefTextEfficiency = beliefsEfficiency.length > 0 ? '' : 'No beliefs formed yet.';
  beliefsEfficiency.forEach((belief: Belief) => {
    beliefTextEfficiency += `- ${belief.toString()}\n`;
  });
  displayMessage('Adaptive Agent', beliefTextEfficiency.trim(), COLORS.agent1);


  // Create and execute a task with efficiency focus
  const efficiencyTask = new TaskGoal(
    'data_processing',
    {
      data_size: 'large',
      time_constraint: 'tight',
      accuracy_requirement: 'moderate'
    },
    0.8
  );

  displaySystemMessage(`Executing task: ${efficiencyTask.description}`);
  const planEfficiency = await agent.plan(efficiencyTask);

  if (planEfficiency) {
    agent.executePlan(planEfficiency); // Assuming executePlan logs tool usage
    displayMessage('System', `Task completed with status: ${planEfficiency.status}`, COLORS.success);
  } else {
    displayMessage('System', 'Failed to create plan for the task', COLORS.error);
  }
}

/**
 * Phase 2: Agent switches to Thoroughness frame
 */
async function switchToThoroughnessFrame() {
  // Create a frame adaptation goal
  const adaptationGoal = new FrameAdaptationGoal(
    'thoroughness',
    'Need for detailed analysis and high accuracy',
    0.9
  );

  displayMessage('System', `Frame adaptation goal: ${adaptationGoal.description}`, COLORS.info);

  // Execute frame change
  const thoroughnessFrame = new ThoroughnessFrame();
  agent.setFrame(thoroughnessFrame);

  displayMessage('Adaptive Agent', `New frame: ${agent['frame'].name}`, COLORS.agent1);

  // Create new perceptions under Thoroughness frame
  displayMessage('System', 'Agent perceiving quality analyzer results', COLORS.info);
  agent.perceive(new ToolResultPerception(
    'quality_analyzer',
    {
      accuracy: '99.8%',
      error_rate: '0.2%',
      coverage: 'comprehensive',
      validation_level: 'rigorous'
    }
  ));

  displayMessage('System', 'Agent perceiving data integrity metrics', COLORS.info);
  agent.perceive(new ObservationPerception(
    'data_integrity',
    {
      completeness: 'full',
      consistency: 'high',
      reliability: 'excellent'
    }
  ));

  // Show current beliefs
  displaySystemMessage('Beliefs formed or updated under Thoroughness frame:');
  const beliefsThoroughness = agent.getBeliefs();
  let beliefTextThoroughness = beliefsThoroughness.length > 0 ? '' : 'No beliefs formed yet.';
  beliefsThoroughness.forEach((belief: Belief) => {
    beliefTextThoroughness += `- ${belief.toString()}\n`;
  });
  displayMessage('Adaptive Agent', beliefTextThoroughness.trim(), COLORS.agent1);


  // Create and execute a task with thoroughness focus
  const thoroughnessTask = new TaskGoal(
    'data_analysis',
    {
      data_size: 'large',
      time_constraint: 'flexible',
      accuracy_requirement: 'very high'
    },
    0.8
  );

  displaySystemMessage(`Executing task: ${thoroughnessTask.description}`);
  const planThoroughness = await agent.plan(thoroughnessTask);

  if (planThoroughness) {
    agent.executePlan(planThoroughness);
    displayMessage('System', `Task completed with status: ${planThoroughness.status}`, COLORS.success);
  } else {
    displayMessage('System', 'Failed to create plan for the task', COLORS.error);
  }
}

/**
 * Phase 3: Agent switches to Security frame based on new information
 */
async function switchToSecurityFrame() {
  // Agent receives security-relevant information
  displayMessage('System', 'Received security alert information', COLORS.warning);
  agent.perceive(new ToolResultPerception(
    'security_scanner',
    {
      vulnerability_detected: true,
      severity: 'high',
      affected_components: ['data_processor', 'auth_service'],
      recommended_action: 'immediate mitigation'
    }
  ));
  
  // Create a frame adaptation goal
  const adaptationGoal = new FrameAdaptationGoal(
    'security',
    'Security vulnerability detected',
    0.95 // High priority
  );

  displayMessage('System', `Frame adaptation goal: ${adaptationGoal.description}`, COLORS.info);

  // Execute frame change
  const securityFrame = new SecurityFrame();
  agent.setFrame(securityFrame);

  displayMessage('Adaptive Agent', `New frame: ${agent['frame'].name}`, COLORS.agent1);

  // Create new perceptions under Security frame
  displayMessage('System', 'Agent perceiving threat analysis results', COLORS.info);
  agent.perceive(new ObservationPerception(
    'threat_analysis',
    {
      threat_level: 'elevated',
      attack_vectors: ['injection', 'authorization_bypass'],
      potential_impact: 'data_breach'
    }
  ));

  // Show current beliefs
  displaySystemMessage('Beliefs formed or updated under Security frame:');
  const beliefsSecurity = agent.getBeliefs();
  let beliefTextSecurity = beliefsSecurity.length > 0 ? '' : 'No beliefs formed yet.';
  beliefsSecurity.forEach((belief: Belief) => {
    beliefTextSecurity += `- ${belief.toString()}\n`;
  });
  displayMessage('Adaptive Agent', beliefTextSecurity.trim(), COLORS.agent1);


  // Create and execute a task with security focus
  const securityTask = new TaskGoal(
    'vulnerability_mitigation',
    {
      priority: 'critical',
      scope: 'affected_components',
      verification_required: true
    },
    0.9
  );

  displaySystemMessage(`Executing task: ${securityTask.description}`);
  const planSecurity = await agent.plan(securityTask);

  if (planSecurity) {
    agent.executePlan(planSecurity);
    displayMessage('System', `Task completed with status: ${planSecurity.status}`, COLORS.success);
  } else {
    displayMessage('System', 'Failed to create plan for the task', COLORS.error);
  }
}

/**
 * Phase 4: Compare how the same evidence is evaluated differently across frames
 */
async function compareBeliefConfidence() {
  // Create a common proposition to evaluate
  const proposition = 'SystemIsReadyForDeployment';
  
  // Create evidence that will be interpreted by each frame
  const evidence = {
    performance: {
      response_time: '45ms',
      throughput: '1200 req/sec',
      resource_usage: '40%'
    },
    quality: {
      test_coverage: '87%',
      known_issues: 2,
      documentation: 'partial'
    },
    security: {
      vulnerabilities: 1,
      severity: 'medium',
      patch_status: 'in_progress'
    }
  };

  displaySystemMessage('Evaluating the same evidence across different frames');
  displayMessage('System', `Proposition: "${proposition}"`, COLORS.info);

  // Function to evaluate in a specific frame
  async function evaluateInFrame(frameType: string, frameInstance: Frame, client: GeminiClient) { // Use GeminiClient type
    // Set the frame
    agent.setFrame(frameInstance);
    
    // Create a context with the evidence
    const context = new Context([
      new ContextElement('evidence', evidence, 'system_analyzer')
    ]);
    
    // Create a justification element
    const justificationElement = new ToolResultJustificationElement(
      'system_analyzer',
      evidence
    );
    
    // Manually compute confidence using the frame's method
    const confidenceResult = await frameInstance.computeInitialConfidence( 
      proposition,
      [justificationElement],
      client 
    );

    displaySystemMessage(`In ${frameType} frame:`);
    let evalText = `- Confidence in "${proposition}": ${confidenceResult.toFixed(2)}\n`;
    evalText += `- Interpretation focus: ${getFrameInterpretationFocus(frameType, evidence)}`;
    displayMessage('Adaptive Agent', evalText, COLORS.agent1);


    // Create a belief with this frame's evaluation
    const belief = new Belief(
      proposition,
      confidenceResult,
      new Justification([justificationElement])
    );
    
    return belief;
  }

  // Evaluate in each frame, passing the main geminiClient instance
  const efficiencyBelief = await evaluateInFrame('Efficiency', new EfficiencyFrame(), geminiClient);
  const thoroughnessBelief = await evaluateInFrame('Thoroughness', new ThoroughnessFrame(), geminiClient);
  const securityBelief = await evaluateInFrame('Security', new SecurityFrame(), geminiClient);
  
  // Show comparison
  displaySystemMessage('Comparison of belief confidence across frames:');
  let comparisonText = `- Efficiency frame: ${efficiencyBelief.confidence.toFixed(2)}\n`;
  comparisonText += `- Thoroughness frame: ${thoroughnessBelief.confidence.toFixed(2)}\n`;
  comparisonText += `- Security frame: ${securityBelief.confidence.toFixed(2)}`;
  displayMessage('System', comparisonText, COLORS.info);


  // Determine the most cautious frame
  const frames = [
    { name: 'Efficiency', confidence: efficiencyBelief.confidence },
    { name: 'Thoroughness', confidence: thoroughnessBelief.confidence },
    { name: 'Security', confidence: securityBelief.confidence }
  ];
  
  frames.sort((a, b) => a.confidence - b.confidence);
  
  console.log(`\nMost cautious frame: ${frames[0].name} (${frames[0].confidence.toFixed(2)})`);
  console.log(`Most optimistic frame: ${frames[2].name} (${frames[2].confidence.toFixed(2)})`);
}

/**
 * Helper function to describe how each frame interprets the evidence
 */
function getFrameInterpretationFocus(frameType: string, evidence: any): string {
  switch (frameType) {
    case 'Efficiency':
      return `Fast response time (${evidence.performance.response_time}) and high throughput (${evidence.performance.throughput})`;
    case 'Thoroughness':
      return `Test coverage (${evidence.quality.test_coverage}) and known issues (${evidence.quality.known_issues})`;
    case 'Security':
      return `Vulnerabilities (${evidence.security.vulnerabilities}, ${evidence.security.severity} severity)`;
    default:
      return 'Unknown interpretation';
  }
}

// Run the main function
main().catch(error => {
  console.error('Error in frame switching example:', error);
});
