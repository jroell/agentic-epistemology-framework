import { clampConfidence, negateProp, generateId } from '../types/common';
import type { Proposition, Justification, JustificationElement, Evidence } from '../types/common';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { LLMClient } from '../llm/llm-client';

/**
 * Parameters that influence a frame's behavior
 */
export interface FrameParameters {
  /**
   * Weight given to evidence depending on its type
   */
  weightPerformance?: number;
  weightDetail?: number;
  weightSecurity?: number;
  
  // Debate-specific frame parameters
  weightFairness?: number;
  weightSupportive?: number;
  weightCritical?: number;
  weightEvidence?: number;
  weightLogic?: number;
  weightStructure?: number;
  
  // Additional parameters can be added here as needed
  [key: string]: number | undefined;
}

/**
 * A cognitive lens/perspective that influences interpretation and reasoning
 */
export interface Frame {
  /**
   * Unique identifier for the frame
   */
  id: string;
  
  /**
   * Human-readable name of the frame
   */
  name: string;
  
  /**
   * Description of the frame's characteristics
   */
  description: string;

  /**
   * Interpret a perception through this frame's lens
   * 
   * @param perception Perception to interpret
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to the interpreted perception
   */
  interpretPerception(
    perception: Perception, 
    llmClient: LLMClient
  ): Promise<Perception>;

  /**
   * Get propositions relevant to a perception or goal in this frame
   * 
   * @param source Perception or goal to extract propositions from
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to an array of relevant propositions
   */
  getRelevantPropositions(
    source: Perception | Goal, 
    llmClient: LLMClient
  ): Promise<string[]>;

  /**
   * Compute initial confidence for a new belief based on justification
   * 
   * @param proposition Proposition being considered
   * @param justificationElements Justification elements supporting the belief
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to the initial confidence level
   */
  computeInitialConfidence(
    proposition: string, 
    justificationElements: JustificationElement[],
    llmClient: LLMClient
  ): Promise<number>;

  /**
   * Update confidence based on existing belief and new evidence
   * 
   * @param proposition The proposition being updated
   * @param currentConfidence Current confidence level
   * @param currentJustification Current justification
   * @param newElements New justification elements
   * @param sourceFrame Frame of the source (optional)
   * @returns Promise resolving to the updated confidence level
   */
  updateConfidence(
    proposition: Proposition,
    currentConfidence: number,
    currentJustification: Justification | undefined,
    newElements: JustificationElement[],
    sourceFrame?: Frame
  ): Promise<number>;

  /**
   * Recompute confidence for a belief when the frame changes
   * 
   * @param proposition The proposition associated with the justification
   * @param justification Justification supporting the belief
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to the recomputed confidence level
   */
  recomputeConfidence(
    proposition: string,
    justification: Justification,
    llmClient: LLMClient
  ): Promise<number>;

  /**
   * Evaluate justification from an external source considering frame differences
   * 
   * @param proposition Proposition being justified
   * @param externalJustification Justification from external source
   * @param sourceFrame Frame of the source agent
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to the confidence level based on external justification
   */
  evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    llmClient: LLMClient
  ): Promise<number>;
  
  /**
   * Get the compatibility level between this frame and another
   * 
   * @param other The other frame to compare with
   * @returns Compatibility score between 0 (incompatible) and 1 (fully compatible)
   */
  getCompatibility(other: Frame): number;
}

/**
 * Base implementation for frames
 */
export abstract class BaseFrame implements Frame {
  id: string;
  name: string;
  description: string;
  parameters: FrameParameters;

  constructor(
    id: string | undefined,
    name: string,
    description: string,
    parameters: FrameParameters = {}
  ) {
    this.id = id ?? generateId('frame');
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  async interpretPerception(
    perception: Perception,
    llmClient: LLMClient
  ): Promise<Perception> {
    try {
      // Default implementation - use LLM to interpret based on frame
      const interpretedData = await llmClient.interpretPerceptionData(perception.data, this);
      perception.data = interpretedData;
      return perception;
    } catch (error) {
      console.error(`Error interpreting perception with ${this.name} frame:`, error);
      return perception; // Return original perception if interpretation fails
    }
  }

  async getRelevantPropositions(
    source: Perception | Goal,
    llmClient: LLMClient
  ): Promise<string[]> {
    try {
      // Default implementation - use LLM to extract propositions
      const sourceData = source instanceof Goal ? source.description : source.data;
      return await llmClient.extractRelevantPropositions(sourceData, this);
    } catch (error) {
      console.error(`Error extracting propositions with ${this.name} frame:`, error);
      return []; // Return empty array if extraction fails
    }
  }

  async computeInitialConfidence(
    proposition: string,
    justificationElements: JustificationElement[],
    llmClient: LLMClient
  ): Promise<number> {
    try {
      if (justificationElements.length === 0) {
        return 0.5; // Default confidence if no justification
      }

      // Default implementation - use strength and type-based weights
      let totalConfidence = 0;
      let totalWeight = 0;

      for (const element of justificationElements) {
        const strength = await this.getElementStrength(element, proposition, llmClient);
        const weight = await this.getElementWeight(element, llmClient);

        totalConfidence += strength * weight;
        totalWeight += weight;
      }

      return clampConfidence(totalWeight > 0 ? totalConfidence / totalWeight : 0.5);
    } catch (error) {
      console.error(`Error computing initial confidence with ${this.name} frame:`, error);
      return 0.5; // Return moderate confidence if computation fails
    }
  }

  abstract updateConfidence(
    proposition: Proposition,
    currentConfidence: number,
    currentJustification: Justification | undefined,
    newElements: JustificationElement[],
    sourceFrame?: Frame
  ): Promise<number>;

  async recomputeConfidence(
    proposition: string,
    justification: Justification,
    llmClient: LLMClient
  ): Promise<number> {
    try {
      if (justification.elements.length === 0) {
        return 0.5; // Default confidence if no justification
      }

      // Start fresh and compute based on all existing justification elements
      let totalConfidence = 0;
      let totalWeight = 0;

      for (const element of justification.elements) {
        const strength = await this.getElementStrength(element, proposition, llmClient);
        const weight = await this.getElementWeight(element, llmClient);

        totalConfidence += strength * weight;
        totalWeight += weight;
      }

      return clampConfidence(totalWeight > 0 ? totalConfidence / totalWeight : 0.5);
    } catch (error) {
      console.error(`Error recomputing confidence with ${this.name} frame:`, error);
      return 0.5; // Return moderate confidence if computation fails
    }
  }

  async evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    llmClient: LLMClient
  ): Promise<number> {
    try {
      if (externalJustification.elements.length === 0) {
        return 0.5; // Default confidence if no justification
      }

      // Evaluate external justification with this frame's perspective
      let totalConfidence = 0;
      let totalWeight = 0;

      for (const element of externalJustification.elements) {
        const strength = await this.getElementStrength(element, proposition, llmClient);
        const weight = await this.getElementWeight(element, llmClient);

        totalConfidence += strength * weight;
        totalWeight += weight;
      }

      const baseConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0.5;
      
      // Modulate by frame compatibility
      const compatibility = this.getCompatibility(sourceFrame);
      return clampConfidence(baseConfidence * compatibility);
    } catch (error) {
      console.error(`Error evaluating external justification with ${this.name} frame:`, error);
      return 0.5; // Return moderate confidence if evaluation fails
    }
  }

  abstract getCompatibility(other: Frame): number;

  /**
   * Get the strength of a justification element for a proposition
   * @param element The justification element
   * @param proposition The proposition being evaluated
   * @param llmClient Client for LLM interaction
   * @returns Promise resolving to the strength value
   */
  protected async getElementStrength(
    element: JustificationElement,
    proposition: string,
    llmClient: LLMClient
  ): Promise<number> {
    // Default implementation - use LLM to judge evidence strength
    return llmClient.judgeEvidenceStrength(element, proposition);
  }

  /**
   * Get the weight to assign to a justification element
   * @param element The justification element
   * @param llmClient Client for LLM interaction
   * @returns Promise resolving to the weight value
   */
  protected async getElementWeight(
    element: JustificationElement,
    llmClient: LLMClient
  ): Promise<number> {
    // Default implementation - use LLM to judge evidence saliency
    return llmClient.judgeEvidenceSaliency(element, this);
  }
}

/**
 * A frame that prioritizes efficiency and speed
 */
export class EfficiencyFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Efficiency',
      'Prioritizes speed and performance metrics',
      {
        weightPerformance: 0.8,
        ...parameters
      }
    );
  }

  async updateConfidence(
    proposition: Proposition,
    currentConfidence: number,
    _currentJustification: Justification | undefined,
    newElements: JustificationElement[],
    _sourceFrame?: Frame
  ): Promise<number> {
    let updated = currentConfidence;
    
    // Apply Frame-Weighted Update (Eq. 1 from paper)
    for (const element of newElements) {
      // Get evidence strength C(e, P)
      let evidenceStrength = 0.5; // Default
      // Convert element to Evidence type if it has getConfidence method
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Apply weightPerformance for frame-specific weight function w_F(e)
      const weight = element.type === 'performance' 
        ? this.parameters.weightPerformance || 0.8 
        : 1 - (this.parameters.weightPerformance || 0.8);
      
      // Weighted update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof EfficiencyFrame) return 0.9;
    if (other.name === 'Thoroughness') return 0.3;
    if (other.name === 'Security') return 0.5;
    return 0.4;
  }
}

/**
 * A frame that prioritizes thoroughness and completeness
 */
export class ThoroughnessFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Thoroughness',
      'Prioritizes completeness and detail',
      {
        weightDetail: 0.8,
        ...parameters
      }
    );
  }

  async updateConfidence(
    proposition: Proposition,
    currentConfidence: number,
    _currentJustification: Justification | undefined,
    newElements: JustificationElement[],
    _sourceFrame?: Frame
  ): Promise<number> {
    let updated = currentConfidence;
    
    // Apply Frame-Weighted Update with thoroughness-specific weighting
    for (const element of newElements) {
      // Get evidence strength C(e, P)
      let evidenceStrength = 0.5; // Default
      // Convert element to Evidence type if it has getConfidence method
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Apply weightDetail for frame-specific weight function w_F(e)
      const weight = element.type === 'detailed' 
        ? this.parameters.weightDetail || 0.8 
        : 1 - (this.parameters.weightDetail || 0.8);
      
      // Weighted update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof ThoroughnessFrame) return 0.9;
    if (other.name === 'Efficiency') return 0.3;
    if (other.name === 'Security') return 0.7;
    return 0.5;
  }
}

/**
 * A frame that prioritizes security and risk minimization
 */
export class SecurityFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Security',
      'Prioritizes safety and risk minimization',
      {
        weightSecurity: 0.8,
        ...parameters
      }
    );
  }

  async updateConfidence(
    proposition: Proposition,
    currentConfidence: number,
    _currentJustification: Justification | undefined,
    newElements: JustificationElement[],
    _sourceFrame?: Frame
  ): Promise<number> {
    let updated = currentConfidence;
    
    // Apply Frame-Weighted Update with security-specific weighting
    for (const element of newElements) {
      // Get evidence strength C(e, P)
      let evidenceStrength = 0.5; // Default
      // Convert element to Evidence type if it has getConfidence method
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Apply weightSecurity for frame-specific weight function w_F(e)
      const weight = element.type === 'security' 
        ? this.parameters.weightSecurity || 0.8 
        : 1 - (this.parameters.weightSecurity || 0.8);
      
      // Weighted update: conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof SecurityFrame) return 0.9;
    if (other.name === 'Efficiency') return 0.5;
    if (other.name === 'Thoroughness') return 0.7;
    return 0.4;
  }
}

/**
 * Factory for creating frames
 */
export class FrameFactory {
  /**
   * Create a frame by name
   * 
   * @param frameName Name of the frame to create
   * @returns The created frame
   */
  static create(frameName: string): Frame {
    switch (frameName.toLowerCase()) {
      case 'efficiency': return new EfficiencyFrame();
      case 'thoroughness': return new ThoroughnessFrame();
      case 'security': return new SecurityFrame();
      default: throw new Error(`Unknown frame: ${frameName}`);
    }
  }
  
  /**
   * Get a list of available frame types
   * 
   * @returns Array of available frame type names
   */
  static available(): string[] {
    return ['efficiency', 'thoroughness', 'security'];
  }
}
