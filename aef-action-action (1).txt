import { EntityId, generateId } from '../types/common';
import { Belief } from '../epistemic/belief';
import { Tool } from './tool';
import { Message } from './message';
import { Goal } from './goal';

/**
 * Abstract base class for actions that agents can perform
 * 
 * Actions represent intentional operations by agents, such as using tools
 * or communicating with other agents
 */
export abstract class Action {
  /**
   * Unique identifier for the action
   */
  id: string;
  
  /**
   * Type of action
   */
  type: string;
  
  /**
   * Optional description of the action
   */
  description?: string;
  
  /**
   * Time required to execute this action (in ms)
   * 0 means instantaneous, -1 means unknown/variable
   */
  executionTime: number;

  /**
   * Create a new action
   * 
   * @param type Type of action
   * @param description Optional description
   * @param executionTime Time required to execute (ms)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    type: string, 
    description?: string, 
    executionTime: number = -1,
    id?: string
  ) {
    this.id = id || generateId('action');
    this.type = type;
    this.description = description;
    this.executionTime = executionTime;
  }

  /**
   * Check if this action can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the action can achieve the goal
   */
  abstract canAchieve(goal: Goal, beliefs: Belief[]): boolean;
  
  /**
   * Get the cost of this action (abstract metric)
   * 
   * @returns Cost value
   */
  abstract getCost(): number;
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `${this.type} (${this.id})${this.description ? ': ' + this.description : ''}`;
  }
}

/**
 * Action for using a tool
 */
export class UseTool extends Action {
  /**
   * Tool to use
   */
  tool: Tool;
  
  /**
   * Parameters to pass to the tool
   */
  parameters?: any;

  /**
   * Create a new tool usage action
   * 
   * @param tool Tool to use
   * @param parameters Parameters to pass to the tool
   * @param description Optional description
   * @param executionTime Time required to execute (ms)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    tool: Tool,
    parameters?: any,
    description?: string,
    executionTime: number = -1,
    id?: string
  ) {
    super('use_tool', description || `Use tool: ${tool.name}`, executionTime, id);
    this.tool = tool;
    this.parameters = parameters;
  }

  /**
   * Check if this tool can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the tool can achieve the goal
   */
  canAchieve(goal: Goal, beliefs: Belief[]): boolean {
    // Check if the tool has the required capabilities
    const requiredCapabilities = goal.getRequiredCapabilities();
    return requiredCapabilities.every(capability => 
      this.tool.capabilities.has(capability)
    );
  }
  
  /**
   * Get the cost of using this tool
   * 
   * @returns Cost value
   */
  getCost(): number {
    return this.tool.getCost();
  }
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `UseTool: ${this.tool.name} (${this.tool.id})`;
  }
}

/**
 * Action for sending a message
 */
export class SendMessage extends Action {
  /**
   * Message to send
   */
  message: Message;

  /**
   * Create a new message sending action
   * 
   * @param message Message to send
   * @param description Optional description
   * @param executionTime Time required to execute (ms)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    message: Message,
    description?: string,
    executionTime: number = 0, // Assumed to be instantaneous
    id?: string
  ) {
    super(
      'send_message', 
      description || `Send message to ${message.recipient}`, 
      executionTime, 
      id
    );
    this.message = message;
  }

  /**
   * Check if this message can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the message can achieve the goal
   */
  canAchieve(goal: Goal, beliefs: Belief[]): boolean {
    // This is a simplified implementation
    // In a real system, this would involve semantic matching between
    // the message content and the goal
    
    // Check if goal requires communication
    if (goal.requiresCommunication()) {
      // Check if message is addressed to the right recipient
      if (goal.getTargetAgents().includes(this.message.recipient)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get the cost of sending this message
   * 
   * @returns Cost value (typically low for messages)
   */
  getCost(): number {
    // Messages typically have low cost
    // Could be proportional to message size in a more sophisticated implementation
    return 1;
  }
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `SendMessage to ${this.message.recipient}: "${this.message.content}"`;
  }
}

/**
 * Action for composite/sequential actions
 */
export class CompositeAction extends Action {
  /**
   * Actions that make up this composite action
   */
  actions: Action[];

  /**
   * Create a new composite action
   * 
   * @param actions Actions that make up this composite action
   * @param description Optional description
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    actions: Action[],
    description?: string,
    id?: string
  ) {
    // Calculate total execution time as sum of component action times
    // -1 if any component has unknown time
    const executionTime = actions.some(a => a.executionTime < 0) 
      ? -1 
      : actions.reduce((sum, a) => sum + a.executionTime, 0);
    
    super('composite', description || 'Composite action', executionTime, id);
    this.actions = [...actions];
  }

  /**
   * Check if this composite action can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the composite action can achieve the goal
   */
  canAchieve(goal: Goal, beliefs: Belief[]): boolean {
    // A composite action can achieve a goal if any of its component actions can
    // or if the sequence as a whole can achieve it
    
    // Check if any individual action can achieve the goal
    if (this.actions.some(action => action.canAchieve(goal, beliefs))) {
      return true;
    }
    
    // Check if the last action in the sequence can achieve the goal
    // This assumes that previous actions set up the necessary conditions
    if (this.actions.length > 0) {
      return this.actions[this.actions.length - 1].canAchieve(goal, beliefs);
    }
    
    return false;
  }
  
  /**
   * Get the cost of this composite action
   * 
   * @returns Sum of costs of component actions
   */
  getCost(): number {
    return this.actions.reduce((sum, action) => sum + action.getCost(), 0);
  }
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `CompositeAction (${this.id}) with ${this.actions.length} steps`;
  }
  
  /**
   * Get a detailed string representation of the action
   * 
   * @returns Detailed string representation with all component actions
   */
  toDetailedString(): string {
    return `CompositeAction (${this.id}):\n` + 
      this.actions.map((a, i) => `  ${i+1}. ${a.toString()}`).join('\n');
  }
}

/**
 * Action for querying internal belief state
 */
export class QueryBeliefs extends Action {
  /**
   * Query string or pattern
   */
  query: string;
  
  /**
   * Minimum confidence threshold for beliefs
   */
  confidenceThreshold: number;

  /**
   * Create a new belief query action
   * 
   * @param query Query string or pattern
   * @param confidenceThreshold Minimum confidence threshold
   * @param description Optional description
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    query: string,
    confidenceThreshold: number = 0,
    description?: string,
    id?: string
  ) {
    super(
      'query_beliefs', 
      description || `Query beliefs: ${query}`,
      0, // Queries are typically instantaneous
      id
    );
    this.query = query;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Check if this query can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the query can achieve the goal
   */
  canAchieve(goal: Goal, beliefs: Belief[]): boolean {
    // Query actions typically don't directly achieve goals
    // but can provide information needed for other actions
    
    // If the goal is to gain information, a query might achieve it
    if (goal.type === 'information_gathering') {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the cost of this query
   * 
   * @returns Cost value (typically very low for queries)
   */
  getCost(): number {
    // Queries typically have very low cost
    return 0.5;
  }
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `QueryBeliefs: "${this.query}" (confidence >= ${this.confidenceThreshold})`;
  }
}

/**
 * Action for updating agent frame
 */
export class ChangeFrame extends Action {
  /**
   * Frame ID to change to
   */
  targetFrameId: string;

  /**
   * Create a new frame change action
   * 
   * @param targetFrameId Frame ID to change to
   * @param description Optional description
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    targetFrameId: string,
    description?: string,
    id?: string
  ) {
    super(
      'change_frame',
      description || `Change frame to ${targetFrameId}`,
      0, // Frame changes are typically instantaneous
      id
    );
    this.targetFrameId = targetFrameId;
  }

  /**
   * Check if this frame change can achieve a specific goal
   * 
   * @param goal Goal to check
   * @param beliefs Relevant beliefs
   * @returns True if the frame change can achieve the goal
   */
  canAchieve(goal: Goal, beliefs: Belief[]): boolean {
    // Frame changes typically don't directly achieve goals
    // but can enable better decision-making for certain types of goals
    
    // If the goal explicitly requires a frame change
    if (goal.type === 'frame_adaptation' && 
        goal.parameters && 
        goal.parameters.targetFrame === this.targetFrameId) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the cost of this frame change
   * 
   * @returns Cost value (typically moderate for frame changes due to cognitive adjustment)
   */
  getCost(): number {
    // Frame changes have moderate cost due to the cognitive adjustment required
    return 5;
  }
  
  /**
   * Create a string representation of the action
   * 
   * @returns String representation
   */
  toString(): string {
    return `ChangeFrame: to ${this.targetFrameId}`;
  }
}

/**
 * Factory for creating actions
 */
export class ActionFactory {
  /**
   * Create a tool usage action
   * 
   * @param tool Tool to use
   * @param parameters Parameters to pass to the tool
   * @returns A new UseTool action
   */
  static createToolAction(tool: Tool, parameters?: any): UseTool {
    return new UseTool(tool, parameters);
  }
  
  /**
   * Create a message sending action
   * 
   * @param recipient Recipient ID
   * @param content Message content
   * @param sender Sender ID
   * @returns A new SendMessage action
   */
  static createMessageAction(recipient: EntityId, content: any, sender: EntityId): SendMessage {
    const message = new Message(recipient, content, sender);
    return new SendMessage(message);
  }
  
  /**
   * Create a composite action
   * 
   * @param actions Component actions
   * @param description Optional description
   * @returns A new CompositeAction
   */
  static createCompositeAction(actions: Action[], description?: string): CompositeAction {
    return new CompositeAction(actions, description);
  }
  
  /**
   * Create a belief query action
   * 
   * @param query Query string or pattern
   * @param confidenceThreshold Minimum confidence threshold
   * @returns A new QueryBeliefs action
   */
  static createQueryAction(query: string, confidenceThreshold: number = 0): QueryBeliefs {
    return new QueryBeliefs(query, confidenceThreshold);
  }
  
  /**
   * Create a frame change action
   * 
   * @param targetFrameId Frame ID to change to
   * @returns A new ChangeFrame action
   */
  static createFrameChangeAction(targetFrameId: string): ChangeFrame {
    return new ChangeFrame(targetFrameId);
  }
}