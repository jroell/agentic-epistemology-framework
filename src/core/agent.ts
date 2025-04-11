import { EntityId } from '../types/common';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { Capability } from '../action/capability';
import { Memory, DefaultMemory } from './memory';
import { Observer, DefaultObserver } from '../observer/observer';
import { Registry } from './registry';
import { Context, ContextElement } from './context';
import { Perception, ToolResultPerception } from './perception';
import { Justification, JustificationElement, ExternalJustificationElement } from '../epistemic/justification';
import { Goal } from '../action/goal';
import { Plan } from '../action/plan';
import { Action, UseTool, SendMessage } from '../action/action';
import { Tool } from '../action/tool';
import { Message } from '../action/message';
import { EpistemicConflict } from '../epistemic/conflict';
import { negateProp } from '../types/common';

/**
 * Default confidence thresholds for belief-related operations
 */
export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  action: 0.7,    // Minimum confidence to take action
  conflict: 0.6,  // Minimum confidence to identify a conflict
  communication: 0.5, // Minimum confidence to communicate a belief
  memory: 0.3     // Minimum confidence to store in long-term memory
};

/**
 * Configuration for various confidence thresholds
 */
export interface ConfidenceThresholds {
  action: number;
  conflict: number;
  communication: number;
  memory: number;
}

/**
 * An autonomous entity with perception, reasoning, planning, and action capabilities
 */
export class Agent {
  /**
   * Unique identifier for the agent
   */
  id: EntityId;
  
  /**
   * Type of entity
   */
  type: string = 'Agent';
  
  /**
   * Human-readable name of the agent
   */
  name?: string;
  
  /**
   * Map of beliefs held by the agent
   */
  private beliefs: Map<string, Belief> = new Map();
  
  /**
   * Agent's memory system
   */
  private memory: Memory;
  
  /**
   * Agent's current frame/perspective
   */
  private frame: Frame;
  
  /**
   * Agent's current working context
   */
  private context: Context;
  
  /**
   * Agent's capabilities
   */
  private capabilities: Set<Capability>;
  
  /**
   * Registry of available tools and entities
   */
  private registry: Registry;
  
  /**
   * Observer for logging agent events
   */
  private observer: Observer;
  
  /**
   * Confidence thresholds for different operations
   */
  private confidenceThresholds: ConfidenceThresholds;

  /**
   * Create a new agent
   * 
   * @param id Agent ID
   * @param name Agent name
   * @param initialBeliefs Initial beliefs
   * @param initialFrame Initial frame/perspective
   * @param capabilities Agent capabilities
   * @param registry Registry of tools and entities
   * @param memory Optional memory system
   * @param observer Optional observer for logging
   * @param confidenceThresholds Optional confidence thresholds
   */
  constructor(
    id: EntityId,
    name: string,
    initialBeliefs: Belief[] = [],
    initialFrame: Frame,
    capabilities: Set<Capability> = new Set(),
    registry: Registry,
    memory?: Memory,
    observer?: Observer,
    confidenceThresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS
  ) {
    this.id = id;
    this.name = name;
    this.frame = initialFrame;
    this.capabilities = capabilities;
    this.registry = registry;
    this.memory = memory || new DefaultMemory();
    this.observer = observer || new DefaultObserver();
    this.confidenceThresholds = confidenceThresholds;
    this.context = new Context([]);

    // Initialize beliefs
    initialBeliefs.forEach(belief => {
      this.beliefs.set(belief.proposition, belief);
      this.memory.storeEntity(belief);
    });
  }

  /**
   * Process a perception event, potentially updating beliefs and context
   * 
   * @param perception The perception to process
   */
  perceive(perception: Perception): void {
    // Log the perception event
    this.observer.logPerception(this.id, perception);

    // Update context with new perception
    this.context.addElements(perception.getContextualElements());

    // Process the perception based on current frame
    const interpretedPerception = this.frame.interpretPerception(perception);

    // Update beliefs based on the interpreted perception
    this.updateBeliefs(interpretedPerception);
  }

  /**
   * Update beliefs based on new information from a perception
   * 
   * @param perception The perception containing new information
   */
  private updateBeliefs(perception: Perception): void {
    const relevantPropositions = this.frame.getRelevantPropositions(perception);

    relevantPropositions.forEach(proposition => {
      const existingBelief = this.beliefs.get(proposition);
      const newJustificationElements = perception.getJustificationElements(proposition);

      if (existingBelief) {
        // Update existing belief
        const updatedConfidence = this.computeUpdatedConfidence(
          existingBelief, 
          newJustificationElements,
          this.frame
        );

        const updatedJustification = new Justification([
          ...existingBelief.justification.elements,
          ...newJustificationElements
        ]);

        const updatedBelief = new Belief(
          proposition,
          updatedConfidence,
          updatedJustification
        );

        this.beliefs.set(proposition, updatedBelief);
        this.memory.storeEntity(updatedBelief);
        this.observer.logBeliefUpdate(this.id, existingBelief, updatedBelief);
      } else if (newJustificationElements.length > 0) {
        // Create new belief
        const initialConfidence = this.frame.computeInitialConfidence(
          proposition,
          newJustificationElements
        );

        const justification = new Justification(newJustificationElements);
        const newBelief = new Belief(proposition, initialConfidence, justification);
        
        this.beliefs.set(proposition, newBelief);
        this.memory.storeEntity(newBelief);
        this.observer.logBeliefFormation(this.id, newBelief);
      }
    });
  }

  /**
   * Compute updated confidence based on existing belief and new evidence
   * 
   * @param existingBelief The existing belief
   * @param newJustificationElements New evidence
   * @param frame The frame to use for computation
   * @returns Updated confidence value
   */
  private computeUpdatedConfidence(
    existingBelief: Belief,
    newJustificationElements: JustificationElement[],
    frame: Frame
  ): number {
    return frame.updateConfidence(
      existingBelief.confidence, 
      existingBelief.justification,
      newJustificationElements
    );
  }

  /**
   * Construct a plan to achieve a goal
   * 
   * @param goal The goal to achieve
   * @returns A plan or null if planning failed
   */
  plan(goal: Goal): Plan | null {
    // Log the planning event
    this.observer.logPlanningStart(this.id, goal);

    // Get relevant beliefs from context and memory
    const relevantBeliefs = this.getRelevantBeliefs(goal);

    // Check if confidence in relevant beliefs is sufficient
    for (const belief of relevantBeliefs) {
      if (belief.confidence < this.confidenceThresholds.action) {
        // Need more information - could initiate inquiry
        this.observer.logInsufficientConfidence(this.id, belief, goal);
        return null;
      }
    }

    // Simple planning algorithm (in real implementation, this would be more sophisticated)
    const availableActions = this.getAvailableActions();
    const plan = this.constructPlan(goal, relevantBeliefs, availableActions);
    
    if (plan) {
      this.observer.logPlanCreation(this.id, plan);
    }
    
    return plan;
  }

  /**
   * Get beliefs relevant to a specific goal
   * 
   * @param goal The goal to get relevant beliefs for
   * @returns Array of relevant beliefs
   */
  private getRelevantBeliefs(goal: Goal): Belief[] {
    // Retrieve relevant beliefs based on the current frame and goal
    const relevantPropositions = this.frame.getRelevantPropositions(goal);
    
    return relevantPropositions
      .map(prop => this.beliefs.get(prop))
      .filter((belief): belief is Belief => belief !== undefined);
  }

  /**
   * Get available actions based on current capabilities
   * 
   * @returns Array of available actions
   */
  private getAvailableActions(): Action[] {
    const actions: Action[] = [];
    
    this.capabilities.forEach(capability => {
      const tools = this.registry.getToolsForCapability(capability);
      
      tools.forEach(tool => {
        actions.push(new UseTool(tool));
      });
    });
    
    return actions;
  }

  /**
   * Construct a plan to achieve a goal using available actions and beliefs
   * 
   * @param goal The goal to achieve
   * @param beliefs Relevant beliefs
   * @param availableActions Available actions
   * @returns A plan or null if planning failed
   */
  private constructPlan(goal: Goal, beliefs: Belief[], availableActions: Action[]): Plan | null {
    // This is a simplified planning algorithm
    // In a full implementation, this would include more sophisticated planning methods
    
    const planSteps: Action[] = [];
    
    // Simple linear planning for demonstration purposes
    const subgoals = goal.decompose();
    
    for (const subgoal of subgoals) {
      const actionForSubgoal = availableActions.find(action => 
        action.canAchieve(subgoal, beliefs)
      );
      
      if (!actionForSubgoal) {
        return null; // Cannot find action for subgoal
      }
      
      planSteps.push(actionForSubgoal);
    }
    
    if (planSteps.length === 0) {
      return null;
    }
    
    return new Plan(goal, planSteps, beliefs);
  }

  /**
   * Execute a plan, performing actions and updating state
   * 
   * @param plan The plan to execute
   * @returns True if the plan was executed successfully
   */
  executePlan(plan: Plan): boolean {
    // Log plan execution start
    this.observer.logPlanExecution(this.id, plan);
    
    for (const action of plan.steps) {
      // Check if supporting beliefs still have sufficient confidence
      const supportingBeliefs = plan.getSupportingBeliefs(action);
      
      for (const belief of supportingBeliefs) {
        const currentBelief = this.beliefs.get(belief.proposition);
        
        if (!currentBelief || currentBelief.confidence < this.confidenceThresholds.action) {
          // Belief confidence has changed, abort plan execution
          this.observer.logPlanAbort(this.id, plan, action);
          return false;
        }
      }
      
      // Execute the action
      try {
        const result = this.executeAction(action);
        if (!result) {
          this.observer.logActionFailure(this.id, action);
          return false;
        }
      } catch (error) {
        this.observer.logActionError(this.id, action, error);
        return false;
      }
    }
    
    this.observer.logPlanCompletion(this.id, plan);
    return true;
  }

  /**
   * Execute a single action
   * 
   * @param action The action to execute
   * @returns True if the action was executed successfully
   */
  executeAction(action: Action): boolean {
    this.observer.logActionExecution(this.id, action);
    
    if (action instanceof UseTool) {
      return this.executeTool(action.tool, action.parameters);
    } else if (action instanceof SendMessage) {
      return this.sendMessage(action.message);
    }
    
    return false;
  }

  /**
   * Use a tool to perform an operation
   * 
   * @param tool The tool to use
   * @param parameters Optional parameters for the tool
   * @returns True if the tool was used successfully
   */
  private executeTool(tool: Tool, parameters?: any): boolean {
    try {
      const result = tool.use(this.context, parameters);
      this.perceive(new ToolResultPerception(tool.id, result));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send a message to another entity
   * 
   * @param message The message to send
   * @returns True if the message was sent successfully
   */
  private sendMessage(message: Message): boolean {
    try {
      const recipientId = message.recipient;
      const recipient = this.registry.getEntity(recipientId);
      
      if (recipient) {
        // In a real implementation, this would actually send the message
        // For now, we just log it
        this.observer.logMessageSent(this.id, recipientId, message);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect epistemic conflicts with other agents
   * 
   * @param otherAgent The agent to check for conflicts with
   * @returns Array of detected conflicts
   */
  detectConflicts(otherAgent: Agent): EpistemicConflict[] {
    const conflicts: EpistemicConflict[] = [];
    
    // Check each belief in this agent
    for (const [proposition, belief] of this.beliefs.entries()) {
      // If confidence is above conflict threshold
      if (belief.confidence >= this.confidenceThresholds.conflict) {
        // Check if other agent has a contradictory belief
        const negatedProp = negateProp(proposition);
        const otherBelief = otherAgent.getBelief(negatedProp);
        
        if (otherBelief && otherBelief.confidence >= otherAgent.confidenceThresholds.conflict) {
          // Create a conflict object
          const conflict = new EpistemicConflict(
            this.id,
            otherAgent.id,
            proposition,
            belief,
            otherBelief
          );
          
          conflicts.push(conflict);
          this.observer.logConflictDetection(conflict);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Exchange justifications to resolve a conflict
   * 
   * @param conflict The conflict to resolve
   * @param otherAgent The other agent involved in the conflict
   */
  exchangeJustifications(conflict: EpistemicConflict, otherAgent: Agent): void {
    // Log the justification exchange
    this.observer.logJustificationExchange(this.id, otherAgent.id, conflict);
    
    // Get the other agent's justification for the conflicting belief
    const otherJustification = conflict.contradictoryBelief.justification;
    
    // Process the justification from the other agent
    this.processExternalJustification(
      conflict.proposition,
      otherJustification,
      otherAgent.frame
    );
    
    // Other agent also processes this agent's justification
    otherAgent.processExternalJustification(
      negateProp(conflict.proposition),
      conflict.belief.justification,
      this.frame
    );
  }

  /**
   * Process a justification received from another agent
   * 
   * @param proposition The proposition being justified
   * @param externalJustification The external justification
   * @param sourceFrame The frame of the source agent
   */
  processExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): void {
    // Get current belief about the proposition
    const currentBelief = this.beliefs.get(proposition);
    
    if (!currentBelief) {
      // If no current belief, potentially form a new one
      const initialConfidence = this.frame.evaluateExternalJustification(
        proposition,
        externalJustification,
        sourceFrame
      );
      
      if (initialConfidence > 0) {
        const newBelief = new Belief(
          proposition,
          initialConfidence,
          new Justification([
            new ExternalJustificationElement(
              externalJustification,
              sourceFrame.id
            )
          ])
        );
        
        this.beliefs.set(proposition, newBelief);
        this.memory.storeEntity(newBelief);
        this.observer.logBeliefFormation(this.id, newBelief);
      }
    } else {
      // Update existing belief
      const externalJustElement = new ExternalJustificationElement(
        externalJustification,
        sourceFrame.id
      );
      
      const updatedConfidence = this.frame.updateConfidence(
        currentBelief.confidence,
        currentBelief.justification,
        [externalJustElement]
      );
      
      const updatedJustification = new Justification([
        ...currentBelief.justification.elements,
        externalJustElement
      ]);
      
      const updatedBelief = new Belief(
        proposition,
        updatedConfidence,
        updatedJustification
      );
      
      this.beliefs.set(proposition, updatedBelief);
      this.memory.storeEntity(updatedBelief);
      this.observer.logBeliefUpdate(this.id, currentBelief, updatedBelief);
    }
  }

  /**
   * Change the agent's active frame
   * 
   * @param newFrame The new frame to set
   */
  setFrame(newFrame: Frame): void {
    const oldFrame = this.frame;
    this.frame = newFrame;
    
    // Log the frame change
    this.observer.logFrameChange(this.id, oldFrame, newFrame);
    
    // Potentially update belief confidences based on new frame
    this.recomputeBeliefConfidences();
  }

  /**
   * Recompute confidence levels for all beliefs when frame changes
   */
  private recomputeBeliefConfidences(): void {
    for (const [proposition, belief] of this.beliefs.entries()) {
      // Frame-dependent confidence recalculation
      const newConfidence = this.frame.recomputeConfidence(
        belief.justification,
        belief.confidence
      );
      
      if (newConfidence !== belief.confidence) {
        const updatedBelief = new Belief(
          proposition,
          newConfidence,
          belief.justification
        );
        
        this.beliefs.set(proposition, updatedBelief);
        this.memory.storeEntity(updatedBelief);
        this.observer.logBeliefUpdate(this.id, belief, updatedBelief);
      }
    }
  }

  /**
   * Get all beliefs with confidence above a threshold
   * 
   * @param confidenceThreshold Minimum confidence threshold (default: 0)
   * @returns Array of beliefs above the threshold
   */
  getBeliefs(confidenceThreshold: number = 0): Belief[] {
    return Array.from(this.beliefs.values())
      .filter(belief => belief.confidence >= confidenceThreshold);
  }

  /**
   * Get a specific belief by proposition
   * 
   * @param proposition The proposition to get a belief for
   * @returns The belief or undefined if not found
   */
  getBelief(proposition: string): Belief | undefined {
    return this.beliefs.get(proposition);
  }

  /**
   * Get the agent's current frame
   * 
   * @returns The current frame
   */
  get frame(): Frame {
    return this._frame;
  }

  /**
   * Set the agent's frame
   * 
   * @param frame The new frame
   */
  set frame(frame: Frame) {
    this._frame = frame;
  }

  /**
   * Frame backing property
   */
  private _frame: Frame;
}
