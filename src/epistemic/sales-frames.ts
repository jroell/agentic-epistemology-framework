import { Frame, BaseFrame, FrameParameters } from './frame';
import { clampConfidence } from '../types/common';
import type { Proposition, Justification, JustificationElement, Evidence } from '../types/common';

/**
 * A frame for a persuasive sales agent prioritizing influence and outcome maximization
 */
export class PersuasiveFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Persuasion Architect',
      'An elite negotiator and influence strategist focused on outcome maximization while preserving reputational capital and ethical integrity',
      {
        weightPersuasive: 0.85,
        weightValueCreation: 0.75,
        weightReciprocity: 0.6,
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
    
    // Persuasive frame weights evidence based on persuasiveness and value-creation potential
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Apply different weights based on evidence type
      let weight = 0.5; // Default weight
      
      if (element.type === 'persuasive' || element.type === 'influential') {
        weight = this.parameters.weightPersuasive as number || 0.85;
      } else if (element.type === 'value_creation' || element.type === 'mutual_benefit') {
        weight = this.parameters.weightValueCreation as number || 0.75;
      } else if (element.type === 'reciprocity' || element.type === 'social_proof') {
        weight = this.parameters.weightReciprocity as number || 0.6;
      }
      
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    // Persuasive frames have a slight bias toward optimism in their proposals
    updated = Math.min(1.0, updated * 1.1);
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof PersuasiveFrame) return 0.95;
    if (other instanceof BuyerFrame) return 0.7; // Good compatibility with buyer frame
    return 0.6; // Moderate compatibility with unknown frames
  }
}

/**
 * A frame for a potential buyer/client with mixed rational and emotional motives
 */
export class BuyerFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Realistic Buyer',
      'A nuanced, sometimes contradictory stakeholder with both rational and emotional decision factors',
      {
        weightRoi: 0.8,
        weightRisk: 0.85,
        weightSocialProof: 0.7,
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
    
    // Buyer weighs evidence based on ROI, risk, and social proof
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Apply different weights based on evidence type
      let weight = 0.5; // Default weight
      
      if (element.type === 'roi' || element.type === 'value') {
        weight = this.parameters.weightRoi as number || 0.8;
      } else if (element.type === 'risk' || element.type === 'security') {
        weight = this.parameters.weightRisk as number || 0.85;
        // For risk evidence, higher evidence strength means lower confidence
        evidenceStrength = 1.0 - evidenceStrength;
      } else if (element.type === 'social_proof' || element.type === 'reputation') {
        weight = this.parameters.weightSocialProof as number || 0.7;
      }
      
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    // Buyers have a slight bias toward skepticism in sales situations
    updated = Math.max(0.0, updated * 0.9);
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof BuyerFrame) return 0.95;
    if (other instanceof PersuasiveFrame) return 0.6; // Moderate compatibility with persuasive frame
    return 0.5; // Moderate compatibility with unknown frames
  }
}
