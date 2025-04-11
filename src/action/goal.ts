import { EntityId, generateId } from '../types/common';
import { Capability } from './capability';

/**
 * A target state or outcome that motivates an agent's planning and action
 * 
 * Goals represent desired states or outcomes that agents aim to achieve
 * through planning and executing actions
 */
export class Goal {
  /**
   * Unique identifier for the goal
   */
  id: string;
  
  /**
   * Type of goal (e.g., 'information_gathering', 'state_change', 'ongoing_maintenance')
   */
  type: string;
  
  /**
   * Description of the goal
   */
  description: string;
  
  /**
   * Priority of the goal (0-1, higher means more important)
   */
  priority: number;
  
  /**
   * Deadline for goal completion (milliseconds since epoch)
   * 0 means no deadline
   */
  deadline: number;
  
  /**
   * Additional parameters for the goal
   */
  parameters?: Record<string, any>;
  
  /**
   * Parent goal ID if this is a subgoal
   */
  parentGoalId?: string;
  
  /**
   * Time when the goal was created
   */
  createdAt: number;
  
  /**
   * ID of the entity that created the goal
   */
  createdBy?: EntityId;

  /**
   * Create a new goal
   * 
   * @param id Optional ID (generated if not provided)
   * @param type Type of goal
   * @param description Description of the goal
   * @param parameters Additional parameters
   * @param priority Priority (0-1)
   * @param deadline Deadline (ms since epoch)
   * @param parentGoalId Parent goal ID if this is a subgoal
   * @param createdBy ID of the entity that created the goal
   */
  constructor(
    id: string | null,
    type: string,
    description: string,
    parameters?: Record<string, any>,
    priority: number = 0.5,
    deadline: number = 0,
    parentGoalId?: string,
    createdBy?: EntityId
  ) {
    this.id = id || generateId('goal');
    this.type = type;
    this.description = description;
    this.priority = priority;
    this.deadline = deadline;
    this.parameters = parameters;
    this.parentGoalId = parentGoalId;
    this.createdBy = createdBy;
    this.createdAt = Date.now();
  }

  /**
   * Decompose this goal into subgoals
   * 
   * @returns Array of subgoals
   */
  decompose(): Goal[] {
    // Default implementation returns the goal itself
    // Override in subclasses for specific decomposition logic
    return [this];
  }

  /**
   * Check if the goal has a deadline
   * 
   * @returns True if the goal has a deadline
   */
  hasDeadline(): boolean {
    return this.deadline > 0;
  }

  /**
   * Check if the goal is overdue
   * 
   * @returns True if the goal is overdue
   */
  isOverdue(): boolean {
    if (!this.hasDeadline()) {
      return false;
    }
    return Date.now() > this.deadline;
  }

  /**
   * Get time remaining until deadline (in ms)
   * 
   * @returns Time remaining or Infinity if no deadline
   */
  getTimeRemaining(): number {
    if (!this.hasDeadline()) {
      return Infinity;
    }
    return Math.max(0, this.deadline - Date.now());
  }

  /**
   * Check if this goal requires communication with other agents
   * 
   * @returns True if the goal requires communication
   */
  requiresCommunication(): boolean {
    // Default implementation checks for target agents in parameters
    return this.parameters !== undefined && 
           'targetAgents' in this.parameters && 
           Array.isArray(this.parameters.targetAgents) && 
           this.parameters.targetAgents.length > 0;
  }

  /**
   * Get target agents for communication
   * 
   * @returns Array of agent IDs or empty array if none
   */
  getTargetAgents(): EntityId[] {
    if (!this.requiresCommunication()) {
      return [];
    }
    return this.parameters!.targetAgents as EntityId[];
  }

  /**
   * Get capabilities required to achieve this goal
   * 
   * @returns Array of required capabilities
   */
  getRequiredCapabilities(): Capability[] {
    // Default implementation checks for requiredCapabilities in parameters
    if (this.parameters && 'requiredCapabilities' in this.parameters) {
      return this.parameters.requiredCapabilities as Capability[];
    }
    return [];
  }

  /**
   * Get relevant propositions related to this goal
   * 
   * @returns Array of relevant propositions
   */
  getRelevantPropositions(): string[] {
    // Default implementation
    // In a real system, this would involve NLP to extract propositions
    
    // Simple keyword-based extraction
    const propositions: string[] = [];
    
    // Add goal description as a proposition
    propositions.push(this.description);
    
    // Extract from parameters if available
    if (this.parameters) {
      if (typeof this.parameters.condition === 'string') {
        propositions.push(this.parameters.condition);
      }
      
      if (typeof this.parameters.target === 'string') {
        propositions.push(`${this.parameters.target}IsAchieved`);
      }
    }
    
    return propositions;
  }

  /**
   * Create a string representation of the goal
   * 
   * @returns String representation
   */
  toString(): string {
    return `Goal(${this.type}): ${this.description} (priority: ${this.priority})`;
  }
}

/**
 * Goal for gathering information
 */
export class InformationGatheringGoal extends Goal {
  /**
   * Create a new information gathering goal
   * 
   * @param topic Topic to gather information about
   * @param minConfidence Minimum confidence required
   * @param description Optional description
   * @param priority Priority (0-1)
   * @param deadline Deadline (ms since epoch)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    topic: string,
    minConfidence: number = 0.7,
    description?: string,
    priority: number = 0.5,
    deadline: number = 0,
    id?: string
  ) {
    super(
      id,
      'information_gathering',
      description || `Gather information about ${topic}`,
      {
        topic,
        minConfidence,
        requiredCapabilities: [
          Capability.DataAnalysis, 
          Capability.DatabaseQuery
        ]
      },
      priority,
      deadline
    );
  }

  /**
   * Override to provide specialized decomposition
   * 
   * @returns Array of subgoals
   */
  decompose(): Goal[] {
    const topic = this.parameters!.topic as string;
    
    // Decompose into source-specific subgoals
    return [
      new Goal(
        null,
        'query_database',
        `Query database for ${topic}`,
        { topic, source: 'database' },
        this.priority,
        this.deadline,
        this.id
      ),
      new Goal(
        null,
        'analyze_results',
        `Analyze results about ${topic}`,
        { topic, source: 'analysis' },
        this.priority,
        this.deadline,
        this.id
      )
    ];
  }
}

/**
 * Goal for communicating with other agents
 */
export class CommunicationGoal extends Goal {
  /**
   * Create a new communication goal
   * 
   * @param targetAgents IDs of agents to communicate with
   * @param content Content to communicate
   * @param purpose Purpose of the communication
   * @param priority Priority (0-1)
   * @param deadline Deadline (ms since epoch)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    targetAgents: EntityId[],
    content: any,
    purpose: string,
    priority: number = 0.5,
    deadline: number = 0,
    id?: string
  ) {
    super(
      id,
      'communication',
      `Communicate with ${targetAgents.length} agent(s): ${purpose}`,
      {
        targetAgents,
        content,
        purpose,
        requiredCapabilities: [Capability.TextGeneration]
      },
      priority,
      deadline
    );
  }

  /**
   * Override to confirm this requires communication
   * 
   * @returns Always true for communication goals
   */
  requiresCommunication(): boolean {
    return true;
  }
}

/**
 * Goal for adapting or changing frames
 */
export class FrameAdaptationGoal extends Goal {
  /**
   * Create a new frame adaptation goal
   * 
   * @param targetFrame ID of the frame to adapt to
   * @param reason Reason for adaptation
   * @param priority Priority (0-1)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    targetFrame: string,
    reason: string,
    priority: number = 0.8, // High priority by default
    id?: string
  ) {
    super(
      id,
      'frame_adaptation',
      `Adapt to ${targetFrame} frame: ${reason}`,
      {
        targetFrame,
        reason,
        requiredCapabilities: [Capability.SelfMonitoring]
      },
      priority,
      0 // No deadline for frame adaptations
    );
  }
}

/**
 * Goal for performing a specific task
 */
export class TaskGoal extends Goal {
  /**
   * Create a new task goal
   * 
   * @param taskName Name of the task
   * @param taskParams Parameters for the task
   * @param priority Priority (0-1)
   * @param deadline Deadline (ms since epoch)
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    taskName: string,
    taskParams: Record<string, any>,
    priority: number = 0.5,
    deadline: number = 0,
    id?: string
  ) {
    super(
      id,
      'task',
      `Perform task: ${taskName}`,
      {
        taskName,
        ...taskParams,
        requiredCapabilities: getCapabilitiesForTask(taskName)
      },
      priority,
      deadline
    );
  }
}

/**
 * Helper function to determine required capabilities for common tasks
 * 
 * @param taskName Name of the task
 * @returns Array of required capabilities
 */
function getCapabilitiesForTask(taskName: string): Capability[] {
  // Map common tasks to required capabilities
  const taskCapabilityMap: Record<string, Capability[]> = {
    'data_analysis': [
      Capability.DataAnalysis, 
      Capability.DataVisualization
    ],
    'text_generation': [
      Capability.TextGeneration
    ],
    'code_writing': [
      Capability.CodeGeneration
    ],
    'planning': [
      Capability.Planning,
      Capability.LogicalReasoning
    ],
    'translation': [
      Capability.Translation
    ],
    'summarization': [
      Capability.Summarization,
      Capability.TextAnalysis
    ]
  };
  
  // Return capabilities for the task or a default set
  return taskCapabilityMap[taskName.toLowerCase()] || [Capability.LogicalReasoning];
}
