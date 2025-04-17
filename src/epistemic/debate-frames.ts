import { Frame, BaseFrame, FrameParameters } from './frame';
import { clampConfidence } from '../types/common';
import type { Proposition, Justification, JustificationElement, Evidence } from '../types/common';

/**
 * A frame for a debate moderator prioritizing fairness and neutrality
 */
export class ModeratorFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Moderator',
      'Prioritizes fairness, balance, and maintains neutral perspective',
      {
        weightFairness: 0.9,
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
    
    // Moderator weights evidence based on fairness and balance
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Fairness weighting - moderators give balanced weight to all evidence types
      // They slightly favor balanced/fair evidence
      const weight = element.type === 'balanced' 
        ? (this.parameters.weightFairness as number || 0.9) 
        : 0.7;
      
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    // Moderators are somewhat compatible with all frames
    if (other instanceof ModeratorFrame) return 0.95;
    if (other instanceof ProDebateFrame) return 0.6;
    if (other instanceof ConDebateFrame) return 0.6;
    if (other instanceof JudgeFrame) return 0.8;
    return 0.7; // Generally fair compatibility with unknown frames
  }
}

/**
 * A frame for a debater arguing in favor of propositions
 */
export class ProDebateFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Pro Debater',
      'Prioritizes supporting evidence and persuasive arguments',
      {
        weightSupportive: 0.85,
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
    
    // Pro-debaters weight supportive evidence much higher
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Pro debaters strongly favor supporting evidence
      const weight = (element.type === 'supporting' || element.type === 'favorable') 
        ? (this.parameters.weightSupportive as number || 0.85) 
        : 0.4;
      
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    // Pro debaters have a bias toward high confidence in their arguments
    updated = Math.min(1.0, updated * 1.1);
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof ProDebateFrame) return 0.95;
    if (other instanceof ConDebateFrame) return 0.3; // Low compatibility with opponents
    if (other instanceof ModeratorFrame) return 0.6;
    if (other instanceof JudgeFrame) return 0.5;
    return 0.4; // Lower compatibility with unknown frames
  }
}

/**
 * A frame for a debater arguing against propositions
 */
export class ConDebateFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Con Debater',
      'Prioritizes opposing evidence and critical analysis',
      {
        weightCritical: 0.85,
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
    
    // Con-debaters weight critical/opposing evidence much higher
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Con debaters strongly favor opposing evidence
      const weight = (element.type === 'opposing' || element.type === 'critical') 
        ? (this.parameters.weightCritical as number || 0.85) 
        : 0.4;
      
      // For con debaters, we interpret high evidence strength as supporting their critical position
      // So actually invert the confidence for the proposition itself
      const effectiveStrength = 1.0 - evidenceStrength;
      
      updated = (1 - weight) * updated + weight * effectiveStrength;
    }
    
    // Con debaters have a bias toward low confidence in the proposition (high confidence in opposing it)
    updated = Math.max(0.0, updated * 0.9);
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof ConDebateFrame) return 0.95;
    if (other instanceof ProDebateFrame) return 0.3; // Low compatibility with opponents
    if (other instanceof ModeratorFrame) return 0.6;
    if (other instanceof JudgeFrame) return 0.5;
    return 0.4; // Lower compatibility with unknown frames
  }
}

/**
 * A frame for a debate judge who evaluates arguments fairly but critically
 */
export class JudgeFrame extends BaseFrame {
  constructor(id?: string, parameters: FrameParameters = {}) {
    super(
      id,
      'Judge',
      'Prioritizes logical analysis, evidence quality, and argumentative structure',
      {
        weightEvidence: 0.6,
        weightLogic: 0.7,
        weightStructure: 0.5,
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
    
    // Judges weight evidence based on quality and relevance, not position
    for (const element of newElements) {
      let evidenceStrength = 0.5; // Default
      if ('getConfidence' in element) {
        evidenceStrength = (element as unknown as Evidence).getConfidence(proposition);
      }
      
      // Judge weights different aspects of argumentation
      let weight = 0.5; // Default medium weight
      
      if (element.type === 'evidence') {
        weight = this.parameters.weightEvidence as number || 0.6;
      } else if (element.type === 'logic') {
        weight = this.parameters.weightLogic as number || 0.7;
      } else if (element.type === 'structure') {
        weight = this.parameters.weightStructure as number || 0.5;
      }
      
      updated = (1 - weight) * updated + weight * evidenceStrength;
    }
    
    return clampConfidence(updated);
  }

  getCompatibility(other: Frame): number {
    if (other instanceof JudgeFrame) return 0.95;
    if (other instanceof ModeratorFrame) return 0.8;
    if (other instanceof ProDebateFrame) return 0.5;
    if (other instanceof ConDebateFrame) return 0.5;
    return 0.6; // Moderate compatibility with unknown frames
  }
}
