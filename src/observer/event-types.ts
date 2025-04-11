import { EntityId } from '../types/common';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { EpistemicConflict } from '../epistemic/conflict';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { Plan } from '../action/plan';
import { Action } from '../action/action';
import { Message } from '../action/message';

/**
 * Base interface for all observable events
 */
export interface Event {
  /**
   * Type of the event
   */
  type: EventType.GoalFailure;
  goal: Goal;
  reason: string;
}

/**
 * Event for goal abandonment
 */
export interface GoalAbandonmentEvent extends Event {
  type: EventType.GoalAbandonment;
  goal: Goal;
  reason: string;
}

/**
 * Event for planning start
 */
export interface PlanningStartEvent extends Event {
  type: EventType.PlanningStart;
  goal: Goal;
}

/**
 * Event for plan creation
 */
export interface PlanCreationEvent extends Event {
  type: EventType.PlanCreation;
  plan: Plan;
}

/**
 * Event for plan execution
 */
export interface PlanExecutionEvent extends Event {
  type: EventType.PlanExecution;
  plan: Plan;
}

/**
 * Event for plan completion
 */
export interface PlanCompletionEvent extends Event {
  type: EventType.PlanCompletion;
  plan: Plan;
}

/**
 * Event for plan failure
 */
export interface PlanFailureEvent extends Event {
  type: EventType.PlanFailure;
  plan: Plan;
  reason: string;
}

/**
 * Event for plan abort
 */
export interface PlanAbortEvent extends Event {
  type: EventType.PlanAbort;
  plan: Plan;
  reason: string;
}

/**
 * Event for action execution
 */
export interface ActionExecutionEvent extends Event {
  type: EventType.ActionExecution;
  action: Action;
}

/**
 * Event for action success
 */
export interface ActionSuccessEvent extends Event {
  type: EventType.ActionSuccess;
  action: Action;
  result: any;
}

/**
 * Event for action failure
 */
export interface ActionFailureEvent extends Event {
  type: EventType.ActionFailure;
  action: Action;
  reason: string;
}

/**
 * Event for action error
 */
export interface ActionErrorEvent extends Event {
  type: EventType.ActionError;
  action: Action;
  error: Error | string;
}

/**
 * Event for message sent
 */
export interface MessageSentEvent extends Event {
  type: EventType.MessageSent;
  recipientId: EntityId;
  message: Message;
}

/**
 * Event for message received
 */
export interface MessageReceivedEvent extends Event {
  type: EventType.MessageReceived;
  senderId: EntityId;
  message: Message;
}

/**
 * Event for insufficient confidence
 */
export interface InsufficientConfidenceEvent extends Event {
  type: EventType.InsufficientConfidence;
  belief: Belief;
  goal: Goal;
  requiredConfidence: number;
}

/**
 * Event for log
 */
export interface LogEvent extends Event {
  type: EventType.Log;
  level: 'info' | 'debug' | 'warning' | 'error';
  message: string;
  data?: any;
}

/**
 * Event for error
 */
export interface ErrorEvent extends Event {
  type: EventType.Error;
  message: string;
  error: Error | string;
  data?: any;
}

/**
 * Event for warning
 */
export interface WarningEvent extends Event {
  type: EventType.Warning;
  message: string;
  data?: any;
}

/**
 * Event for debug
 */
export interface DebugEvent extends Event {
  type: EventType.Debug;
  message: string;
  data?: any;
}

/**
 * Union type of all events
 */
export type AnyEvent =
  | BeliefFormationEvent
  | BeliefUpdateEvent
  | BeliefRejectionEvent
  | PerceptionEvent
  | ConflictDetectionEvent
  | JustificationExchangeEvent
  | ConflictResolutionEvent
  | FrameChangeEvent
  | GoalAdoptionEvent
  | GoalCompletionEvent
  | GoalFailureEvent
  | GoalAbandonmentEvent
  | PlanningStartEvent
  | PlanCreationEvent
  | PlanExecutionEvent
  | PlanCompletionEvent
  | PlanFailureEvent
  | PlanAbortEvent
  | ActionExecutionEvent
  | ActionSuccessEvent
  | ActionFailureEvent
  | ActionErrorEvent
  | MessageSentEvent
  | MessageReceivedEvent
  | InsufficientConfidenceEvent
  | LogEvent
  | ErrorEvent
  | WarningEvent
  | DebugEvent;

/**
 * Event factory for creating events
 */
export class EventFactory {
  /**
   * Create a belief formation event
   */
  static createBeliefFormationEvent(entityId: EntityId, belief: Belief): BeliefFormationEvent {
    return {
      type: EventType.BeliefFormation,
      timestamp: Date.now(),
      entityId,
      belief
    };
  }

  /**
   * Create a belief update event
   */
  static createBeliefUpdateEvent(
    entityId: EntityId,
    oldBelief: Belief,
    newBelief: Belief
  ): BeliefUpdateEvent {
    return {
      type: EventType.BeliefUpdate,
      timestamp: Date.now(),
      entityId,
      oldBelief,
      newBelief,
      confidenceDelta: newBelief.confidence - oldBelief.confidence
    };
  }

  /**
   * Create a perception event
   */
  static createPerceptionEvent(entityId: EntityId, perception: Perception): PerceptionEvent {
    return {
      type: EventType.Perception,
      timestamp: Date.now(),
      entityId,
      perception
    };
  }

  /**
   * Create a conflict detection event
   */
  static createConflictDetectionEvent(
    entityId: EntityId,
    conflict: EpistemicConflict
  ): ConflictDetectionEvent {
    return {
      type: EventType.ConflictDetection,
      timestamp: Date.now(),
      entityId,
      conflict
    };
  }

  /**
   * Create a frame change event
   */
  static createFrameChangeEvent(
    entityId: EntityId,
    oldFrame: Frame,
    newFrame: Frame
  ): FrameChangeEvent {
    return {
      type: EventType.FrameChange,
      timestamp: Date.now(),
      entityId,
      oldFrame,
      newFrame
    };
  }

  /**
   * Create a plan execution event
   */
  static createPlanExecutionEvent(entityId: EntityId, plan: Plan): PlanExecutionEvent {
    return {
      type: EventType.PlanExecution,
      timestamp: Date.now(),
      entityId,
      plan
    };
  }

  /**
   * Create an action execution event
   */
  static createActionExecutionEvent(entityId: EntityId, action: Action): ActionExecutionEvent {
    return {
      type: EventType.ActionExecution,
      timestamp: Date.now(),
      entityId,
      action
    };
  }

  /**
   * Create a message sent event
   */
  static createMessageSentEvent(
    entityId: EntityId,
    recipientId: EntityId,
    message: Message
  ): MessageSentEvent {
    return {
      type: EventType.MessageSent,
      timestamp: Date.now(),
      entityId,
      recipientId,
      message
    };
  }

  /**
   * Create a log event
   */
  static createLogEvent(
    entityId: EntityId,
    level: 'info' | 'debug' | 'warning' | 'error',
    message: string,
    data?: any
  ): LogEvent {
    return {
      type: EventType.Log,
      timestamp: Date.now(),
      entityId,
      level,
      message,
      data
    };
  }
} string;
  
  /**
   * Timestamp when the event occurred
   */
  timestamp: number;
  
  /**
   * ID of the entity that triggered the event
   */
  entityId: EntityId;
}

/**
 * Types of observable events
 */
export enum EventType {
  // Belief events
  BeliefFormation = 'belief_formation',
  BeliefUpdate = 'belief_update',
  BeliefRejection = 'belief_rejection',
  
  // Perception events
  Perception = 'perception',
  
  // Conflict events
  ConflictDetection = 'conflict_detection',
  JustificationExchange = 'justification_exchange',
  ConflictResolution = 'conflict_resolution',
  
  // Frame events
  FrameChange = 'frame_change',
  
  // Goal events
  GoalAdoption = 'goal_adoption',
  GoalCompletion = 'goal_completion',
  GoalFailure = 'goal_failure',
  GoalAbandonment = 'goal_abandonment',
  
  // Planning events
  PlanningStart = 'planning_start',
  PlanCreation = 'plan_creation',
  PlanExecution = 'plan_execution',
  PlanCompletion = 'plan_completion',
  PlanFailure = 'plan_failure',
  PlanAbort = 'plan_abort',
  
  // Action events
  ActionExecution = 'action_execution',
  ActionSuccess = 'action_success',
  ActionFailure = 'action_failure',
  ActionError = 'action_error',
  
  // Message events
  MessageSent = 'message_sent',
  MessageReceived = 'message_received',
  
  // Confidence events
  InsufficientConfidence = 'insufficient_confidence',
  
  // General events
  Log = 'log',
  Error = 'error',
  Warning = 'warning',
  Debug = 'debug'
}

/**
 * Event for belief formation
 */
export interface BeliefFormationEvent extends Event {
  type: EventType.BeliefFormation;
  belief: Belief;
}

/**
 * Event for belief update
 */
export interface BeliefUpdateEvent extends Event {
  type: EventType.BeliefUpdate;
  oldBelief: Belief;
  newBelief: Belief;
  confidenceDelta: number;
}

/**
 * Event for belief rejection
 */
export interface BeliefRejectionEvent extends Event {
  type: EventType.BeliefRejection;
  belief: Belief;
  reason: string;
}

/**
 * Event for perception
 */
export interface PerceptionEvent extends Event {
  type: EventType.Perception;
  perception: Perception;
}

/**
 * Event for conflict detection
 */
export interface ConflictDetectionEvent extends Event {
  type: EventType.ConflictDetection;
  conflict: EpistemicConflict;
}

/**
 * Event for justification exchange
 */
export interface JustificationExchangeEvent extends Event {
  type: EventType.JustificationExchange;
  conflict: EpistemicConflict;
  otherAgentId: EntityId;
}

/**
 * Event for conflict resolution
 */
export interface ConflictResolutionEvent extends Event {
  type: EventType.ConflictResolution;
  conflict: EpistemicConflict;
  resolutionType: string;
  reason: string;
}

/**
 * Event for frame change
 */
export interface FrameChangeEvent extends Event {
  type: EventType.FrameChange;
  oldFrame: Frame;
  newFrame: Frame;
}

/**
 * Event for goal adoption
 */
export interface GoalAdoptionEvent extends Event {
  type: EventType.GoalAdoption;
  goal: Goal;
}

/**
 * Event for goal completion
 */
export interface GoalCompletionEvent extends Event {
  type: EventType.GoalCompletion;
  goal: Goal;
}

/**
 * Event for goal failure
 */
export interface GoalFailureEvent extends Event {
  type: