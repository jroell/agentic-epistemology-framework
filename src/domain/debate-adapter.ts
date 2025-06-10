/**
 * Debate Domain Adapter
 * 
 * This adapter encapsulates all debate-specific logic that was previously
 * hardcoded in the LLM client. It implements the DomainAdapter interface
 * to provide debate-specific proposition extraction, relevance scoring,
 * and context extraction.
 */

import { 
  BaseDomainAdapter, 
  DomainOperation, 
  DomainOperationParams, 
  DomainOperationResult 
} from './domain-adapter';

/**
 * Debate-specific domain adapter
 */
export class DebateAdapter extends BaseDomainAdapter {
  constructor() {
    super('debate', 'Formal Debate Domain', '1.0.0');
  }
  
  canHandle(operation: DomainOperation): boolean {
    // Debate adapter can handle all standard operations
    return [
      DomainOperation.EXTRACT_PROPOSITIONS,
      DomainOperation.SCORE_RELEVANCE,
      DomainOperation.EXTRACT_CONTEXT,
      DomainOperation.JUDGE_EVIDENCE_STRENGTH,
      DomainOperation.JUDGE_EVIDENCE_SALIENCY
    ].includes(operation);
  }
  
  async execute<T = unknown>(
    operation: DomainOperation, 
    params: DomainOperationParams
  ): Promise<DomainOperationResult<T>> {
    if (!this.validateParams(operation, params)) {
      return { success: false, data: undefined as T, error: 'Invalid parameters for debate domain' };
    }
    
    // Debate adapter delegates to LLM but provides domain-specific prompts
    // The actual LLM call would be made by the client using our prompts
    return { 
      success: true, 
      data: undefined as T, // LLM client will populate this
      metadata: this.getLoggingContext(operation, params)
    };
  }
  
  buildPrompt(operation: DomainOperation, params: DomainOperationParams): string {
    switch (operation) {
      case DomainOperation.EXTRACT_PROPOSITIONS:
        return this.buildFactualPropositionPrompt(params);
      case DomainOperation.SCORE_RELEVANCE:
        return this.buildRelevanceScorePrompt(params);
      case DomainOperation.EXTRACT_CONTEXT:
        return this.buildDebateContextExtractionPrompt(params);
      case DomainOperation.JUDGE_EVIDENCE_STRENGTH:
        return this.buildEvidenceStrengthPrompt(params);
      case DomainOperation.JUDGE_EVIDENCE_SALIENCY:
        return this.buildEvidenceSaliencyPrompt(params);
      default:
        throw new Error(`Unsupported operation for debate domain: ${operation}`);
    }
  }
  
  /**
   * Debate-specific parameter validation
   */
  validateParams(operation: DomainOperation, params: DomainOperationParams): boolean {
    // Call base validation first
    if (!super.validateParams(operation, params)) {
      return false;
    }
    
    // Add debate-specific validations
    switch (operation) {
      case DomainOperation.SCORE_RELEVANCE:
        // For debates, we need a clear context to score against
        return !!(params.proposition && params.context && params.context.length > 10);
      default:
        return true;
    }
  }
  
  /**
   * Enhanced logging context for debate domain
   */
  getLoggingContext(operation: DomainOperation, params: DomainOperationParams): Record<string, unknown> {
    const baseContext = super.getLoggingContext(operation, params);
    
    return {
      ...baseContext,
      debateSpecific: true,
      isFactualContent: this.detectFactualContent(params.content),
      isTacticalContent: this.detectTacticalContent(params.content),
      propositionLength: params.proposition?.length || 0,
      contextLength: params.context?.length || 0
    };
  }
  
  /**
   * Build prompt for extracting factual propositions (debate-specific)
   */
  private buildFactualPropositionPrompt(params: DomainOperationParams): string {
    const contentStr = typeof params.content === 'string' 
      ? params.content 
      : JSON.stringify(params.content);
    
    let prompt = `You are analyzing debate content to extract ONLY factual propositions and claims, excluding tactical thoughts, meta-commentary, and internal reasoning.\n\n`;
    
    if (params.context) {
      prompt += `**Debate Context/Topic:** ${params.context}\n\n`;
    }
    
    prompt += `**Content to Analyze:**\n"${contentStr}"\n\n`;
    prompt += `**Instructions:**\n`;
    prompt += `Extract ONLY factual propositions - statements that make claims about the world, events, or relationships that could be true or false.\n\n`;
    prompt += `DO NOT include:\n`;
    prompt += `- Tactical thoughts (e.g., "This argument will be effective")\n`;
    prompt += `- Meta-commentary (e.g., "Bostrom's name drop is predictable")\n`;
    prompt += `- Internal reasoning (e.g., "I should emphasize...")\n`;
    prompt += `- Questions, emotional expressions, or procedural statements\n`;
    prompt += `- Debate strategy or rhetorical observations\n\n`;
    prompt += `DO include:\n`;
    prompt += `- Factual claims about events, entities, relationships\n`;
    prompt += `- Statements about causes, effects, or properties\n`;
    prompt += `- Assertions that can be empirically verified or falsified\n`;
    prompt += `- Claims about what is true or false in the world\n\n`;
    prompt += `**Format:** Return each factual proposition on a separate line.\n`;
    prompt += `If no factual propositions exist, return nothing.\n`;
    prompt += `Do not add numbering, bullet points, or explanations.`;

    return prompt;
  }
  
  /**
   * Build prompt for scoring proposition relevance to debate topic
   */
  private buildRelevanceScorePrompt(params: DomainOperationParams): string {
    let prompt = `Evaluate how relevant the following proposition is to the given debate context.\n\n`;
    prompt += `**Debate Context/Topic:** "${params.context}"\n\n`;
    prompt += `**Proposition to Evaluate:** "${params.proposition}"\n\n`;
    prompt += `**Instructions:**\n`;
    prompt += `Rate the semantic relevance of this proposition to the debate context.\n`;
    prompt += `Consider whether the proposition directly relates to, supports, or contradicts the debate topic.\n`;
    prompt += `Focus on substantive relevance to the core debate question, not just keyword matching.\n\n`;
    prompt += `Return ONLY a single numerical score between 0.0 and 1.0:\n`;
    prompt += `- 1.0: Directly addresses the core debate question\n`;
    prompt += `- 0.8-0.9: Highly relevant, addresses key aspects of the debate\n`;
    prompt += `- 0.6-0.7: Moderately relevant, relates to important sub-issues\n`;
    prompt += `- 0.4-0.5: Somewhat relevant, tangentially connected\n`;
    prompt += `- 0.2-0.3: Low relevance, minimal connection\n`;
    prompt += `- 0.0-0.1: Completely irrelevant to the debate\n\n`;
    prompt += `Do not include any explanation, units, or other text. Just the number.`;

    return prompt;
  }
  
  /**
   * Build prompt for extracting debate topic from context
   */
  private buildDebateContextExtractionPrompt(params: DomainOperationParams): string {
    const contextStr = typeof params.content === 'string' 
      ? params.content 
      : JSON.stringify(params.content);
      
    let prompt = `You are analyzing an agent's context to extract the main debate topic or resolution being discussed.\n\n`;
    prompt += `**Agent Context:**\n"${contextStr}"\n\n`;
    prompt += `**Instructions:**\n`;
    prompt += `Extract the central debate topic, resolution, or question being discussed.\n`;
    prompt += `Look for:\n`;
    prompt += `- Formal debate resolutions (e.g., "Resolved: ...")\n`;
    prompt += `- Core questions being debated\n`;
    prompt += `- The fundamental disagreement or issue at stake\n`;
    prompt += `- What the participants are arguing for or against\n\n`;
    prompt += `Focus on the substantive topic, not procedural or meta-discussion elements.\n`;
    prompt += `Return a concise topic description (1-2 sentences maximum).\n`;
    prompt += `If no clear debate topic is identifiable, return an empty response.\n`;
    prompt += `Do not use bullet points, numbering, or extra formatting.`;

    return prompt;
  }
  
  /**
   * Build prompt for judging evidence strength in debate context
   */
  private buildEvidenceStrengthPrompt(params: DomainOperationParams): string {
    const evidenceContent = typeof params.evidence === 'string'
      ? params.evidence
      : JSON.stringify(params.evidence);

    let prompt = `Evaluate how strongly the following piece of evidence supports or contradicts the given proposition in a debate context.\n\n`;
    prompt += `**Proposition:** "${params.proposition}"\n\n`;
    prompt += `**Evidence:** ${evidenceContent}\n\n`;
    prompt += `**Instructions:**\n`;
    prompt += `Consider the evidence's:\n`;
    prompt += `- Credibility and source reliability\n`;
    prompt += `- Logical connection to the proposition\n`;
    prompt += `- Empirical strength and verifiability\n`;
    prompt += `- Relevance to the specific claim being made\n\n`;
    prompt += `Return ONLY a single numerical score between 0.0 and 1.0:\n`;
    prompt += `- 1.0: Evidence strongly supports the proposition\n`;
    prompt += `- 0.7-0.9: Evidence moderately supports the proposition\n`;
    prompt += `- 0.5-0.6: Evidence weakly supports or is neutral\n`;
    prompt += `- 0.3-0.4: Evidence weakly contradicts the proposition\n`;
    prompt += `- 0.0-0.2: Evidence strongly contradicts the proposition\n\n`;
    prompt += `Do not include any explanation, units, or other text. Just the number.`;

    return prompt;
  }
  
  /**
   * Build prompt for judging evidence saliency for debate frames
   */
  private buildEvidenceSaliencyPrompt(params: DomainOperationParams): string {
    const evidenceContent = typeof params.evidence === 'string'
      ? params.evidence
      : JSON.stringify(params.evidence);
    
    const frameName = (params.frame as any)?.name || 'Unknown Frame';
    const frameDescription = (params.frame as any)?.description || 'No description available';

    let prompt = `Given your role as **${params.agentName}** with the **${frameName}** frame (${frameDescription}), how salient (relevant, important, and central) is the following evidence to your current debate position and goals?\n\n`;
    
    if (params.context) {
      prompt += `**Debate Context:**\n${params.context}\n\n`;
    }
    
    prompt += `**Proposition:** "${params.proposition}"\n\n`;
    prompt += `**Evidence:** ${evidenceContent}\n\n`;
    prompt += `**Instructions:**\n`;
    prompt += `Consider how important this evidence is given your specific debate frame and role.\n`;
    prompt += `A highly salient piece of evidence is one you would strongly focus on or emphasize given your frame's priorities.\n`;
    prompt += `Consider your frame's perspective on what types of evidence matter most.\n\n`;
    prompt += `Respond with only a single floating-point number from 0.0 (not salient) to 1.0 (extremely salient).\n`;
    prompt += `Do not include any explanation, units, or other text. Just the number.`;

    return prompt;
  }
  
  /**
   * Detect if content contains factual claims
   */
  private detectFactualContent(content: unknown): boolean {
    if (typeof content !== 'string' && typeof content !== 'object') {
      return false;
    }
    
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Simple heuristics - could be enhanced with ML
    const factualIndicators = [
      /\b(is|are|was|were|has|have|had|will|can|cannot|does|did)\b/i,
      /\b(studies show|research indicates|evidence suggests|data reveals)\b/i,
      /\b(according to|statistics|percentage|proven|demonstrated)\b/i,
      /\b(fact|evidence|study|research|analysis|report)\b/i
    ];
    
    return factualIndicators.some(pattern => pattern.test(text));
  }
  
  /**
   * Detect if content contains tactical reasoning
   */
  private detectTacticalContent(content: unknown): boolean {
    if (typeof content !== 'string' && typeof content !== 'object') {
      return false;
    }
    
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Simple heuristics for tactical language
    const tacticalIndicators = [
      /\b(should emphasize|will be effective|strategy|tactic|approach)\b/i,
      /\b(my opponent|their argument|this will|I should)\b/i,
      /\b(predictable|counter|weaken|strengthen|advantage)\b/i,
      /\b(appeal to|focus on|highlight|undermine)\b/i
    ];
    
    return tacticalIndicators.some(pattern => pattern.test(text));
  }
}