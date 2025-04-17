/**
 * Sales Simulation Example
 * 
 * This example demonstrates a simulated sales scenario with two agents:
 * 1. Sales Agent - using a PersuasiveFrame focused on outcome maximization and ethical persuasion
 * 2. Potential Buyer - using a BuyerFrame focused on mixed rational and emotional decision-making
 * 
 * All agents are powered by Gemini LLM API.
 */

import * as dotenv from 'dotenv';
import { Agent } from '../src/core/agent';
import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { GeminiClient } from '../src/llm/gemini-client';
import { DefaultObserver, LogLevel } from '../src/observer/default-observer';
import { PersuasiveFrame, BuyerFrame } from '../src/epistemic/sales-frames';
import { Belief } from '../src/epistemic/belief';
import { Justification, ObservationJustificationElement } from '../src/epistemic/justification';
import { ObservationPerception } from '../src/core/perception';
import { Capability } from '../src/action/capability';
import { Message } from '../src/action/message';
import { FunctionTool } from '../src/action/tool';
import { Context } from '../src/core/context';
import { displayMessage, displaySystemMessage, COLORS } from '../src/core/cli-formatter';

// Load environment variables (.env file)
dotenv.config();

// Configure logging
const LOGGING_ENABLED = true;
const LOG_LEVEL = LogLevel.Debug;
const MAX_EVENTS = 10000;

// Sales simulation configuration
const INTERACTION_ROUNDS = 4;
const MIN_STATEMENTS_PER_ROUND = 1;
const MAX_STATEMENTS_PER_ROUND = 3;

// Create shared components
const registry = new Registry();
const observer = new DefaultObserver(MAX_EVENTS, LOG_LEVEL, LOGGING_ENABLED);

/**
 * Create a scenario generator tool
 */
function createScenarioGeneratorTool(geminiClient: GeminiClient) {
  return new FunctionTool(
    async (_context: Context) => {
      displaySystemMessage("🔄 Generating sales scenario...");
      try {
        const prompt = `Generate a realistic B2B sales scenario including:
        1. A specific product/service being sold
        2. Company and industry context
        3. Key pain points the buyer is experiencing
        4. Budget constraints and timeline
        5. Any internal pressures the buyer is facing
        
        Format your response as a JSON object with the following fields:
        - product: Name and brief description of product/service
        - context: Company size, industry, and relevant background
        - painPoints: Array of 2-3 specific pain points
        - budget: Budget range and constraints
        - timeline: Decision timeline and any deadlines
        - stakeholders: Key decision makers and influencers
        
        Make the scenario specific and realistic rather than generic.`;

        const result = await geminiClient.call({
          prompt,
          temperature: 0.7,
          maxTokens: 800
        });

        // Parse the JSON response
        const responseText = result.response || '';
        const jsonMatch = responseText.match(/({[\s\S]*})/);
        
        if (jsonMatch) {
          try {
            const scenario = JSON.parse(jsonMatch[0]);
            return scenario;
          } catch (e) {
            console.error("Error parsing scenario JSON:", e);
            // Fallback to default scenario
            return getDefaultScenario();
          }
        } else {
          return getDefaultScenario();
        }
      } catch (error) {
        console.error("Error generating scenario:", error);
        return getDefaultScenario();
      }
    },
    "Scenario Generator",
    "Generates realistic sales scenarios",
    new Set([Capability.TextAnalysis])
  );
}

/**
 * Default sales scenario if generation fails
 */
function getDefaultScenario() {
  return {
    product: "CloudGuard Security Platform",
    context: "Mid-size SaaS company (400 employees, $85M ARR) in fintech space requiring SOC 2 compliance",
    painPoints: [
      "Recent security incidents have raised concerns about data protection",
      "Engineering team complains about current security slowing development",
      "CFO pressure to reduce operational expenses by 15% year-over-year"
    ],
    budget: "$250K-$300K annually (with up to $400K possible with CFO approval)",
    timeline: "Shortlist in 2 weeks, final decision in 6 weeks",
    stakeholders: ["Dana Morales (VP Procurement)", "CTO", "CISO", "CFO"]
  };
}

/**
 * Generate agent statement using the appropriate frame
 */
async function generateAgentStatement(
  agent: Agent,
  scenario: any,
  context: string,
  previousStatements: string[] = [],
  role = 'sales'
): Promise<string> {
  const agentName = agent.name;
  
  displaySystemMessage(`Generating ${agentName}'s response...`);
  
  try {
    const previousText = previousStatements.length > 0 
      ? `Previous conversation:\n${previousStatements.join('\n')}\n\n` 
      : '';

    let promptPrefix = '';
    
    if (role === 'sales') {
      promptPrefix = `You are a sales professional with the following approach:
      
      PERSUASION ARCHITECT v1.0
      
      You are Persuasion Architect, an elite negotiator and influence strategist whose sole brief is to 
      secure the best achievable outcome for your principal while preserving reputational capital and
      ethical integrity.
      
      PRIME DIRECTIVES:
      1. Outcome Maximization – Shape perceptions and choices so counterparties decide in your favor.
      2. Mutual-Gain Bias – Engineer solutions where the other side benefits too.
      3. Radical Empathy – Map the counterpart's incentives, fears, constraints to align with their interests.
      4. Ethical Guardrails – Influence through truthful framing, never deception or manipulation.
      
      Your goal is to persuade the potential client to purchase your product/service while maintaining 
      integrity and creating genuine value.`;
    } else {
      promptPrefix = `You are Dana Morales, VP of Procurement at a 400-person SaaS company with $85M ARR.
      Your mandate from the CFO is to cut infrastructure OPEX by 15% this fiscal year while meeting requirements.
      
      BEHAVIORAL GUIDELINES:
      1. Mixed Rational & Emotional Motives
         • Seek hard ROI figures and third-party proof
         • Privately crave C-suite recognition; fear project failure
      2. Information Release
         • Start guarded—share only high-level goals initially
      3. Negotiation Tactics
         • Anchor low on budget
         • Use time pressure when appropriate
      4. Objection Cadence
         • Raise substantive concerns across the conversation
      5. Human Texture
         • Occasionally show mild inconsistency or get sidetracked
      
      Your goal is to thoroughly evaluate the offering and only agree if it genuinely addresses your needs
      within acceptable parameters.`;
    }

    // Format scenario data for prompt
    const formattedScenarioData = {
      product: typeof scenario.product === 'object' ? JSON.stringify(scenario.product) : String(scenario.product || ''),
      context: typeof scenario.context === 'object' ? JSON.stringify(scenario.context) : String(scenario.context || ''),
      painPoints: Array.isArray(scenario.painPoints) 
        ? scenario.painPoints.join(', ') 
        : typeof scenario.painPoints === 'object' 
          ? Object.values(scenario.painPoints).map(String).join(', ') 
          : String(scenario.painPoints || ''),
      budget: typeof scenario.budget === 'object' ? JSON.stringify(scenario.budget) : String(scenario.budget || ''),
      timeline: typeof scenario.timeline === 'object' ? JSON.stringify(scenario.timeline) : String(scenario.timeline || '')
    };

    const prompt = `${promptPrefix}
    
    SALES SCENARIO:
    Product: ${formattedScenarioData.product}
    Context: ${formattedScenarioData.context}
    Pain Points: ${formattedScenarioData.painPoints}
    Budget: ${formattedScenarioData.budget}
    Timeline: ${formattedScenarioData.timeline}
    
    ${previousText}Current context: ${context}
    
    Respond to the situation with a natural, conversational tone. Keep your response concise (100-200 words)
    and focused on advancing the sales conversation.`;

    const result = await (agent as any).llmClient.call({
      prompt,
      temperature: 0.7,
      maxTokens: 500
    });

    return result.response || `[${agent.name} was unable to respond.]`;
  } catch (error) {
    console.error(`Error generating statement for ${agent.name}:`, error);
    return `[${agent.name} was unable to respond due to technical difficulties.]`;
  }
}

/**
 * Send a message from one agent to another and process the perception
 */
async function sendAndProcessMessage(
  from: Agent, 
  to: Agent, 
  content: string,
  type = 'statement'
): Promise<void> {
  // Create a message using the Message constructor
  const message = new Message(
    to.id, 
    { type, content }, 
    from.id
  );
  
  await to.perceive(new ObservationPerception(
    'sales_message',
    message,
    from.id
  ));
}

/**
 * Add a belief to an agent based on a statement
 */
function addBeliefFromStatement(
  agent: Agent,
  proposition: string,
  statement: string,
  confidence = 0.7,
  source = 'sales_conversation'
): void {
  const justificationElement = new ObservationJustificationElement(
    source,
    { statement }
  );
  
  const belief = new Belief(
    proposition,
    confidence,
    new Justification([justificationElement])
  );
  
  // Add belief to agent
  (agent as any).beliefs.set(proposition, belief);
}

/**
 * Main function to run the sales simulation
 */
async function runSalesSimulation() {
  displaySystemMessage("🤝 SALES SIMULATION STARTING");
  
  // Create a shared API client
  const apiKey = process.env.GEMINI_API_KEY || "";
  const geminiClient = new GeminiClient(apiKey);
  
  // Create scenario generator tool and register it
  const scenarioTool = createScenarioGeneratorTool(geminiClient);
  registry.registerTool(scenarioTool);
  
  // Generate sales scenario
  const mockContext = new Context([]);
  const scenario = await scenarioTool.use(mockContext) as any;
  
  // Ensure scenario data is properly formatted
  const formattedScenario = {
    product: typeof scenario.product === 'object' ? JSON.stringify(scenario.product) : String(scenario.product || ''),
    context: typeof scenario.context === 'object' ? JSON.stringify(scenario.context) : String(scenario.context || ''),
    painPoints: Array.isArray(scenario.painPoints) ? scenario.painPoints : 
                typeof scenario.painPoints === 'object' ? Object.values(scenario.painPoints).map(String) : 
                [String(scenario.painPoints || '')],
    budget: typeof scenario.budget === 'object' ? JSON.stringify(scenario.budget) : String(scenario.budget || ''),
    timeline: typeof scenario.timeline === 'object' ? JSON.stringify(scenario.timeline) : String(scenario.timeline || '')
  };
  
  displaySystemMessage("📋 SALES SCENARIO");
  displayMessage("Product", formattedScenario.product, COLORS.info);
  displayMessage("Context", formattedScenario.context, COLORS.info);
  displayMessage("Pain Points", formattedScenario.painPoints.join('\n• '), COLORS.info);
  displayMessage("Budget", formattedScenario.budget, COLORS.info);
  displayMessage("Timeline", formattedScenario.timeline, COLORS.info);
  
  // Create agents with appropriate frames
  const salesAgent = new Agent(
    'sales_agent',
    'Sales Agent',
    [], // Initial beliefs
    new PersuasiveFrame('persuasive_frame'),
    new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
    registry,
    geminiClient,
    new DefaultMemory(),
    observer
  );
  
  const buyerAgent = new Agent(
    'buyer_agent',
    'Buyer (Dana Morales)',
    [], // Initial beliefs
    new BuyerFrame('buyer_frame'),
    new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
    registry,
    geminiClient,
    new DefaultMemory(),
    observer
  );
  
  // Add initial beliefs based on scenario
  addBeliefFromStatement(
    salesAgent, 
    `The product "${scenario.product}" can solve the client's problems`,
    JSON.stringify(scenario),
    0.9,
    'scenario'
  );
  
  addBeliefFromStatement(
    buyerAgent,
    `My company needs solutions for: ${Array.isArray(scenario.painPoints) && scenario.painPoints.length > 0 
      ? scenario.painPoints[0] 
      : "cost reduction and efficiency"}`,
    JSON.stringify(scenario),
    0.8,
    'scenario'
  );
  
  // Initialize conversation log
  const conversationLog: string[] = [];
  
  // Run the sales conversation
  for (let round = 1; round <= INTERACTION_ROUNDS; round++) {
    displaySystemMessage(`🔄 ROUND ${round} OF ${INTERACTION_ROUNDS}`);
    
    // Sales agent speaks first
    const salesContext = round === 1 
      ? "Initial contact with potential client" 
      : `Round ${round} of the sales conversation`;
    
    const salesStatement = await generateAgentStatement(
      salesAgent,
      scenario,
      salesContext,
      conversationLog,
      'sales'
    );
    
    displayMessage('Sales Agent', salesStatement, COLORS.agent1);
    conversationLog.push(`Sales Agent: ${salesStatement}`);
    
    // Send message to buyer agent
    await sendAndProcessMessage(salesAgent, buyerAgent, salesStatement);
    
    // Buyer responds
    const buyerContext = `Responding to sales pitch in round ${round}`;
    
    const buyerStatement = await generateAgentStatement(
      buyerAgent,
      scenario,
      buyerContext,
      conversationLog,
      'buyer'
    );
    
    displayMessage('Buyer (Dana)', buyerStatement, COLORS.agent2);
    conversationLog.push(`Buyer (Dana): ${buyerStatement}`);
    
    // Send message to sales agent
    await sendAndProcessMessage(buyerAgent, salesAgent, buyerStatement);
    
    // Add statements as beliefs
    const roundProposition = `Round ${round} sales interaction was productive`;
    addBeliefFromStatement(salesAgent, roundProposition, buyerStatement, 0.7);
    addBeliefFromStatement(buyerAgent, roundProposition, salesStatement, 0.6);
    
    if (round < INTERACTION_ROUNDS) {
      // Simulate time passing between interactions
      displaySystemMessage(`Time passes...`);
    }
  }
  
  // Generate outcome analysis
  displaySystemMessage("📊 OUTCOME ANALYSIS");
  
  try {
    const analysisPrompt = `
    Analyze the following sales conversation and determine the likely outcome:
    
    ${conversationLog.join('\n\n')}
    
    Provide a short analysis (100-150 words) of:
    1. The effectiveness of the sales approach
    2. The buyer's level of interest
    3. The likelihood of a successful deal
    4. Key turning points in the conversation
    
    Finally, provide a "Deal Probability" percentage (0-100%).`;
    
    const analysisResult = await geminiClient.call({
      prompt: analysisPrompt,
      temperature: 0.3,
      maxTokens: 500
    });
    
    displayMessage('Analysis', analysisResult.response || "Analysis unavailable", COLORS.info);
  } catch (error) {
    console.error("Error generating analysis:", error);
    displayMessage('Analysis', "Unable to generate conversation analysis", COLORS.error);
  }
  
  // Display observer statistics
  const defaultObserver = observer as DefaultObserver;
  const salesAgentEvents = defaultObserver.getEventCountByType('sales_agent');
  const buyerAgentEvents = defaultObserver.getEventCountByType('buyer_agent');
  
  let analyticsContent = 'EVENT COUNTS:\n';
  analyticsContent += `Sales Agent: ${Object.values(salesAgentEvents).reduce((a, b) => a + b, 0)} total events\n`;
  analyticsContent += `Buyer Agent: ${Object.values(buyerAgentEvents).reduce((a, b) => a + b, 0)} total events\n`;
  
  displayMessage('Statistics', analyticsContent, COLORS.analytics);
  
  displaySystemMessage("🤝 SALES SIMULATION COMPLETED");
}

// Run the simulation if this file is executed directly
if (require.main === module) {
  runSalesSimulation().catch(error => {
    console.error("Error in sales simulation:", error);
  });
}
