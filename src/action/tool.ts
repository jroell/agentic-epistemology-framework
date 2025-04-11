import { EntityId, generateId } from '../types/common';
import { Capability } from './capability';
import { Context } from '../core/context';

/**
 * Interface representing a tool that an agent can use
 * 
 * Tools are interfaces that allow agents to access functions or workflows,
 * thereby realizing capabilities
 */
export interface Tool {
  /**
   * Unique identifier for the tool
   */
  id: EntityId;
  
  /**
   * Human-readable name of the tool
   */
  name: string;
  
  /**
   * Description of what the tool does
   */
  description: string;
  
  /**
   * Set of capabilities provided by this tool
   */
  capabilities: Set<Capability>;
  
  /**
   * Schema for tool parameters (if any)
   */
  parameterSchema?: Record<string, any>;
  
  /**
   * Schema for tool outputs
   */
  outputSchema?: Record<string, any>;
  
  /**
   * Cost of using the tool (abstract metric)
   */
  getCost(): number;
  
  /**
   * Use the tool with the given context
   * 
   * @param context Context for tool execution
   * @param parameters Optional parameters for the tool
   * @returns Tool execution result
   */
  use(context: Context, parameters?: any): any;
}

/**
 * Abstract base class for tools
 */
export abstract class BaseTool implements Tool {
  /**
   * Unique identifier for the tool
   */
  id: EntityId;
  
  /**
   * Human-readable name of the tool
   */
  name: string;
  
  /**
   * Description of what the tool does
   */
  description: string;
  
  /**
   * Set of capabilities provided by this tool
   */
  capabilities: Set<Capability>;
  
  /**
   * Schema for tool parameters (if any)
   */
  parameterSchema?: Record<string, any>;
  
  /**
   * Schema for tool outputs
   */
  outputSchema?: Record<string, any>;
  
  /**
   * Base cost of using the tool
   */
  protected baseCost: number;

  /**
   * Create a new tool
   * 
   * @param id Optional ID (generated if not provided)
   * @param name Human-readable name
   * @param description Description of what the tool does
   * @param capabilities Set of capabilities provided
   * @param parameterSchema Schema for parameters
   * @param outputSchema Schema for outputs
   * @param baseCost Base cost of using the tool
   */
  constructor(
    id: string | null, 
    name: string,
    description: string,
    capabilities: Set<Capability>,
    parameterSchema?: Record<string, any>,
    outputSchema?: Record<string, any>,
    baseCost: number = 1
  ) {
    this.id = id || generateId('tool');
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.parameterSchema = parameterSchema;
    this.outputSchema = outputSchema;
    this.baseCost = baseCost;
  }

  /**
   * Get the cost of using the tool
   * 
   * @returns Cost value
   */
  getCost(): number {
    return this.baseCost;
  }

  /**
   * Use the tool with the given context
   * 
   * @param context Context for tool execution
   * @param parameters Optional parameters for the tool
   * @returns Tool execution result
   */
  abstract use(context: Context, parameters?: any): any;
}

/**
 * Tool that wraps a simple function
 */
export class FunctionTool extends BaseTool {
  /**
   * Function wrapped by this tool
   */
  private func: (context: Context, parameters?: any) => any;

  /**
   * Create a new function tool
   * 
   * @param func Function to wrap
   * @param name Human-readable name
   * @param description Description of what the tool does
   * @param capabilities Set of capabilities provided
   * @param parameterSchema Schema for parameters
   * @param outputSchema Schema for outputs
   * @param baseCost Base cost of using the tool
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    func: (context: Context, parameters?: any) => any,
    name: string,
    description: string,
    capabilities: Set<Capability>,
    parameterSchema?: Record<string, any>,
    outputSchema?: Record<string, any>,
    baseCost: number = 1,
    id?: string
  ) {
    super(id || null, name, description, capabilities, parameterSchema, outputSchema, baseCost);
    this.func = func;
  }

  /**
   * Use the tool by calling the wrapped function
   * 
   * @param context Context for tool execution
   * @param parameters Optional parameters for the tool
   * @returns Function result
   */
  use(context: Context, parameters?: any): any {
    return this.func(context, parameters);
  }
}

/**
 * Tool that retrieves and processes information
 */
export class InformationTool extends BaseTool {
  /**
   * Function that processes information
   */
  private processFunction: (query: string, context: Context) => any;
  
  /**
   * Source of information (e.g., 'database', 'web', 'memory')
   */
  private source: string;

  /**
   * Create a new information tool
   * 
   * @param processFunction Function that processes information
   * @param source Source of information
   * @param name Human-readable name
   * @param description Description of what the tool does
   * @param capabilities Set of capabilities provided
   * @param baseCost Base cost of using the tool
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    processFunction: (query: string, context: Context) => any,
    source: string,
    name: string,
    description: string,
    capabilities: Set<Capability>,
    baseCost: number = 1,
    id?: string
  ) {
    super(
      id || null, 
      name, 
      description, 
      capabilities,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query to process'
          }
        },
        required: ['query']
      },
      {
        type: 'object',
        description: 'Information retrieval result'
      },
      baseCost
    );
    this.processFunction = processFunction;
    this.source = source;
  }

  /**
   * Use the tool to process a query
   * 
   * @param context Context for tool execution
   * @param parameters Parameters with a query
   * @returns Processing result
   */
  use(context: Context, parameters?: any): any {
    if (!parameters || !parameters.query || typeof parameters.query !== 'string') {
      throw new Error('InformationTool requires a query parameter');
    }
    
    return this.processFunction(parameters.query, context);
  }

  /**
   * Get the source of information
   * 
   * @returns Source identifier
   */
  getSource(): string {
    return this.source;
  }
}

/**
 * Tool that interacts with external systems or APIs
 */
export class ExternalSystemTool extends BaseTool {
  /**
   * System or API identifier
   */
  private systemId: string;
  
  /**
   * Function that executes the external operation
   */
  private executeFunction: (operation: string, params: any, context: Context) => any;

  /**
   * Create a new external system tool
   * 
   * @param systemId System or API identifier
   * @param executeFunction Function that executes external operations
   * @param name Human-readable name
   * @param description Description of what the tool does
   * @param capabilities Set of capabilities provided
   * @param baseCost Base cost of using the tool
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    systemId: string,
    executeFunction: (operation: string, params: any, context: Context) => any,
    name: string,
    description: string,
    capabilities: Set<Capability>,
    baseCost: number = 2, // External systems typically have higher cost
    id?: string
  ) {
    super(
      id || null, 
      name, 
      description, 
      capabilities,
      {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            description: 'Operation to execute'
          },
          params: {
            type: 'object',
            description: 'Operation parameters'
          }
        },
        required: ['operation']
      },
      {
        type: 'object',
        description: 'External operation result'
      },
      baseCost
    );
    this.systemId = systemId;
    this.executeFunction = executeFunction;
  }

  /**
   * Use the tool to execute an external operation
   * 
   * @param context Context for tool execution
   * @param parameters Parameters with operation and params
   * @returns Operation result
   */
  use(context: Context, parameters?: any): any {
    if (!parameters || !parameters.operation || typeof parameters.operation !== 'string') {
      throw new Error('ExternalSystemTool requires an operation parameter');
    }
    
    return this.executeFunction(
      parameters.operation, 
      parameters.params || {}, 
      context
    );
  }

  /**
   * Get the system identifier
   * 
   * @returns System ID
   */
  getSystemId(): string {
    return this.systemId;
  }
  
  /**
   * Get the cost of using the tool
   * 
   * @param operation Optional operation name to get specific cost
   * @returns Cost value
   */
  getCost(operation?: string): number {
    // External system operations can have varying costs
    const operationCostMultipliers: Record<string, number> = {
      'read': 1,
      'query': 1.2,
      'write': 1.5,
      'delete': 2,
      'complex': 3
    };
    
    if (operation && operation in operationCostMultipliers) {
      return this.baseCost * operationCostMultipliers[operation];
    }
    
    return this.baseCost;
  }
}

/**
 * Tool factory for creating common tool types
 */
export class ToolFactory {
  /**
   * Create a function tool
   * 
   * @param func Function to wrap
   * @param name Human-readable name
   * @param description Description of what the tool does
   * @param capabilities Capabilities provided
   * @returns A new FunctionTool
   */
  static createFunctionTool(
    func: (context: Context, parameters?: any) => any,
    name: string,
    description: string,
    capabilities: Capability[]
  ): FunctionTool {
    return new FunctionTool(
      func,
      name,
      description,
      new Set(capabilities)
    );
  }

  /**
   * Create a database query tool
   * 
   * @param databaseId Database identifier
   * @param executeQuery Function that executes queries
   * @returns A new ExternalSystemTool configured for database operations
   */
  static createDatabaseTool(
    databaseId: string,
    executeQuery: (operation: string, params: any, context: Context) => any
  ): ExternalSystemTool {
    return new ExternalSystemTool(
      databaseId,
      executeQuery,
      `${databaseId} Database Tool`,
      `Query and manipulate data in the ${databaseId} database`,
      new Set([Capability.DatabaseQuery, Capability.DataAnalysis])
    );
  }

  /**
   * Create a text processing tool
   * 
   * @param processFunction Function that processes text
   * @param textOperation Type of text operation
   * @returns A new FunctionTool configured for text processing
   */
  static createTextTool(
    processFunction: (context: Context, parameters?: any) => any,
    textOperation: 'analysis' | 'generation' | 'summarization' | 'translation'
  ): FunctionTool {
    let name: string;
    let description: string;
    let capabilities: Set<Capability>;
    
    switch (textOperation) {
      case 'analysis':
        name = 'Text Analysis Tool';
        description = 'Analyze text for sentiment, entities, or semantic content';
        capabilities = new Set([Capability.TextAnalysis]);
        break;
      case 'generation':
        name = 'Text Generation Tool';
        description = 'Generate text based on prompts or templates';
        capabilities = new Set([Capability.TextGeneration]);
        break;
      case 'summarization':
        name = 'Text Summarization Tool';
        description = 'Create concise summaries of longer texts';
        capabilities = new Set([Capability.Summarization, Capability.TextAnalysis]);
        break;
      case 'translation':
        name = 'Translation Tool';
        description = 'Translate text between languages';
        capabilities = new Set([Capability.Translation]);
        break;
    }
    
    return new FunctionTool(
      processFunction,
      name,
      description,
      capabilities
    );
  }
}
