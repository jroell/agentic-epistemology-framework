import { EntityId } from '../types/common';
import { Entity } from './entity';
import { Tool } from '../action/tool';
import { Capability } from '../action/capability';

/**
 * A lookup service for discovering tools, entities, and capabilities
 * 
 * The Registry provides a central location for agents to discover and
 * access resources available in the system.
 */
export class Registry {
  /**
   * Map of entity ID to entity
   */
  private entities: Map<EntityId, Entity> = new Map();
  
  /**
   * Map of tool ID to tool
   */
  private tools: Map<EntityId, Tool> = new Map();
  
  /**
   * Map of capability to set of tool IDs that provide it
   */
  private capabilityMap: Map<Capability, Set<EntityId>> = new Map();

  /**
   * Register an entity in the registry
   * 
   * @param entity The entity to register
   */
  registerEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);

    if (entity.capabilities) {
      entity.capabilities.forEach(capability => {
        this.registerCapability(entity.id, capability);
      });
    }
  }

  /**
   * Unregister an entity from the registry
   * 
   * @param entityId ID of the entity to unregister
   * @returns True if the entity was unregistered, false if it wasn't registered
   */
  unregisterEntity(entityId: EntityId): boolean {
    const entity = this.entities.get(entityId);
    
    if (!entity) {
      return false;
    }

    if (entity.capabilities) {
      entity.capabilities.forEach(capability => {
        this.unregisterCapability(entityId, capability);
      });
    }
    
    return this.entities.delete(entityId);
  }

  /**
   * Get an entity by its ID
   * 
   * @param entityId ID of the entity to get
   * @returns The entity or undefined if not found
   */
  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities registered in the registry
   * 
   * @returns Array of all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities by type
   * 
   * @param type Type of entities to get
   * @returns Array of matching entities
   */
  getEntitiesByType(type: string): Entity[] {
    return Array.from(this.entities.values())
      .filter(entity => entity.type === type);
  }

  /**
   * Register a tool in the registry
   * 
   * @param tool The tool to register
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);

    tool.capabilities.forEach(capability => {
      this.registerCapability(tool.id, capability);
    });
  }

  /**
   * Unregister a tool from the registry
   * 
   * @param toolId ID of the tool to unregister
   * @returns True if the tool was unregistered, false if it wasn't registered
   */
  unregisterTool(toolId: EntityId): boolean {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return false;
    }

    tool.capabilities.forEach(capability => {
      this.unregisterCapability(toolId, capability);
    });
    
    return this.tools.delete(toolId);
  }

  /**
   * Get a tool by its ID
   * 
   * @param toolId ID of the tool to get
   * @returns The tool or undefined if not found
   */
  getTool(toolId: EntityId): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools registered in the registry
   * 
   * @returns Array of all tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Register a capability provided by an entity or tool
   * 
   * @param providerId ID of the entity or tool providing the capability
   * @param capability The capability being provided
   */
  private registerCapability(providerId: EntityId, capability: Capability): void {
    if (!this.capabilityMap.has(capability)) {
      this.capabilityMap.set(capability, new Set());
    }
    
    this.capabilityMap.get(capability)?.add(providerId);
  }

  /**
   * Unregister a capability provided by an entity or tool
   * 
   * @param providerId ID of the entity or tool providing the capability
   * @param capability The capability being unregistered
   */
  private unregisterCapability(providerId: EntityId, capability: Capability): void {
    const providers = this.capabilityMap.get(capability);

    if (providers) {
      providers.delete(providerId);

      // Remove the capability entirely if there are no more providers
      if (providers.size === 0) {
        this.capabilityMap.delete(capability);
      }
    }
  }

  /**
   * Get tools that provide a specific capability
   * 
   * @param capability The capability to look for
   * @returns Array of tools providing the capability
   */
  getToolsForCapability(capability: Capability): Tool[] {
    const providerIds = this.capabilityMap.get(capability);
    
    if (!providerIds) {
      return [];
    }
    
    return Array.from(providerIds)
      .map(id => this.tools.get(id))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  /**
   * Get entities that provide a specific capability
   * 
   * @param capability The capability to look for
   * @returns Array of entities providing the capability
   */
  getEntitiesForCapability(capability: Capability): Entity[] {
    const providerIds = this.capabilityMap.get(capability);
    
    if (!providerIds) {
      return [];
    }
    
    return Array.from(providerIds)
      .map(id => this.entities.get(id))
      .filter((entity): entity is Entity => entity !== undefined);
  }

  /**
   * Check if a capability is available in the registry
   * 
   * @param capability The capability to check for
   * @returns True if the capability is available
   */
  hasCapability(capability: Capability): boolean {
    const providers = this.capabilityMap.get(capability);
    return providers !== undefined && providers.size > 0;
  }

  /**
   * Get all capabilities registered in the registry
   * 
   * @returns Array of all capabilities
   */
  getAllCapabilities(): Capability[] {
    return Array.from(this.capabilityMap.keys());
  }
}
