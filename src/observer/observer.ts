import { EntityId } from '../types/common';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { EpistemicConflict } from '../epistemic/conflict';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { Plan } from '../action/plan';
import { Action } from '../action/action';
import { Message } from '../action/message';
import {
  EventType,
  AnyEvent,
  EventFactory
} from './event-types';

/**
 * Interface for observers that monitor agent events
 * 
 * Observers provide a mechanism for transparent monitoring and
 * inspection of agent reasoning and behavior
 */
export interface Observer {
  /**
   * Log a belief formation event
   */
  logBeliefFormation(entityId: EntityId, belief: Belief): void;
  
  /**
   * Log a belief update event
   */
  logBeliefUpdate(entityId: EntityId, oldBelief: Belief, newBelief: Belief): void;
  
  /**
   * Log a belief rejection event
   */
  logBeliefRejection(entityId: EntityId, belief: Belief, reason: string): void;
  
  /**
   * Log a perception event
   */
  logPerception(entityId: EntityId, perception: Perception): void;
  
  /**
   * Log a conflict detection event
   */
  logConflictDetection(conflict: EpistemicConflict): void;
  
  /**
   * Log a justification exchange event
   */
  logJustificationExchange(
    entityId: EntityId, 
    otherAgentId: EntityId, 
    conflict: EpistemicConflict
  ): void;
  
  /**
   * Log a conflict resolution event
   */
  logConflictResolution(
    entityId: EntityId,
    conflict: EpistemicConflict,
    resolutionType: string,
    reason: string
  ): void;
  
  /**
   * Log a frame change event
   */
  logFrameChange(entityId: EntityId, oldFrame: Frame, newFrame: Frame): void;
  
  /**
   * Log a goal adoption event
   */
  logGoalAdoption(entityId: EntityId, goal: Goal): void;
  
  /**
   * Log a goal completion event
   */
  logGoalCompletion(entityId: EntityId, goal: Goal): void;
  
  /**
   * Log a goal failure event
   */
  logGoalFailure(entityId: EntityId, goal: Goal, reason: string): void;
  
  /**
   * Log a goal abandonment event
   */
  logGoalAbandonment(entityId: EntityId, goal: Goal, reason: string): void;
  
  /**
   * Log a planning start event
   */
  logPlanningStart(entityId: EntityId, goal: Goal): void;
  
  /**
   * Log a plan creation event
   */
  logPlanCreation(entityId: EntityId, plan: Plan): void;
  
  /**
   * Log a plan execution event
   */
  logPlanExecution(entityId: EntityId, plan: Plan): void;
  
  /**
   * Log a plan completion event
   */
  logPlanCompletion(entityId: EntityId, plan: Plan): void;
  
  /**
   * Log a plan failure event
   */
  logPlanFailure(entityId: EntityId, plan: Plan, reason: string): void;
  
  /**
   * Log a plan abort event
   */
  logPlanAbort(entityId: EntityId, plan: Plan, reason: string): void;
  
  /**
   * Log an action execution event
   */
  logActionExecution(entityId: EntityId, action: Action): void;
  
  /**
   * Log an action success event
   */
  logActionSuccess(entityId: EntityId, action: Action, result: any): void;
  
  /**
   * Log an action failure event
   */
  logActionFailure(entityId: EntityId, action: Action): void;
  
  /**
   * Log an action error event
   */
  logActionError(entityId: EntityId, action: Action, error: Error | string): void;
  
  /**
   * Log a message sent event
   */
  logMessageSent(entityId: EntityId, recipientId: EntityId, message: Message): void;
  
  /**
   * Log a message received event
   */
  logMessageReceived(entityId: EntityId, senderId: EntityId, message: Message): void;
  
  /**
   * Log an insufficient confidence event
   */
  logInsufficientConfidence(
    entityId: EntityId, 
    belief: Belief, 
    goal: Goal
  ): void;
  
  /**
   * Get all events for an entity
   */
  getEvents(entityId: EntityId): AnyEvent[];
  
  /**
   * Get events of a specific type for an entity
   */
  getEventsByType(entityId: EntityId, eventType: EventType): AnyEvent[];
  
  /**
   * Clear all events
   */
  clearEvents(): void;
  
  /**
   * Register an event listener
   */
  addEventListener(callback: (event: AnyEvent) => void): void;
  
  /**
   * Remove an event listener
   */
  removeEventListener(callback: (event: AnyEvent) => void): void;
}

/**
 * Base observer implementation that stores events in memory
 */
export class BaseObserver implements Observer {
  /**
   * Map of entity ID to events
   */
  protected events: Map<EntityId, AnyEvent[]> = new Map();
  
  /**
   * Event listeners
   */
  protected listeners: Set<(event: AnyEvent) => void> = new Set();
  
  /**
   * Process and store an event
   */
  protected processEvent(event: AnyEvent): void {
    // Store the event
    if (!this.events.has(event.entityId)) {
      this.events.set(event.entityId, []);
    }
    
    this.events.get(event.entityId)!.push(event);
    
    // Notify listeners
    this.notifyListeners(event);
  }
  
  /**
   * Notify all listeners of an event
   */
  protected notifyListeners(event: AnyEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }

  /**
   * Log a belief formation event
   */
  logBeliefFormation(entityId: EntityId, belief: Belief): void {
    const event = EventFactory.createBeliefFormationEvent(entityId, belief);
    this.processEvent(event);
  }

  /**
   * Log a belief update event
   */
  logBeliefUpdate(entityId: EntityId, oldBelief: Belief, newBelief: Belief): void {
    const event = EventFactory.createBeliefUpdateEvent(entityId, oldBelief, newBelief);
    this.processEvent(event);
  }

  /**
   * Log a belief rejection event
   */
  logBeliefRejection(entityId: EntityId, belief: Belief, reason: string): void {
    const event = {
      type: EventType.BeliefRejection,
      timestamp: Date.now(),
      entityId,
      belief,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log a perception event
   */
  logPerception(entityId: EntityId, perception: Perception): void {
    const event = EventFactory.createPerceptionEvent(entityId, perception);
    this.processEvent(event);
  }

  /**
   * Log a conflict detection event
   */
  logConflictDetection(conflict: EpistemicConflict): void {
    const event = EventFactory.createConflictDetectionEvent(conflict.agentId, conflict);
    this.processEvent(event);
  }

  /**
   * Log a justification exchange event
   */
  logJustificationExchange(
    entityId: EntityId, 
    otherAgentId: EntityId, 
    conflict: EpistemicConflict
  ): void {
    const event = {
      type: EventType.JustificationExchange,
      timestamp: Date.now(),
      entityId,
      otherAgentId,
      conflict
    };
    this.processEvent(event);
  }

  /**
   * Log a conflict resolution event
   */
  logConflictResolution(
    entityId: EntityId,
    conflict: EpistemicConflict,
    resolutionType: string,
    reason: string
  ): void {
    const event = {
      type: EventType.ConflictResolution,
      timestamp: Date.now(),
      entityId,
      conflict,
      resolutionType,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log a frame change event
   */
  logFrameChange(entityId: EntityId, oldFrame: Frame, newFrame: Frame): void {
    const event = EventFactory.createFrameChangeEvent(entityId, oldFrame, newFrame);
    this.processEvent(event);
  }

  /**
   * Log a goal adoption event
   */
  logGoalAdoption(entityId: EntityId, goal: Goal): void {
    const event = {
      type: EventType.GoalAdoption,
      timestamp: Date.now(),
      entityId,
      goal
    };
    this.processEvent(event);
  }

  /**
   * Log a goal completion event
   */
  logGoalCompletion(entityId: EntityId, goal: Goal): void {
    const event = {
      type: EventType.GoalCompletion,
      timestamp: Date.now(),
      entityId,
      goal
    };
    this.processEvent(event);
  }

  /**
   * Log a goal failure event
   */
  logGoalFailure(entityId: EntityId, goal: Goal, reason: string): void {
    const event = {
      type: EventType.GoalFailure,
      timestamp: Date.now(),
      entityId,
      goal,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log a goal abandonment event
   */
  logGoalAbandonment(entityId: EntityId, goal: Goal, reason: string): void {
    const event = {
      type: EventType.GoalAbandonment,
      timestamp: Date.now(),
      entityId,
      goal,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log a planning start event
   */
  logPlanningStart(entityId: EntityId, goal: Goal): void {
    const event = {
      type: EventType.PlanningStart,
      timestamp: Date.now(),
      entityId,
      goal
    };
    this.processEvent(event);
  }

  /**
   * Log a plan creation event
   */
  logPlanCreation(entityId: EntityId, plan: Plan): void {
    const event = {
      type: EventType.PlanCreation,
      timestamp: Date.now(),
      entityId,
      plan
    };
    this.processEvent(event);
  }

  /**
   * Log a plan execution event
   */
  logPlanExecution(entityId: EntityId, plan: Plan): void {
    const event = EventFactory.createPlanExecutionEvent(entityId, plan);
    this.processEvent(event);
  }

  /**
   * Log a plan completion event
   */
  logPlanCompletion(entityId: EntityId, plan: Plan): void {
    const event = {
      type: EventType.PlanCompletion,
      timestamp: Date.now(),
      entityId,
      plan
    };
    this.processEvent(event);
  }

  /**
   * Log a plan failure event
   */
  logPlanFailure(entityId: EntityId, plan: Plan, reason: string): void {
    const event = {
      type: EventType.PlanFailure,
      timestamp: Date.now(),
      entityId,
      plan,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log a plan abort event
   */
  logPlanAbort(entityId: EntityId, plan: Plan, reason: string): void {
    const event = {
      type: EventType.PlanAbort,
      timestamp: Date.now(),
      entityId,
      plan,
      reason
    };
    this.processEvent(event);
  }

  /**
   * Log an action execution event
   */
  logActionExecution(entityId: EntityId, action: Action): void {
    const event = EventFactory.createActionExecutionEvent(entityId, action);
    this.processEvent(event);
  }

  /**
   * Log an action success event
   */
  logActionSuccess(entityId: EntityId, action: Action, result: any): void {
    const event = {
      type: EventType.ActionSuccess,
      timestamp: Date.now(),
      entityId,
      action,
      result
    };
    this.processEvent(event);
  }

  /**
   * Log an action failure event
   */
  logActionFailure(entityId: EntityId, action: Action): void {
    const event = {
      type: EventType.ActionFailure,
      timestamp: Date.now(),
      entityId,
      action,
      reason: 'Action failed'
    };
    this.processEvent(event);
  }

  /**
   * Log an action error event
   */
  logActionError(entityId: EntityId, action: Action, error: Error | string): void {
    const event = {
      type: EventType.ActionError,
      timestamp: Date.now(),
      entityId,
      action,
      error
    };
    this.processEvent(event);
  }

  /**
   * Log a message sent event
   */
  logMessageSent(entityId: EntityId, recipientId: EntityId, message: Message): void {
    const event = EventFactory.createMessageSentEvent(entityId, recipientId, message);
    this.processEvent(event);
  }

  /**
   * Log a message received event
   */
  logMessageReceived(entityId: EntityId, senderId: EntityId, message: Message): void {
    const event = {
      type: EventType.MessageReceived,
      timestamp: Date.now(),
      entityId,
      senderId,
      message
    };
    this.processEvent(event);
  }

  /**
   * Log an insufficient confidence event
   */
  logInsufficientConfidence(
    entityId: EntityId, 
    belief: Belief, 
    goal: Goal
  ): void {
    const event = {
      type: EventType.InsufficientConfidence,
      timestamp: Date.now(),
      entityId,
      belief,
      goal,
      requiredConfidence: 0.7 // Default value
    };
    this.processEvent(event);
  }

  /**
   * Get all events for an entity
   */
  getEvents(entityId: EntityId): AnyEvent[] {
    return this.events.get(entityId) || [];
  }

  /**
   * Get events of a specific type for an entity
   */
  getEventsByType(entityId: EntityId, eventType: EventType): AnyEvent[] {
    const events = this.events.get(entityId) || [];
    return events.filter(event => event.type === eventType);
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events.clear();
  }

  /**
   * Register an event listener
   */
  addEventListener(callback: (event: AnyEvent) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(callback: (event: AnyEvent) => void): void {
    this.listeners.delete(callback);
  }
}
