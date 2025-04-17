import './cli-formatter';
import { EntityId } from '../types/common';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { Capability } from '../action/capability';
import { Memory, DefaultMemory } from './memory';
import { Observer } from '../observer/observer';
import { DefaultObserver } from '../observer/default-observer';
import { Registry } from './registry';
import { Context, ContextElement } from './context';
import { Perception, ToolResultPerception } from './perception';
import { Justification, JustificationElement, ExternalJustificationElement } from '../epistemic/justification';
import { Goal } from '../action/goal';
import { Plan } from '../action/plan';
import { Action, UseTool, SendMessage } from '../action/action';
import { Tool } from '../action/tool'; // Keep Tool import
import { Message } from '../action/message';
import { EpistemicConflict } from '../epistemic/conflict';
import { LLMClient } from '../llm/llm-client';
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
  type = 'Agent';
  
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
   * Client for interacting with the Gemini LLM
   */
  private llmClient: LLMClient;

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
 * @param geminiClient Client for LLM interaction
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
    llmClient: LLMClient,
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
    this._frame = initialFrame;
    this.context = new Context([]);
    this.llmClient = llmClient;

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
  async perceive(perception: Perception): Promise<void> { // Changed to async
    this.observer.logPerception(this.id, perception);
    this.context.addElements(perception.getContextualElements());
    // Call async interpretPerception and pass geminiClient
    const interpretedPerception = await this.frame.interpretPerception(perception, this.llmClient);
    await this.updateBeliefs(interpretedPerception); // Await belief update
  }

  /**
   * Update beliefs based on new information from a perception
   * 
   * @param perception The perception containing new information
   */
  private async updateBeliefs(perception: Perception): Promise<void> { 
    // Call async getRelevantPropositions and pass geminiClient
    const relevantPropositions = await this.frame.getRelevantPropositions(perception, this.llmClient);

    // Use Promise.all to handle async updates concurrently
    await Promise.all(relevantPropositions.map(async proposition => { // Changed to async map
      const existingBelief = this.beliefs.get(proposition);
      const newJustificationElements = perception.getJustificationElements(proposition);

      if (existingBelief) {
        // Call the async computeUpdatedConfidence
        const updatedConfidence = await this.computeUpdatedConfidence( 
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
        // Call async computeInitialConfidence and pass geminiClient
        const initialConfidence = await this.frame.computeInitialConfidence(
          proposition,
          newJustificationElements,
          this.llmClient
        );

        const justification = new Justification(newJustificationElements);
        const newBelief = new Belief(proposition, initialConfidence, justification);
        
        this.beliefs.set(proposition, newBelief);
        this.memory.storeEntity(newBelief);
        this.observer.logBeliefFormation(this.id, newBelief);
      }
    })); // End Promise.all map
  }

  /**
   * Compute updated confidence based on existing belief and new evidence
   * 
   * @param existingBelief The existing belief
   * @param newJustificationElements New evidence
   * @param frame The frame to use for computation
   * @returns Promise resolving to the updated confidence value
   */
  private async computeUpdatedConfidence( // Changed to async
    existingBelief: Belief, 
    newJustificationElements: JustificationElement[],
    frame: Frame
  ): Promise<number> { // Changed return type
    // Pass the proposition and geminiClient to the frame's updateConfidence method
    return frame.updateConfidence(
      existingBelief.proposition, 
      existingBelief.confidence, 
      existingBelief.justification,
      newJustificationElements
    );
  }

  /**
   * Construct a plan to achieve a goal
   * 
 * @param goal The goal to achieve
 * @returns A promise resolving to a plan or null if planning failed
 */
  async plan(goal: Goal): Promise<Plan | null> {
    this.observer.logPlanningStart(this.id, goal);
    // Await the async call to getRelevantBeliefs
    const relevantBeliefs = await this.getRelevantBeliefs(goal); 

    for (const belief of relevantBeliefs) {
      if (belief.confidence < this.confidenceThresholds.action) {
        this.observer.logInsufficientConfidence(this.id, belief, goal);
        return null;
      }
    }

    const plan = await this.constructPlan(goal, relevantBeliefs);

    if (plan) {
      this.observer.logPlanCreation(this.id, plan);
    }

    return plan;
  }

  /**
   * Get beliefs relevant to a specific goal
   * 
   * @param goal The goal to get relevant beliefs for
   * @returns Promise resolving to an array of relevant beliefs
   */
  private async getRelevantBeliefs(goal: Goal): Promise<Belief[]> { // Changed to async
    // Call async getRelevantPropositions and pass geminiClient
    const relevantPropositions = await this.frame.getRelevantPropositions(goal, this.llmClient);

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
 * @param beliefs Relevant beliefs
 * @returns A promise resolving to a plan or null if planning failed
 */
  private async constructPlan(goal: Goal, beliefs: Belief[]): Promise<Plan | null> {
    const availableTools = this.getAvailableTools();

    if (availableTools.length === 0) {
        console.warn(`[Agent ${this.id}] No tools available to achieve goal: ${goal.description}`);
        return null;
    }

    const planSteps = await this.llmClient.generatePlan(goal, beliefs, availableTools, this.frame);

    if (!planSteps || planSteps.length === 0) {
        console.warn(`[Agent ${this.id}] Gemini failed to generate a plan for goal: ${goal.description}`);
        return null;
    }

    // Note: Gemini provides the actions, so we use those directly.
    // The 'beliefs' parameter here represents the beliefs *at the time of planning*,
    // which Gemini used as context. These might be useful for plan monitoring later.
    return new Plan(goal, planSteps, beliefs);
  }

 /**
  * Get available tools based on current capabilities and registry.
   * @returns Array of available Tool objects.
   */
 private getAvailableTools(): Tool[] {
    const tools: Tool[] = [];
    this.capabilities.forEach(capability => {
        const toolsForCapability = this.registry.getToolsForCapability(capability);
        tools.push(...toolsForCapability);
    });
    // Deduplicate tools if necessary (e.g., if multiple capabilities map to the same tool)
    return Array.from(new Map(tools.map(tool => [tool.id, tool])).values());
 }


  /**
   * Execute a plan, performing actions and updating state
   * 
   * @param plan The plan to execute
   * @returns True if the plan was executed successfully
   */
  executePlan(plan: Plan): boolean {
    this.observer.logPlanExecution(this.id, plan);

    for (const action of plan.steps) {
      const supportingBeliefs = plan.getSupportingBeliefs(action);

      for (const belief of supportingBeliefs) {
        const currentBelief = this.beliefs.get(belief.proposition);

        if (!currentBelief || currentBelief.confidence < this.confidenceThresholds.action) {
          // Belief confidence has changed, abort plan execution
          // Pass action description or ID instead of the object
          this.observer.logPlanAbort(this.id, plan, `Action failed pre-check: ${action.toString()}`);
          return false;
        }
      }

      try {
        const result = this.executeAction(action);
        if (!result) {
          // Call logActionFailure with correct arguments (entityId, action)
          this.observer.logActionFailure(this.id, action);
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error : String(error);
        this.observer.logActionError(this.id, action, errorMessage);
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

    // Convert map iterator to array for compatibility with target settings
    for (const [proposition, belief] of Array.from(this.beliefs.entries())) { 
      if (belief.confidence >= this.confidenceThresholds.conflict) {
        const negatedProp = negateProp(proposition);
        const otherBelief = otherAgent.getBelief(negatedProp);

        if (otherBelief && otherBelief.confidence >= otherAgent.confidenceThresholds.conflict) {
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
    this.observer.logJustificationExchange(this.id, otherAgent.id, conflict);
    const otherJustification = conflict.contradictoryBelief.justification;

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
  async processExternalJustification( // Changed to async
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): Promise<void> { // Changed return type
    const currentBelief = this.beliefs.get(proposition);

    if (!currentBelief) {
      // If no current belief, potentially form a new one
      // Call async evaluateExternalJustification and pass geminiClient
      const initialConfidence = await this.frame.evaluateExternalJustification( 
        proposition,
        externalJustification,
        sourceFrame,
        this.llmClient 
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
      const externalJustElement = new ExternalJustificationElement(
        externalJustification,
        sourceFrame.id
      );
      
      // Pass proposition and geminiClient to updateConfidence
      const updatedConfidence = await this.frame.updateConfidence( // Added await
        proposition, 
        currentBelief.confidence,
        currentBelief.justification,
        [externalJustElement],
        sourceFrame
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

    this.observer.logFrameChange(this.id, oldFrame, newFrame);

    // Potentially update belief confidences based on new frame
    this.recomputeBeliefConfidences();
  }

  /**
   * Recompute confidence levels for all beliefs when frame changes
   */
  private async recomputeBeliefConfidences(): Promise<void> { // Changed to async
    // Iterate using Promise.all for async operations
    // For now, making the callback async (forEach itself doesn't handle async callbacks well)
    await Promise.all(Array.from(this.beliefs.entries()).map(async ([proposition, belief]) => { // Changed to async map
      // Frame-dependent confidence recalculation
      // Call async recomputeConfidence, passing proposition and geminiClient
      const newConfidence = await this.frame.recomputeConfidence( 
        proposition,           // Pass proposition (string)
        belief.justification,  // Pass justification (Justification)
        this.llmClient         // Pass llmClient
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
    })); // End Promise.all map
  }

  /**
   * Get all beliefs with confidence above a threshold
   * 
   * @param confidenceThreshold Minimum confidence threshold (default: 0)
   * @returns Array of beliefs above the threshold
   */
  getBeliefs(confidenceThreshold = 0): Belief[] {
    // Convert Map values iterator to array before filtering
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
