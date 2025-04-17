import { Frame } from '../epistemic/frame';
import { JustificationElement } from '../epistemic/justification';
import { Tool } from '../action/tool';
import { Belief } from '../epistemic/belief';
import { Goal } from '../action/goal';
import { Action } from '../action/action';
import { LLMClient } from './llm-client';

/**
 * A mock implementation of LLMClient
 * 
 * This client doesn't require an API key and returns predefined responses
 */
export class MockGeminiClient implements LLMClient {
  // Create a map to store available tools (to match GeminiClient interface)
  private availableToolsMap: Map<string, Tool> = new Map();

  /**
   * Create a new mock Gemini client that doesn't require an API key
   */
  constructor() {
    console.log("Using MockGeminiClient - no API calls will be made");
  }

  /**
   * Override the interpretPerceptionData method
   */
  async interpretPerceptionData(data: any, frame: Frame): Promise<any> {
    console.log(`[MockGeminiClient] Interpreting data through ${frame.name} frame`);
    // Return the original data with a frame-specific note
    return {
      ...data,
      interpretation: `Interpreted through ${frame.name} frame`
    };
  }

  /**
   * Override the extractRelevantPropositions method
   */
  async extractRelevantPropositions(content: any, frame: Frame): Promise<string[]> {
    console.log(`[MockGeminiClient] Extracting propositions with ${frame.name} frame`);
    
    // Return frame-specific mock propositions
    switch (frame.name) {
      case 'Efficiency':
        return [
          'SystemPerformanceIsOptimal',
          'FastResponseTimeIsAchieved',
          'ResourceUtilizationIsEfficient'
        ];
      case 'Thoroughness':
        return [
          'AllCasesAreCovered',
          'TestingIsComprehensive',
          'DocumentationIsComplete'
        ];
      case 'Security':
        return [
          'SystemIsSecureAgainstThreats',
          'DataIsProtected',
          'AccessControlsAreEffective'
        ];
      default:
        return ['DefaultProposition1', 'DefaultProposition2'];
    }
  }

  /**
   * Override the judgeEvidenceStrength method
   */
  async judgeEvidenceStrength(element: JustificationElement, proposition: string): Promise<number> {
    console.log(`[MockGeminiClient] Judging evidence strength for: ${proposition}`);
    
    // Return different values based on element type
    switch (element.type) {
      case 'tool_result':
        return 0.85;
      case 'observation':
        return 0.75;
      case 'testimony':
        return 0.6;
      case 'inference':
        return 0.7;
      case 'external':
        return 0.5;
      default:
        return 0.65;
    }
  }

  /**
   * Override the judgeEvidenceSaliency method
   */
  async judgeEvidenceSaliency(element: JustificationElement, frame: Frame): Promise<number> {
    console.log(`[MockGeminiClient] Judging evidence saliency with ${frame.name} frame`);
    
    // Return frame-specific saliency values
    if (frame.name === 'Efficiency' && element.type === 'performance') {
      return 0.9;
    } else if (frame.name === 'Thoroughness' && element.type === 'detailed') {
      return 0.9;
    } else if (frame.name === 'Security' && element.type === 'security') {
      return 0.9;
    }
    
    return 0.6; // Default saliency
  }

  /**
   * Override the judgeSourceTrust method
   */
  async judgeSourceTrust(source: string, frame: Frame): Promise<number> {
    console.log(`[MockGeminiClient] Judging source trust: ${source}`);
    
    // Return different values based on source and frame
    if (source.includes('tool')) {
      return 0.8;
    } else if (source.includes('agent')) {
      return 0.7;
    }
    
    return 0.6; // Default trust
  }

  /**
   * Override the generatePlan method
   */
  async generatePlan(
    goal: Goal,
    beliefs: Belief[],
    availableTools: Tool[],
    frame: Frame
  ): Promise<Action[]> {
    console.log(`[MockGeminiClient] Generating plan for goal: ${goal.description}`);
    
    // Return an empty array as a placeholder
    // In a real implementation, this would generate actual plan steps
    return [];
  }

  /**
   * Override the buildPrompt method to prevent parent class errors
   */
  buildPrompt(goal: Goal, beliefs: Belief[], frame: Frame, availableTools: Tool[]): string {
    return "Mock prompt";
  }
}
