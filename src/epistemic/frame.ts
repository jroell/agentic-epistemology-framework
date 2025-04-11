import { EntityId, generateId, clampConfidence } from '../types/common';
import { Perception } from '../core/perception';
import { Goal } from '../action/goal';
import { Justification, JustificationElement } from './justification';

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
   * @returns The interpreted perception (may be modified)
   */
  abstract interpretPerception(perception: Perception): Perception;

  /**
   * Get propositions relevant to a perception or goal in this frame
   * 
   * @param source Perception or goal to extract propositions from
   * @returns Array of relevant propositions
   */
  abstract getRelevantPropositions(source: Perception | Goal): string[];

  /**
   * Compute initial confidence for a new belief based on justification
   * 
   * @param proposition Proposition being considered
   * @param justificationElements Justification elements supporting the belief
   * @returns Initial confidence level
   */
  abstract computeInitialConfidence(
    proposition: string, 
    justificationElements: JustificationElement[]
  ): number;

  /**
   * Update confidence based on existing belief and new evidence
   * 
   * @param currentConfidence Current confidence level
   * @param currentJustification Current justification
   * @param newElements New justification elements
   * @returns Updated confidence level
   */
  abstract updateConfidence(
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[]
  ): number;

  /**
   * Recompute confidence for a belief when the frame changes
   * 
   * @param justification Justification supporting the belief
   * @param currentConfidence Current confidence level
   * @returns Recomputed confidence level
   */
  abstract recomputeConfidence(
    justification: Justification,
    currentConfidence: number
  ): number;

  /**
   * Evaluate justification from an external source considering frame differences
   * 
   * @param proposition Proposition being justified
   * @param externalJustification Justification from external source
   * @param sourceFrame Frame of the source agent
   * @returns Confidence level based on external justification
   */
  abstract evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): number;
  
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
  frameCompatibilityWeight: 0.5
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

  interpretPerception(perception: Perception): Perception {
    // In a real implementation, this would filter or prioritize aspects
    // of the perception based on efficiency concerns
    return perception;
  }

  getRelevantPropositions(source: Perception | Goal): string[] {
    // In a real implementation, this would extract propositions
    // related to efficiency metrics
    
    // Simplified implementation
    if (source instanceof Goal) {
      return source.getRelevantPropositions().filter(prop => 
        prop.toLowerCase().includes('speed') ||
        prop.toLowerCase().includes('fast') ||
        prop.toLowerCase().includes('efficient') ||
        prop.toLowerCase().includes('cost') ||
        prop.toLowerCase().includes('resource')
      );
    } else {
      // For perceptions, extract propositions from data
      const propositions: string[] = [];
      const data = JSON.stringify(source.data).toLowerCase();
      
      // Extract potential propositions - this is greatly simplified
      if (data.includes('time') || data.includes('duration')) {
        propositions.push('ProcessingTimeIsOptimal');
      }
      if (data.includes('resource') || data.includes('memory')) {
        propositions.push('ResourceUsageIsOptimal');
      }
      if (data.includes('cost') || data.includes('expense')) {
        propositions.push('CostIsMinimized');
      }
      
      return propositions;
    }
  }

  computeInitialConfidence(proposition: string, justificationElements: JustificationElement[]): number {
    // Higher initial confidence for efficiency-related propositions
    const isEfficiencyProposition = 
      proposition.toLowerCase().includes('fast') ||
      proposition.toLowerCase().includes('speed') ||
      proposition.toLowerCase().includes('efficient') ||
      proposition.toLowerCase().includes('cost') ||
      proposition.toLowerCase().includes('resource');
    
    let baseConfidence = isEfficiencyProposition ? 0.7 : 0.5;
    
    // Adjust based on justification source types
    const toolResults = justificationElements.filter(el => el.type === 'tool_result').length;
    const observations = justificationElements.filter(el => el.type === 'observation').length;
    const testimonies = justificationElements.filter(el => el.type === 'testimony').length;
    
    // Tool results and direct observations get higher weight in efficiency frame
    const adjustedConfidence = baseConfidence + 
      (toolResults * this.parameters.toolResultWeight * 0.05) + 
      (observations * this.parameters.observationWeight * 0.04) - 
      (testimonies * (1 - this.parameters.testimonyWeight) * 0.03);
    
    return clampConfidence(
      Math.min(adjustedConfidence, this.parameters.maxInitialConfidence)
    );
  }

  updateConfidence(
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[]
  ): number {
    // In efficiency frame, tool results and observations impact confidence more
    let confidenceChange = 0;
    
    for (const element of newElements) {
      switch (element.type) {
        case 'tool_result':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.toolResultWeight;
          break;
        case 'observation':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.observationWeight;
          break;
        case 'testimony':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.testimonyWeight;
          break;
        case 'inference':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.inferenceWeight;
          break;
        case 'external':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.externalJustificationWeight;
          break;
      }
    }
    
    // Adjust for sample size
    const totalElements = currentJustification.elements.length + newElements.length;
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    confidenceChange *= sampleSizeFactor;
    
    return clampConfidence(currentConfidence + confidenceChange);
  }

  recomputeConfidence(justification: Justification, currentConfidence: number): number {
    // When switching to this frame, recompute confidence based on justification types
    const toolResults = justification.getElementsByType('tool_result').length;
    const observations = justification.getElementsByType('observation').length;
    const testimonies = justification.getElementsByType('testimony').length;
    const inferences = justification.getElementsByType('inference').length;
    const externals = justification.getElementsByType('external').length;
    
    // Base confidence on current confidence
    let baseConfidence = currentConfidence;
    
    // Adjust based on this frame's parameters
    const totalWeight = 
      (toolResults * this.parameters.toolResultWeight) +
      (observations * this.parameters.observationWeight) +
      (testimonies * this.parameters.testimonyWeight) +
      (inferences * this.parameters.inferenceWeight) +
      (externals * this.parameters.externalJustificationWeight);
    
    const totalElements = toolResults + observations + testimonies + inferences + externals;
    
    if (totalElements > 0) {
      const weightedConfidence = totalWeight / totalElements;
      
      // Blend current confidence with weighted confidence
      baseConfidence = (baseConfidence + weightedConfidence) / 2;
    }
    
    // Adjust for sample size
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    return clampConfidence(baseConfidence * (0.7 + 0.3 * sampleSizeFactor));
  }

  evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): number {
    // Evaluate external justification based on this frame's values
    
    // Check if the proposition is aligned with efficiency concerns
    const isEfficiencyProposition = 
      proposition.toLowerCase().includes('fast') ||
      proposition.toLowerCase().includes('speed') ||
      proposition.toLowerCase().includes('efficient') ||
      proposition.toLowerCase().includes('cost') ||
      proposition.toLowerCase().includes('resource');
    
    // Base confidence on proposition alignment
    let baseConfidence = isEfficiencyProposition ? 0.6 : 0.3;
    
    // Adjust based on frame compatibility
    const compatibility = this.getCompatibility(sourceFrame);
    baseConfidence *= (0.5 + 0.5 * compatibility);
    
    // Adjust based on justification types
    const toolResults = externalJustification.getElementsByType('tool_result').length;
    const observations = externalJustification.getElementsByType('observation').length;
    
    // In efficiency frame, tool results and observations are valued more
    baseConfidence += 
      (toolResults * this.parameters.toolResultWeight * 0.05) +
      (observations * this.parameters.observationWeight * 0.05);
    
    return clampConfidence(baseConfidence);
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

  interpretPerception(perception: Perception): Perception {
    // In a real implementation, this would prioritize detailed aspects
    // of the perception and seek more complete information
    return perception;
  }

  getRelevantPropositions(source: Perception | Goal): string[] {
    // Extract propositions related to thoroughness and completeness
    
    if (source instanceof Goal) {
      return source.getRelevantPropositions().filter(prop => 
        prop.toLowerCase().includes('thorough') ||
        prop.toLowerCase().includes('complete') ||
        prop.toLowerCase().includes('comprehensive') ||
        prop.toLowerCase().includes('detail') ||
        prop.toLowerCase().includes('accuracy')
      );
    } else {
      // For perceptions, extract propositions from data
      const propositions: string[] = [];
      const data = JSON.stringify(source.data).toLowerCase();
      
      if (data.includes('detail') || data.includes('thorough')) {
        propositions.push('AnalysisIsThorough');
      }
      if (data.includes('complet') || data.includes('comprehen')) {
        propositions.push('InformationIsComplete');
      }
      if (data.includes('accura') || data.includes('correct')) {
        propositions.push('DataIsAccurate');
      }
      
      return propositions;
    }
  }

  computeInitialConfidence(proposition: string, justificationElements: JustificationElement[]): number {
    // Lower initial confidence overall - thoroughness frame is cautious
    const isThoroughnessProposition = 
      proposition.toLowerCase().includes('thorough') ||
      proposition.toLowerCase().includes('complete') ||
      proposition.toLowerCase().includes('comprehensive') ||
      proposition.toLowerCase().includes('detail') ||
      proposition.toLowerCase().includes('accuracy');
    
    let baseConfidence = isThoroughnessProposition ? 0.6 : 0.4;
    
    // Adjust based on justification source types and quantity
    const toolResults = justificationElements.filter(el => el.type === 'tool_result').length;
    const observations = justificationElements.filter(el => el.type === 'observation').length;
    const testimonies = justificationElements.filter(el => el.type === 'testimony').length;
    const inferences = justificationElements.filter(el => el.type === 'inference').length;
    
    // Thoroughness frame values multiple sources and types of evidence
    const justificationDiversity = new Set(justificationElements.map(el => el.type)).size / 5;
    const totalElements = justificationElements.length;
    
    // Sample size factor - thoroughness frame requires more evidence
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    // Diversity bonus - thoroughness frame values diverse evidence
    const diversityBonus = justificationDiversity * 0.2;
    
    baseConfidence += 
      (sampleSizeFactor * 0.2) + 
      diversityBonus + 
      (observations * this.parameters.observationWeight * 0.02) + 
      (inferences * this.parameters.inferenceWeight * 0.02);
    
    return clampConfidence(
      Math.min(baseConfidence, this.parameters.maxInitialConfidence)
    );
  }

  updateConfidence(
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[]
  ): number {
    // Thoroughness frame values diverse evidence and requires more of it
    let confidenceChange = 0;
    
    // Calculate evidence diversity before and after
    const oldTypes = new Set(currentJustification.elements.map(el => el.type));
    const newTypes = new Set(newElements.map(el => el.type));
    const allTypes = new Set([...oldTypes, ...newTypes]);
    
    // Diversity bonus - thoroughness frame values diverse evidence types
    const diversityIncrease = (allTypes.size - oldTypes.size) * 0.05;
    confidenceChange += diversityIncrease;
    
    // Add confidence based on element types
    for (const element of newElements) {
      switch (element.type) {
        case 'tool_result':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.toolResultWeight;
          break;
        case 'observation':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.observationWeight;
          break;
        case 'testimony':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.testimonyWeight;
          break;
        case 'inference':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.inferenceWeight;
          break;
        case 'external':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.externalJustificationWeight;
          break;
      }
    }
    
    // Sample size factor - thoroughness frame requires more evidence
    const totalElements = currentJustification.elements.length + newElements.length;
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    confidenceChange *= sampleSizeFactor;
    
    return clampConfidence(currentConfidence + confidenceChange);
  }

  recomputeConfidence(justification: Justification, currentConfidence: number): number {
    // When switching to this frame, recompute confidence based on thoroughness criteria
    const elements = justification.elements;
    const totalElements = elements.length;
    
    // Diversity of justification types
    const uniqueTypes = new Set(elements.map(el => el.type)).size;
    const diversityFactor = uniqueTypes / 5; // Normalize by maximum possible types
    
    // Source diversity - thoroughness frame values diverse sources
    const uniqueSources = new Set(elements.map(el => el.source)).size;
    const sourceDiversityFactor = Math.min(uniqueSources / 3, 1); // Cap at 3 unique sources
    
    // Sample size factor - thoroughness frame requires more evidence
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    // Blend current confidence with thoroughness criteria
    const thoroughnessScore = 
      (diversityFactor * 0.3) + 
      (sourceDiversityFactor * 0.3) + 
      (sampleSizeFactor * 0.4);
    
    const blendedConfidence = (currentConfidence + thoroughnessScore) / 2;
    
    return clampConfidence(blendedConfidence);
  }

  evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): number {
    // Thoroughness frame values comprehensive justifications
    
    // Check if the proposition is aligned with thoroughness concerns
    const isThoroughnessProposition = 
      proposition.toLowerCase().includes('thorough') ||
      proposition.toLowerCase().includes('complete') ||
      proposition.toLowerCase().includes('comprehensive') ||
      proposition.toLowerCase().includes('detail') ||
      proposition.toLowerCase().includes('accuracy');
    
    // Base confidence on proposition alignment
    let baseConfidence = isThoroughnessProposition ? 0.6 : 0.4;
    
    // Adjust based on frame compatibility
    const compatibility = this.getCompatibility(sourceFrame);
    baseConfidence *= (0.5 + 0.5 * compatibility);
    
    // Thoroughness frame values diverse, comprehensive justifications
    const elements = externalJustification.elements;
    const totalElements = elements.length;
    
    // Diversity of justification types
    const uniqueTypes = new Set(elements.map(el => el.type)).size;
    const diversityFactor = uniqueTypes / 5; // Normalize by maximum possible types
    
    // Sample size factor - thoroughness frame values more evidence
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    baseConfidence += 
      (diversityFactor * 0.15) + 
      (sampleSizeFactor * 0.15);
    
    return clampConfidence(baseConfidence);
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

  interpretPerception(perception: Perception): Perception {
    // In a real implementation, this would prioritize security-related aspects
    // of the perception and highlight potential risks
    return perception;
  }

  getRelevantPropositions(source: Perception | Goal): string[] {
    // Extract propositions related to security and risk
    
    if (source instanceof Goal) {
      return source.getRelevantPropositions().filter(prop => 
        prop.toLowerCase().includes('secur') ||
        prop.toLowerCase().includes('safe') ||
        prop.toLowerCase().includes('risk') ||
        prop.toLowerCase().includes('threat') ||
        prop.toLowerCase().includes('protect') ||
        prop.toLowerCase().includes('vulnerab')
      );
    } else {
      // For perceptions, extract propositions from data
      const propositions: string[] = [];
      const data = JSON.stringify(source.data).toLowerCase();
      
      if (data.includes('secur') || data.includes('safe')) {
        propositions.push('SystemIsSecure');
      }
      if (data.includes('risk') || data.includes('threat')) {
        propositions.push('RisksAreMinimized');
      }
      if (data.includes('vulnerab') || data.includes('exploit')) {
        propositions.push('VulnerabilitiesAreAddressed');
      }
      if (data.includes('protect') || data.includes('defense')) {
        propositions.push('ProtectionsAreEffective');
      }
      
      return propositions;
    }
  }

  computeInitialConfidence(proposition: string, justificationElements: JustificationElement[]): number {
    // Security frame is cautious and starts with lower confidence
    const isSecurityProposition = 
      proposition.toLowerCase().includes('secur') ||
      proposition.toLowerCase().includes('safe') ||
      proposition.toLowerCase().includes('risk') ||
      proposition.toLowerCase().includes('threat') ||
      proposition.toLowerCase().includes('protect');
    
    // For security propositions, start with higher base confidence
    // For positive security claims, start lower (cautious)
    // For negative security claims (risks exist), start higher
    let baseConfidence = 0.3;
    
    if (isSecurityProposition) {
      if (proposition.toLowerCase().includes('is secure') || 
          proposition.toLowerCase().includes('is safe')) {
        baseConfidence = 0.3; // Low initial confidence in security claims
      } else if (proposition.toLowerCase().includes('risk') ||
                proposition.toLowerCase().includes('threat') ||
                proposition.toLowerCase().includes('vulnerab')) {
        baseConfidence = 0.5; // Higher initial confidence in risk claims
      }
    }
    
    // Security frame values observations highly
    const observations = justificationElements.filter(el => el.type === 'observation').length;
    const toolResults = justificationElements.filter(el => el.type === 'tool_result').length;
    
    // Security frame is skeptical of testimony
    const testimonies = justificationElements.filter(el => el.type === 'testimony').length;
    
    baseConfidence += 
      (observations * this.parameters.observationWeight * 0.05) +
      (toolResults * this.parameters.toolResultWeight * 0.04) -
      (testimonies * (1 - this.parameters.testimonyWeight) * 0.02);
    
    return clampConfidence(
      Math.min(baseConfidence, this.parameters.maxInitialConfidence)
    );
  }

  updateConfidence(
    currentConfidence: number, 
    currentJustification: Justification,
    newElements: JustificationElement[]
  ): number {
    // Security frame is cautious about increasing confidence
    // but quick to decrease it for potential risks
    let confidenceChange = 0;
    
    // Check for negative evidence that might reduce confidence
    const hasNegativeEvidence = newElements.some(element => {
      if (typeof element.content === 'string') {
        return element.content.toLowerCase().includes('risk') ||
               element.content.toLowerCase().includes('threat') ||
               element.content.toLowerCase().includes('vulnerab') ||
               element.content.toLowerCase().includes('fail');
      }
      return false;
    });
    
    // If negative evidence exists, decrease confidence more rapidly
    if (hasNegativeEvidence) {
      confidenceChange -= this.parameters.confidenceDecreaseRate * 1.5;
    }
    
    // Add confidence based on element types
    for (const element of newElements) {
      // Security frame values observations and tool results more
      switch (element.type) {
        case 'tool_result':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.toolResultWeight;
          break;
        case 'observation':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.observationWeight;
          break;
        case 'testimony':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.testimonyWeight;
          break;
        case 'inference':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.inferenceWeight;
          break;
        case 'external':
          confidenceChange += this.parameters.confidenceIncreaseRate * this.parameters.externalJustificationWeight;
          break;
      }
    }
    
    // Security frame requires more evidence before high confidence
    const totalElements = currentJustification.elements.length + newElements.length;
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    confidenceChange *= sampleSizeFactor;
    
    return clampConfidence(currentConfidence + confidenceChange);
  }

  recomputeConfidence(justification: Justification, currentConfidence: number): number {
    // When switching to security frame, recompute with a security focus
    
    // Security frame is generally more cautious
    let securityAdjustedConfidence = currentConfidence * 0.8;
    
    // Check for security-related risks in justification
    const hasSecurityRisks = justification.elements.some(element => {
      if (typeof element.content === 'string') {
        return element.content.toLowerCase().includes('risk') ||
               element.content.toLowerCase().includes('threat') ||
               element.content.toLowerCase().includes('vulnerab') ||
               element.content.toLowerCase().includes('fail');
      }
      return false;
    });
    
    // If security risks are found, reduce confidence further
    if (hasSecurityRisks) {
      securityAdjustedConfidence *= 0.7;
    }
    
    // Security frame values comprehensive testing
    const observations = justification.getElementsByType('observation').length;
    const toolResults = justification.getElementsByType('tool_result').length;
    
    // Sample size factor - security frame requires more evidence
    const totalElements = justification.elements.length;
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    // Add confidence for observations and tool results
    securityAdjustedConfidence += 
      (observations * this.parameters.observationWeight * 0.02) +
      (toolResults * this.parameters.toolResultWeight * 0.02) +
      (sampleSizeFactor * 0.1);
    
    return clampConfidence(securityAdjustedConfidence);
  }

  evaluateExternalJustification(
    proposition: string,
    externalJustification: Justification,
    sourceFrame: Frame
  ): number {
    // Security frame is cautious about external justifications
    
    // Check if the proposition is security-related
    const isSecurityProposition = 
      proposition.toLowerCase().includes('secur') ||
      proposition.toLowerCase().includes('safe') ||
      proposition.toLowerCase().includes('risk') ||
      proposition.toLowerCase().includes('threat') ||
      proposition.toLowerCase().includes('protect');
    
    // Base confidence is low for security frame evaluating external claims
    let baseConfidence = 0.3;
    
    // Adjust based on frame compatibility (trust security-focused frames more)
    const compatibility = this.getCompatibility(sourceFrame);
    baseConfidence *= (0.5 + 0.5 * compatibility);
    
    // Positive security claims start with lower confidence
    if (isSecurityProposition && 
        (proposition.toLowerCase().includes('is secure') || 
         proposition.toLowerCase().includes('is safe'))) {
      baseConfidence *= 0.8;
    }
    
    // Check for evidence quality
    const observations = externalJustification.getElementsByType('observation').length;
    const toolResults = externalJustification.getElementsByType('tool_result').length;
    
    // Security frame values detailed observations and tool results
    baseConfidence += 
      (observations * this.parameters.observationWeight * 0.03) +
      (toolResults * this.parameters.toolResultWeight * 0.03);
    
    // Sample size factor - security frame requires more evidence
    const totalElements = externalJustification.elements.length;
    const sampleSizeFactor = Math.min(
      totalElements / this.parameters.minSampleSizeForHighConfidence, 
      1
    );
    
    baseConfidence *= (0.7 + 0.3 * sampleSizeFactor);
    
    return clampConfidence(baseConfidence);
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
