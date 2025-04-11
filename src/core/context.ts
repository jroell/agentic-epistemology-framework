import { EntityId } from '../types/common';

/**
 * An element currently active in the agent's working memory
 * 
 * Context elements represent information that is currently relevant to the
 * agent's reasoning and decision-making processes
 */
export class ContextElement {
  /**
   * Type of the context element (e.g., 'message', 'tool_result', 'observation')
   */
  type: string;
  
  /**
   * The actual content of the context element
   */
  content: any;
  
  /**
   * Source of the context element (e.g., tool ID, agent ID, etc.)
   */
  source: EntityId | null;
  
  /**
   * Timestamp when this context element was created
   */
  timestamp: number;

  /**
   * Create a new context element
   * 
   * @param type Type of context element
   * @param content Content of the element
   * @param source Source of the element (optional)
   */
  constructor(type: string, content: any, source: EntityId | null = null) {
    this.type = type;
    this.content = content;
    this.source = source;
    this.timestamp = Date.now();
  }
}

/**
 * The transient working set of information relevant for current decisions
 * 
 * Context represents the agent's current focus of attention and contains
 * information that is actively being used for reasoning and decision-making
 */
export class Context {
  /**
   * Elements currently active in the context
   */
  elements: ContextElement[];
  
  /**
   * Maximum age for context elements in milliseconds
   * Elements older than this will be automatically removed
   * If set to 0, elements never expire
   */
  maxAge: number;
  
  /**
   * Maximum number of elements to keep in the context
   * If set to 0, there is no limit
   */
  maxElements: number;
  
  /**
   * Create a new context
   * 
   * @param initialElements Initial elements to add to the context
   * @param maxAge Maximum age for context elements (default: 0, no expiry)
   * @param maxElements Maximum number of elements (default: 100)
   */
  constructor(
    initialElements: ContextElement[] = [], 
    maxAge: number = 0,
    maxElements: number = 100
  ) {
    this.elements = [...initialElements];
    this.maxAge = maxAge;
    this.maxElements = maxElements;
  }

  /**
   * Add elements to the context
   * Automatically handles pruning old elements if necessary
   * 
   * @param elementsToAdd Elements to add to the context
   */
  addElements(elementsToAdd: ContextElement[]): void {
    this.elements.push(...elementsToAdd);
    this.prune();
  }

  /**
   * Remove expired elements and enforce size limits
   */
  private prune(): void {
    const now = Date.now();
    
    // Remove expired elements if maxAge is set
    if (this.maxAge > 0) {
      this.elements = this.elements.filter(el => 
        (now - el.timestamp) <= this.maxAge
      );
    }
    
    // Enforce maximum elements by removing oldest first
    if (this.maxElements > 0 && this.elements.length > this.maxElements) {
      this.elements.sort((a, b) => b.timestamp - a.timestamp);
      this.elements = this.elements.slice(0, this.maxElements);
    }
  }

  /**
   * Clear all elements from the context
   */
  clear(): void {
    this.elements = [];
  }

  /**
   * Get elements of a specific type
   * 
   * @param type Type of elements to retrieve
   * @returns Array of matching context elements
   */
  getElementsByType(type: string): ContextElement[] {
    return this.elements.filter(element => element.type === type);
  }

  /**
   * Get elements from a specific source
   * 
   * @param source Source of elements to retrieve
   * @returns Array of matching context elements
   */
  getElementsBySource(source: EntityId): ContextElement[] {
    return this.elements.filter(element => element.source === source);
  }
  
  /**
   * Get elements matching a predicate function
   * 
   * @param predicate Function that tests each element
   * @returns Array of matching context elements
   */
  getElementsByPredicate(predicate: (element: ContextElement) => boolean): ContextElement[] {
    return this.elements.filter(predicate);
  }
  
  /**
   * Find the most recent element matching a predicate
   * 
   * @param predicate Function that tests each element
   * @returns The most recent matching element, or undefined if none match
   */
  getMostRecentElement(predicate: (element: ContextElement) => boolean): ContextElement | undefined {
    return this.getElementsByPredicate(predicate)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }
}
