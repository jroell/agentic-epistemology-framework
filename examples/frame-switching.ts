/**
 * Frame switching example
 * 
 * This example demonstrates how an agent can switch frames to adapt
 * to different situations, affecting its belief formation and decision-making.
 */

import {
  Agent,
  Registry,
  DefaultMemory,
  DefaultObserver,
  LogLevel,
  EfficiencyFrame,
  ThoroughnessFrame,
  SecurityFrame,
  Belief,
  Justification,
  ToolResultJustificationElement,
  ObservationJustificationElement,
  Perception,
  ToolResultPerception,
  ObservationPerception,
  Frame,
  FrameFactory,
  Capability,
  ActionFactory,
  Goal,
  TaskGoal,
  FrameAdaptationGoal,
  Plan,
  PlanStatus,
  Context,
  ContextElement
} from '../src';

// Create a registry
const registry = new Registry();

// Create a memory instance
const memory = new DefaultMemory();

// Create an observer with console logging enabled
const observer = new DefaultObserver(1000, LogLevel.Debug, true);

// Create an agent starting with the efficiency frame
const efficiencyFrame = new EfficiencyFrame();
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
  memory,
  observer
);

// Main execution
async function main() {
  console.log('--- Frame Switching Example Started ---');
  
  // Phase 1: Agent operates with Efficiency frame
  console.log('\n--- Phase 1: Efficiency Frame ---');
  await operateWithEfficiencyFrame();
  
  // Phase 2: Agent switches to Thoroughness frame
  console.log('\n--- Phase 2: Switching to Thoroughness Frame ---');
  await switchToThoroughnessFrame();
  
  // Phase 3: Agent switches to Security frame based on new information
  console.log('\n--- Phase 3: Switching to Security Frame ---');
  await switchToSecurityFrame();
  
  // Phase 4: Compare beliefs across frames
  console.log('\n--- Phase 4: Comparing Belief Confidence Across Frames ---');
  await compareBeliefConfidence();
  
  console.log('\n--- Frame Switching Example Completed ---');
}

/**
 * Phase 1: Agent operates with Efficiency frame
 */
async function operateWithEfficiencyFrame() {
  console.log(`Current frame: ${agent['frame'].name}`);
  
  // Create some initial beliefs under Efficiency frame
  agent.perceive(new ToolResultPerception(
    'performance_monitor',
    {
      execution_time: '50ms',
      throughput: '1000 items/sec',
      resource_utilization: '30%'
    }
  ));
  
  agent.perceive(new ObservationPerception(
    'system_metrics',
    {
      latency: 'low',
      response_time: 'fast',
      user_satisfaction: 'high'
    }
  ));
  
  // Show current beliefs
  console.log('\nBeliefs formed under Efficiency frame:');
  const beliefs = agent.getBeliefs();
  beliefs.forEach(belief => {
    console.log(`- ${belief.toString()}`);
  });
  
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
  
  console.log(`\nExecuting task: ${efficiencyTask.description}`);
  const plan = agent.plan(efficiencyTask);
  
  if (plan) {
    agent.executePlan(plan);
    console.log(`Task completed with status: ${plan.status}`);
  } else {
    console.log('Failed to create plan for the task');
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
  
  console.log(`Frame adaptation goal: ${adaptationGoal.description}`);
  
  // Execute frame change
  const thoroughnessFrame = new ThoroughnessFrame();
  agent.setFrame(thoroughnessFrame);
  
  console.log(`New frame: ${agent['frame'].name}`);
  
  // Create new perceptions under Thoroughness frame
  agent.perceive(new ToolResultPerception(
    'quality_analyzer',
    {
      accuracy: '99.8%',
      error_rate: '0.2%',
      coverage: 'comprehensive',
      validation_level: 'rigorous'
    }
  ));
  
  agent.perceive(new ObservationPerception(
    'data_integrity',
    {
      completeness: 'full',
      consistency: 'high',
      reliability: 'excellent'
    }
  ));
  
  // Show current beliefs
  console.log('\nBeliefs formed or updated under Thoroughness frame:');
  const beliefs = agent.getBeliefs();
  beliefs.forEach(belief => {
    console.log(`- ${belief.toString()}`);
  });
  
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
  
  console.log(`\nExecuting task: ${thoroughnessTask.description}`);
  const plan = agent.plan(thoroughnessTask);
  
  if (plan) {
    agent.executePlan(plan);
    console.log(`Task completed with status: ${plan.status}`);
  } else {
    console.log('Failed to create plan for the task');
  }
}

/**
 * Phase 3: Agent switches to Security frame based on new information
 */
async function switchToSecurityFrame() {
  // Agent receives security-relevant information
  console.log('Received security alert information');
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
  
  console.log(`Frame adaptation goal: ${adaptationGoal.description}`);
  
  // Execute frame change
  const securityFrame = new SecurityFrame();
  agent.setFrame(securityFrame);
  
  console.log(`New frame: ${agent['frame'].name}`);
  
  // Create new perceptions under Security frame
  agent.perceive(new ObservationPerception(
    'threat_analysis',
    {
      threat_level: 'elevated',
      attack_vectors: ['injection', 'authorization_bypass'],
      potential_impact: 'data_breach'
    }
  ));
  
  // Show current beliefs
  console.log('\nBeliefs formed or updated under Security frame:');
  const beliefs = agent.getBeliefs();
  beliefs.forEach(belief => {
    console.log(`- ${belief.toString()}`);
  });
  
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
  
  console.log(`\nExecuting task: ${securityTask.description}`);
  const plan = agent.plan(securityTask);
  
  if (plan) {
    agent.executePlan(plan);
    console.log(`Task completed with status: ${plan.status}`);
  } else {
    console.log('Failed to create plan for the task');
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
  
  console.log('Evaluating the same evidence across different frames');
  console.log(`Proposition: "${proposition}"`);
  
  // Function to evaluate in a specific frame
  async function evaluateInFrame(frameType: string, frameInstance: Frame) {
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
    const confidence = frameInstance.computeInitialConfidence(
      proposition,
      [justificationElement]
    );
    
    console.log(`\nIn ${frameType} frame:`);
    console.log(`- Confidence in "${proposition}": ${confidence.toFixed(2)}`);
    console.log(`- Interpretation focus: ${getFrameInterpretationFocus(frameType, evidence)}`);
    
    // Create a belief with this frame's evaluation
    const belief = new Belief(
      proposition,
      confidence,
      new Justification([justificationElement])
    );
    
    return belief;
  }
  
  // Evaluate in each frame
  const efficiencyBelief = await evaluateInFrame('Efficiency', new EfficiencyFrame());
  const thoroughnessBelief = await evaluateInFrame('Thoroughness', new ThoroughnessFrame());
  const securityBelief = await evaluateInFrame('Security', new SecurityFrame());
  
  // Show comparison
  console.log('\nComparison of belief confidence across frames:');
  console.log(`- Efficiency frame: ${efficiencyBelief.confidence.toFixed(2)}`);
  console.log(`- Thoroughness frame: ${thoroughnessBelief.confidence.toFixed(2)}`);
  console.log(`- Security frame: ${securityBelief.confidence.toFixed(2)}`);
  
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
