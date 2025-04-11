/// <reference lib="dom" />
import { generateId } from '../types/common';

/**
 * A persistent store of the agent's knowledge and experiences
 * 
 * Unlike Context which is transient, Memory provides long-term storage for 
 * beliefs, experiences, and other knowledge that the agent might need later
 */
export interface Memory {
  /**
   * Store an entity in memory
   * 
   * @param entity The entity to store
   * @returns The ID of the stored entity
   */
  storeEntity(entity: any): string;
  
  /**
   * Retrieve an entity by its ID
   * 
   * @param id ID of the entity to retrieve
   * @returns The retrieved entity or null if not found
   */
  retrieveEntity(id: string): any | null;
  
  /**
   * Query entities based on criteria
   * 
   * @param criteria Object with properties to match against entities
   * @returns Array of matching entities
   */
  queryEntities(criteria: object): any[];
  
  /**
   * Clear all entities from memory
   */
  clear(): void;
}

/**
 * Simple in-memory implementation of the Memory interface
 * 
 * Stores entities in a Map with metadata tracking creation and
 * access timestamps
 */
export class DefaultMemory implements Memory {
  /**
   * Map of entity ID to entity with metadata
   */
  private entities: Map<string, any> = new Map();

  /**
   * Store an entity in memory
   * 
   * @param entity The entity to store
   * @returns The ID of the stored entity
   */
  storeEntity(entity: any): string {
    // Use existing ID if available, otherwise generate one
    const id = entity.id || generateId('entity');
    
    // Store entity with metadata
    this.entities.set(id, {
      ...entity,
      _stored: Date.now(),
      _accessed: Date.now(),
      _accessCount: 0
    });
    
    return id;
  }

  /**
   * Retrieve an entity by its ID
   * 
   * @param id ID of the entity to retrieve
   * @returns The retrieved entity or null if not found
   */
  retrieveEntity(id: string): any | null {
    const entity = this.entities.get(id);
    
    if (entity) {
      // Update access metadata
      entity._accessed = Date.now();
      entity._accessCount += 1;
      return entity;
    }
    
    return null;
  }

  /**
   * Query entities based on criteria
   * 
   * @param criteria Object with properties to match against entities
   * @returns Array of matching entities
   */
  queryEntities(criteria: object): any[] {
    const results = Array.from(this.entities.values())
      .filter(entity => this.matchesCriteria(entity, criteria));
    
    // Update access metadata for all results
    const now = Date.now();
    results.forEach(entity => {
      entity._accessed = now;
      entity._accessCount += 1;
    });
    
    return results;
  }

  /**
   * Clear all entities from memory
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Check if an entity matches the given criteria
   * 
   * @param entity Entity to check
   * @param criteria Criteria to match against
   * @returns True if the entity matches all criteria
   */
  private matchesCriteria(entity: any, criteria: object): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      // Skip internal metadata properties
      if (key.startsWith('_')) continue;
      
      // Check for property existence
      if (!(key in entity)) return false;
      
      // Handle different types of criteria values
      if (typeof value === 'function') {
        // Function predicate
        if (!value(entity[key])) return false;
      } else if (value instanceof RegExp) {
        // Regular expression matching
        if (typeof entity[key] !== 'string' || !value.test(entity[key])) return false;
      } else if (Array.isArray(value)) {
        // Check if value is in array
        if (!value.includes(entity[key])) return false;
      } else if (typeof value === 'object' && value !== null) {
        // Nested object criteria
        if (typeof entity[key] !== 'object' || entity[key] === null) return false;
        if (!this.matchesCriteria(entity[key], value)) return false;
      } else {
        // Simple equality check
        if (entity[key] !== value) return false;
      }
    }
    
    return true;
  }

  /**
   * Get statistics about memory usage
   * 
   * @returns Object with memory statistics
   */
  getStats(): { count: number, avgAccessCount: number, mostAccessed: string[] } {
    const entities = Array.from(this.entities.entries());
    const count = entities.length;
    
    if (count === 0) {
      return { count: 0, avgAccessCount: 0, mostAccessed: [] };
    }
    
    // Calculate average access count
    const totalAccessCount = entities.reduce(
      (sum, [_, entity]) => sum + (entity._accessCount || 0), 
      0
    );
    const avgAccessCount = totalAccessCount / count;
    
    // Find most frequently accessed entities
    const sorted = entities
      .sort(([_, a], [__, b]) => (b._accessCount || 0) - (a._accessCount || 0))
      .slice(0, 5);
    
    const mostAccessed = sorted.map(([id, _]) => id);
    
    return { count, avgAccessCount, mostAccessed };
  }
}

/**
 * Memory implementation that uses locality-sensitive hashing for efficient
 * similarity-based retrieval
 * 
 * This is a more advanced memory implementation that can retrieve entities
 * based on semantic similarity rather than exact criteria matching
 */
export class SemanticMemory implements Memory {
  /**
   * Underlying storage for entities
   */
  private storage: DefaultMemory = new DefaultMemory();
  
  /**
   * Map of entity ID to vector representation
   */
  private vectors: Map<string, number[]> = new Map();
  
  /**
   * Dimension of vector embeddings
   */
  private dimension: number;
  
  /**
   * Vectorize function that converts entities to vector representations
   */
  private vectorize: (entity: any) => number[];
  
  /**
   * Create a new semantic memory
   * 
   * @param vectorize Function that converts entities to vectors
   * @param dimension Dimension of vector embeddings
   */
  constructor(vectorize: (entity: any) => number[], dimension: number = 128) {
    this.vectorize = vectorize;
    this.dimension = dimension;
  }

  /**
   * Store an entity in memory
   * 
   * @param entity The entity to store
   * @returns The ID of the stored entity
   */
  storeEntity(entity: any): string {
    // Store in regular memory
    const id = this.storage.storeEntity(entity);
    
    // Compute and store vector representation
    try {
      const vector = this.vectorize(entity);
      this.vectors.set(id, vector);
    } catch (error) {
      console.warn(`Failed to vectorize entity ${id}:`, error);
    }
    
    return id;
  }

  /**
   * Retrieve an entity by its ID
   * 
   * @param id ID of the entity to retrieve
   * @returns The retrieved entity or null if not found
   */
  retrieveEntity(id: string): any | null {
    return this.storage.retrieveEntity(id);
  }

  /**
   * Query entities based on criteria
   * 
   * @param criteria Object with properties to match against entities
   * @returns Array of matching entities
   */
  queryEntities(criteria: object): any[] {
    return this.storage.queryEntities(criteria);
  }

  /**
   * Find entities similar to a query entity or vector
   * 
   * @param query Entity or vector to find similar entities to
   * @param limit Maximum number of results to return
   * @param threshold Minimum similarity score (0-1) to include in results
   * @returns Array of [entity, similarity] pairs
   */
  findSimilar(query: any | number[], limit: number = 10, threshold: number = 0.7): [any, number][] {
    // Convert query to vector if it's not already
    const queryVector = Array.isArray(query) 
      ? query 
      : this.vectorize(query);
    
    // Compute similarity scores with all stored entities
    const results: [any, number][] = [];
    
    // Convert Map iterator to array before iterating
    for (const [id, vector] of Array.from(this.vectors.entries())) { 
      const similarity = this.cosineSimilarity(queryVector, vector);
      
      if (similarity >= threshold) {
        const entity = this.storage.retrieveEntity(id);
        if (entity) {
          results.push([entity, similarity]);
        }
      }
    }
    
    // Sort by similarity (descending) and limit results
    return results
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  /**
   * Clear all entities from memory
   */
  clear(): void {
    this.storage.clear();
    this.vectors.clear();
  }

  /**
   * Calculate cosine similarity between two vectors
   * 
   * @param a First vector
   * @param b Second vector
   * @returns Similarity score between 0 and 1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
