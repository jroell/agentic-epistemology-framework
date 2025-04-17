/// <reference lib="dom" />
import { EntityId } from '../types/common';
import { BaseObserver, Observer } from './observer';
import { EventType, AnyEvent } from './event-types';

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
    maxEventsPerEntity: number = 1000,
    logLevel: LogLevel = LogLevel.Info,
    logToConsole: boolean = false,
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

    const entityEvents = this.events.get(event.entityId)!;

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
    
    // Create header with metadata
    const header = `[${timestamp}] [${levelStr}] [${event.entityId}] [${event.type}]`;
    
    // Create a box around the header for better visibility
    const headerLine = '─'.repeat(header.length + 4);
    const boxedHeader = `┌${headerLine}┐\n│  ${header}  │\n└${headerLine}┘`;
    
    // Format the JSON data with pretty indentation for better readability
    let jsonData;
    
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
      case EventType.Perception:
        // For perception events, just stringify the whole event
        jsonData = event;
        break;
      default:
        // For all other event types, just stringify the event directly
        jsonData = event;
    }

    // Log the formatted output
    const formattedJson = JSON.stringify(jsonData, null, 2);
    
    switch (level) {
      case LogLevel.Error:
        console.error(boxedHeader);
        console.error(formattedJson);
        break;
      case LogLevel.Warning:
        console.warn(boxedHeader);
        console.warn(formattedJson);
        break;
      case LogLevel.Info:
        console.info(boxedHeader);
        console.info(formattedJson);
        break;
      case LogLevel.Debug:
        console.debug(boxedHeader);
        console.debug(formattedJson);
        break;
    }
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
    return events.filter(event => {
      const frameEvent = event as any;
      return frameEvent.newFrame.id === frameId || frameEvent.oldFrame.id === frameId;
    });
  }

  /**
   * Get events related to a specific belief
   */
  getBeliefEvents(entityId: EntityId, proposition: string): AnyEvent[] {
    const events = this.getEvents(entityId);
    return events.filter(event => {
      if (event.type === EventType.BeliefFormation) {
        return (event as any).belief.proposition === proposition;
      } else if (event.type === EventType.BeliefUpdate) {
        return (event as any).newBelief.proposition === proposition;
      } else if (event.type === EventType.BeliefRejection) {
        return (event as any).belief.proposition === proposition;
      } else if (event.type === EventType.InsufficientConfidence) {
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
      if (event.type.startsWith('goal_') || event.type === EventType.PlanningStart) {
        return (event as any).goal.id === goalId;
      } else if (event.type.startsWith('plan_')) {
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
      if (event.type.startsWith('plan_')) {
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
      console.error('Error importing events from JSON:', error);
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
