import { JustificationElement } from '../epistemic/justification';
import { Frame } from '../epistemic/frame';
import { Tool } from '../action/tool';
import { Belief } from '../epistemic/belief';
import { Goal } from '../action/goal';
import { Action } from '../action/action';

/**
 * Interface for LLM clients used in the framework
 * 
 * This defines the common methods required for any LLM client implementation,
 * whether it's a real client connecting to an API or a mock for testing
 */
export interface LLMClient {
  /**
   * Interpret perception data through a specific frame
   * @param data The perception data to interpret
   * @param frame The cognitive frame to use for interpretation
   * @returns Promise resolving to the interpreted data
   */
  interpretPerceptionData(data: any, frame: Frame): Promise<any>;
  
  /**
   * Extract relevant propositions from content using a specific frame
   * @param content The content to extract propositions from
   * @param frame The cognitive frame to use for extraction
   * @returns Promise resolving to an array of proposition strings
   */
  extractRelevantPropositions(content: any, frame: Frame): Promise<string[]>;
  
  /**
   * Judge the strength of evidence for a proposition
   * @param element The justification element to evaluate
   * @param proposition The proposition being evaluated
   * @returns Promise resolving to a confidence score between 0 and 1
   */
  judgeEvidenceStrength(element: JustificationElement, proposition: string): Promise<number>;
  
  /**
   * Judge the saliency of evidence based on a frame
   * @param element The justification element to evaluate
   * @param frame The cognitive frame to use for evaluation
   * @returns Promise resolving to a saliency score between 0 and 1
   */
  judgeEvidenceSaliency(element: JustificationElement, frame: Frame): Promise<number>;
  
  /**
   * Judge the trustworthiness of a source based on a frame
   * @param source The source identifier to evaluate
   * @param frame The cognitive frame to use for evaluation
   * @returns Promise resolving to a trust score between 0 and 1
   */
  judgeSourceTrust(source: string, frame: Frame): Promise<number>;
  
  /**
   * Generate a plan to achieve a goal given beliefs, tools, and a frame
   * @param goal The goal to achieve
   * @param beliefs Relevant beliefs to consider
   * @param availableTools Tools available for use in the plan
   * @param frame The cognitive frame to use for planning
   * @returns Promise resolving to an array of actions or null if planning fails
   */
  generatePlan(
    goal: Goal,
    beliefs: Belief[],
    availableTools: Tool[],
    frame: Frame
  ): Promise<Action[] | null>;
}
