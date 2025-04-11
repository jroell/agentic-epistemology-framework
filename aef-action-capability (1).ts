/**
 * Capability definitions for the AEF
 * 
 * Capabilities represent the abstract behaviors or functions that agents can perform
 */

/**
 * Enum of standard capabilities that agents can possess
 */
export enum Capability {
  // Communication capabilities
  TextGeneration = 'text_generation',
  TextAnalysis = 'text_analysis',
  Translation = 'translation',
  Summarization = 'summarization',
  
  // Data capabilities
  DatabaseQuery = 'database_query',
  DataVisualization = 'data_visualization',
  DataAnalysis = 'data_analysis',
  
  // Reasoning capabilities
  LogicalReasoning = 'logical_reasoning',
  ProbabilisticReasoning = 'probabilistic_reasoning',
  Planning = 'planning',
  
  // Domain-specific capabilities
  ImageAnalysis = 'image_analysis',
  AudioAnalysis = 'audio_analysis',
  CodeGeneration = 'code_generation',
  MathematicsProblemSolving = 'mathematics_problem_solving',
  
  // System capabilities
  FileIO = 'file_io',
  NetworkAccess = 'network_access',
  SystemExecution = 'system_execution',
  
  // Meta capabilities
  SelfMonitoring = 'self_monitoring',
  LearningAndAdaptation = 'learning_and_adaptation'
}

/**
 * Interface for capability metadata
 */
export interface CapabilityMetadata {
  /**
   * Unique identifier of the capability
   */
  id: Capability;
  
  /**
   * Human-readable name of the capability
   */
  name: string;
  
  /**
   * Description of what the capability enables
   */
  description: string;
  
  /**
   * Optional list of parameters the capability can accept
   */
  parameters?: CapabilityParameter[];
  
  /**
   * Optional description of what the capability returns
   */
  returns?: string;
}

/**
 * Interface for capability parameter metadata
 */
export interface CapabilityParameter {
  /**
   * Name of the parameter
   */
  name: string;
  
  /**
   * Type of the parameter
   */
  type: string;
  
  /**
   * Description of the parameter
   */
  description: string;
  
  /**
   * Whether the parameter is required
   */
  required: boolean;
  
  /**
   * Default value if not provided
   */
  defaultValue?: any;
}

/**
 * Map of capability metadata by capability ID
 */
export const CAPABILITY_METADATA: Record<Capability, CapabilityMetadata> = {
  [Capability.TextGeneration]: {
    id: Capability.TextGeneration,
    name: 'Text Generation',
    description: 'Generate text based on a prompt or context',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        description: 'Input prompt or context for generation',
        required: true
      },
      {
        name: 'maxLength',
        type: 'number',
        description: 'Maximum length of generated text',
        required: false,
        defaultValue: 500
      }
    ],
    returns: 'Generated text string'
  },
  
  [Capability.TextAnalysis]: {
    id: Capability.TextAnalysis,
    name: 'Text Analysis',
    description: 'Analyze text for sentiment, entities, or other properties',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to analyze',
        required: true
      },
      {
        name: 'analysisType',
        type: 'string',
        description: 'Type of analysis to perform (sentiment, entities, etc.)',
        required: false,
        defaultValue: 'sentiment'
      }
    ],
    returns: 'Analysis results object'
  },
  
  [Capability.Translation]: {
    id: Capability.Translation,
    name: 'Translation',
    description: 'Translate text between languages',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to translate',
        required: true
      },
      {
        name: 'sourceLanguage',
        type: 'string',
        description: 'Source language code',
        required: false,
        defaultValue: 'auto'
      },
      {
        name: 'targetLanguage',
        type: 'string',
        description: 'Target language code',
        required: true
      }
    ],
    returns: 'Translated text string'
  },
  
  [Capability.Summarization]: {
    id: Capability.Summarization,
    name: 'Summarization',
    description: 'Create a concise summary of longer text',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Text to summarize',
        required: true
      },
      {
        name: 'maxLength',
        type: 'number',
        description: 'Maximum length of summary',
        required: false,
        defaultValue: 200
      }
    ],
    returns: 'Summarized text string'
  },
  
  [Capability.DatabaseQuery]: {
    id: Capability.DatabaseQuery,
    name: 'Database Query',
    description: 'Query a database and return results',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'Query string (SQL, etc.)',
        required: true
      },
      {
        name: 'databaseId',
        type: 'string',
        description: 'Identifier for the database to query',
        required: true
      }
    ],
    returns: 'Query results array or object'
  },
  
  [Capability.DataVisualization]: {
    id: Capability.DataVisualization,
    name: 'Data Visualization',
    description: 'Create visualizations from data',
    parameters: [
      {
        name: 'data',
        type: 'array',
        description: 'Data to visualize',
        required: true
      },
      {
        name: 'visualizationType',
        type: 'string',
        description: 'Type of visualization (bar, line, scatter, etc.)',
        required: true
      }
    ],
    returns: 'Visualization image or configuration object'
  },
  
  [Capability.DataAnalysis]: {
    id: Capability.DataAnalysis,
    name: 'Data Analysis',
    description: 'Analyze data for patterns, statistics, or insights',
    parameters: [
      {
        name: 'data',
        type: 'array',
        description: 'Data to analyze',
        required: true
      },
      {
        name: 'analysisType',
        type: 'string',
        description: 'Type of analysis to perform',
        required: true
      }
    ],
    returns: 'Analysis results object'
  },
  
  [Capability.LogicalReasoning]: {
    id: Capability.LogicalReasoning,
    name: 'Logical Reasoning',
    description: 'Perform logical inference and deduction',
    parameters: [
      {
        name: 'premises',
        type: 'array',
        description: 'Array of premise statements',
        required: true
      },
      {
        name: 'query',
        type: 'string',
        description: 'Query or goal to reason about',
        required: true
      }
    ],
    returns: 'Reasoning results and conclusion'
  },
  
  [Capability.ProbabilisticReasoning]: {
    id: Capability.ProbabilisticReasoning,
    name: 'Probabilistic Reasoning',
    description: 'Reason under uncertainty using probability',
    parameters: [
      {
        name: 'model',
        type: 'object',
        description: 'Probabilistic model or network',
        required: true
      },
      {
        name: 'query',
        type: 'string',
        description: 'Query to reason about',
        required: true
      },
      {
        name: 'evidence',
        type: 'object',
        description: 'Observed evidence',
        required: false
      }
    ],
    returns: 'Probability distribution or inference results'
  },
  
  [Capability.Planning]: {
    id: Capability.Planning,
    name: 'Planning',
    description: 'Create plans to achieve goals',
    parameters: [
      {
        name: 'goal',
        type: 'string',
        description: 'Goal to achieve',
        required: true
      },
      {
        name: 'initialState',
        type: 'object',
        description: 'Initial state of the environment',
        required: true
      },
      {
        name: 'availableActions',
        type: 'array',
        description: 'Actions available to the planner',
        required: true
      }
    ],
    returns: 'Sequence of actions to achieve the goal'
  },
  
  [Capability.ImageAnalysis]: {
    id: Capability.ImageAnalysis,
    name: 'Image Analysis',
    description: 'Analyze images for content, objects, or properties',
    parameters: [
      {
        name: 'image',
        type: 'binary',
        description: 'Image data to analyze',
        required: true
      },
      {
        name: 'analysisType',
        type: 'string',
        description: 'Type of analysis to perform',
        required: false,
        defaultValue: 'object_detection'
      }
    ],
    returns: 'Analysis results object'
  },
  
  [Capability.AudioAnalysis]: {
    id: Capability.AudioAnalysis,
    name: 'Audio Analysis',
    description: 'Analyze audio for speech, music, or other properties',
    parameters: [
      {
        name: 'audio',
        type: 'binary',
        description: 'Audio data to analyze',
        required: true
      },
      {
        name: 'analysisType',
        type: 'string',
        description: 'Type of analysis to perform',
        required: false,
        defaultValue: 'speech_to_text'
      }
    ],
    returns: 'Analysis results object'
  },
  
  [Capability.CodeGeneration]: {
    id: Capability.CodeGeneration,
    name: 'Code Generation',
    description: 'Generate code based on specifications',
    parameters: [
      {
        name: 'specification',
        type: 'string',
        description: 'Specification or description of code to generate',
        required: true
      },
      {
        name: 'language',
        type: 'string',
        description: 'Programming language to generate',
        required: true
      }
    ],
    returns: 'Generated code string'
  },
  
  [Capability.MathematicsProblemSolving]: {
    id: Capability.MathematicsProblemSolving,
    name: 'Mathematics Problem Solving',
    description: 'Solve mathematical problems and equations',
    parameters: [
      {
        name: 'problem',
        type: 'string',
        description: 'Problem statement or equation',
        required: true
      },
      {
        name: 'format',
        type: 'string',
        description: 'Format for the solution',
        required: false,
        defaultValue: 'step_by_step'
      }
    ],
    returns: 'Solution and working'
  },
  
  [Capability.FileIO]: {
    id: Capability.FileIO,
    name: 'File I/O',
    description: 'Read and write files',
    parameters: [
      {
        name: 'operation',
        type: 'string',
        description: 'Operation to perform (read, write, append, etc.)',
        required: true
      },
      {
        name: 'path',
        type: 'string',
        description: 'File path',
        required: true
      },
      {
        name: 'content',
        type: 'any',
        description: 'Content to write (for write operations)',
        required: false
      }
    ],
    returns: 'File content or operation status'
  },
  
  [Capability.NetworkAccess]: {
    id: Capability.NetworkAccess,
    name: 'Network Access',
    description: 'Access network resources via HTTP or other protocols',
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'URL or network resource identifier',
        required: true
      },
      {
        name: 'method',
        type: 'string',
        description: 'HTTP method or protocol action',
        required: false,
        defaultValue: 'GET'
      },
      {
        name: 'data',
        type: 'any',
        description: 'Data to send (for POST, PUT, etc.)',
        required: false
      }
    ],
    returns: 'Response from the network resource'
  },
  
  [Capability.SystemExecution]: {
    id: Capability.SystemExecution,
    name: 'System Execution',
    description: 'Execute system commands or scripts',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'Command to execute',
        required: true
      },
      {
        name: 'args',
        type: 'array',
        description: 'Command arguments',
        required: false,
        defaultValue: []
      }
    ],
    returns: 'Command output and execution status'
  },
  
  [Capability.SelfMonitoring]: {
    id: Capability.SelfMonitoring,
    name: 'Self-Monitoring',
    description: 'Monitor agent\'s own state and performance',
    parameters: [
      {
        name: 'aspectToMonitor',
        type: 'string',
        description: 'Aspect of the agent to monitor',
        required: false,
        defaultValue: 'all'
      },
      {
        name: 'duration',
        type: 'number',
        description: 'Duration of monitoring (ms)',
        required: false,
        defaultValue: 1000
      }
    ],
    returns: 'Monitoring results object'
  },
  
  [Capability.LearningAndAdaptation]: {
    id: Capability.LearningAndAdaptation,
    name: 'Learning and Adaptation',
    description: 'Learn from experience and adapt behavior',
    parameters: [
      {
        name: 'experience',
        type: 'object',
        description: 'Experience data to learn from',
        required: true
      },
      {
        name: 'learningRate',
        type: 'number',
        description: 'Rate of adaptation',
        required: false,
        defaultValue: 0.1
      }
    ],
    returns: 'Learning results and adaptation status'
  }
};

/**
 * Get metadata for a specific capability
 * 
 * @param capability Capability to get metadata for
 * @returns Capability metadata
 */
export function getCapabilityMetadata(capability: Capability): CapabilityMetadata {
  return CAPABILITY_METADATA[capability];
}

/**
 * Check if a capability is available in the system
 * 
 * @param capability Capability to check
 * @returns True if the capability is available
 */
export function isCapabilityAvailable(capability: Capability): boolean {
  return capability in CAPABILITY_METADATA;
}

/**
 * Get all available capabilities
 * 
 * @returns Array of all available capabilities
 */
export function getAllCapabilities(): Capability[] {
  return Object.keys(CAPABILITY_METADATA) as Capability[];
}
