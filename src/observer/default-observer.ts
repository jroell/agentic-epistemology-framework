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
    // Check if event type is filtered out
    if (this.eventFilters.has(event.type)) {
      return;
    }
    
    // Check if event level is below the minimum log level
    if (this.getLevelForEvent(event) < this.logLevel) {
      return;
    }
    
    // Log to console if enabled
    if (this.logToConsole) {
      this.logEventToConsole(event);
    }
    
    // Store the event
    if (!this.events.has(event.entityId)) {
      this.events.set(event.entityId, []);
    }
    
    const entityEvents = this.events.get(event.entityId)!;
    
    // Add the event
    entityEvents.push(event);
    
    // Enforce maximum events per entity
    if (entityEvents.length > this.maxEventsPerEntity) {
      entityEvents.splice(0, entityEvents.length - this.maxEventsPerEntity);
    }
    
    // Notify listeners
    this.notifyListeners(event);
  }

  /**
   * Log an event to the console
   */
  private logEventToConsole(event: AnyEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const level = this.getLevelForEvent(event);
    const levelStr = LogLevel[level].toUpperCase();
    
    let message = `[${timestamp}] [${levelStr}] [${event.entityId}] [${event.type}]`;
    
    switch (event.type) {
      case EventType.BeliefFormation:
        message += ` Belief formed: ${event.belief.proposition} (conf: ${event.belief.confidence.toFixed(2)})`;
        break;
      case EventType.BeliefUpdate:
        message += ` Belief updated: ${event.newBelief.proposition} (conf: ${event.oldBelief.confidence.toFixed(2)} -> ${event.newBelief.confidence.toFixed(2)})`;
        break;
      case EventType.FrameChange:
        message += ` Frame changed: ${event.oldFrame.name} -> ${event.newFrame.name}`;
        break;
      case EventType.PlanExecution:
        message += ` Executing plan: ${event.plan.toString()}`;
        break;
      case EventType.ActionExecution:
        message += ` Executing action: ${event.action.toString()}`;
        break;
      case EventType.MessageSent:
        message += ` Message sent to ${event.recipientId}: ${event.message.toString()}`;
        break;
      default:
        // Generic toString for other event types
        message += ` ${JSON.stringify(event)}`;
    }
    
    switch (level) {
      case LogLevel.Error:
        console.error(message);
        break;
      case LogLevel.Warning:
        console.warn(message);
        break;
      case LogLevel.Info:
        console.info(message);
        break;
      case LogLevel.Debug:
        console.debug(message);
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
    for (const [entityId, entityEvents] of this.events.entries()) {
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
    
    for (const entityEvents of this.events.values()) {
      allEvents.push(...entityEvents);
    }
    
    // Sort by timestamp
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export all events to JSON
   */
  exportToJson(): string {
    const data: Record<string, AnyEvent[]> = {};
    
    for (const [entityId, entityEvents] of this.events.entries()) {
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
      
      // Clear existing events
      this.events.clear();
      
      // Import new events
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
