import { EntityId, generateId } from '../types/common';
import { Goal } from './goal';
import { Action } from './action';
import { Belief } from '../epistemic/belief';

/**
 * Status of a plan
 */
export enum PlanStatus {
  /**
   * Plan has been created but not started
   */
  Created = 'created',
  
  /**
   * Plan is currently being executed
   */
  InProgress = 'in_progress',
  
  /**
   * Plan has been completed successfully
   */
  Completed = 'completed',
  
  /**
   * Plan execution failed
   */
  Failed = 'failed',
  
  /**
   * Plan execution was aborted
   */
  Aborted = 'aborted'
}

/**
 * A sequence of actions aimed at achieving a goal
 * 
 * Plans represent the agent's strategy for achieving goals through
 * a structured sequence of actions
 */
export class Plan {
  /**
   * Unique identifier for the plan
   */
  id: string;
  
  /**
   * Goal this plan aims to achieve
   */
  goal: Goal;
  
  /**
   * Sequence of actions to execute
   */
  steps: Action[];
  
  /**
   * Beliefs supporting this plan
   */
  supportingBeliefs: Belief[];
  
  /**
   * Current status of the plan
   */
  status: PlanStatus;
  
  /**
   * Index of the current step being executed
   */
  currentStepIndex: number;
  
  /**
   * Timestamp when the plan was created
   */
  createdAt: number;
  
  /**
   * Timestamp when the plan was started
   */
  startedAt?: number;
  
  /**
   * Timestamp when the plan was completed/failed/aborted
   */
  endedAt?: number;
  
  /**
   * Optional parent plan if this is a subplan
   */
  parentPlanId?: string;

  /**
   * Create a new plan
   * 
   * @param goal Goal to achieve
   * @param steps Actions to execute
   * @param supportingBeliefs Beliefs supporting the plan
   * @param parentPlanId Optional parent plan ID
   * @param id Optional ID (generated if not provided)
   */
  constructor(
    goal: Goal,
    steps: Action[],
    supportingBeliefs: Belief[] = [],
    parentPlanId?: string,
    id?: string
  ) {
    this.id = id || generateId('plan');
    this.goal = goal;
    this.steps = [...steps];
    this.supportingBeliefs = [...supportingBeliefs];
    this.status = PlanStatus.Created;
    this.currentStepIndex = 0;
    this.createdAt = Date.now();
    this.parentPlanId = parentPlanId;
  }

  /**
   * Start executing the plan
   * 
   * @returns True if the plan was started
   */
  start(): boolean {
    if (this.status !== PlanStatus.Created) {
      return false;
    }
    
    this.status = PlanStatus.InProgress;
    this.startedAt = Date.now();
    return true;
  }

  /**
   * Mark the plan as completed
   * 
   * @returns True if the plan was marked as completed
   */
  complete(): boolean {
    if (this.status !== PlanStatus.InProgress) {
      return false;
    }
    
    this.status = PlanStatus.Completed;
    this.endedAt = Date.now();
    return true;
  }

  /**
   * Mark the plan as failed
   * 
   * @param reason Optional reason for failure
   * @returns True if the plan was marked as failed
   */
  fail(reason?: string): boolean {
    if (this.status !== PlanStatus.InProgress) {
      return false;
    }
    
    this.status = PlanStatus.Failed;
    this.endedAt = Date.now();
    
    if (reason) {
      this.setMetadata('failure_reason', reason);
    }
    
    return true;
  }

  /**
   * Abort the plan
   * 
   * @param reason Optional reason for abortion
   * @returns True if the plan was aborted
   */
  abort(reason?: string): boolean {
    if (this.status !== PlanStatus.Created && this.status !== PlanStatus.InProgress) {
      return false;
    }
    
    this.status = PlanStatus.Aborted;
    this.endedAt = Date.now();
    
    if (reason) {
      this.setMetadata('abort_reason', reason);
    }
    
    return true;
  }

  /**
   * Get the next action to execute
   * 
   * @returns The next action or undefined if none
   */
  getNextAction(): Action | undefined {
    if (this.status !== PlanStatus.InProgress || this.currentStepIndex >= this.steps.length) {
      return undefined;
    }
    
    return this.steps[this.currentStepIndex];
  }

  /**
   * Advance to the next step
   * 
   * @returns True if advanced, false if at the end
   */
  advanceToNextStep(): boolean {
    if (this.status !== PlanStatus.InProgress || this.currentStepIndex >= this.steps.length - 1) {
      return false;
    }
    
    this.currentStepIndex++;
    
    // If we've reached the end, automatically complete the plan
    if (this.currentStepIndex >= this.steps.length) {
      this.complete();
    }
    
    return true;
  }

  /**
   * Get the current progress percentage
   * 
   * @returns Progress percentage (0-100)
   */
  getProgress(): number {
    if (this.steps.length === 0) {
      return this.status === PlanStatus.Completed ? 100 : 0;
    }
    
    return (this.currentStepIndex / this.steps.length) * 100;
  }

  /**
   * Get beliefs supporting a specific action
   * 
   * @param action Action to get supporting beliefs for
   * @returns Array of supporting beliefs
   */
  getSupportingBeliefs(action: Action): Belief[] {
    // This is a simplified implementation
    // In a real system, this would involve semantic matching between
    // beliefs and actions to determine which beliefs support which actions
    
    // For now, we just return all supporting beliefs for any action
    return [...this.supportingBeliefs];
  }

  /**
   * Get execution time (actual or estimated)
   * 
   * @returns Execution time in milliseconds or -1 if unknown
   */
  getExecutionTime(): number {
    if (this.status === PlanStatus.Completed || 
        this.status === PlanStatus.Failed || 
        this.status === PlanStatus.Aborted) {
      // Actual execution time
      return (this.endedAt || 0) - (this.startedAt || this.createdAt);
    }
    
    // Estimated execution time based on action execution times
    let totalTime = 0;
    let hasUnknownTime = false;
    
    for (const action of this.steps) {
      if (action.executionTime < 0) {
        hasUnknownTime = true;
      } else {
        totalTime += action.executionTime;
      }
    }
    
    return hasUnknownTime ? -1 : totalTime;
  }

  /**
   * Get the total cost of this plan
   * 
   * @returns Sum of costs of all actions
   */
  getTotalCost(): number {
    return this.steps.reduce((sum, action) => sum + action.getCost(), 0);
  }

  /**
   * Check if the plan is still valid given current beliefs
   * 
   * @param currentBeliefs Current beliefs to check against
   * @returns True if the plan is still valid
   */
  isStillValid(currentBeliefs: Belief[]): boolean {
    // This is a simplified implementation
    // In a real system, this would involve more complex validation logic
    
    // Check if any of the supporting beliefs have changed significantly
    for (const supportingBelief of this.supportingBeliefs) {
      const currentBelief = currentBeliefs.find(
        belief => belief.proposition === supportingBelief.proposition
      );
      
      if (!currentBelief) {
        // Supporting belief no longer exists
        return false;
      }
      
      if (Math.abs(currentBelief.confidence - supportingBelief.confidence) > 0.2) {
        // Confidence has changed significantly
        return false;
      }
    }
    
    return true;
  }

  /**
   * Set metadata value
   * 
   * @param key Metadata key
   * @param value Metadata value
   */
  setMetadata(key: string, value: any): void {
    this._metadata = this._metadata || {};
    this._metadata[key] = value;
  }

  /**
   * Get metadata value
   * 
   * @param key Metadata key
   * @param defaultValue Default value if key doesn't exist
   * @returns Metadata value or default
   */
  getMetadata<T>(key: string, defaultValue?: T): T | undefined {
    return this._metadata && key in this._metadata 
      ? this._metadata[key] as T 
      : defaultValue;
  }

  /**
   * Get all metadata
   * 
   * @returns Metadata object
   */
  getAllMetadata(): Record<string, any> {
    return { ...this._metadata };
  }

  /**
   * Create a string representation of the plan
   * 
   * @returns String representation
   */
  toString(): string {
    return `Plan[${this.status}] for goal: ${this.goal.description} (${this.steps.length} steps)`;
  }

  /**
   * Create a detailed string representation of the plan
   * 
   * @returns Detailed string representation
   */
  toDetailedString(): string {
    const stepsList = this.steps.map((step, index) => 
      `  ${index + 1}. ${step.toString()}${index === this.currentStepIndex ? ' <- Current' : ''}`
    ).join('\n');
    
    return `Plan: ${this.id}\n` +
           `Goal: ${this.goal.description}\n` +
           `Status: ${this.status}\n` +
           `Progress: ${this.getProgress().toFixed(1)}%\n` +
           `Steps:\n${stepsList}`;
  }

  /**
   * Private metadata storage
   */
  private _metadata: Record<string, any> = {};
}

/**
 * A planner that creates plans to achieve goals
 */
export interface Planner {
  /**
   * Create a plan to achieve a goal
   * 
   * @param goal Goal to achieve
   * @param beliefs Current beliefs
   * @param availableActions Available actions
   * @returns A plan or null if no plan could be created
   */
  createPlan(
    goal: Goal, 
    beliefs: Belief[], 
    availableActions: Action[]
  ): Promise<Plan | null>;
}

/**
 * Simple sequential planner that creates linear plans
 */
export class SequentialPlanner implements Planner {
  /**
   * Create a sequential plan to achieve a goal
   * 
   * @param goal Goal to achieve
   * @param beliefs Current beliefs
   * @param availableActions Available actions
   * @returns A sequential plan or null if no plan could be created
   */
  async createPlan(
    goal: Goal, 
    beliefs: Belief[], 
    availableActions: Action[]
  ): Promise<Plan | null> {
    // Decompose the goal into subgoals
    const subgoals = goal.decompose();
    
    // Create a sequence of actions for each subgoal
    const planSteps: Action[] = [];
    const supportingBeliefs: Belief[] = [];
    
    for (const subgoal of subgoals) {
      // Find an action that can achieve the subgoal
      const action = availableActions.find(a => a.canAchieve(subgoal, beliefs));
      
      if (!action) {
        // No action found for this subgoal
        return null;
      }
      
      planSteps.push(action);
      
      // Collect supporting beliefs for this action
      // Check if the belief's proposition is relevant to the subgoal
      const subgoalRelevantProps = subgoal.getRelevantPropositions();
      const relevantBeliefs = beliefs.filter(belief => 
        subgoalRelevantProps.includes(belief.proposition)
      );
      
      for (const belief of relevantBeliefs) {
        if (!supportingBeliefs.some(b => b.proposition === belief.proposition)) {
          supportingBeliefs.push(belief);
        }
      }
    }
    
    if (planSteps.length === 0) {
      // No actions found for any subgoal
      return null;
    }
    
    return new Plan(goal, planSteps, supportingBeliefs);
  }
}

/**
 * Factory for creating different types of planners
 */
export class PlannerFactory {
  /**
   * Create a sequential planner
   * 
   * @returns A new SequentialPlanner
   */
  static createSequentialPlanner(): Planner {
    return new SequentialPlanner();
  }
}
