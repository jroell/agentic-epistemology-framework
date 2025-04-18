// src/observer/default-observer.ts
/// <reference lib="dom" />
import { EntityId } from '../types/common';
import { BaseObserver, Observer } from './observer';
import { EventType, AnyEvent } from './event-types';
import { Perception, ObservationPerception, MessagePerception, ToolResultPerception } from '../core/perception'; // Import specific types
import { displayMessage, COLORS } from '../core/cli-formatter'; // Import shared formatter

/**
 * Default observer implementation with enhanced logging capabilities
 *
 * This observer extends the base observer with additional features like
 * log levels, maximum event storage, and event filtering
 */
export class DefaultObserver extends BaseObserver implements Observer {
  /**
   * Maximum number of events to store per entity
   */
  private maxEventsPerEntity: number;

  /**
   * Current log level
   */
  private logLevel: LogLevel;

  /**
   * Whether to log to console
   */
  private logToConsole: boolean;

  /**
   * Event filters
   */
  private eventFilters: Set<EventType>;

  /**
   * Create a new default observer
   *
   * @param maxEventsPerEntity Maximum number of events to store per entity
   * @param logLevel Minimum log level to record
   * @param logToConsole Whether to log events to console
   * @param eventFilters Event types to filter out
   */
  constructor(
    maxEventsPerEntity = 1000,
    logLevel: LogLevel = LogLevel.Info,
    logToConsole = false,
    eventFilters: EventType[] = []
  ) {
    super();
    this.maxEventsPerEntity = maxEventsPerEntity;
    this.logLevel = logLevel;
    this.logToConsole = logToConsole;
    this.eventFilters = new Set(eventFilters);
  }

  /**
   * Process and store an event
   */
  protected override processEvent(event: AnyEvent): void {
    if (this.eventFilters.has(event.type)) {
      return;
    }

    if (this.getLevelForEvent(event) < this.logLevel) {
      return;
    }

    if (this.logToConsole) {
      this.logEventToConsole(event);
    }

    if (!this.events.has(event.entityId)) {
      this.events.set(event.entityId, []);
    }

    const entityEvents = this.events.get(event.entityId);
    if (!entityEvents) {
      // Should not happen if the map is managed correctly, but good practice
      // Use displayMessage for error
      displayMessage("DefaultObserver", `No event array found for entity ${event.entityId}`, COLORS.error);
      return;
    }

    entityEvents.push(event);

    if (entityEvents.length > this.maxEventsPerEntity) {
      entityEvents.splice(0, entityEvents.length - this.maxEventsPerEntity);
    }

    this.notifyListeners(event);
  }

  /**
   * Log an event to the console
   */
  private logEventToConsole(event: AnyEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const level = this.getLevelForEvent(event);
    const levelStr = LogLevel[level].toUpperCase();

    // Create header with metadata (will be part of the message title)
    const header = `[${levelStr}] [${event.entityId}] [${event.type}]`;
    const messageTitle = `OBSERVER EVENT: ${header}`;

    // Format the JSON data with pretty indentation for better readability
    let jsonData: object; // Ensure jsonData is typed as object

    switch (event.type) {
      case EventType.BeliefFormation:
        jsonData = {
          type: 'belief_formation',
          proposition: event.belief.proposition,
          confidence: event.belief.confidence
        };
        break;
      case EventType.BeliefUpdate:
        jsonData = {
          type: 'belief_update',
          oldProposition: event.oldBelief.proposition,
          newProposition: event.newBelief.proposition,
          oldConfidence: event.oldBelief.confidence,
          newConfidence: event.newBelief.confidence
        };
        break;
      case EventType.FrameChange:
        jsonData = {
          type: 'frame_change',
          oldFrame: event.oldFrame.name,
          newFrame: event.newFrame.name
        };
        break;
      case EventType.PlanExecution:
        jsonData = {
          type: 'plan_execution',
          plan: event.plan.toString()
        };
        break;
      case EventType.ActionExecution:
        jsonData = {
          type: 'action_execution',
          action: event.action.toString()
        };
        break;
      case EventType.MessageSent:
        jsonData = {
          type: 'message_sent',
          recipient: event.recipientId,
          message: event.message.toString()
        };
        break;
      case EventType.Perception: { // Add block scope
        // Simplify perception logging
        let perceptionTypeString = 'unknown';
        const perception = event.perception as Perception; // Cast for type checking
        if (perception instanceof ObservationPerception) {
          perceptionTypeString = perception.observationType;
        } else if (perception instanceof MessagePerception) {
          perceptionTypeString = 'message';
        } else if (perception instanceof ToolResultPerception) {
          perceptionTypeString = 'tool_result';
        }

        jsonData = {
          type: 'perception_received',
          perceptionType: perceptionTypeString,
          source: perception.source,
          details: `Perception of type '${perceptionTypeString}' received from source '${perception.source}'`
        };
        break;
      } // Close block scope
      default: { // Add block scope for default case
        // For all other event types, just stringify the event directly
        // Filter out potentially large or circular properties if needed
        const simplifiedEvent: Record<string, any> = {};
        for (const key in event) {
            if (Object.prototype.hasOwnProperty.call(event, key)) {
                // Example: Skip potentially large 'context' or complex objects
                if (key !== 'context' && key !== 'agent' && key !== 'observer') {
                     simplifiedEvent[key] = (event as any)[key];
                }
            }
        }
        jsonData = simplifiedEvent;
        break; // Added break statement
       } // Close block scope for default case
    }

    // Log the formatted output using displayMessage
    const formattedJson = JSON.stringify(jsonData, null, 2);
    let messageColor = COLORS.system; // Default color

    switch (level) {
      case LogLevel.Error:
        messageColor = COLORS.error;
        break;
      case LogLevel.Warning:
        messageColor = COLORS.warning;
        break;
      case LogLevel.Info:
        messageColor = COLORS.info;
        break;
      case LogLevel.Debug:
        messageColor = COLORS.system; // Use gray for debug
        break;
    }
    // Add timestamp to the title for context
    displayMessage(`${messageTitle} @ ${timestamp}`, formattedJson, messageColor);
  }


  /**
   * Get the log level for an event type
   */
  private getLevelForEvent(event: AnyEvent): LogLevel {
    switch (event.type) {
      case EventType.Error:
        return LogLevel.Error;

      case EventType.Warning:
      case EventType.ActionFailure:
      case EventType.ActionError:
      case EventType.PlanFailure:
      case EventType.PlanAbort:
      case EventType.GoalFailure:
      case EventType.GoalAbandonment:
      case EventType.InsufficientConfidence:
        return LogLevel.Warning;

      case EventType.BeliefFormation:
      case EventType.BeliefUpdate:
      case EventType.ConflictDetection:
      case EventType.ConflictResolution:
      case EventType.FrameChange:
      case EventType.GoalAdoption:
      case EventType.GoalCompletion:
      case EventType.PlanCreation:
      case EventType.PlanExecution:
      case EventType.PlanCompletion:
      case EventType.ActionExecution:
      case EventType.ActionSuccess:
      case EventType.MessageSent:
      case EventType.MessageReceived:
      case EventType.Log:
        return LogLevel.Info;

      case EventType.Perception:
      case EventType.JustificationExchange:
      case EventType.PlanningStart:
      case EventType.Debug:
      default:
        return LogLevel.Debug;
    }
  }

  /**
   * Set the maximum number of events to store per entity
   */
    setMaxEventsPerEntity(max: number): void {
    this.maxEventsPerEntity = max;

    // Enforce new limit on existing events
    // Convert Map iterator to array before iterating
    for (const [entityId, entityEvents] of Array.from(this.events.entries())) {
      if (entityEvents.length > this.maxEventsPerEntity) {
        this.events.set(
          entityId,
          entityEvents.slice(-this.maxEventsPerEntity)
        );
      }
    }
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Enable or disable console logging
   */
  setLogToConsole(enabled: boolean): void {
    this.logToConsole = enabled;
  }

  /**
   * Add an event type to the filter
   */
  addEventFilter(eventType: EventType): void {
    this.eventFilters.add(eventType);
  }

  /**
   * Remove an event type from the filter
   */
  removeEventFilter(eventType: EventType): void {
    this.eventFilters.delete(eventType);
  }

  /**
   * Clear all event filters
   */
  clearEventFilters(): void {
    this.eventFilters.clear();
  }

  /**
   * Get a count of events by type for an entity
   */
  getEventCountByType(entityId: EntityId): Record<string, number> {
    const events = this.events.get(entityId) || [];
    const counts: Record<string, number> = {};

    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get events within a time range for an entity
   */
  getEventsInTimeRange(
    entityId: EntityId,
    startTime: number,
    endTime: number
  ): AnyEvent[] {
    const events = this.events.get(entityId) || [];
    return events.filter(event =>
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Get events for a specific frame change
   */
  getFrameChangeEvents(entityId: EntityId, frameId: string): AnyEvent[] {
    const events = this.getEventsByType(entityId, EventType.FrameChange);
    return events.filter((event): event is AnyEvent & { oldFrame: { id: string }, newFrame: { id: string } } => {
      // Use a type guard to check if the event has the expected frame properties
      return event.type === EventType.FrameChange &&
             typeof (event as any).oldFrame === 'object' && (event as any).oldFrame !== null && typeof (event as any).oldFrame.id === 'string' &&
             typeof (event as any).newFrame === 'object' && (event as any).newFrame !== null && typeof (event as any).newFrame.id === 'string' &&
             ((event as any).newFrame.id === frameId || (event as any).oldFrame.id === frameId);
    });
  }

  /**
   * Get events related to a specific belief
   */
  getBeliefEvents(entityId: EntityId, proposition: string): AnyEvent[] {
    const events = this.getEvents(entityId);
    return events.filter(event => {
      // Use type guards based on event type
      if (event.type === EventType.BeliefFormation && typeof (event as any).belief === 'object' && (event as any).belief !== null) {
        return (event as any).belief.proposition === proposition;
      } else if (event.type === EventType.BeliefUpdate && typeof (event as any).newBelief === 'object' && (event as any).newBelief !== null) {
        return (event as any).newBelief.proposition === proposition;
      } else if (event.type === EventType.BeliefRejection && typeof (event as any).belief === 'object' && (event as any).belief !== null) {
        return (event as any).belief.proposition === proposition;
      } else if (event.type === EventType.InsufficientConfidence && typeof (event as any).belief === 'object' && (event as any).belief !== null) {
        return (event as any).belief.proposition === proposition;
      }
      return false;
    });
  }

  /**
   * Get events related to a specific goal
   */
  getGoalEvents(entityId: EntityId, goalId: string): AnyEvent[] {
    const events = this.getEvents(entityId);
    return events.filter(event => {
      // Use type guards based on event type
      if ((event.type.startsWith('goal_') || event.type === EventType.PlanningStart) && typeof (event as any).goal === 'object' && (event as any).goal !== null) {
        return (event as any).goal.id === goalId;
      } else if (event.type.startsWith('plan_') && typeof (event as any).plan === 'object' && (event as any).plan !== null && typeof (event as any).plan.goal === 'object' && (event as any).plan.goal !== null) {
        return (event as any).plan.goal.id === goalId;
      }
      return false;
    });
  }

  /**
   * Get events related to a specific plan
   */
  getPlanEvents(entityId: EntityId, planId: string): AnyEvent[] {
    const events = this.getEvents(entityId);
    return events.filter(event => {
      // Use type guard based on event type
      if (event.type.startsWith('plan_') && typeof (event as any).plan === 'object' && (event as any).plan !== null) {
        return (event as any).plan.id === planId;
      }
      return false;
    });
  }

  /**
   * Get a timeline of all events across all entities
   */
  getTimeline(): AnyEvent[] {
    const allEvents: AnyEvent[] = [];

    // Convert Map values iterator to array before iterating
    for (const entityEvents of Array.from(this.events.values())) {
      allEvents.push(...entityEvents);
    }

    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export all events to JSON
   */
  exportToJson(): string {
    const data: Record<string, AnyEvent[]> = {};

    // Convert Map iterator to array before iterating
    for (const [entityId, entityEvents] of Array.from(this.events.entries())) {
      data[entityId] = entityEvents;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import events from JSON
   */
  importFromJson(json: string): void {
    try {
      const data = JSON.parse(json) as Record<string, AnyEvent[]>;

      this.events.clear();

      for (const [entityId, entityEvents] of Object.entries(data)) {
        this.events.set(entityId, entityEvents);
      }
    } catch (error) {
      // Use displayMessage for error
      displayMessage("DefaultObserver", `Error importing events from JSON: ${error instanceof Error ? error.message : String(error)}`, COLORS.error);
      throw new Error('Invalid JSON format for events');
    }
  }
}

/**
 * Log levels for filtering events
 */
export enum LogLevel {
  Error = 0,
  Warning = 1,
  Info = 2,
  Debug = 3
}
