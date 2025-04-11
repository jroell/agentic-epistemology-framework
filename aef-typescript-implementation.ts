/**
 * Agentic Epistemology Framework (AEF)
 * TypeScript Reference Implementation
 *
 * This implementation provides a comprehensive foundation for the AEF as described
 * in the paper "Agentic Epistemology: A Structured Framework for Reasoning in
 * Autonomous Agents and Synthetic Societies"
 *
 * @version 1.0.0
 */

/**
 * Core namespace for the Agentic Epistemology Framework
 */
namespace AEF {

  /**
   * Unique identifier for entities in the framework
   */
  export type EntityId = string;

  /**
   * Interface representing any identifiable participant in the system
   */
  export interface Entity {
    id: EntityId;
    type: string;
    name?: string;
    capabilities?: Set<Capability>;
  }

  /**
   * An autonomous entity with perception, reasoning, planning, and action capabilities
   */
  export class Agent implements Entity {
    id: EntityId;
    type: string = 'Agent';
    name?: string;
    private beliefs: Map<string, Belief> = new Map();
    private memory: Memory;
    private frame: Frame;
    private context: Context;
    private capabilities: Set<Capability>;
    private registry: Registry;
    private observer: Observer;
    private confidenceThresholds: ConfidenceThresholds;

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
      
      return new Plan(goal, planSteps, beliefs);
    }

    /**
     * Execute a plan, performing actions and updating state
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
     */
    executeAction(action: Action): boolean {
      this.observer.logActionExecution(this.id, action);
      
      if (action instanceof UseTool) {
        return this.executeTool(action.tool);
      } else if (action instanceof SendMessage) {
        return this.sendMessage(action.message);
      }
      
      return false;
    }

    /**
     * Use a tool to perform an operation
     */
    private executeTool(tool: Tool): boolean {
      try {
        const result = tool.use(this.context);
        this.perceive(new ToolResultPerception(tool.id, result));
        return true;
      } catch (error) {
        return false;
      }
    }

    /**
     * Send a message to another entity
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
     */
    detectConflicts(otherAgent: Agent): EpistemicConflict[] {
      const conflicts: EpistemicConflict[] = [];
      
      // Check each belief in this agent
      for (const [proposition, belief] of this.beliefs.entries()) {
        // If confidence is above conflict threshold
        if (belief.confidence >= this.confidenceThresholds.conflict) {
          // Check if other agent has a contradictory belief
          const negatedProp = negateProp(proposition);
          const otherBelief = otherAgent.beliefs.get(negatedProp);
          
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
     */
    private processExternalJustification(
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
     */
    getBeliefs(confidenceThreshold: number = 0): Belief[] {
      return Array.from(this.beliefs.values())
        .filter(belief => belief.confidence >= confidenceThreshold);
    }

    /**
     * Get a specific belief by proposition
     */
    getBelief(proposition: string): Belief | undefined {
      return this.beliefs.get(proposition);
    }
  }

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
   * A stimulus received by an agent from the environment or communication
   */
  export abstract class Perception {
    id: string;
    timestamp: number;
    source: EntityId | null;
    data: any;

    constructor(id: string, data: any, source: EntityId | null = null) {
      this.id = id;
      this.data = data;
      this.source = source;
      this.timestamp = Date.now();
    }

    /**
     * Extract contextual elements from this perception
     */
    abstract getContextualElements(): ContextElement[];

    /**
     * Extract justification elements related to a specific proposition
     */
    abstract getJustificationElements(proposition: string): JustificationElement[];
  }

  /**
   * Perception from a tool execution result
   */
  export class ToolResultPerception extends Perception {
    constructor(toolId: string, result: any) {
      super(`tool_result:${toolId}`, result, toolId);
    }

    getContextualElements(): ContextElement[] {
      // Convert tool result to context elements
      return [new ContextElement('tool_result', this.data, this.source)];
    }

    getJustificationElements(proposition: string): JustificationElement[] {
      // Tool results can justify beliefs
      if (this.isRelevantToProposition(proposition)) {
        return [new ToolResultJustificationElement(
          this.source as string,
          this.data
        )];
      }
      return [];
    }

    private isRelevantToProposition(proposition: string): boolean {
      // Simple relevance check - in a real implementation this would be more sophisticated
      // This could involve semantic matching, keyword analysis, etc.
      return JSON.stringify(this.data).includes(proposition);
    }
  }

  /**
   * Perception from a received message
   */
  export class MessagePerception extends Perception {
    message: Message;

    constructor(message: Message) {
      super(`message:${message.id}`, message.content, message.sender);
      this.message = message;
    }

    getContextualElements(): ContextElement[] {
      return [new ContextElement('message', this.message.content, this.message.sender)];
    }

    getJustificationElements(proposition: string): JustificationElement[] {
      if (this.isRelevantToProposition(proposition)) {
        return [new TestimonyJustificationElement(
          this.message.sender,
          this.message.content
        )];
      }
      return [];
    }

    private isRelevantToProposition(proposition: string): boolean {
      // Simple check for relevance to the proposition
      return typeof this.message.content === 'string' && 
        this.message.content.includes(proposition);
    }
  }

  /**
   * An element currently active in the agent's working memory
   */
  export class ContextElement {
    type: string;
    content: any;
    source: EntityId | null;
    timestamp: number;

    constructor(type: string, content: any, source: EntityId | null = null) {
      this.type = type;
      this.content = content;
      this.source = source;
      this.timestamp = Date.now();
    }
  }

  /**
   * The transient working set of information relevant for current decisions
   */
  export class Context {
    elements: ContextElement[];
    
    constructor(initialElements: ContextElement[] = []) {
      this.elements = [...initialElements];
    }

    /**
     * Add elements to the context
     */
    addElements(elementsToAdd: ContextElement[]): void {
      this.elements.push(...elementsToAdd);
    }

    /**
     * Clear all elements from the context
     */
    clear(): void {
      this.elements = [];
    }

    /**
     * Get elements of a specific type
     */
    getElementsByType(type: string): ContextElement[] {
      return this.elements.filter(element => element.type === type);
    }

    /**
     * Get elements from a specific source
     */
    getElementsBySource(source: EntityId): ContextElement[] {
      return this.elements.filter(element => element.source === source);
    }
  }

  /**
   * A persistent store of the agent's knowledge and experiences
   */
  export interface Memory {
    storeEntity(entity: any): void;
    retrieveEntity(id: string): any | null;
    queryEntities(criteria: object): any[];
    clear(): void;
  }

  /**
   * Simple in-memory implementation of the Memory interface
   */
  export class DefaultMemory implements Memory {
    private entities: Map<string, any> = new Map();

    storeEntity(entity: any): void {
      const id = entity.id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.entities.set(id, {
        ...entity,
        _timestamp: Date.now()
      });
    }

    retrieveEntity(id: string): any | null {
      return this.entities.get(id) || null;
    }

    queryEntities(criteria: object): any[] {
      return Array.from(this.entities.values())
        .filter(entity => this.matchesCriteria(entity, criteria));
    }

    clear(): void {
      this.entities.clear();
    }

    private matchesCriteria(entity: any, criteria: object): boolean {
      for (const [key, value] of Object.entries(criteria)) {
        if (entity[key] !== value) {
          return false;
        }
      }
      return true;
    }
  }

  /**
   * A proposition held by an agent with a confidence level and justification
   */
  export class Belief {
    proposition: string;
    confidence: number;
    justification: Justification;
    timestamp: number;

    constructor(
      proposition: string,
      confidence: number,
      justification: Justification
    ) {
      this.proposition = proposition;
      this.confidence = clampConfidence(confidence);
      this.justification = justification;
      this.timestamp = Date.now();
    }

    /**
     * Create a belief with the negation of this belief's proposition
     */
    negation(): Belief {
      return new Belief(
        negateProp(this.proposition),
        this.confidence,
        this.justification
      );
    }
  }

  /**
   * Utility function to negate a proposition string
   * This is a simplified implementation for demonstration
   */
  export function negateProp(proposition: string): string {
    if (proposition.startsWith('¬')) {
      return proposition.substring(1);
    } else {
      return `¬${proposition}`;
    }
  }

  /**
   * Ensure confidence is within valid range [0,1]
   */
  function clampConfidence(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Evidence, reasoning trace, or source supporting a Belief
   */
  export class Justification {
    elements: JustificationElement[];
    timestamp: number;

    constructor(elements: JustificationElement[] = []) {
      this.elements = [...elements];
      this.timestamp = Date.now();
    }

    /**
     * Add new elements to the justification
     */
    addElements(elementsToAdd: JustificationElement[]): void {
      this.elements.push(...elementsToAdd);
      this.timestamp = Date.now();
    }

    /**
     * Get all elements of a specific type
     */
    getElementsByType(type: string): JustificationElement[] {
      return this.elements.filter(element => element.type === type);
    }

    /**
     * Get all elements from a specific source
     */
    getElementsBySource(source: string): JustificationElement[] {
      return this.elements.filter(element => element.source === source);
    }
  }

  /**
   * Base class for elements within a justification
   */
  export abstract class JustificationElement {
    type: string;
    source: string;
    content: any;
    timestamp: number;

    constructor(type: string, source: string, content: any) {
      this.type = type;
      this.source = source;
      this.content = content;
      this.timestamp = Date.now();
    }
  }

  /**
   * Justification element based on tool execution results
   */
  export class ToolResultJustificationElement extends JustificationElement {
    constructor(toolId: string, result: any) {
      super('tool_result', toolId, result);
    }
  }

  /**
   * Justification element based on testimony from another entity
   */
  export class TestimonyJustificationElement extends JustificationElement {
    constructor(entityId: string, testimony: any) {
      super('testimony', entityId, testimony);
    }
  }

  /**
   * Justification element based on direct observation
   */
  export class ObservationJustificationElement extends JustificationElement {
    constructor(source: string, observation: any) {
      super('observation', source, observation);
    }
  }

  /**
   * Justification element based on logical inference
   */
  export class InferenceJustificationElement extends JustificationElement {
    premises: string[];
    inferenceRule: string;

    constructor(source: string, conclusion: string, premises: string[], inferenceRule: string) {
      super('inference', source, conclusion);
      this.premises = premises;
      this.inferenceRule = inferenceRule;
    }
  }

  /**
   * Justification element wrapping justification from another agent
   */
  export class ExternalJustificationElement extends JustificationElement {
    externalJustification: Justification;
    sourceFrameId: string;

    constructor(externalJustification: Justification, sourceFrameId: string) {
      super('external', 'external_agent', externalJustification);
      this.externalJustification = externalJustification;
      this.sourceFrameId = sourceFrameId;
    }
  }

  /**
   * A lens/perspective that influences interpretation and reasoning
   */
  export abstract class Frame {
    id: string;
    name: string;
    description: string;

    constructor(id: string, name: string, description: string) {
      this.id = id;
      this.name = name;
      this.description = description;
    }

    /**
     * Interpret a perception through this frame's lens
     */
    abstract interpretPerception(perception: Perception): Perception;

    /**
     * Get propositions relevant to a perception or goal in this frame
     */
    abstract getRelevantPropositions(source: Perception | Goal): string[];

    /**
     * Compute initial confidence for a new belief based on justification
     */
    abstract computeInitialConfidence(proposition: string, justification: JustificationElement[]): number;

    /**
     * Update confidence based on existing belief and new evidence
     */
    abstract updateConfidence(
      currentConfidence: number, 
      currentJustification: Justification,
      newElements: JustificationElement[]
    ): number;

    /**
     * Recompute confidence for a belief when the frame changes
     */
    abstract recomputeConfidence(justification: Justification, currentConfidence: number): number;

    /**
     * Evaluate justification from an external source considering frame differences
     */
    abstract evaluateExternalJustification(
      proposition: string,
      externalJustification: Justification,
      sourceFrame: Frame
    ): number;
  }

  /**
   * A frame that prioritizes efficiency and speed
   */
  export class EfficiencyFrame extends Frame {
    constructor() {
      super('efficiency', 'Efficiency', 'Prioritizes speed and resource optimization');
    }

    interpretPerception(perception: Perception): Perception {
      // In a real implementation, this would filter or prioritize aspects
      // of the perception based on efficiency concerns
      return perception;
    }

    getRelevantPropositions(source: Perception | Goal): string[] {
      // In a real implementation, this would extract propositions
      // related to efficiency metrics
      
      // Simplified implementation
      if (source instanceof Goal) {
        return source.getRelevantPropositions().filter(prop => 
          prop.toLowerCase().includes('speed') ||
          prop.toLowerCase().includes('fast') ||
          prop.toLowerCase().includes('efficient') ||
          prop.toLowerCase().includes('cost') ||
          prop.toLowerCase().includes('resource')
        );
      } else {
        // For perceptions, extract propositions from data
        const propositions: string[] = [];
        const data = JSON.stringify(source.data);
        
        // Extract potential propositions - this is greatly simplified
        if (data.includes('time') || data.includes('duration')) {
          propositions.push('ProcessingTimeIsOptimal');
        }
        if (data.includes('resource') || data.includes('memory')) {
          propositions.push('ResourceUsageIsOptimal');
        }
        
        return propositions;
      }
    }

    computeInitialConfidence(proposition: string, justification: JustificationElement[]): number {
      // Higher initial confidence for efficiency-related propositions
      const isEfficiencyProposition = 
        proposition.toLowerCase().includes('fast') ||
        proposition.toLowerCase().includes('speed') ||
        proposition.toLowerCase().includes('efficient') ||
        proposition.toLowerCase().includes('cost') ||
        proposition.toLowerCase().includes('resource');
      
      let baseConfidence = isEfficiencyProposition ? 0.7 : 0.5;
      
      // Adjust based on justification source types
      const toolResults = justification.filter(el => el.type === 'tool_result').length;
      const observations = justification.filter(el => el.type === 'observation').length;
      const testimonies = justification.filter(el => el.type === 'testimony').length;
      
      // Tool results and direct observations get higher weight in efficiency frame
      return clampConfidence(
        baseConfidence + (toolResults * 0.1) + (observations * 0.08) - (testimonies * 0.02)
      );
    }

    updateConfidence(
      currentConfidence: number, 
      currentJustification: Justification,
      newElements: JustificationElement[]
    ): number {
      // In efficiency frame, tool results and observations impact confidence more
      let confidenceChange = 0;
      
      for (const element of newElements) {
        switch (element.type) {
          case 'tool_result':
            confidenceChange += 0.1;
            break;
          case 'observation':
            confidenceChange += 0.08;
            break;
          case 'testimony':
            confidence