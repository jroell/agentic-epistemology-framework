import { EntityId } from '../types/common';
import { Capability } from '../action/capability';

/**
 * Interface representing any identifiable participant in the system
 * 
 * Entities are the fundamental building blocks of the AEF and can represent
 * agents, human users, APIs, or other system components
 */
export interface Entity {
  /**
   * Unique identifier for the entity
   */
  id: EntityId;
  
  /**
   * Type of entity (e.g., 'Agent', 'Human', 'API')
   */
  type: string;
  
  /**
   * Optional human-readable name for the entity
   */
  name?: string;
  
  /**
   * Set of capabilities the entity possesses
   */
  capabilities?: Set<Capability>;
}
