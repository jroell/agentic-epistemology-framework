import { EntityId, generateId, clampConfidence, negateProp } from '../types/common'; // Added negateProp
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { GeminiClient } from '../llm/gemini-client'; // Added import
import { 
  Justification, 
  JustificationElement, 
  TestimonyJustificationElement, // Added import
  InferenceJustificationElement, // Added import
  ExternalJustificationElement // Added import
} from './justification';

/**
 * A cognitive lens/perspective that influences interpretation and reasoning
 * 
 * Frames represent different cognitive perspectives that influence how
 * agents interpret perceptions, form beliefs, and make decisions
 */
export abstract class Frame {
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
   * Parameters that influence the frame's behavior
   */
  parameters: FrameParameters;

  /**
   * Create a new frame
   * 
   * @param id Unique identifier for the frame
   * @param name Human-readable name
   * @param description Description of the frame
   * @param parameters Parameters influencing behavior
   */
  constructor(
    id: string, 
    name: string, 
    description: string,
    parameters: Partial<FrameParameters> = {}
  ) {
    this.id = id || generateId('frame');
    this.name = name;
    this.description = description;
    this.parameters = {
      ...DEFAULT_FRAME_PARAMETERS,
      ...parameters
    };
  }

  /**
   * Interpret a perception through this frame's lens
   * 
   * @param perception Perception to interpret
   * @param geminiClient Client for LLM interaction if needed
   * @returns Promise resolving to the interpreted perception (may be modified)
   */
  abstract interpretPerception(
    perception: Perception, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<Perception>; // Changed return type

  /**
   * Get propositions relevant to a perception or goal in this frame
   * 
   * @param source Perception or goal to extract propositions from
   * @param geminiClient Client for LLM interaction if needed
   * @returns Promise resolving to an array of relevant propositions
   */
  abstract getRelevantPropositions(
    source: Perception | Goal, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<string[]>; // Changed return type

  /**
   * Compute initial confidence for a new belief based on justification
   * 
   * @param proposition Proposition being considered
   * @param justificationElements Justification elements supporting the belief
   * @param geminiClient Client for LLM interaction if needed
   * @returns Promise resolving to the initial confidence level
   */
  abstract computeInitialConfidence(
    proposition: string, 
    justificationElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number>; // Changed return type to Promise<number>

  /**
   * Update confidence based on existing belief and new evidence
   * 
   * @param currentConfidence Current confidence level
   * @param currentJustification Current justification
   * @param newElements New justification elements
   * @param proposition The proposition being updated
   * @param currentConfidence Current confidence level
   * @param currentJustification Current justification
   * @param newElements New justification elements
   * @param geminiClient Client for LLM interaction if needed
   * @returns Promise resolving to the updated confidence level
   */
  abstract updateConfidence(
    proposition: string, 
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number>; // Changed return type to Promise<number>

  /**
   * Recompute confidence for a belief when the frame changes
   * 
   * @param proposition The proposition associated with the justification
   * @param justification Justification supporting the belief
   * @param geminiClient Client for LLM interaction
   * @returns Promise resolving to the recomputed confidence level
   */
  abstract recomputeConfidence(
    proposition: string, // Added proposition
    justification: Justification,
    // currentConfidence: number, // Removed unused parameter
    geminiClient: GeminiClient 
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
  abstract evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number>; // Changed return type
  
  /**
   * Update frame parameters
   * 
   * @param newParameters New parameter values
   * @returns A new frame with updated parameters
   */
  abstract withParameters(newParameters: Partial<FrameParameters>): Frame;
  
  /**
   * Get the compatibility level between this frame and another
   * 
   * @param otherFrame The other frame to compare with
   * @returns Compatibility score between 0 (incompatible) and 1 (fully compatible)
   */
  abstract getCompatibility(otherFrame: Frame): number;
  
  /**
   * Create a string representation of the frame
   * 
   * @returns String representation
   */
  toString(): string {
    return `Frame: ${this.name} (${this.id})`;
  }
}

/**
 * Parameters that influence a frame's behavior
 */
export interface FrameParameters {
  /**
   * Weight given to tool results in confidence calculations
   */
  toolResultWeight: number;
  
  /**
   * Weight given to observations in confidence calculations
   */
  observationWeight: number;
  
  /**
   * Weight given to testimony in confidence calculations
   */
  testimonyWeight: number;
  
  /**
   * Weight given to inference in confidence calculations
   */
  inferenceWeight: number;
  
  /**
   * Weight given to external justifications in confidence calculations
   */
  externalJustificationWeight: number;
  
  /**
   * Rate at which confidence increases with supporting evidence
   */
  confidenceIncreaseRate: number;
  
  /**
   * Rate at which confidence decreases with contradicting evidence
   */
  confidenceDecreaseRate: number;
  
  /**
   * Minimum sample size required for high confidence
   */
  minSampleSizeForHighConfidence: number;
  
  /**
   * Maximum initial confidence for a new belief
   */
  maxInitialConfidence: number;
  
  /**
   * Weight given to frame compatibility in evaluating external justifications
   */
  frameCompatibilityWeight: number;

  /**
   * Sensitivity parameter (alpha) for Justification-Source updates.
   * Determines how much weight is given to source trust vs. belief inertia.
   */
  sourceTrustWeight: number; // Added for Eq. 2
}

/**
 * Default frame parameters
 */
export const DEFAULT_FRAME_PARAMETERS: FrameParameters = {
  toolResultWeight: 0.8,
  observationWeight: 0.7,
  testimonyWeight: 0.5,
  inferenceWeight: 0.6,
  externalJustificationWeight: 0.4,
  confidenceIncreaseRate: 0.1,
  confidenceDecreaseRate: 0.15,
  minSampleSizeForHighConfidence: 5,
  maxInitialConfidence: 0.8,
  frameCompatibilityWeight: 0.5,
  sourceTrustWeight: 0.6 // Default alpha value for Eq. 2
};

/**
 * A frame that prioritizes efficiency and speed
 */
export class EfficiencyFrame extends Frame {
  /**
   * Create a new efficiency frame
   * 
   * @param id Optional ID (generated if not provided)
   * @param parameters Optional custom parameters
   */
  constructor(id?: string, parameters: Partial<FrameParameters> = {}) {
    super(
      id || 'efficiency',
      'Efficiency',
      'Prioritizes speed, resource optimization, and quick results',
      {
        toolResultWeight: 0.9,
        observationWeight: 0.8,
        testimonyWeight: 0.4,
        inferenceWeight: 0.7,
        confidenceIncreaseRate: 0.15,
        confidenceDecreaseRate: 0.1,
        minSampleSizeForHighConfidence: 3,
        maxInitialConfidence: 0.85,
        ...parameters
      }
    );
  }

  async interpretPerception( // Changed to async
    perception: Perception, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<Perception> { // Changed return type
    // Use LLM to interpret data based on frame
    const interpretedData = await geminiClient.interpretPerceptionData(perception.data, this);
    // Modify the data of the existing perception object
    perception.data = interpretedData; 
    return perception;
  }

  async getRelevantPropositions( // Changed to async
    source: Perception | Goal, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<string[]> { // Changed return type
    // Use LLM to extract propositions based on frame
    const sourceData = (source instanceof Goal) ? source.description : source.data;
    return await geminiClient.extractRelevantPropositions(sourceData, this);
  }

  async computeInitialConfidence( // Changed to async
    proposition: string, 
    justificationElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { 
    // Implement weighted average logic using LLM calls
    if (justificationElements.length === 0) {
      return 0.5; // Default confidence if no justification
    }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    // Evaluate all elements concurrently
    await Promise.all(justificationElements.map(async (element) => {
      // TODO: Add error handling for LLM calls
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      
      let adjustedStrength = strength;
      // Modulate strength by trust for relevant types
      if (element.type === 'testimony' || element.type === 'external') {
         // TODO: Add error handling for LLM call
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; // Simple modulation, could be more complex
      }
      
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    // Calculate weighted average, default to 0.5 if totalSaliency is 0
    const initialConfidence = totalSaliency > 0 
      ? totalWeightedStrength / totalSaliency 
      : 0.5; 

    // Apply max initial confidence limit
    return clampConfidence(
      Math.min(initialConfidence, this.parameters.maxInitialConfidence)
    );
  }

  async updateConfidence( // Changed to async
    proposition: string, 
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { // Changed return type to Promise<number>
    // Implement Frame-Weighted Update (Eq. 1 from paper Section 5.4)
    // conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
    // Applied sequentially for each new element.

    let updatedConfidence = currentConfidence;

    for (const element of newElements) {
      // --- Get Evidence Strength C(e, P) using LLM ---
      // TODO: Implement error handling for LLM call
      const evidenceStrength = await geminiClient.judgeEvidenceStrength(element, proposition);

      // --- Get Frame Weight w_F(e) using LLM ---
      // TODO: Implement error handling for LLM call
      const frameWeight = await geminiClient.judgeEvidenceSaliency(element, this); // Use LLM for saliency

      // --- Apply Update Model ---
      if (element.type === 'testimony' || element.type === 'external') {
        // Apply Justification-Source Model (Eq. 2) for these types
        // TODO: Implement error handling for LLM call
        const trustScore = await geminiClient.judgeSourceTrust(element.source, this);
        const alpha = this.parameters.sourceTrustWeight;
        // Note: This simple form assumes the testimony/external evidence *supports* the proposition.
        // A more robust version would need the LLM to also judge if the source supports/contradicts,
        // and adjust the target confidence accordingly (e.g., target = trustScore or 1 - trustScore).
        // For now, applying the simple interpolation towards the trust score.
        updatedConfidence = (1 - alpha) * updatedConfidence + alpha * trustScore;

      } else {
        // Apply Frame-Weighted Model (Eq. 1) for other types
        updatedConfidence = (1 - frameWeight) * updatedConfidence + frameWeight * evidenceStrength;
      }
    }
    
    return clampConfidence(updatedConfidence);
  }
  
  /**
   * Helper method to detect if a justification element contradicts a proposition.
   * Basic implementation - assumes specific content structures.
   */
  private _detectContradiction(element: JustificationElement, proposition: string): boolean {
    const negatedProposition = negateProp(proposition);

    if (element instanceof InferenceJustificationElement) {
      // Check if the inference conclusion is the negation
      return element.content === negatedProposition;
    } 
    
    if (element instanceof TestimonyJustificationElement) {
      // Basic check: assumes content might be the negated proposition string
      // TODO: Needs more robust parsing if content is complex (e.g., a Belief object)
      return typeof element.content === 'string' && element.content === negatedProposition;
    }

    if (element instanceof ExternalJustificationElement) {
      // Basic check: assumes content might be the negated proposition string
      // TODO: Needs more robust parsing/checking of the external justification structure
      return typeof element.content === 'string' && element.content === negatedProposition;
    }

    // Assume ToolResult and Observation don't directly contradict in this simple check
    return false; 
  }

  async recomputeConfidence( 
    proposition: string, // Added proposition
    justification: Justification, 
    // currentConfidence: number, // Removed unused parameter
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Re-evaluate confidence based *only* on the justification from the *current* frame's perspective.
    // Uses the same weighted average logic as computeInitialConfidence.
    const justificationElements = justification.elements;
    if (justificationElements.length === 0) {
      return 0.5; // Default confidence if no justification
    }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    // Evaluate all elements concurrently
    await Promise.all(justificationElements.map(async (element) => {
      // TODO: Add error handling for LLM calls
      // Use the passed-in proposition
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition); 
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      
      let adjustedStrength = strength;
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const recomputedConfidence = totalSaliency > 0 
      ? totalWeightedStrength / totalSaliency 
      : 0.5; 

    // Unlike computeInitialConfidence, we don't apply maxInitialConfidence here.
    return clampConfidence(recomputedConfidence);
  }

  async evaluateExternalJustification( 
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Evaluate the external justification using this frame's perspective and LLM calls,
    // then modulate by frame compatibility.
    const justificationElements = externalJustification.elements;
     if (justificationElements.length === 0) {
      return 0.5; // Default confidence if no justification
    }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    // Evaluate all elements concurrently using *this* frame's perspective
    await Promise.all(justificationElements.map(async (element) => {
      // TODO: Add error handling for LLM calls
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      // Saliency is judged by *this* frame (the evaluating frame)
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this); 
      
      let adjustedStrength = strength;
       // Trust in the source is judged by *this* frame
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const calculatedConfidence = totalSaliency > 0 
      ? totalWeightedStrength / totalSaliency 
      : 0.5; 

    // Modulate by frame compatibility
    const compatibility = this.getCompatibility(sourceFrame);
    // Simple modulation: scale confidence by compatibility. Could use frameCompatibilityWeight parameter.
    const finalConfidence = calculatedConfidence * compatibility; 

    return clampConfidence(finalConfidence);
  }

  withParameters(newParameters: Partial<FrameParameters>): Frame {
    return new EfficiencyFrame(this.id, {
      ...this.parameters,
      ...newParameters
    });
  }

  getCompatibility(otherFrame: Frame): number {
    if (otherFrame instanceof EfficiencyFrame) {
      return 0.9; // High compatibility with same frame type
    } else if (otherFrame instanceof ThoroughnessFrame) {
      return 0.3; // Low compatibility with thoroughness frame
    } else if (otherFrame instanceof SecurityFrame) {
      return 0.5; // Moderate compatibility with security frame
    } else {
      return 0.4; // Default compatibility
    }
  }
}

/**
 * A frame that prioritizes thoroughness and completeness
 */
export class ThoroughnessFrame extends Frame {
  /**
   * Create a new thoroughness frame
   * 
   * @param id Optional ID (generated if not provided)
   * @param parameters Optional custom parameters
   */
  constructor(id?: string, parameters: Partial<FrameParameters> = {}) {
    super(
      id || 'thoroughness',
      'Thoroughness',
      'Prioritizes completeness, detail, and comprehensive analysis',
      {
        toolResultWeight: 0.7,
        observationWeight: 0.8,
        testimonyWeight: 0.6,
        inferenceWeight: 0.8,
        confidenceIncreaseRate: 0.08,
        confidenceDecreaseRate: 0.12,
        minSampleSizeForHighConfidence: 8,
        maxInitialConfidence: 0.7,
        ...parameters
      }
    );
  }

  async interpretPerception( // Changed to async
    perception: Perception, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<Perception> { // Changed return type
    // Use LLM to interpret data based on frame
    const interpretedData = await geminiClient.interpretPerceptionData(perception.data, this);
     // Modify the data of the existing perception object
    perception.data = interpretedData;
    return perception;
  }

  async getRelevantPropositions( // Changed to async
    source: Perception | Goal, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<string[]> { // Changed return type
    // Use LLM to extract propositions based on frame
    const sourceData = (source instanceof Goal) ? source.description : source.data;
    return await geminiClient.extractRelevantPropositions(sourceData, this);
  }

  async computeInitialConfidence( // Changed to async
    proposition: string, 
    justificationElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { 
    // Implement weighted average logic using LLM calls
    if (justificationElements.length === 0) {
      return 0.5; // Default confidence if no justification
    }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    // Evaluate all elements concurrently
    await Promise.all(justificationElements.map(async (element) => {
      // TODO: Add error handling for LLM calls
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      
      let adjustedStrength = strength;
      // Modulate strength by trust for relevant types
      if (element.type === 'testimony' || element.type === 'external') {
         // TODO: Add error handling for LLM call
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    // Calculate weighted average, default to 0.5 if totalSaliency is 0
    const initialConfidence = totalSaliency > 0 
      ? totalWeightedStrength / totalSaliency 
      : 0.5; 

    // Apply max initial confidence limit
    // Thoroughness frame might apply a stricter limit or additional factors (like diversity) here if needed
    return clampConfidence(
      Math.min(initialConfidence, this.parameters.maxInitialConfidence) 
    );
  }

  async updateConfidence( // Changed to async
    proposition: string, 
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { // Changed return type to Promise<number>
    // Implement Frame-Weighted Update (Eq. 1 from paper Section 5.4)
    // conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
    // Applied sequentially for each new element.

    let updatedConfidence = currentConfidence;

    // Thoroughness frame might have slightly different placeholder strengths
    // or weights compared to EfficiencyFrame, but using the same for now.
    for (const element of newElements) {
      // --- Get Evidence Strength C(e, P) using LLM ---
      const evidenceStrength = await geminiClient.judgeEvidenceStrength(element, proposition);

      // --- Get Frame Weight w_F(e) using LLM ---
      const frameWeight = await geminiClient.judgeEvidenceSaliency(element, this); // Use LLM for saliency

      // --- Apply Update Model ---
      if (element.type === 'testimony' || element.type === 'external') {
        // Apply Justification-Source Model (Eq. 2)
        const trustScore = await geminiClient.judgeSourceTrust(element.source, this);
        const alpha = this.parameters.sourceTrustWeight;
        updatedConfidence = (1 - alpha) * updatedConfidence + alpha * trustScore;
      } else {
        // Apply Frame-Weighted Model (Eq. 1)
        updatedConfidence = (1 - frameWeight) * updatedConfidence + frameWeight * evidenceStrength;
      }
    }
    
    return clampConfidence(updatedConfidence);
  }
  
  /**
   * Helper method to detect if a justification element contradicts a proposition.
   * Basic implementation - assumes specific content structures.
   * TODO: Consider moving this to the base Frame class for reuse.
   */
  private _detectContradiction(element: JustificationElement, proposition: string): boolean {
    const negatedProposition = negateProp(proposition);

    if (element instanceof InferenceJustificationElement) {
      return element.content === negatedProposition;
    } 
    
    if (element instanceof TestimonyJustificationElement) {
      return typeof element.content === 'string' && element.content === negatedProposition;
    }

    if (element instanceof ExternalJustificationElement) {
      return typeof element.content === 'string' && element.content === negatedProposition;
    }
    
    return false; 
  }

  async recomputeConfidence( 
    proposition: string, // Added proposition
    justification: Justification, 
    // currentConfidence: number, // Removed unused parameter
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Re-evaluate confidence based *only* on the justification from the *current* frame's perspective.
    const justificationElements = justification.elements;
    if (justificationElements.length === 0) { return 0.5; }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    await Promise.all(justificationElements.map(async (element) => {
      // Use the passed-in proposition
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition); 
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      let adjustedStrength = strength;
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const recomputedConfidence = totalSaliency > 0 ? totalWeightedStrength / totalSaliency : 0.5; 
    return clampConfidence(recomputedConfidence);
  }

  async evaluateExternalJustification( 
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Evaluate the external justification using this frame's perspective and LLM calls,
    // then modulate by frame compatibility.
     const justificationElements = externalJustification.elements;
     if (justificationElements.length === 0) { return 0.5; }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    await Promise.all(justificationElements.map(async (element) => {
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this); 
      let adjustedStrength = strength;
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const calculatedConfidence = totalSaliency > 0 ? totalWeightedStrength / totalSaliency : 0.5; 
    const compatibility = this.getCompatibility(sourceFrame);
    const finalConfidence = calculatedConfidence * compatibility; 

    return clampConfidence(finalConfidence);
  }

  withParameters(newParameters: Partial<FrameParameters>): Frame {
    return new ThoroughnessFrame(this.id, {
      ...this.parameters,
      ...newParameters
    });
  }

  getCompatibility(otherFrame: Frame): number {
    if (otherFrame instanceof ThoroughnessFrame) {
      return 0.9; // High compatibility with same frame type
    } else if (otherFrame instanceof EfficiencyFrame) {
      return 0.3; // Low compatibility with efficiency frame
    } else if (otherFrame instanceof SecurityFrame) {
      return 0.7; // High compatibility with security frame
    } else {
      return 0.5; // Default compatibility
    }
  }
}

/**
 * A frame that prioritizes security and risk minimization
 */
export class SecurityFrame extends Frame {
  /**
   * Create a new security frame
   * 
   * @param id Optional ID (generated if not provided)
   * @param parameters Optional custom parameters
   */
  constructor(id?: string, parameters: Partial<FrameParameters> = {}) {
    super(
      id || 'security',
      'Security',
      'Prioritizes safety, security, and risk minimization',
      {
        toolResultWeight: 0.8,
        observationWeight: 0.9,
        testimonyWeight: 0.4,
        inferenceWeight: 0.7,
        confidenceIncreaseRate: 0.05,
        confidenceDecreaseRate: 0.2,
        minSampleSizeForHighConfidence: 10,
        maxInitialConfidence: 0.6,
        ...parameters
      }
    );
  }

  async interpretPerception( // Changed to async
    perception: Perception, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<Perception> { // Changed return type
    // Use LLM to interpret data based on frame
    const interpretedData = await geminiClient.interpretPerceptionData(perception.data, this);
     // Modify the data of the existing perception object
    perception.data = interpretedData;
    return perception;
  }

  async getRelevantPropositions( // Changed to async
    source: Perception | Goal, 
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<string[]> { // Changed return type
    // Use LLM to extract propositions based on frame
    const sourceData = (source instanceof Goal) ? source.description : source.data;
    return await geminiClient.extractRelevantPropositions(sourceData, this);
  }

  async computeInitialConfidence( // Changed to async
    proposition: string, 
    justificationElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { 
    // Implement weighted average logic using LLM calls
    if (justificationElements.length === 0) {
      return 0.5; // Default confidence if no justification
    }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    // Evaluate all elements concurrently
    await Promise.all(justificationElements.map(async (element) => {
      // TODO: Add error handling for LLM calls
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      
      let adjustedStrength = strength;
      // Modulate strength by trust for relevant types
      if (element.type === 'testimony' || element.type === 'external') {
         // TODO: Add error handling for LLM call
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    // Calculate weighted average, default to 0.5 if totalSaliency is 0
    const initialConfidence = totalSaliency > 0 
      ? totalWeightedStrength / totalSaliency 
      : 0.5; 

    // Apply max initial confidence limit
    // Security frame might apply a stricter limit or additional factors here if needed
    return clampConfidence(
      Math.min(initialConfidence, this.parameters.maxInitialConfidence) 
    );
  }

  async updateConfidence( // Changed to async
    proposition: string, 
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[],
    geminiClient: GeminiClient // Added geminiClient parameter
  ): Promise<number> { // Changed return type to Promise<number>
    // Implement Frame-Weighted Update (Eq. 1 from paper Section 5.4)
    // conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e, P)
    // Applied sequentially for each new element.

    let updatedConfidence = currentConfidence;

    // Security frame might have different placeholder strengths/weights.
    for (const element of newElements) {
      // --- Get Evidence Strength C(e, P) using LLM ---
      const evidenceStrength = await geminiClient.judgeEvidenceStrength(element, proposition);

      // --- Get Frame Weight w_F(e) using LLM ---
      const frameWeight = await geminiClient.judgeEvidenceSaliency(element, this); // Use LLM for saliency

      // --- Apply Update Model ---
      if (element.type === 'testimony' || element.type === 'external') {
        // Apply Justification-Source Model (Eq. 2)
        const trustScore = await geminiClient.judgeSourceTrust(element.source, this);
        const alpha = this.parameters.sourceTrustWeight;
        updatedConfidence = (1 - alpha) * updatedConfidence + alpha * trustScore;
      } else {
         // Apply Frame-Weighted Model (Eq. 1)
        updatedConfidence = (1 - frameWeight) * updatedConfidence + frameWeight * evidenceStrength;
      }
    }
    
    return clampConfidence(updatedConfidence);
  }
  
  /**
   * Helper method to detect if a justification element contradicts a proposition.
   * Basic implementation - assumes specific content structures.
   * TODO: Consider moving this to the base Frame class for reuse.
   */
  private _detectContradiction(element: JustificationElement, proposition: string): boolean {
    const negatedProposition = negateProp(proposition);

    if (element instanceof InferenceJustificationElement) {
      return element.content === negatedProposition;
    } 
    
    if (element instanceof TestimonyJustificationElement) {
      return typeof element.content === 'string' && element.content === negatedProposition;
    }

    if (element instanceof ExternalJustificationElement) {
      return typeof element.content === 'string' && element.content === negatedProposition;
    }
    
    return false; 
  }

  async recomputeConfidence( 
    proposition: string, // Added proposition
    justification: Justification, 
    // currentConfidence: number, // Removed unused parameter
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Re-evaluate confidence based *only* on the justification from the *current* frame's perspective.
     const justificationElements = justification.elements;
     if (justificationElements.length === 0) { return 0.5; }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    await Promise.all(justificationElements.map(async (element) => {
      // Use the passed-in proposition
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition); 
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this);
      let adjustedStrength = strength;
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const recomputedConfidence = totalSaliency > 0 ? totalWeightedStrength / totalSaliency : 0.5; 
    return clampConfidence(recomputedConfidence);
  }

  async evaluateExternalJustification( 
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame,
    geminiClient: GeminiClient 
  ): Promise<number> { 
    // Evaluate the external justification using this frame's perspective and LLM calls,
    // then modulate by frame compatibility.
     const justificationElements = externalJustification.elements;
     if (justificationElements.length === 0) { return 0.5; }

    let totalWeightedStrength = 0;
    let totalSaliency = 0;

    await Promise.all(justificationElements.map(async (element) => {
      const strength = await geminiClient.judgeEvidenceStrength(element, proposition);
      const saliency = await geminiClient.judgeEvidenceSaliency(element, this); 
      let adjustedStrength = strength;
      if (element.type === 'testimony' || element.type === 'external') {
        const trust = await geminiClient.judgeSourceTrust(element.source, this);
        adjustedStrength = strength * trust; 
      }
      totalWeightedStrength += adjustedStrength * saliency;
      totalSaliency += saliency;
    }));

    const calculatedConfidence = totalSaliency > 0 ? totalWeightedStrength / totalSaliency : 0.5; 
    const compatibility = this.getCompatibility(sourceFrame);
    const finalConfidence = calculatedConfidence * compatibility; 

    return clampConfidence(finalConfidence);
  }

  withParameters(newParameters: Partial<FrameParameters>): Frame {
    return new SecurityFrame(this.id, {
      ...this.parameters,
      ...newParameters
    });
  }

  getCompatibility(otherFrame: Frame): number {
    if (otherFrame instanceof SecurityFrame) {
      return 0.9; // High compatibility with same frame type
    } else if (otherFrame instanceof ThoroughnessFrame) {
      return 0.7; // High compatibility with thoroughness frame
    } else if (otherFrame instanceof EfficiencyFrame) {
      return 0.5; // Moderate compatibility with efficiency frame
    } else {
      return 0.4; // Default compatibility
    }
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
   * @param parameters Optional custom parameters
   * @returns The created frame
   */
  static createFrame(frameName: string, parameters: Partial<FrameParameters> = {}): Frame {
    switch (frameName.toLowerCase()) {
      case 'efficiency':
        return new EfficiencyFrame(undefined, parameters);
      case 'thoroughness':
        return new ThoroughnessFrame(undefined, parameters);
      case 'security':
        return new SecurityFrame(undefined, parameters);
      default:
        throw new Error(`Unknown frame type: ${frameName}`);
    }
  }
  
  /**
   * Get a list of available frame types
   * 
   * @returns Array of available frame type names
   */
  static getAvailableFrameTypes(): string[] {
    return ['efficiency', 'thoroughness', 'security'];
  }
}
