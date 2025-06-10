/**
 * Domain Adapter Architecture
 * 
 * This module provides a domain-agnostic abstraction layer that allows
 * the core LLM client and agent systems to work with any domain without
 * hardcoding domain-specific logic.
 * 
 * Key Design Patterns:
 * - Strategy Pattern: Different adapters implement different domain strategies
 * - Adapter Pattern: Adapts generic operations to domain-specific needs
 * - Template Method: Defines operation structure, domains provide specifics
 * - Dependency Injection: Adapters are injected where needed
 */

/**
 * Core operations that any domain might need to customize
 */
export enum DomainOperation {
  EXTRACT_PROPOSITIONS = 'extract_propositions',
  SCORE_RELEVANCE = 'score_relevance', 
  EXTRACT_CONTEXT = 'extract_context',
  JUDGE_EVIDENCE_STRENGTH = 'judge_evidence_strength',
  JUDGE_EVIDENCE_SALIENCY = 'judge_evidence_saliency'
}

/**
 * Generic parameters for domain operations
 */
export interface DomainOperationParams {
  content?: unknown;
  context?: string;
  proposition?: string;
  evidence?: unknown;
  frame?: unknown;
  agentId?: string;
  agentName?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Result of a domain operation
 */
export interface DomainOperationResult<T = unknown> {
  success: boolean;
  data: T;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Abstract interface for domain adapters
 * 
 * Domain adapters encapsulate all domain-specific logic and provide
 * a consistent interface for the core system to interact with.
 */
export interface DomainAdapter {
  /**
   * Unique identifier for this domain adapter
   */
  readonly domainId: string;
  
  /**
   * Human-readable name for this domain
   */
  readonly domainName: string;
  
  /**
   * Version of this adapter implementation
   */
  readonly version: string;
  
  /**
   * Check if this adapter can handle a specific operation
   */
  canHandle(operation: DomainOperation): boolean;
  
  /**
   * Execute a domain-specific operation
   */
  execute<T = unknown>(
    operation: DomainOperation, 
    params: DomainOperationParams
  ): Promise<DomainOperationResult<T>>;
  
  /**
   * Build domain-specific prompts for LLM operations
   */
  buildPrompt(operation: DomainOperation, params: DomainOperationParams): string;
  
  /**
   * Parse domain-specific responses from LLM
   */
  parseResponse<T = unknown>(
    operation: DomainOperation, 
    response: string, 
    params: DomainOperationParams
  ): DomainOperationResult<T>;
  
  /**
   * Get domain-specific logging context
   */
  getLoggingContext(operation: DomainOperation, params: DomainOperationParams): Record<string, unknown>;
  
  /**
   * Validate parameters for a specific operation
   */
  validateParams(operation: DomainOperation, params: DomainOperationParams): boolean;
}

/**
 * Base implementation providing common functionality
 */
export abstract class BaseDomainAdapter implements DomainAdapter {
  constructor(
    public readonly domainId: string,
    public readonly domainName: string,
    public readonly version: string = '1.0.0'
  ) {}
  
  abstract canHandle(operation: DomainOperation): boolean;
  abstract execute<T = unknown>(
    operation: DomainOperation, 
    params: DomainOperationParams
  ): Promise<DomainOperationResult<T>>;
  abstract buildPrompt(operation: DomainOperation, params: DomainOperationParams): string;
  
  /**
   * Default response parsing - can be overridden by specific domains
   */
  parseResponse<T = unknown>(
    operation: DomainOperation, 
    response: string, 
    params: DomainOperationParams
  ): DomainOperationResult<T> {
    try {
      // Default parsing logic - domains can override for specific needs
      const trimmedResponse = response.trim();
      
      switch (operation) {
        case DomainOperation.EXTRACT_PROPOSITIONS:
          const propositions = trimmedResponse
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[•*-]\s*/, '').trim())
            .filter(line => line.length > 0);
          return { success: true, data: propositions as T };
          
        case DomainOperation.SCORE_RELEVANCE:
        case DomainOperation.JUDGE_EVIDENCE_STRENGTH:
        case DomainOperation.JUDGE_EVIDENCE_SALIENCY:
          const scoreMatch = trimmedResponse.match(/^([0](?:\.\d+)?|1(?:\.0+)?)$/);
          if (scoreMatch) {
            const score = parseFloat(scoreMatch[1]);
            if (!isNaN(score) && score >= 0 && score <= 1) {
              return { success: true, data: score as T };
            }
          }
          return { success: false, data: 0.5 as T, error: 'Invalid score format' };
          
        case DomainOperation.EXTRACT_CONTEXT:
          return { success: true, data: trimmedResponse as T };
          
        default:
          return { success: true, data: trimmedResponse as T };
      }
    } catch (error) {
      return { 
        success: false, 
        data: undefined as T, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Default logging context - can be enhanced by specific domains
   */
  getLoggingContext(operation: DomainOperation, params: DomainOperationParams): Record<string, unknown> {
    return {
      domainId: this.domainId,
      domainName: this.domainName,
      operation,
      contentType: typeof params.content,
      hasContext: !!params.context,
      agentId: params.agentId
    };
  }
  
  /**
   * Default parameter validation - can be enhanced by specific domains
   */
  validateParams(operation: DomainOperation, params: DomainOperationParams): boolean {
    switch (operation) {
      case DomainOperation.EXTRACT_PROPOSITIONS:
        return params.content !== undefined;
      case DomainOperation.SCORE_RELEVANCE:
        return !!(params.proposition && params.context);
      case DomainOperation.EXTRACT_CONTEXT:
        return params.content !== undefined;
      case DomainOperation.JUDGE_EVIDENCE_STRENGTH:
        return !!(params.evidence && params.proposition);
      case DomainOperation.JUDGE_EVIDENCE_SALIENCY:
        return !!(params.evidence && params.proposition && params.frame);
      default:
        return true;
    }
  }
}

/**
 * Generic/Default domain adapter for when no specific domain is provided
 */
export class GenericDomainAdapter extends BaseDomainAdapter {
  constructor() {
    super('generic', 'Generic Domain', '1.0.0');
  }
  
  canHandle(operation: DomainOperation): boolean {
    // Generic adapter can handle all operations with basic implementations
    return true;
  }
  
  async execute<T = unknown>(
    operation: DomainOperation, 
    params: DomainOperationParams
  ): Promise<DomainOperationResult<T>> {
    if (!this.validateParams(operation, params)) {
      return { success: false, data: undefined as T, error: 'Invalid parameters' };
    }
    
    // For generic adapter, we provide basic implementations
    // Real domains would implement more sophisticated logic
    switch (operation) {
      case DomainOperation.EXTRACT_PROPOSITIONS:
        return { success: true, data: [] as T }; // Generic: no propositions
      case DomainOperation.SCORE_RELEVANCE:
        return { success: true, data: 0.5 as T }; // Generic: neutral relevance
      case DomainOperation.EXTRACT_CONTEXT:
        return { success: true, data: 'Generic context' as T };
      case DomainOperation.JUDGE_EVIDENCE_STRENGTH:
        return { success: true, data: 0.5 as T }; // Generic: neutral strength
      case DomainOperation.JUDGE_EVIDENCE_SALIENCY:
        return { success: true, data: 0.5 as T }; // Generic: neutral saliency
      default:
        return { success: false, data: undefined as T, error: 'Operation not supported' };
    }
  }
  
  buildPrompt(operation: DomainOperation, params: DomainOperationParams): string {
    // Generic prompts - domains would provide more sophisticated ones
    switch (operation) {
      case DomainOperation.EXTRACT_PROPOSITIONS:
        return `Extract key propositions from the following content:\n${JSON.stringify(params.content)}`;
      case DomainOperation.SCORE_RELEVANCE:
        return `Rate the relevance of "${params.proposition}" to "${params.context}" on a scale of 0.0 to 1.0. Return only the number.`;
      case DomainOperation.EXTRACT_CONTEXT:
        return `Extract the main context or topic from: ${JSON.stringify(params.content)}`;
      default:
        return `Analyze the provided data for operation: ${operation}`;
    }
  }
}

/**
 * Registry for managing domain adapters
 */
export class DomainAdapterRegistry {
  private adapters: Map<string, DomainAdapter> = new Map();
  private defaultAdapter: DomainAdapter = new GenericDomainAdapter();
  
  /**
   * Register a domain adapter
   */
  register(adapter: DomainAdapter): void {
    this.adapters.set(adapter.domainId, adapter);
  }
  
  /**
   * Get a domain adapter by ID
   */
  get(domainId: string): DomainAdapter | undefined {
    return this.adapters.get(domainId);
  }
  
  /**
   * Get the default adapter (used when no specific domain is provided)
   */
  getDefault(): DomainAdapter {
    return this.defaultAdapter;
  }
  
  /**
   * Set a custom default adapter
   */
  setDefault(adapter: DomainAdapter): void {
    this.defaultAdapter = adapter;
  }
  
  /**
   * Find adapters that can handle a specific operation
   */
  findCapableAdapters(operation: DomainOperation): DomainAdapter[] {
    return Array.from(this.adapters.values()).filter(adapter => adapter.canHandle(operation));
  }
  
  /**
   * List all registered adapters
   */
  listAdapters(): DomainAdapter[] {
    return Array.from(this.adapters.values());
  }
}