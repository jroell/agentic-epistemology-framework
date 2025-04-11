import { EntityId, generateId } from '../types/common';
import { ContextElement } from './context';
import { 
  JustificationElement, 
  ToolResultJustificationElement,
  TestimonyJustificationElement,
  ObservationJustificationElement
} from '../epistemic/justification';
import { Message } from '../action/message';

/**
 * A stimulus received by an agent from the environment or communication
 * 
 * Perceptions are the primary way agents receive information from their
 * environment, tools, or other agents
 */
export abstract class Perception {
  /**
   * Unique identifier for the perception
   */
  id: string;
  
  /**
   * Timestamp when the perception was created
   */
  timestamp: number;
  
  /**
   * Source of the perception (e.g., tool ID, agent ID, sensor ID)
   */
  source: EntityId | null;
  
  /**
   * Content or data associated with the perception
   */
  data: any;

  /**
   * Create a new perception
   * 
   * @param id Unique identifier (optional, generated if not provided)
   * @param data Content or data of the perception
   * @param source Source of the perception
   */
  constructor(id: string | null = null, data: any, source: EntityId | null = null) {
    this.id = id || generateId('perception');
    this.data = data;
    this.source = source;
    this.timestamp = Date.now();
  }

  /**
   * Extract contextual elements from this perception
   * These will be added to the agent's context when the perception is processed
   * 
   * @returns Array of context elements
   */
  abstract getContextualElements(): ContextElement[];

  /**
   * Extract justification elements related to a specific proposition
   * These can be used to form or update beliefs about the proposition
   * 
   * @param proposition The proposition to get justification elements for
   * @returns Array of justification elements
   */
  abstract getJustificationElements(proposition: string): JustificationElement[];
}

/**
 * Perception from a tool execution result
 */
export class ToolResultPerception extends Perception {
  /**
   * Tool that produced the result
   */
  toolId: EntityId;
  
  /**
   * Result data from the tool execution
   */
  result: any;

  /**
   * Create a new tool result perception
   * 
   * @param toolId ID of the tool that produced the result
   * @param result Result data from the tool execution
   */
  constructor(toolId: EntityId, result: any) {
    super(`tool_result:${toolId}:${Date.now()}`, result, toolId);
    this.toolId = toolId;
    this.result = result;
  }

  /**
   * Extract contextual elements from this tool result
   * 
   * @returns Array of context elements
   */
  getContextualElements(): ContextElement[] {
    return [new ContextElement('tool_result', this.result, this.toolId)];
  }

  /**
   * Extract justification elements related to a proposition
   * 
   * @param proposition The proposition to get justification elements for
   * @returns Array of justification elements
   */
  getJustificationElements(proposition: string): JustificationElement[] {
    // Check if this tool result is relevant to the proposition
    if (this.isRelevantToProposition(proposition)) {
      return [new ToolResultJustificationElement(
        this.toolId,
        this.result
      )];
    }
    return [];
  }

  /**
   * Check if this tool result is relevant to a proposition
   * 
   * @param proposition The proposition to check relevance for
   * @returns True if the tool result is relevant to the proposition
   */
  private isRelevantToProposition(proposition: string): boolean {
    // Simple relevance check - in a real implementation this would be more sophisticated
    // This could involve semantic matching, keyword analysis, etc.
    const stringifiedResult = JSON.stringify(this.result).toLowerCase();
    return stringifiedResult.includes(proposition.toLowerCase());
  }
}

/**
 * Perception from a received message
 */
export class MessagePerception extends Perception {
  /**
   * The received message
   */
  message: Message;

  /**
   * Create a new message perception
   * 
   * @param message The received message
   */
  constructor(message: Message) {
    super(`message:${message.id}`, message.content, message.sender);
    this.message = message;
  }

  /**
   * Extract contextual elements from this message
   * 
   * @returns Array of context elements
   */
  getContextualElements(): ContextElement[] {
    return [new ContextElement('message', this.message.content, this.message.sender)];
  }

  /**
   * Extract justification elements related to a proposition
   * 
   * @param proposition The proposition to get justification elements for
   * @returns Array of justification elements
   */
  getJustificationElements(proposition: string): JustificationElement[] {
    if (this.isRelevantToProposition(proposition)) {
      return [new TestimonyJustificationElement(
        this.message.sender,
        this.message.content
      )];
    }
    return [];
  }

  /**
   * Check if this message is relevant to a proposition
   * 
   * @param proposition The proposition to check relevance for
   * @returns True if the message is relevant to the proposition
   */
  private isRelevantToProposition(proposition: string): boolean {
    // Simple check for relevance - in a real implementation this would be more sophisticated
    if (typeof this.message.content === 'string') {
      return this.message.content.toLowerCase().includes(proposition.toLowerCase());
    }
    
    // For structured content, check if any field contains the proposition
    if (typeof this.message.content === 'object' && this.message.content !== null) {
      const stringified = JSON.stringify(this.message.content).toLowerCase();
      return stringified.includes(proposition.toLowerCase());
    }
    
    return false;
  }
}

/**
 * Perception from direct observation of the environment
 */
export class ObservationPerception extends Perception {
  /**
   * Type of observation (e.g., 'visual', 'auditory', 'sensor')
   */
  observationType: string;
  
  /**
   * Create a new observation perception
   * 
   * @param observationType Type of observation
   * @param data Observation data
   * @param source Source of the observation (e.g., sensor ID)
   */
  constructor(observationType: string, data: any, source: EntityId | null = null) {
    super(`observation:${observationType}:${Date.now()}`, data, source);
    this.observationType = observationType;
  }

  /**
   * Extract contextual elements from this observation
   * 
   * @returns Array of context elements
   */
  getContextualElements(): ContextElement[] {
    return [new ContextElement(`observation:${this.observationType}`, this.data, this.source)];
  }

  /**
   * Extract justification elements related to a proposition
   * 
   * @param proposition The proposition to get justification elements for
   * @returns Array of justification elements
   */
  getJustificationElements(proposition: string): JustificationElement[] {
    if (this.isRelevantToProposition(proposition)) {
      return [new ObservationJustificationElement(
        this.source || 'direct_observation',
        this.data
      )];
    }
    return [];
  }

  /**
   * Check if this observation is relevant to a proposition
   * 
   * @param proposition The proposition to check relevance for
   * @returns True if the observation is relevant to the proposition
   */
  private isRelevantToProposition(proposition: string): boolean {
    // Simple relevance check
    const stringifiedData = JSON.stringify(this.data).toLowerCase();
    return stringifiedData.includes(proposition.toLowerCase());
  }
}
