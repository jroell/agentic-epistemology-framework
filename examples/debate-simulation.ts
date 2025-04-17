/**
 * Debate Simulation Example with Colorful UI
 * 
 * This advanced example demonstrates a simulated debate with four agents:
 * 1. Moderator - using a ModeratorFrame focused on fairness
 * 2. Debater A - using a ProDebateFrame focused on supporting arguments
 * 3. Debater B - using a ConDebateFrame focused on opposing arguments
 * 4. Judge - using a JudgeFrame focused on evaluating quality of arguments
 * 
 * All agents are powered by Gemini LLM API.
 * The UI uses chalk for a colored terminal experience.
 */

import * as dotenv from 'dotenv';
import { Agent } from '../src/core/agent';

// Use chalk individually
const chalk = {
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: {
    yellow: (text: string) => `\x1b[1;33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[1;34m${text}\x1b[0m`,
    red: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[1;32m${text}\x1b[0m`,
    white: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[1;35m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[1;90m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[1;36m${text}\x1b[0m`
  }
};

import { Registry } from '../src/core/registry';
import { DefaultMemory } from '../src/core/memory';
import { GeminiClient } from '../src/llm/gemini-client';
import { DefaultObserver, LogLevel } from '../src/observer/default-observer';
import { ModeratorFrame, ProDebateFrame, ConDebateFrame, JudgeFrame } from '../src/epistemic/debate-frames';
import { Belief } from '../src/epistemic/belief';
import { Justification, ObservationJustificationElement } from '../src/epistemic/justification';
import { ObservationPerception } from '../src/core/perception';
import { Capability } from '../src/action/capability';
import { Message } from '../src/action/message';
import { Frame } from '../src/epistemic/frame'; // Tool import removed as it was unused
import { FunctionTool } from '../src/action/tool'; // Removed Tool import
import { Context } from '../src/core/context';

// Load environment variables (.env file)
dotenv.config();

// Configure logging
const LOGGING_ENABLED = true;
const LOG_LEVEL = LogLevel.Debug;
const MAX_EVENTS = 10000;

// Override console methods to add colors to JSON logs
const originalConsoleDebug = console.debug;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Helper function to colorize JSON output
function colorizeJson(jsonString: string): string {
  try {
    // Replace JSON syntax with colored versions
    return jsonString
      .replace(/{/g, chalk.gray('{'))
      .replace(/}/g, chalk.gray('}'))
      .replace(/\[/g, chalk.gray('['))
      .replace(/\]/g, chalk.gray(']'))
      .replace(/"([^"]+)":/g, `${chalk.cyan('"$1"')}:`)
      .replace(/: "([^"]+)"/g, `: ${chalk.green('"$1"')}`)
      .replace(/: (true|false)/g, `: ${chalk.yellow('$1')}`)
      .replace(/: ([0-9]+\.?[0-9]*)/g, `: ${chalk.yellow('$1')}`);
  } catch (e) {
    return jsonString;
  }
}

// Monkey patch console methods to colorize JSON output
console.debug = function(...args: unknown[]) { // Use unknown[] instead of any[]
  const newArgs = args.map(arg => {
    if (typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))) {
      return colorizeJson(arg);
    }
    return arg;
  });
  originalConsoleDebug.apply(console, newArgs);
};

console.info = function(...args: unknown[]) { // Use unknown[] instead of any[]
  const newArgs = args.map(arg => {
    if (typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))) {
      return colorizeJson(arg);
    }
    return arg;
  });
  originalConsoleInfo.apply(console, newArgs);
};

console.warn = function(...args: unknown[]) { // Use unknown[] instead of any[]
  const newArgs = args.map(arg => {
    if (typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))) {
      return colorizeJson(arg);
    }
    return arg;
  });
  originalConsoleWarn.apply(console, newArgs);
};

console.error = function(...args: unknown[]) { // Use unknown[] instead of any[]
  const newArgs = args.map(arg => {
    if (typeof arg === 'string' && (arg.trim().startsWith('{') || arg.trim().startsWith('['))) {
      return colorizeJson(arg);
    }
    return arg;
  });
  originalConsoleError.apply(console, newArgs);
};

// Debate configuration
const DEBATE_ROUNDS = 3;
const MIN_STATEMENTS_PER_ROUND = 1;
const MAX_STATEMENTS_PER_ROUND = 2;

// Colors and styling
const COLORS = {
  moderator: (text: string) => chalk.bold.yellow(text),
  debaterA: (text: string) => chalk.bold.blue(text),
  debaterB: (text: string) => chalk.bold.red(text),
  judge: (text: string) => chalk.bold.green(text),
  topic: (text: string) => chalk.bold.white(text),
  round: (text: string) => chalk.bold.magenta(text),
  system: (text: string) => chalk.gray(text),
  analytics: (text: string) => chalk.cyan(text),
  divider: (text: string) => chalk.gray(text),
  box: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  }
};

// Create shared components
const registry = new Registry();
const observer = new DefaultObserver(MAX_EVENTS, LOG_LEVEL, LOGGING_ENABLED);

// Create a shared API client with proper API key
// Hard-coding the API key for this example only (normally would use process.env.GEMINI_API_KEY)
const apiKey = "AIzaSyAoNAZyLsdBJZTSa7A_YJsrpkN74plgDww";
console.log(COLORS.system(`Using Gemini API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`));

// Determine log format from environment variable (set by command line args)
// const logFormat = process.env.LOG_FORMAT === 'json' ? 'json' : 'simple'; // Removed unused variable
const geminiClient = new GeminiClient(apiKey);

// Create a topic generator tool
const topicGeneratorTool = new FunctionTool(
  async (_context: Context) => { // Mark context as unused
    console.log(COLORS.system("📋 Generating debate topic..."));
    try {
      const prompt = `Generate a interesting but somewhat controversial debate topic suitable for a structured debate. 
      The topic should be debatable from both sides with good arguments available for each position.
      The topic should be suitable for an intellectual debate and not overly political or divisive.
      Return ONLY the debate topic as a simple statement in the format "Resolved: [topic]" without any additional text.`;

      // Use the GeminiClient's public API
      const result = await geminiClient.call({
        prompt,
        temperature: 0.7,
        maxTokens: 100
      });

      const topic = result.response || "Resolved: Artificial intelligence will ultimately benefit humanity more than harm it.";
      return { topic };
    } catch (error) {
      console.error("Error generating topic:", error);
      return { topic: "Resolved: Artificial intelligence will ultimately benefit humanity more than harm it." };
    }
  },
  "Topic Generator",
  "Generates debate topics dynamically based on current trends and interests",
  new Set([Capability.TextAnalysis])
);

// Create argument analysis tool
const argumentAnalysisTool = new FunctionTool(
  async (context: Context, params: { text: string, perspective: string }) => {
    console.log(COLORS.system(`🧠 Analyzing argument from ${params.perspective} perspective...`));
    try {
      const prompt = `
      Analyze the following argument from a ${params.perspective} perspective.
      Argument: "${params.text}"
      
      Provide a structured analysis with the following:
      1. Key claims identified
      2. Evidence quality assessment
      3. Logical structure evaluation
      4. Overall strength rating (0-100)
      `;

      // Use the GeminiClient's public API
      const result = await geminiClient.call({
        prompt,
        temperature: 0.3,
        maxTokens: 500
      });

      return { 
        analysis: result.response || `Failed to analyze argument from ${params.perspective} perspective`,
        source: params.perspective
      };
    } catch (error) {
      console.error("Error analyzing argument:", error);
      return { 
        analysis: `Failed to analyze argument from ${params.perspective} perspective`,
        source: params.perspective
      };
    }
  },
  "Argument Analyzer",
  "Analyzes debate arguments from different perspectives",
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning])
);

// Register tools
registry.registerTool(topicGeneratorTool);
registry.registerTool(argumentAnalysisTool);

// Create agents with different debate frames
const moderator = new Agent(
  'moderator',
  'Debate Moderator',
  [], // Initial beliefs
  new ModeratorFrame('moderator_frame'),
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
  registry,
  geminiClient,
  new DefaultMemory(),
  observer
);

const debaterA = new Agent(
  'debater_a',
  'Debater A (Pro)',
  [], // Initial beliefs
  new ProDebateFrame('pro_frame'),
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
  registry,
  geminiClient,
  new DefaultMemory(),
  observer
);

const debaterB = new Agent(
  'debater_b',
  'Debater B (Con)',
  [], // Initial beliefs
  new ConDebateFrame('con_frame'),
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
  registry,
  geminiClient,
  new DefaultMemory(),
  observer
);

const judge = new Agent(
  'judge',
  'Debate Judge',
  [], // Initial beliefs
  new JudgeFrame('judge_frame'),
  new Set([Capability.TextAnalysis, Capability.LogicalReasoning, Capability.SelfMonitoring]),
  registry,
  geminiClient,
  new DefaultMemory(),
  observer
);

/**
 * Use Gemini to generate a statement from an agent's perspective
 */
async function generateAgentStatement(
  agent: Agent, 
  topic: string, 
  context: string, 
  previousStatements: string[] = [],
  role = 'neutral'
): Promise<string> {
  const frame = (agent as any).frame as Frame; // Note: Accessing private member via 'any' cast - consider adding a getter to Agent
  
  console.log(COLORS.system(`🗣️  Generating statement from ${agent.name} (${frame.name} frame)...`));
  
  try {
    const previousText = previousStatements.length > 0 
      ? `Previous statements in this round:\n${previousStatements.join('\n')}\n\n` 
      : '';

    const prompt = `
    You are ${agent.name}, a debater with a ${frame.name} frame in a formal debate.
    
    Topic: ${topic}
    
    ${previousText}Current context: ${context}
    
    ${role === 'pro' ? 'You are arguing IN FAVOR of the resolution.' : 
      role === 'con' ? 'You are arguing AGAINST the resolution.' : 
      'You should maintain neutrality as a moderator/judge.'}
      
    As someone with a ${frame.description}, you prioritize ${
      frame.name === 'Pro Debater' ? 'supporting evidence and persuasive arguments.' :
      frame.name === 'Con Debater' ? 'critical analysis and identifying flaws.' :
      frame.name === 'Moderator' ? 'fairness, balance, and neutrality.' :
      frame.name === 'Judge' ? 'logical analysis, evidence quality, and argumentative structure.' :
      'balanced consideration of multiple perspectives.'
    }
    
    Generate a ${
      frame.name === 'Moderator' ? 'clear, neutral question or statement to guide the debate' :
      frame.name === 'Judge' ? 'fair assessment of the arguments presented' :
      'compelling argument based on your perspective'
    }.
    
    ${
      frame.name === 'Pro Debater' ? 'Make strong supporting claims backed by evidence.' :
      frame.name === 'Con Debater' ? 'Critically examine assumptions and point out weaknesses.' :
      frame.name === 'Judge' ? 'Analyze the logical structure and evidence quality of both sides.' :
      ''
    }
    
    Keep your response concise (150-250 words) and focused.
    `;

    // Use the GeminiClient's public API
    const result = await geminiClient.call({
      prompt,
      temperature: 0.7,
      maxTokens: 500
    });

    return result.response || `[${agent.name} was unable to respond due to technical difficulties]`;
  } catch (error) {
    console.error(`Error generating statement for ${agent.name}:`, error);
    return `[${agent.name} was unable to respond due to technical difficulties]`;
  }
}

/**
 * Use Gemini to generate a topic and opening for the debate
 */
async function generateDebateTopic(): Promise<{ topic: string, description: string }> {
  try {
    // Generate topic using the tool
    const mockContext = new Context([]);
    const topicResult = await topicGeneratorTool.use(mockContext) as { topic: string };
    const topic = topicResult.topic;
    
    // Generate a description/context for the debate
    const prompt = `
    The following is a debate topic: "${topic}"
    
    Generate a short, neutral context paragraph (about 100 words) that introduces this topic, explains why it's worth debating, 
    and provides some brief background information that would help frame the debate.
    
    Write only the description paragraph without any preamble, introduction, or conclusion.
    `;

    // Use the GeminiClient's public API
    const result = await geminiClient.call({
      prompt,
      temperature: 0.7,
      maxTokens: 300
    });

    return {
      topic,
      description: result.response || "No description available."
    };
  } catch (error) {
    console.error("Error generating debate topic:", error);
    return { 
      topic: "Resolved: Artificial intelligence will ultimately benefit humanity more than harm it.",
      description: "Artificial intelligence presents both tremendous opportunities and significant risks. As AI systems grow more powerful and autonomous, we must weigh potential benefits like accelerated research and economic growth against risks like job displacement and autonomous weapons. This fundamental question shapes how we develop, regulate, and deploy these technologies."
    };
  }
}

/**
 * Generate a judge's final decision
 */
async function generateJudgingDecision(
  topic: string, 
  debateLog: {round: number, statements: {agent: string, text: string}[]}[],
  agent: Agent
): Promise<string> {
  console.log(COLORS.system(`⚖️  Judge is evaluating the debate...`));
  
  try {
    // Create a formatted debate transcript
    const transcript = debateLog.map(round => {
      return `ROUND ${round.round}:\n${round.statements.map(s => `${s.agent}: ${s.text}`).join('\n\n')}`;
    }).join('\n\n' + '='.repeat(50) + '\n\n');
    
    const prompt = `
    You are ${agent.name}, a debate judge with a ${(agent as any).frame.name /* Note: Accessing private member */} frame in a formal debate.
    
    Topic: ${topic}
    
    Your task is to carefully evaluate the debate transcript below and render a fair decision.
    
    ${transcript}
    
    As someone with a ${(agent as any).frame.description /* Note: Accessing private member */}, you evaluate arguments based on:
    1. Quality of evidence presented
    2. Logical reasoning
    3. Persuasiveness
    4. Clarity and organization
    5. Responses to opposing arguments
    
    Please provide:
    1. A summary of key arguments from both sides
    2. An analysis of the strengths and weaknesses of each side
    3. Your final decision including who won the debate and why
    4. A point-based scoring (1-10) across different dimensions
    
    Be specific about what arguments and techniques were most effective.
    Your decision should be fair, detailed, and based solely on the content of the debate.
    `;

    // Use the GeminiClient's public API
    const result = await geminiClient.call({
      prompt,
      temperature: 0.3,
      maxTokens: 1500
    });

    return result.response || "Due to technical difficulties, the judge is unable to render a complete decision at this time.";
  } catch (error) {
    console.error("Error generating judge's decision:", error);
    return "Due to technical difficulties, the judge is unable to render a complete decision at this time.";
  }
}

/**
 * Generate a moderator's opening question
 */
async function generateModeratorQuestion(
  topic: string, 
  description: string, 
  round: number,
  previousStatements: string[] = []
): Promise<string> {
  console.log(COLORS.system(`❓ Moderator generating question for round ${round}...`));
  
  try {
    const roundText = round === 1 ? 'opening statements' :
                    round === DEBATE_ROUNDS ? 'closing statements' :
                    `round ${round}`;

    const previousText = previousStatements.length > 0 
      ? `Previous statements in the debate:\n${previousStatements.join('\n\n')}\n\n` 
      : '';
    
    const prompt = `
    You are the moderator of a formal debate.
    
    Topic: ${topic}
    Context: ${description}
    Current round: ${roundText}
    
    ${previousText}
    
    ${round === 1 ? 
      'Generate an opening question that invites debaters to present their initial positions on the topic.' :
      round === DEBATE_ROUNDS ? 
      'Generate a final question asking debaters to summarize their key arguments and provide a concluding statement.' :
      'Generate a focused question that builds on previous statements and pushes the debate forward. The question should highlight an important aspect not yet fully explored or address a point of contention between the debaters.'}
    
    Your question should be:
    1. Neutral and unbiased (not favoring either position)
    2. Clearly worded and specific
    3. Thought-provoking and substantive
    4. Relevant to the current state of the debate
    
    Write only the question without any preamble or explanation.
    `;

    // Use the GeminiClient's public API
    const result = await geminiClient.call({
      prompt,
      temperature: 0.5,
      maxTokens: 150
    });

    return result.response || (round === 1 
      ? `What is your position on whether ${topic.toLowerCase().replace('resolved: ', '')}?` 
      : "Please provide your next argument on this topic.");
  } catch (error) {
    console.error("Error generating moderator question:", error);
    return round === 1 
      ? `What is your position on whether ${topic.toLowerCase().replace('resolved: ', '')}?` 
      : "Please provide your next argument on this topic.";
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
  // Create a message using the Message constructor directly
  const message = new Message(
    to.id, 
    { type, content }, 
    from.id
  );
  
  await to.perceive(new ObservationPerception(
    'debate_message',
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
  source = 'debate'
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
  
  // Add belief by directly accessing the private method
  (agent as any).beliefs.set(proposition, belief); // Note: Accessing private member via 'any' cast - consider adding a method to Agent
}

// UI Helper functions
// Define a type for the color function
type ColorFunction = (text: string) => string;

function createBox(text: string, color: ColorFunction, width = 80): string { // Use ColorFunction type, remove inferred type for width
  const lines = wordWrap(text, width - 4);
  const box = {
    top: COLORS.box.topLeft + COLORS.box.horizontal.repeat(width - 2) + COLORS.box.topRight,
    bottom: COLORS.box.bottomLeft + COLORS.box.horizontal.repeat(width - 2) + COLORS.box.bottomRight,
    empty: COLORS.box.vertical + ' '.repeat(width - 2) + COLORS.box.vertical,
    content: (line: string) => COLORS.box.vertical + ' ' + line + ' '.repeat(Math.max(0, width - line.length - 4)) + ' ' + COLORS.box.vertical
  };

  let result = color(box.top) + '\n';
  
  lines.forEach(line => {
    result += color(box.content(line)) + '\n';
  });
  
  result += color(box.bottom);
  return result;
}

function wordWrap(text: string, maxLength: number): string[] {
  // Simple word wrap implementation
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    // Handle new line characters in the text
    if (word.includes('\n')) {
      const segments = word.split('\n');
      segments.forEach((segment, index) => {
        if (index === 0) {
          if (currentLine.length + segment.length + 1 <= maxLength) {
            currentLine += (currentLine ? ' ' : '') + segment;
          } else {
            lines.push(currentLine);
            currentLine = segment;
          }
        } else {
          lines.push(currentLine);
          currentLine = segment;
        }
      });
      return;
    }

    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function displayMessage(agent: string, message: string, round?: number): void {
  const width = process.stdout.columns || 80;
  const boxWidth = Math.min(width - 2, 100);
  
  let color = COLORS.system;
  let name = '';
  
  switch(agent.toLowerCase()) {
    case 'moderator':
      color = COLORS.moderator;
      name = 'MODERATOR';
      break;
    case 'debater a (pro)':
    case 'debater a':
    case 'pro':
      color = COLORS.debaterA;
      name = 'DEBATER A (PRO)';
      break;
    case 'debater b (con)':
    case 'debater b': 
    case 'con':
      color = COLORS.debaterB;
      name = 'DEBATER B (CON)';
      break;
    case 'judge':
      color = COLORS.judge;
      name = 'JUDGE';
      break;
    case 'system':
      color = COLORS.system;
      name = 'SYSTEM';
      break;
  }
  
  const header = name + (round ? ` (ROUND ${round})` : '');
  console.log('\n' + color(header));
  console.log(createBox(message, color, boxWidth));
}

function displaySystemMessage(message: string, width = 80): void { // Remove inferred type for width
  const boxWidth = Math.min(process.stdout.columns - 2 || width, width);
  const divider = '═'.repeat(boxWidth);
  console.log(COLORS.topic(divider));
  console.log(chalk.bold.white(message)); // Use chalk directly for bold
  console.log(COLORS.topic(divider));
}

/**
 * Main function to run the debate simulation
 */
async function runDebateSimulation() {
  console.clear();
  displaySystemMessage("🎭 DEBATE SIMULATION STARTING 🎭");
  
  // Step 1: Generate a debate topic
  const { topic, description } = await generateDebateTopic();
  
  displaySystemMessage(`📜 DEBATE TOPIC: ${topic}`);
  displayMessage('System', description);
  
  // Add beliefs to agents about the topic
  const topicProposition = `The proposition "${topic.replace('Resolved: ', '')}" is true`;
  addBeliefFromStatement(moderator, `${topicProposition} is debatable`, description, 0.9, 'topic_selection');
  addBeliefFromStatement(debaterA, topicProposition, description, 0.8, 'initial_position');
  addBeliefFromStatement(debaterB, `NOT ${topicProposition}`, description, 0.8, 'initial_position');
  addBeliefFromStatement(judge, `${topicProposition} requires evaluation`, description, 0.5, 'initial_position');
  
  // Initialize the debate log
  const debateLog: { 
    round: number, 
    statements: {agent: string, text: string}[] 
  }[] = [];
  
  const allStatements: string[] = [];
  
  // Step 2: Conduct debate rounds
  for (let round = 1; round <= DEBATE_ROUNDS; round++) {
    displaySystemMessage(`🔄 ROUND ${round} OF ${DEBATE_ROUNDS}`);
    
    // Moderator asks question
    const moderatorQuestion = await generateModeratorQuestion(
      topic, 
      description, 
      round, 
      allStatements
    );
    
    displayMessage('Moderator', moderatorQuestion, round);
    
    // Send moderator's question to both debaters
    await sendAndProcessMessage(moderator, debaterA, moderatorQuestion, 'question');
    await sendAndProcessMessage(moderator, debaterB, moderatorQuestion, 'question');
    await sendAndProcessMessage(moderator, judge, moderatorQuestion, 'question');
    
    // Initialize round in debate log
    const roundLog = {
      round,
      statements: [
        { agent: "Moderator", text: moderatorQuestion }
      ]
    };
    
    allStatements.push(`Moderator: ${moderatorQuestion}`);
    
    // Alternating responses with follow-ups
    const statementsThisRound = Math.floor(Math.random() * 
      (MAX_STATEMENTS_PER_ROUND - MIN_STATEMENTS_PER_ROUND + 1)) + MIN_STATEMENTS_PER_ROUND;
    
    for (let i = 0; i < statementsThisRound; i++) {
      // First debater A responds
      const debaterAResponse = await generateAgentStatement(
        debaterA, 
        topic, 
        `Round ${round}, responding to: ${moderatorQuestion}`,
        allStatements,
        'pro'
      );
      
      displayMessage('Debater A (Pro)', debaterAResponse, round);
      roundLog.statements.push({ agent: "Debater A (Pro)", text: debaterAResponse });
      allStatements.push(`Debater A (Pro): ${debaterAResponse}`);
      
      // Send debater A's response to others
      await sendAndProcessMessage(debaterA, moderator, debaterAResponse);
      await sendAndProcessMessage(debaterA, debaterB, debaterAResponse);
      await sendAndProcessMessage(debaterA, judge, debaterAResponse);
      
      // Then debater B responds
      const debaterBResponse = await generateAgentStatement(
        debaterB, 
        topic, 
        `Round ${round}, responding to: ${moderatorQuestion} and ${debaterAResponse}`,
        allStatements,
        'con'
      );
      
      displayMessage('Debater B (Con)', debaterBResponse, round);
      roundLog.statements.push({ agent: "Debater B (Con)", text: debaterBResponse });
      allStatements.push(`Debater B (Con): ${debaterBResponse}`);
      
      // Send debater B's response to others
      await sendAndProcessMessage(debaterB, moderator, debaterBResponse);
      await sendAndProcessMessage(debaterB, debaterA, debaterBResponse);
      await sendAndProcessMessage(debaterB, judge, debaterBResponse);
    }
    
    // Add round to debate log
    debateLog.push(roundLog);
  }
  
  // Step 3: Judge renders a decision
  displaySystemMessage("⚖️ JUDGE'S DECISION");
  
  const judgement = await generateJudgingDecision(topic, debateLog, judge);
  displayMessage('Judge', judgement);
  
  // Send judgement to all participants
  await sendAndProcessMessage(judge, moderator, judgement, 'judgement');
  await sendAndProcessMessage(judge, debaterA, judgement, 'judgement');
  await sendAndProcessMessage(judge, debaterB, judgement, 'judgement');
  
  // Step 4: Moderator closes the debate
  const closingStatement = await generateAgentStatement(
    moderator, 
    topic, 
    `Debate has concluded with the judge's decision: ${judgement}`,
    allStatements
  );
  
  displaySystemMessage("🏁 DEBATE CONCLUSION");
  displayMessage('Moderator', closingStatement);
  
  // Print statistics from the observer
  displaySystemMessage("📊 DEBATE ANALYTICS");
  
  // Cast to DefaultObserver to access statistics methods
  const defaultObserver = observer as DefaultObserver;
  
  // Agent event counts
  let analyticsContent = '';
  
  ['moderator', 'debater_a', 'debater_b', 'judge'].forEach(agentId => {
    const counts = defaultObserver.getEventCountByType(agentId);
    analyticsContent += `${agentId.toUpperCase()}:\n`;
    Object.entries(counts).forEach(([type, count]) => {
      analyticsContent += `  - ${type}: ${count}\n`;
    });
    analyticsContent += '\n';
  });
  
  // Print total events
  const timeline = defaultObserver.getTimeline();
  analyticsContent += `Total events tracked: ${timeline.length}`;
  
  displayMessage('System', analyticsContent);
  
  displaySystemMessage("🎭 DEBATE SIMULATION COMPLETED 🎭");
}

/**
 * Parse command line arguments to determine logging options
 */
function parseCommandLineArgs(): { logFormat: 'default' | 'pretty' | 'json' } {
  const args = process.argv.slice(2);
  const options = {
    logFormat: 'default' as 'default' | 'pretty' | 'json'
  };

  // Check for log format option
  const formatIndex = args.findIndex(arg => arg === '--log-format' || arg === '-f');
  if (formatIndex !== -1 && formatIndex < args.length - 1) {
    const format = args[formatIndex + 1].toLowerCase();
    if (['default', 'pretty', 'json'].includes(format)) {
      options.logFormat = format as 'default' | 'pretty' | 'json';
    }
  }

  return options;
}

// Run the simulation if this file is executed directly
if (require.main === module) {
  const options = parseCommandLineArgs();
  
  // Configure logging based on command line options
  if (options.logFormat === 'json') {
    // Set up environment for pure JSON output (useful for piping to jq)
    process.env.LOG_FORMAT = 'json';
    console.log('{"type":"debate_simulation","status":"starting","timestamp":"' + new Date().toISOString() + '"}');
  } else if (options.logFormat === 'pretty') {
    // Enhanced pretty printing is already configured
    console.log(COLORS.system("Starting debate simulation with pretty log formatting..."));
  } else {
    // Default format
    console.log(COLORS.system("Starting debate simulation..."));
  }
  
  runDebateSimulation().catch(error => {
    if (options.logFormat === 'json') {
      console.error('{"type":"error","message":"' + error.message + '","timestamp":"' + new Date().toISOString() + '"}');
    } else {
      console.error("Error in debate simulation:", error);
    }
  });
}
