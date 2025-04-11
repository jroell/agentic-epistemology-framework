import { EntityId, generateId } from '../types/common';

/**
 * Evidence, reasoning trace, or source supporting a Belief
 * 
 * Justifications provide the evidentiary basis for beliefs, allowing agents
 * to track why they hold certain beliefs and enabling transparency in reasoning
 */
export class Justification {
  /**
   * Unique identifier for the justification
   */
  id: string;
  
  /**
   * Elements comprising the justification
   */
  elements: JustificationElement[];
  
  /**
   * Timestamp when the justification was created or last updated
   */
  timestamp: number;

  /**
   * Create a new justification
   * 
   * @param elements Elements comprising the justification
   * @param id Optional ID (generated if not provided)
   */
  constructor(elements: JustificationElement[] = [], id?: string) {
    this.id = id || generateId('justification');
    this.elements = [...elements];
    this.timestamp = Date.now();
  }

  /**
   * Add new elements to the justification
   * 
   * @param elementsToAdd Elements to add
   */
  addElements(elementsToAdd: JustificationElement[]): void {
    this.elements.push(...elementsToAdd);
    this.timestamp = Date.now();
  }

  /**
   * Get all elements of a specific type
   * 
   * @param type Type of elements to retrieve
   * @returns Array of matching justification elements
   */
  getElementsByType(type: string): JustificationElement[] {
    return this.elements.filter(element => element.type === type);
  }

  /**
   * Get all elements from a specific source
   * 
   * @param source Source of elements to retrieve
   * @returns Array of matching justification elements
   */
  getElementsBySource(source: string): JustificationElement[] {
    return this.elements.filter(element => element.source === source);
  }
  
  /**
   * Get elements matching a predicate function
   * 
   * @param predicate Function that tests each element
   * @returns Array of matching justification elements
   */
  getElementsByPredicate(predicate: (element: JustificationElement) => boolean): JustificationElement[] {
    return this.elements.filter(predicate);
  }
  
  /**
   * Merge this justification with another
   * 
   * @param other Justification to merge with
   * @returns A new justification containing elements from both
   */
  merge(other: Justification): Justification {
    return new Justification([
      ...this.elements,
      ...other.elements
    ]);
  }
  
  /**
   * Create a deep copy of this justification
   * 
   * @returns A new justification that is a deep copy of this one
   */
  clone(): Justification {
    return new Justification(
      this.elements.map(element => element.clone()),
      this.id
    );
  }
  
  /**
   * Create a string representation of the justification
   * 
   * @returns String representation
   */
  toString(): string {
    if (this.elements.length === 0) {
      return "No justification provided";
    }
    
    return this.elements
      .map(element => element.toString())
      .join("; ");
  }
}

/**
 * Base class for elements within a justification
 */
export abstract class JustificationElement {
  /**
   * Unique identifier for the element
   */
  id: string;
  
  /**
   * Type of justification element
   */
  type: string;
  
  /**
   * Source of the element (e.g., tool ID, agent ID, etc.)
   */
  source: string;
  
  /**
   * Content of the element
   */
  content: any;
  
  /**
   * Timestamp when the element was created
   */
  timestamp: number;

  /**
   * Create a new justification element
   * 
   * @param type Type of justification element
   * @param source Source of the element
   * @param content Content of the element
   * @param id Optional ID (generated if not provided)
   */
  constructor(type: string, source: string, content: any, id?: string) {
    this.id = id || generateId('just_element');
    this.type = type;
    this.source = source;
    this.content = content;
    this.timestamp = Date.now();
  }
  
  /**
   * Create a deep copy of this justification element
   * 
   * @returns A new element that is a deep copy of this one
   */
  abstract clone(): JustificationElement;
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `${this.type} from ${this.source}`;
  }
}

/**
 * Justification element based on tool execution results
 */
export class ToolResultJustificationElement extends JustificationElement {
  /**
   * Create a new tool result justification element
   * 
   * @param toolId ID of the tool that produced the result
   * @param result Result data from the tool execution
   * @param id Optional ID (generated if not provided)
   */
  constructor(toolId: string, result: any, id?: string) {
    super('tool_result', toolId, result, id);
  }
  
  /**
   * Create a deep copy of this element
   * 
   * @returns A new element that is a deep copy of this one
   */
  clone(): ToolResultJustificationElement {
    return new ToolResultJustificationElement(
      this.source,
      JSON.parse(JSON.stringify(this.content)),
      this.id
    );
  }
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `Tool result from ${this.source}`;
  }
}

/**
 * Justification element based on testimony from another entity
 */
export class TestimonyJustificationElement extends JustificationElement {
  /**
   * Create a new testimony justification element
   * 
   * @param entityId ID of the entity providing testimony
   * @param testimony Content of the testimony
   * @param id Optional ID (generated if not provided)
   */
  constructor(entityId: string, testimony: any, id?: string) {
    super('testimony', entityId, testimony, id);
  }
  
  /**
   * Create a deep copy of this element
   * 
   * @returns A new element that is a deep copy of this one
   */
  clone(): TestimonyJustificationElement {
    return new TestimonyJustificationElement(
      this.source,
      JSON.parse(JSON.stringify(this.content)),
      this.id
    );
  }
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `Testimony from ${this.source}`;
  }
}

/**
 * Justification element based on direct observation
 */
export class ObservationJustificationElement extends JustificationElement {
  /**
   * Create a new observation justification element
   * 
   * @param source Source of the observation (e.g., sensor ID)
   * @param observation Observation data
   * @param id Optional ID (generated if not provided)
   */
  constructor(source: string, observation: any, id?: string) {
    super('observation', source, observation, id);
  }
  
  /**
   * Create a deep copy of this element
   * 
   * @returns A new element that is a deep copy of this one
   */
  clone(): ObservationJustificationElement {
    return new ObservationJustificationElement(
      this.source,
      JSON.parse(JSON.stringify(this.content)),
      this.id
    );
  }
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `Observation from ${this.source}`;
  }
}

/**
 * Justification element based on logical inference
 */
export class InferenceJustificationElement extends JustificationElement {
  /**
   * Premises used in the inference
   */
  premises: string[];
  
  /**
   * Rule of inference used
   */
  inferenceRule: string;

  /**
   * Create a new inference justification element
   * 
   * @param source Source of the inference (e.g., "logical_engine")
   * @param conclusion Conclusion drawn
   * @param premises Premises used in the inference
   * @param inferenceRule Rule of inference used
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    source: string, 
    conclusion: string, 
    premises: string[], 
    inferenceRule: string, 
    id?: string
  ) {
    super('inference', source, conclusion, id);
    this.premises = [...premises];
    this.inferenceRule = inferenceRule;
  }
  
  /**
   * Create a deep copy of this element
   * 
   * @returns A new element that is a deep copy of this one
   */
  clone(): InferenceJustificationElement {
    return new InferenceJustificationElement(
      this.source,
      this.content,
      [...this.premises],
      this.inferenceRule,
      this.id
    );
  }
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `Inference (${this.inferenceRule}) from premises: ${this.premises.join(', ')}`;
  }
}

/**
 * Justification element wrapping justification from another agent
 */
export class ExternalJustificationElement extends JustificationElement {
  /**
   * External justification
   */
  externalJustification: Justification;
  
  /**
   * ID of the frame used by the source agent
   */
  sourceFrameId: string;

  /**
   * Create a new external justification element
   * 
   * @param externalJustification Justification from external agent
   * @param sourceFrameId ID of the frame used by the source agent
   * @param sourceAgentId ID of the source agent
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    externalJustification: Justification, 
    sourceFrameId: string, 
    sourceAgentId: string = 'external_agent',
    id?: string
  ) {
    super('external', sourceAgentId, externalJustification, id);
    this.externalJustification = externalJustification;
    this.sourceFrameId = sourceFrameId;
  }
  
  /**
   * Create a deep copy of this element
   * 
   * @returns A new element that is a deep copy of this one
   */
  clone(): ExternalJustificationElement {
    return new ExternalJustificationElement(
      this.externalJustification.clone(),
      this.sourceFrameId,
      this.source,
      this.id
    );
  }
  
  /**
   * Create a string representation of the element
   * 
   * @returns String representation
   */
  toString(): string {
    return `External justification from ${this.source} using frame ${this.sourceFrameId}`;
  }
}
