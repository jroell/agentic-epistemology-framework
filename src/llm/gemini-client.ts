// src/llm/gemini-client.ts
import { GoogleGenerativeAI, GenerativeModel, FunctionDeclaration, FunctionCall, Part, FunctionDeclarationSchema, SchemaType, SafetySetting } from "@google/generative-ai";
import { Tool } from '../action/tool';
import { Goal } from '../action/goal';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { JustificationElement } from '../epistemic/justification';
import { Action, UseTool } from '../action/action';
import { EntityId } from "../types/common";
import { LLMClient } from "./llm-client";
import { displayMessage, COLORS, createBox } from "../core/cli-formatter";
import { 
  DomainAdapter, 
  DomainOperation, 
  DomainOperationParams, 
  DomainAdapterRegistry 
} from '../domain/domain-adapter';

// Use the SDK's FunctionDeclarationSchema directly for parameters
// Note: We might need to refine this if Tool.parameterSchema doesn't exactly match
// For now, we assume Tool.parameterSchema is compatible or can be cast.

/**
 * Client for interacting with Google's Gemini AI models
 *
 * This implementation connects to the actual Gemini API
 */
export class GeminiClient implements LLMClient {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private availableToolsMap: Map<EntityId, Tool> = new Map();
    private domainAdapter?: DomainAdapter;
    private domainRegistry: DomainAdapterRegistry;

    constructor(
        apiKey: string, 
        modelName = "gemini-2.0-flash", 
        domainAdapter?: DomainAdapter,
        domainRegistry?: DomainAdapterRegistry
    ) {
        if (!apiKey) {
            throw new Error("Gemini API key is required.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
        });
        
        // Domain adapter injection
        this.domainAdapter = domainAdapter;
        this.domainRegistry = domainRegistry || new DomainAdapterRegistry();
        
        // If no domain adapter provided but registry has a default, use it
        if (!this.domainAdapter && this.domainRegistry) {
            this.domainAdapter = this.domainRegistry.getDefault();
        }
    }
    
    /**
     * Set or change the domain adapter for this client
     */
    setDomainAdapter(adapter: DomainAdapter): void {
        this.domainAdapter = adapter;
    }
    
    /**
     * Get the current domain adapter
     */
    getDomainAdapter(): DomainAdapter | undefined {
        return this.domainAdapter;
    }
    
    /**
     * Execute a domain operation using the configured domain adapter.
     * This is the core method that bridges domain-specific logic with LLM execution.
     * 
     * @param operation The domain operation to execute
     * @param params Parameters for the operation
     * @param logCategory Category for logging purposes
     * @returns Promise resolving to the operation result
     */
    private async executeWithDomain<T>(
        operation: DomainOperation,
        params: DomainOperationParams,
        logCategory: string
    ): Promise<T> {
        const adapter = this.domainAdapter;
        const contextStr = params.agentId ? `[Agent: ${params.agentName || params.agentId}]` : '[System]';
        
        if (!adapter) {
            displayMessage("GeminiClient", `No domain adapter configured for operation: ${operation}`, COLORS.warning);
            return this.getDefaultValueForOperation<T>(operation);
        }
        
        if (!adapter.canHandle(operation)) {
            displayMessage("GeminiClient", `Domain adapter ${adapter.domainId} cannot handle operation: ${operation}`, COLORS.warning);
            return this.getDefaultValueForOperation<T>(operation);
        }
        
        if (!adapter.validateParams(operation, params)) {
            displayMessage("GeminiClient", `Invalid parameters for operation ${operation} in domain ${adapter.domainId}`, COLORS.error);
            return this.getDefaultValueForOperation<T>(operation);
        }
        
        try {
            // Get domain-specific logging context
            const loggingContext = adapter.getLoggingContext(operation, params);
            
            displayMessage(
                logCategory,
                `${contextStr} Executing with ${adapter.domainName} domain\\n` +
                `Operation: ${operation}\\n` +
                `Domain: ${adapter.domainId} v${adapter.version}\\n` +
                `Context: ${JSON.stringify(loggingContext, null, 2)}`,
                COLORS.info
            );
            
            // Build domain-specific prompt
            const prompt = adapter.buildPrompt(operation, params);
            
            // Execute LLM call
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();
            
            displayMessage(
                `LLM ${operation.toUpperCase()}`,
                `${contextStr} Raw LLM Response: "${text}"\\n` +
                `Domain: ${adapter.domainName}\\n` +
                `Method: Domain-specific ${operation}`,
                COLORS.info
            );
            
            // Parse domain-specific response
            const parseResult = adapter.parseResponse<T>(operation, text, params);
            
            if (parseResult.success) {
                displayMessage(
                    `${operation.toUpperCase()} RESULT`,
                    `${contextStr} Success: ${this.formatResultForLogging(parseResult.data)}\\n` +
                    `Domain: ${adapter.domainName}\\n` +
                    `Metadata: ${JSON.stringify(parseResult.metadata || {}, null, 2)}`,
                    COLORS.success
                );
                return parseResult.data;
            } else {
                displayMessage("GeminiClient", `Domain parsing failed: ${parseResult.error}`, COLORS.warning);
                return this.getDefaultValueForOperation<T>(operation);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            displayMessage("GeminiClient", `Error in domain operation ${operation}: ${errorMessage}`, COLORS.error);
            return this.getDefaultValueForOperation<T>(operation);
        }
    }
    
    /**
     * Get default value for an operation when domain adapter fails
     */
    private getDefaultValueForOperation<T>(operation: DomainOperation): T {
        switch (operation) {
            case DomainOperation.EXTRACT_PROPOSITIONS:
                return [] as T;
            case DomainOperation.SCORE_RELEVANCE:
            case DomainOperation.JUDGE_EVIDENCE_STRENGTH:
            case DomainOperation.JUDGE_EVIDENCE_SALIENCY:
                return 0.5 as T;
            case DomainOperation.EXTRACT_CONTEXT:
                return 'Generic context' as T;
            default:
                return undefined as T;
        }
    }
    
    /**
     * Format result for logging display
     */
    private formatResultForLogging(result: unknown): string {
        if (Array.isArray(result)) {
            return `${result.length} items: [${result.slice(0, 3).join(', ')}${result.length > 3 ? '...' : ''}]`;
        } else if (typeof result === 'number') {
            return result.toFixed(3);
        } else if (typeof result === 'string') {
            return result.length > 100 ? result.substring(0, 100) + '...' : result;
        }
        return String(result);
    }

    /**
     * Generates a plan (sequence of actions) using Gemini based on the goal, beliefs, available tools, and frame.
     * @param goal The goal to achieve.
     * @param beliefs Current relevant beliefs.
     * @param availableTools Tools the agent can use.
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to an array of Action objects or null if planning fails.
     */
    async generatePlan(goal: Goal, beliefs: Belief[], availableTools: Tool[], frame: Frame): Promise<Action[] | null> {
        const planningData = {
          type: "gemini_planning",
          timestamp: new Date().toISOString(),
          goal: goal.description,
          frame: frame.name,
          toolCount: availableTools.length
        };
        displayMessage("GeminiClient", `Planning started:\n${JSON.stringify(planningData, null, 2)}`, COLORS.info);

        this.availableToolsMap.clear();
        availableTools.forEach(tool => this.availableToolsMap.set(tool.id, tool));

        const geminiTools: FunctionDeclaration[] = availableTools.map(tool => ({
            name: tool.id, // Use unique ID for function name to avoid collisions
            description: `${tool.name}: ${tool.description}`, // Combine name and description
            // Cast parameterSchema directly to FunctionDeclarationSchema, using SchemaType.OBJECT for the default
            parameters: (tool.parameterSchema as FunctionDeclarationSchema | undefined) ?? { type: SchemaType.OBJECT, properties: {} }
        }));

        const prompt = this.buildPrompt(goal, beliefs, frame, availableTools);

        try {
            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                tools: [{ functionDeclarations: geminiTools }],
                // toolConfig: { functionCallingConfig: { mode: "ANY" } } // Or AUTO/NONE
            });

            const response = result.response;
            const responseData = {
              type: "gemini_response",
              timestamp: new Date().toISOString(),
              functionCalls: response?.candidates?.[0]?.content?.parts
                      ?.filter((part): part is Part & { functionCall: FunctionCall } => 'functionCall' in part)
                      ?.map(part => part.functionCall)
                      ?.length || 0,
              hasText: !!response?.text(),
              candidates: response?.candidates?.length || 0
            };
            displayMessage("GeminiClient", `Received response:\n${JSON.stringify(responseData, null, 2)}`, COLORS.info);


            const functionCalls = response?.candidates?.[0]?.content?.parts
                ?.filter((part): part is Part & { functionCall: FunctionCall } => 'functionCall' in part)
                ?.map(part => part.functionCall);

            if (!functionCalls || functionCalls.length === 0) {
                const noFuncData = {
                  type: "gemini_plan_no_functions",
                  timestamp: new Date().toISOString(),
                  hasTextResponse: !!response?.text()
                };
                displayMessage("GeminiClient", `Planning - No function calls suggested:\n${JSON.stringify(noFuncData, null, 2)}`, COLORS.warning);

                // Optional: Check response.text() for a textual plan or explanation
                const textResponse = response?.text();
                if (textResponse) {
                    const textResponseData = {
                      type: "gemini_text_response",
                      timestamp: new Date().toISOString(),
                      textLength: textResponse.length,
                      text: textResponse
                    };
                    displayMessage("GeminiClient", `Planning - Received text response instead of functions:\n${JSON.stringify(textResponseData, null, 2)}`, COLORS.info);

                    // Potentially try to parse text response as a fallback? (More complex)
                }
                return null;
            }

            const planActions: Action[] = [];
            for (const call of functionCalls) {
                const tool = this.availableToolsMap.get(call.name); // Find tool by ID used as function name
                if (tool) {
                    // Basic validation: Check if required parameters are present
                    // Accessing 'required' might need adjustment based on FunctionDeclarationSchema structure
                    const schema = tool.parameterSchema as FunctionDeclarationSchema | undefined;
                    const requiredParams = schema?.required || [];
                    const missingParams = requiredParams.filter((param: string) => !(param in call.args));
                    if (missingParams.length > 0) {
                         // Use displayMessage for warning
                         displayMessage("GeminiClient", `Missing required parameters for tool ${tool.name} (${tool.id}): ${missingParams.join(', ')}. Skipping action.`, COLORS.warning);
                         continue; // Or handle error more gracefully
                    }
                    planActions.push(new UseTool(tool, call.args));
                } else {
                    // Use displayMessage for warning
                    displayMessage("GeminiClient", `Gemini called unknown tool: ${call.name}. Skipping action.`, COLORS.warning);
                    // Potentially ask Gemini to retry or correct?
                }
            }

            if (planActions.length === 0) {
                 const noValidActionsData = {
                   type: "gemini_plan_no_valid_actions",
                   timestamp: new Date().toISOString(),
                   functionCallCount: functionCalls?.length || 0,
                   issue: "No valid actions could be mapped from function calls"
                 };
                 displayMessage("GeminiClient", `Planning - No valid actions mapped:\n${JSON.stringify(noValidActionsData, null, 2)}`, COLORS.warning);

                 return null;
            }

            const successData = {
              type: "gemini_plan_success",
              timestamp: new Date().toISOString(),
              actionCount: planActions.length,
              actions: planActions.map(action => action.toString())
            };
            displayMessage("GeminiClient", `Planning successful:\n${JSON.stringify(successData, null, 2)}`, COLORS.success);

            return planActions;

        } catch (error) {
            const errorData = {
              type: "gemini_plan_error",
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error)
            };
            // Use displayMessage with error color
            displayMessage("GeminiClient", `Planning Error:\n${JSON.stringify(errorData, null, 2)}`, COLORS.error);

            return null;
        }
    }

     /**
     * Asks Gemini to judge the trustworthiness of an evidence source given the agent's frame.
     * @param sourceId The ID of the evidence source (e.g., agent ID, tool ID, sensor ID).
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to a trust score (0-1), or a default (e.g., 0.5) on error.
     */
    async judgeSourceTrust(sourceId: string, frame: Frame): Promise<number> {
        // const trustStartData = { // Commenting out as this might be too verbose for UI
        //   type: "gemini_source_trust",
        //   timestamp: new Date().toISOString(),
        //   sourceId: sourceId,
        //   frame: frame.name,
        //   operation: "start"
        // };
        // displayMessage("GeminiClient", `Judging source trust:\n${JSON.stringify(trustStartData, null, 2)}`, COLORS.info);

        const prompt = this.buildSourceTrustPrompt(sourceId, frame);
        const defaultValue = 0.5; // Default trust on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();
            // Use displayMessage for internal log
            displayMessage("GeminiClient", `Raw source trust judgment response: "${text}"`, COLORS.info);

            // Stricter parsing: Check if the response *only* contains a valid number in [0, 1]
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/; // Matches 0, 1, 0.x, 1.0
            if (scoreRegex.test(text)) {
                const score = parseFloat(text);
                 // Double check parsed value just in case regex had issues (though unlikely)
                if (!isNaN(score) && score >= 0 && score <= 1) {
                    // Use displayMessage for internal log
                    displayMessage("GeminiClient", `Parsed trust score: ${score}`, COLORS.info);
                    return score;
                }
            }

            // If regex fails or parsing fails (shouldn't happen if regex is correct)
            // Use displayMessage for warning
            displayMessage("GeminiClient", `Response "${text}" is not a valid score between 0.0 and 1.0. Returning default trust ${defaultValue}.`, COLORS.warning);
            return defaultValue;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Use displayMessage for error
            displayMessage("GeminiClient", `API Error judging source trust: ${errorMessage}`, COLORS.error);
            return defaultValue; // Return default on API error
        }
    }

    /**
     * Asks Gemini to judge the saliency (relevance/importance) of evidence given the agent's frame.
     * @param element The justification element representing the evidence.
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to a saliency score (0-1), or a default (e.g., 0.5) on error.
     */
    async judgeEvidenceSaliencyForFrame(
        element: JustificationElement,
        frame: Frame,
        proposition: string,
        agentName: string,
        context: string,
    ): Promise<number> {
        const agentContext = agentName ? `[Agent: ${agentName}]` : '[Unknown Agent]';
        const evidenceType = element.constructor.name;
        const evidenceContent = this.getEvidencePreview(element);
        
        displayMessage(
            "FRAME SALIENCY EVALUATION CONTEXT",
            `${agentContext} Evaluating evidence saliency for frame\n` +
            `Frame: "${frame.name}" (${frame.description})\n` +
            `Proposition: "${proposition}"\n` +
            `Evidence Type: ${evidenceType}\n` +
            `Evidence Preview: ${evidenceContent}\n` +
            `Agent Context: ${context}\n` +
            `Purpose: Determining w_F(e) for Paper Section 5.4.3.A`,
            COLORS.info
        );
        const prompt = this.buildEvidenceSaliencyPrompt(element, frame, proposition, agentName, context);
        const defaultValue = 0.5; // Default saliency on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();
            displayMessage(
                "LLM FRAME SALIENCY JUDGMENT",
                `${agentContext} LLM Response: "${text}"\n` +
                `Frame Perspective: How salient is this evidence given the ${frame.name} frame?\n` +
                `Scale: 0.0 (irrelevant to frame) to 1.0 (highly salient to frame)`,
                COLORS.info
            );

            // Stricter parsing
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/;
            if (scoreRegex.test(text)) {
                const score = parseFloat(text);
                if (!isNaN(score) && score >= 0 && score <= 1) {
                    displayMessage(
                        "FRAME SALIENCY RESULT",
                        `${agentContext} Final Saliency Score w_F(e): ${score}\n` +
                        `Frame Impact: ${this.interpretSaliencyScore(score, frame.name)}\n` +
                        `Mathematical Role: Will be used as w_F(e) in equation conf_new = (1 - w_F(e)) * conf_old + w_F(e) * C(e,P)`,
                        COLORS.success
                    );
                    return score;
                }
            }

            // Use displayMessage for warning
            displayMessage("GeminiClient", `Response "${text}" is not a valid score between 0.0 and 1.0. Returning default saliency ${defaultValue}.`, COLORS.warning);
            return defaultValue;

        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : String(error);
             // Use displayMessage for error
            displayMessage("GeminiClient", `API Error judging evidence saliency: ${errorMessage}`, COLORS.error);
            return defaultValue; // Return default on API error
        }
    }

    /**
     * Asks Gemini to judge the strength of a piece of evidence relative to a proposition.
     * @param element The justification element representing the evidence.
     * @param proposition The proposition being evaluated.
     * @param agentId Optional agent ID for enhanced context logging
     * @param agentName Optional agent name for enhanced context logging
     * @returns A promise resolving to a confidence score (0-1), or a default (e.g., 0.5) on error.
     */
    async judgeEvidenceStrength(
        element: JustificationElement, 
        proposition: string,
        agentId?: string,
        agentName?: string
    ): Promise<number> {
        const context = agentId ? `[Agent: ${agentName || agentId}]` : '[Unknown Agent]';
        const evidenceType = element.constructor.name;
        const evidenceContent = this.getEvidencePreview(element);
        
        displayMessage(
            "EVIDENCE EVALUATION CONTEXT", 
            `${context} Evaluating evidence strength\n` +
            `Proposition: "${proposition}"\n` +
            `Evidence Type: ${evidenceType}\n` +
            `Evidence Preview: ${evidenceContent}\n` +
            `Evaluation Trigger: Belief formation/update process`, 
            COLORS.info
        );
        const prompt = this.buildEvidenceStrengthPrompt(element, proposition);
        const defaultValue = 0.5; // Default confidence on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt); // Simple text prompt for now
            const response = result.response;
            const text = response.text().trim();
            displayMessage(
                "LLM EVIDENCE STRENGTH JUDGMENT", 
                `${context} LLM Response: "${text}"\n` +
                `Evaluation Criteria: How strongly does this evidence support the proposition?\n` +
                `Scale: 0.0 (contradicts) to 1.0 (strongly supports)`,
                COLORS.info
            );

            // Stricter parsing
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/;
            if (scoreRegex.test(text)) {
                 const score = parseFloat(text);
                 if (!isNaN(score) && score >= 0 && score <= 1) {
                    displayMessage(
                        "EVIDENCE STRENGTH RESULT", 
                        `${context} Final Strength Score: ${score}\n` +
                        `Interpretation: ${this.interpretStrengthScore(score)}\n` +
                        `Next Step: Will be used in confidence update formula (Paper Section 5.4.3)`,
                        COLORS.success
                    );
                    return score;
                }
            }

            // Use displayMessage for warning
            displayMessage("GeminiClient", `Response "${text}" is not a valid score between 0.0 and 1.0. Returning default strength ${defaultValue}.`, COLORS.warning);
            return defaultValue;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Use displayMessage for error
            displayMessage("GeminiClient", `API Error judging evidence strength: ${errorMessage}`, COLORS.error);
            return defaultValue; // Return default on API error
        }
    }

    /**
     * Builds the prompt for the Gemini API call.
     */
    private buildPrompt(goal: Goal, beliefs: Belief[], frame: Frame, availableTools: Tool[]): string {
        let prompt = `You are an autonomous agent operating under the Agentic Epistemology Framework (AEF).\n`;
        prompt += `Your current cognitive frame is "${frame.name}" (${frame.description}). This frame influences how you interpret information and prioritize actions.\n`;
        prompt += `Your current goal is: "${goal.description}".\n\n`;

        prompt += "Based on your current beliefs and the available tools, generate a sequence of tool calls to achieve this goal.\n";
        prompt += "Only use the tools provided. Call them in the order they should be executed.\n\n";


        if (beliefs.length > 0) {
            prompt += "Current Relevant Beliefs (Proposition: Confidence):\n";
            beliefs.forEach(b => {
                prompt += `- ${b.proposition}: ${b.confidence.toFixed(2)}\n`;
            });
            prompt += "\n";
        } else {
            prompt += "You currently have no specific relevant beliefs.\n\n";
        }

        prompt += "Available Tools:\n";
        availableTools.forEach(tool => {
            prompt += `- Tool ID: ${tool.id}\n`;
            prompt += `  Name: ${tool.name}\n`;
            prompt += `  Description: ${tool.description}\n`;
            if (tool.parameterSchema) {
                prompt += `  Parameters Schema: ${JSON.stringify(tool.parameterSchema)}\n`;
            }
        });
        prompt += "\nPlease provide the sequence of function calls required to achieve the goal.";

        return prompt;
    }

    /**
     * Builds the prompt for the judgeEvidenceStrength call.
     */
    private buildEvidenceStrengthPrompt(element: JustificationElement, proposition: string): string {
        // Simple string formatting for content - might need refinement for complex objects
        const evidenceContent = typeof element.content === 'string'
            ? element.content
            : JSON.stringify(element.content);

        let prompt = `Evaluate how strongly the following piece of evidence supports or contradicts the given proposition.\n\n`;
        prompt += `Proposition: "${proposition}"\n\n`;
        prompt += `Evidence Details:\n`;
        prompt += `- Type: ${element.type}\n`;
        prompt += `- Source: ${element.source}\n`;
        prompt += `- Content: ${evidenceContent}\n\n`;
        prompt += `Instructions:\n`;
        prompt += `Return ONLY a single numerical score between 0.0 and 1.0.\n`;
        prompt += ` - 1.0 means the evidence strongly supports the proposition.\n`;
        prompt += ` - 0.0 means the evidence strongly contradicts the proposition.\n`;
        prompt += ` - 0.5 means the evidence is neutral, irrelevant, or ambiguous.\n`;
        prompt += `Do not include any explanation, units, or other text. Just the number.`;

        return prompt;
    }

    /**
     * Builds the prompt for the judgeEvidenceSaliency call.
     */
    private buildEvidenceSaliencyPrompt(
        element: JustificationElement,
        frame: Frame,
        proposition: string,
        agentName: string,
        context: string,
    ): string {
        const evidenceContent = typeof element.content === 'string'
            ? element.content
            : JSON.stringify(element.content);

        let prompt = `Given your role as **${agentName}** with the **${frame.name}** frame (${frame.description}), how salient (relevant, important, and central) is the following proposition to your current arguments and goals? A highly salient proposition is one you would strongly focus on or emphasize.\n\n`;
        prompt += `**Debate Context:**\n${context}\n\n`;
        prompt += `**Proposition to Evaluate:** "${proposition}"\n\n`;
        prompt += `**Evidence for Proposition:**\n`;
        prompt += `- Type: ${element.type}\n`;
        prompt += `- Source: ${element.source}\n`;
        prompt += `- Content: ${evidenceContent}\n\n`;
        prompt += `**Instructions:**\n`;
        prompt += `Respond with only a single floating-point number from 0.0 (not salient) to 1.0 (extremely salient).\n`;
        prompt += `Do not include any explanation, units, or other text. Just the number.`;

        return prompt;
    }

    /**
     * Builds the prompt for the judgeSourceTrust call.
     */
    private buildSourceTrustPrompt(sourceId: string, frame: Frame): string {
        let prompt = `Consider an agent operating under the cognitive frame "${frame.name}".\n`;
        prompt += `Frame Description: "${frame.description}".\n\n`;
        prompt += `Evaluate how trustworthy the following evidence source ID should be considered, given this frame:\n\n`;
        prompt += `Source ID: "${sourceId}"\n\n`;
        prompt += `Instructions:\n`;
        prompt += `Return ONLY a single numerical score between 0.0 and 1.0.\n`;
        prompt += ` - 1.0 means the source is highly trustworthy for this frame.\n`;
        prompt += ` - 0.0 means the source is highly untrustworthy for this frame.\n`;
        prompt += ` - 0.5 means the source has neutral or unknown trustworthiness.\n`;
        prompt += `Consider the frame's priorities (e.g., a Security frame might distrust unknown sources more than an Efficiency frame).\n`;
        prompt += `Do not include any explanation, units, or other text. Just the number.`;

        return prompt;
    }

    /**
     * Asks Gemini to interpret perception data through the lens of a given frame.
     * @param perceptionData The raw data from the perception.
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to the interpreted data (structure TBD, maybe string summary for now).
     */
    async interpretPerceptionData(perceptionData: unknown, frame: Frame, agentId: string, agentName: string): Promise<unknown> { // Use unknown instead of any
        // Use displayMessage for internal log
        displayMessage("GeminiClient", `Interpreting perception data for frame: "${frame.name}"`, COLORS.info);
        const prompt = this.buildInterpretPerceptionPrompt(perceptionData, frame, agentId, agentName);
        // Default value might be the original data or a simple string representation
        const defaultValue = `Uninterpreted data: ${JSON.stringify(perceptionData)}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim() || defaultValue;

            // Log interpreted perception in a simple box using the new color
            const headerInterpretation = `🧠 INTERNAL INTERPRETATION (Agent: ${agentName}, Frame: ${frame.name}) 🧠`;
            // Use createBox with magenta color
            console.log(`\n${COLORS.internalInterpretation(headerInterpretation)}`);
            console.log(createBox(text, COLORS.internalInterpretation));

            // For now, just return the text summary. Could parse structured output later.
            return text || defaultValue;
        } catch (error) {
            // Use displayMessage for error
            displayMessage("GeminiClient", `Error interpreting perception data: ${error instanceof Error ? error.message : String(error)}`, COLORS.error);
            return defaultValue;
        }
    }

     /**
     * Asks Gemini to extract relevant propositions from source data (perception or goal) given a frame.
     * @param sourceData The data from the perception or goal description.
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to an array of proposition strings.
     */
    async extractRelevantPropositions(sourceData: unknown, frame: Frame): Promise<string[]> { // Use unknown instead of any
        // Use displayMessage for internal log
        displayMessage("GeminiClient", `Extracting propositions for frame: "${frame.name}"`, COLORS.info);
        const prompt = this.buildExtractPropositionsPrompt(sourceData, frame);
        const defaultValue: string[] = [];

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim(); // Keep original text for parsing

            // Log extracted propositions in a simple box using the new color
            const propositionsToLog = text ? text.split('\n').map(line => line.trim()).filter(line => line.length > 0) : ['<No propositions extracted>'];
            const headerPropositions = `💡 INTERNAL PROPOSITIONS (Frame: ${frame.name}) 💡`;
            // Format propositions with bullet points inside the box
            const propositionsText = propositionsToLog.map(prop => `- ${prop}`).join('\n');
            console.log(`\n${COLORS.internalPropositions(headerPropositions)}`); // Header with color
            console.log(createBox(propositionsText, COLORS.internalPropositions)); // Use createBox with cyan color


            // Attempt to parse the response as a list of strings (e.g., newline-separated)
            if (text) {
                // Simple split by newline, filter empty lines. Might need more robust parsing.
                const propositions = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                if (propositions.length > 0) {
                    return propositions;
                }
            }
            // Use displayMessage for warning
            displayMessage("GeminiClient", `Failed to parse propositions from response: "${text}". Returning empty list.`, COLORS.warning);
            return defaultValue;

        } catch (error) {
            // Use displayMessage for error
            displayMessage("GeminiClient", `Error extracting propositions: ${error instanceof Error ? error.message : String(error)}`, COLORS.error);
            return defaultValue;
        }
    }

  /**
   * Public API to call the Gemini model with a prompt
   *
   * This provides a simpler interface for examples and tools
   */
  async call(options: {
    prompt: string,
    temperature?: number,
    maxTokens?: number,
    safetySettings?: SafetySetting[] // Use the correct type from the SDK
  }): Promise<{ response: string }> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 800
        },
        safetySettings: options.safetySettings
      });

      return { response: result.response.text().trim() };
    } catch (error) {
      // Use displayMessage for error
      displayMessage("GeminiClient", `Error calling Gemini API: ${error instanceof Error ? error.message : String(error)}`, COLORS.error);
      return { response: "" };
    }
  }

  /**
   * Builds the prompt for the interpretPerceptionData call.
   */
  private buildInterpretPerceptionPrompt(perceptionData: unknown, frame: Frame, agentId: string, agentName: string): string { // Use unknown instead of any
    const perceptionContent = typeof perceptionData === 'string'
        ? perceptionData
        : JSON.stringify(perceptionData, null, 2);

    let prompt = `You are ${agentName} (ID: ${agentId}), an AI agent analyzing an event. Your current cognitive frame is "${frame.name}," which means you prioritize "${frame.description}."\n\n`;
    prompt += `The following event has been perceived:\n---\n${perceptionContent}\n---\n\n`;
    prompt += `Instructions:\n`;
    prompt += `Based on your identity and current frame, write a brief, first-person internal monologue summarizing your interpretation of this event. What does it mean to you? What is the key takeaway?\n`;
    prompt += `Your response should be only the monologue, without any extra formatting or conversational text.`;

    return prompt;
  }

     /**
     * Builds the prompt for the extractRelevantPropositions call.
     */
    private buildExtractPropositionsPrompt(sourceData: unknown, frame: Frame): string { // Use unknown instead of any
         const dataString = typeof sourceData === 'string'
            ? sourceData
            : JSON.stringify(sourceData);

        let prompt = `You are an agent operating under the cognitive frame "${frame.name}".\n`;
        prompt += `Frame Description: "${frame.description}".\n\n`;
        prompt += `Consider the following source data (which could be from a perception or a goal description):\n\`\`\`\n${dataString}\n\`\`\`\n\n`;
        prompt += `Instructions:\n`;
        prompt += `Identify and list the key propositions implied by this data that are relevant to your current frame.\n`;
        prompt += `Focus on statements that could become beliefs for the agent.\n`;
        prompt += `Return ONLY a list of propositions, each on a new line.\n`;
        prompt += `Do not include numbering, bullet points, or any explanation.`;

        return prompt;
    }
    
    /**
     * Get a preview of evidence content for logging
     */
    private getEvidencePreview(element: JustificationElement): string {
        const content = element.toString();
        return content.length > 100 ? content.substring(0, 100) + '...' : content;
    }
    
    /**
     * Interpret strength score for human-readable logging
     */
    private interpretStrengthScore(score: number): string {
        if (score >= 0.8) return 'Strong support for proposition';
        if (score >= 0.6) return 'Moderate support for proposition';
        if (score >= 0.4) return 'Weak support for proposition';
        if (score >= 0.2) return 'Weak contradiction of proposition';
        return 'Strong contradiction of proposition';
    }
    
    /**
     * Interpret saliency score for human-readable logging
     */
    private interpretSaliencyScore(score: number, frameName: string): string {
        if (score >= 0.8) return `Highly salient to ${frameName} frame - major influence on confidence`;
        if (score >= 0.6) return `Moderately salient to ${frameName} frame - significant influence`;
        if (score >= 0.4) return `Somewhat salient to ${frameName} frame - minor influence`;
        if (score >= 0.2) return `Low salience to ${frameName} frame - minimal influence`;
        return `Not salient to ${frameName} frame - evidence will be largely ignored`;
    }

    /**
     * Extract propositions from content using domain adapter.
     * Maintains backward compatibility while using the new domain architecture.
     * 
     * @param content The original content to analyze
     * @param context Optional context about the discussion topic
     * @param agentId Optional agent ID for logging
     * @param agentName Optional agent name for logging  
     * @returns Promise resolving to array of propositions
     */
    async extractFactualPropositions(
        content: unknown,
        context?: string,
        agentId?: string,
        agentName?: string
    ): Promise<string[]> {
        return this.executeWithDomain<string[]>(
            DomainOperation.EXTRACT_PROPOSITIONS,
            { content, context, agentId, agentName },
            'FACTUAL PROPOSITION EXTRACTION'
        );
    }

    /**
     * Score the relevance of a proposition to a specific topic or context using domain adapter.
     * Uses LLM to determine relevance without hardcoded keywords.
     * 
     * @param proposition The proposition to evaluate
     * @param context The topic or context  
     * @param agentId Optional agent ID for logging
     * @param agentName Optional agent name for logging
     * @returns Promise resolving to relevance score (0-1)
     */
    async scorePropositionRelevance(
        proposition: string,
        context: string,
        agentId?: string,
        agentName?: string
    ): Promise<number> {
        return this.executeWithDomain<number>(
            DomainOperation.SCORE_RELEVANCE,
            { proposition, context, agentId, agentName },
            'PROPOSITION RELEVANCE SCORING'
        );
    }

    /**
     * Extract topic/context from agent context using domain adapter (no hardcoded keywords)
     * 
     * @param contextStr The agent's current context as string
     * @param agentId Optional agent ID for logging
     * @param agentName Optional agent name for logging
     * @returns Promise resolving to extracted context
     */
    async extractDebateTopicFromContext(
        contextStr: string,
        agentId?: string,
        agentName?: string
    ): Promise<string> {
        return this.executeWithDomain<string>(
            DomainOperation.EXTRACT_CONTEXT,
            { content: contextStr, agentId, agentName },
            'CONTEXT EXTRACTION'
        );
    }
}
