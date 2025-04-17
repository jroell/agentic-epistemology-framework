import { GoogleGenerativeAI, GenerativeModel, FunctionDeclaration, FunctionCall, Part, FunctionDeclarationSchema, SchemaType, SafetySetting } from "@google/generative-ai"; // Import SafetySetting
import { Tool } from '../action/tool';
import { Goal } from '../action/goal';
import { Belief } from '../epistemic/belief';
import { Frame } from '../epistemic/frame';
import { JustificationElement } from '../epistemic/justification';
import { Action, UseTool } from '../action/action';
import { EntityId } from "../types/common";
import { LLMClient } from "./llm-client";

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
    private availableToolsMap: Map<EntityId, Tool> = new Map(); // To quickly find tools by ID

    constructor(apiKey: string, modelName = "gemini-2.0-flash") {
        if (!apiKey) {
            throw new Error("Gemini API key is required.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Initialize the model with system instructions and tool configuration
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            // System instruction can be added here if needed globally
            // systemInstruction: "You are a helpful planning assistant...",
        });
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
        console.log(JSON.stringify({
            type: "gemini_planning",
            timestamp: new Date().toISOString(),
            goal: goal.description,
            frame: frame.name,
            toolCount: availableTools.length
        }, null, 2));
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
            console.log("[GeminiClient] Received response:", JSON.stringify({
        type: "gemini_response",
        timestamp: new Date().toISOString(),
        functionCalls: response?.candidates?.[0]?.content?.parts
                ?.filter((part): part is Part & { functionCall: FunctionCall } => 'functionCall' in part)
                ?.map(part => part.functionCall)
                ?.length || 0,
        hasText: !!response?.text(),
        candidates: response?.candidates?.length || 0
      }, null, 2));

            const functionCalls = response?.candidates?.[0]?.content?.parts
                ?.filter((part): part is Part & { functionCall: FunctionCall } => 'functionCall' in part)
                ?.map(part => part.functionCall);

            if (!functionCalls || functionCalls.length === 0) {
                console.log(JSON.stringify({
                type: "gemini_plan_no_functions",
                timestamp: new Date().toISOString(),
                hasTextResponse: !!response?.text()
            }, null, 2));
                // Optional: Check response.text() for a textual plan or explanation
                const textResponse = response?.text();
                if (textResponse) {
                    console.log(JSON.stringify({
                        type: "gemini_text_response",
                        timestamp: new Date().toISOString(),
                        textLength: textResponse.length,
                        text: textResponse
                    }, null, 2));
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
                         console.warn(`[GeminiClient] Missing required parameters for tool ${tool.name} (${tool.id}): ${missingParams.join(', ')}. Skipping action.`);
                         continue; // Or handle error more gracefully
                    }
                    planActions.push(new UseTool(tool, call.args));
                } else {
                    console.warn(`[GeminiClient] Gemini called unknown tool: ${call.name}. Skipping action.`);
                    // Potentially ask Gemini to retry or correct?
                }
            }

            if (planActions.length === 0) {
                 console.log(JSON.stringify({
                   type: "gemini_plan_no_valid_actions",
                   timestamp: new Date().toISOString(),
                   functionCallCount: functionCalls?.length || 0,
                   issue: "No valid actions could be mapped from function calls"
                 }, null, 2));
                 return null;
            }

            console.log(JSON.stringify({
                type: "gemini_plan_success",
                timestamp: new Date().toISOString(),
                actionCount: planActions.length,
                actions: planActions.map(action => action.toString())
            }, null, 2));
            return planActions;

        } catch (error) {
            console.error(JSON.stringify({
                type: "gemini_plan_error",
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            }, null, 2));
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
        console.log(JSON.stringify({
            type: "gemini_source_trust",
            timestamp: new Date().toISOString(),
            sourceId: sourceId,
            frame: frame.name,
            operation: "start"
        }, null, 2));
        const prompt = this.buildSourceTrustPrompt(sourceId, frame);
        const defaultValue = 0.5; // Default trust on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();
            console.log(`[GeminiClient] Raw source trust judgment response: "${text}"`);

            // Stricter parsing: Check if the response *only* contains a valid number in [0, 1]
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/; // Matches 0, 1, 0.x, 1.0
            if (scoreRegex.test(text)) {
                const score = parseFloat(text);
                 // Double check parsed value just in case regex had issues (though unlikely)
                if (!isNaN(score) && score >= 0 && score <= 1) {
                    console.log(`[GeminiClient] Parsed trust score: ${score}`);
                    return score;
                }
            }
            
            // If regex fails or parsing fails (shouldn't happen if regex is correct)
            console.warn(`[GeminiClient] Response "${text}" is not a valid score between 0.0 and 1.0. Returning default trust ${defaultValue}.`);
            return defaultValue;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GeminiClient] API Error judging source trust: ${errorMessage}`, error);
            return defaultValue; // Return default on API error
        }
    }

    /**
     * Asks Gemini to judge the saliency (relevance/importance) of evidence given the agent's frame.
     * @param element The justification element representing the evidence.
     * @param frame The agent's current cognitive frame.
     * @returns A promise resolving to a saliency score (0-1), or a default (e.g., 0.5) on error.
     */
    async judgeEvidenceSaliency(element: JustificationElement, frame: Frame): Promise<number> {
        console.log(`[GeminiClient] Judging evidence saliency for frame: "${frame.name}"`);
        const prompt = this.buildEvidenceSaliencyPrompt(element, frame);
        const defaultValue = 0.5; // Default saliency on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim();
            console.log(`[GeminiClient] Raw evidence saliency judgment response: "${text}"`);

            // Stricter parsing
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/; 
            if (scoreRegex.test(text)) {
                const score = parseFloat(text);
                if (!isNaN(score) && score >= 0 && score <= 1) {
                     console.log(`[GeminiClient] Parsed saliency score: ${score}`);
                    return score;
                }
            }
            
            console.warn(`[GeminiClient] Response "${text}" is not a valid score between 0.0 and 1.0. Returning default saliency ${defaultValue}.`);
            return defaultValue;

        } catch (error) {
             const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GeminiClient] API Error judging evidence saliency: ${errorMessage}`, error);
            return defaultValue; // Return default on API error
        }
    }

    /**
     * Asks Gemini to judge the strength of a piece of evidence relative to a proposition.
     * @param element The justification element representing the evidence.
     * @param proposition The proposition being evaluated.
     * @returns A promise resolving to a confidence score (0-1), or a default (e.g., 0.5) on error.
     */
    async judgeEvidenceStrength(element: JustificationElement, proposition: string): Promise<number> {
        console.log(`[GeminiClient] Judging evidence strength for proposition: "${proposition}"`);
        const prompt = this.buildEvidenceStrengthPrompt(element, proposition);
        const defaultValue = 0.5; // Default confidence on error or ambiguous response

        try {
            const result = await this.model.generateContent(prompt); // Simple text prompt for now
            const response = result.response;
            const text = response.text().trim();
            console.log(`[GeminiClient] Raw evidence strength judgment response: "${text}"`);

            // Stricter parsing
            const scoreRegex = /^([0](?:\.\d+)?|1(?:\.0+)?)$/; 
            if (scoreRegex.test(text)) {
                 const score = parseFloat(text);
                 if (!isNaN(score) && score >= 0 && score <= 1) {
                    console.log(`[GeminiClient] Parsed strength score: ${score}`);
                    return score;
                }
            }
            
            console.warn(`[GeminiClient] Response "${text}" is not a valid score between 0.0 and 1.0. Returning default strength ${defaultValue}.`);
            return defaultValue;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GeminiClient] API Error judging evidence strength: ${errorMessage}`, error);
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
    private buildEvidenceSaliencyPrompt(element: JustificationElement, frame: Frame): string {
        const evidenceContent = typeof element.content === 'string' 
            ? element.content 
            : JSON.stringify(element.content);

        // Enhanced prompt emphasizing frame perspective
        let prompt = `You are evaluating evidence for an agent whose current cognitive frame is "${frame.name}".\n`;
        prompt += `This frame prioritizes: "${frame.description}".\n\n`;
        prompt += `Critically evaluate ONLY the SALIENCY (relevance and importance) of the following piece of evidence *specifically from the perspective of the ${frame.name} frame*. How much attention should the agent pay to this evidence given its current frame?\n\n`;
        prompt += `Evidence Details:\n`;
        prompt += `- Type: ${element.type}\n`;
        prompt += `- Source: ${element.source}\n`;
        prompt += `- Content: ${evidenceContent}\n\n`;
        prompt += `Instructions:\n`;
        prompt += `Return ONLY a single numerical score between 0.0 and 1.0.\n`;
        prompt += ` - 1.0 means the evidence is highly salient and important for this frame.\n`;
        prompt += ` - 0.0 means the evidence is irrelevant or should be ignored by this frame.\n`;
        prompt += ` - 0.5 means the evidence has moderate or ambiguous saliency.\n`;
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
    async interpretPerceptionData(perceptionData: unknown, frame: Frame): Promise<unknown> { // Use unknown instead of any
        console.log(`[GeminiClient] Interpreting perception data for frame: "${frame.name}"`);
        const prompt = this.buildInterpretPerceptionPrompt(perceptionData, frame);
        // Default value might be the original data or a simple string representation
        const defaultValue = `Uninterpreted data: ${JSON.stringify(perceptionData)}`; 

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim() || defaultValue;

            // Log interpreted perception in a simple box
            const headerInterpretation = `🧠 INTERNAL INTERPRETATION (Frame: ${frame.name}) 🧠`;
            const boxWidthInterpretation = Math.max(headerInterpretation.length, 80); // Adjust width as needed
            console.log(`\x1b[90m${headerInterpretation}\x1b[0m`); // Gray header
            console.log(`\x1b[90m╭${'─'.repeat(boxWidthInterpretation - 2)}╮\x1b[0m`);
            text.split('\n').forEach(line => console.log(`\x1b[90m│ ${line.padEnd(boxWidthInterpretation - 4)} │\x1b[0m`)); // Simple padding
            console.log(`\x1b[90m╰${'─'.repeat(boxWidthInterpretation - 2)}╯\x1b[0m`);
            // For now, just return the text summary. Could parse structured output later.
            return text || defaultValue; 
        } catch (error) {
            console.error("[GeminiClient] Error interpreting perception data:", error);
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
        console.log(`[GeminiClient] Extracting propositions for frame: "${frame.name}"`);
        const prompt = this.buildExtractPropositionsPrompt(sourceData, frame);
        const defaultValue: string[] = [];

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text().trim(); // Keep original text for parsing

            // Log extracted propositions in a simple box
            const propositionsToLog = text ? text.split('\n').map(line => line.trim()).filter(line => line.length > 0) : ['<No propositions extracted>'];
            const headerPropositions = `💡 INTERNAL PROPOSITIONS (Frame: ${frame.name}) 💡`;
            const boxWidthPropositions = Math.max(headerPropositions.length, 80); // Adjust width as needed
            console.log(`\x1b[90m${headerPropositions}\x1b[0m`); // Gray header
            console.log(`\x1b[90m╭${'─'.repeat(boxWidthPropositions - 2)}╮\x1b[0m`);
            propositionsToLog.forEach(prop => console.log(`\x1b[90m│ - ${prop.padEnd(boxWidthPropositions - 6)} │\x1b[0m`)); // Simple padding
            console.log(`\x1b[90m╰${'─'.repeat(boxWidthPropositions - 2)}╯\x1b[0m`);

            // Attempt to parse the response as a list of strings (e.g., newline-separated)
            if (text) {
                // Simple split by newline, filter empty lines. Might need more robust parsing.
                const propositions = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                if (propositions.length > 0) {
                    return propositions;
                }
            }
            console.warn(`[GeminiClient] Failed to parse propositions from response: "${text}". Returning empty list.`);
            return defaultValue;

        } catch (error) {
            console.error("[GeminiClient] Error extracting propositions:", error);
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
      console.error("Error calling Gemini API:", error);
      return { response: "" };
    }
  }

  /**
   * Builds the prompt for the interpretPerceptionData call.
   */
  private buildInterpretPerceptionPrompt(perceptionData: unknown, frame: Frame): string { // Use unknown instead of any
         const dataString = typeof perceptionData === 'string' 
            ? perceptionData 
            : JSON.stringify(perceptionData);

        let prompt = `You are an agent operating under the cognitive frame "${frame.name}".\n`;
        prompt += `Frame Description: "${frame.description}".\n\n`;
        prompt += `The following data was just perceived:\n\`\`\`\n${dataString}\n\`\`\`\n\n`;
        prompt += `Instructions:\n`;
        prompt += `Interpret this data based on your current frame. Focus on the aspects most relevant to your frame's priorities.\n`;
        prompt += `Provide a concise summary or reinterpretation of the data. If the data contains multiple pieces of information, highlight or extract the most salient parts according to your frame.\n`;
        // Optional: Could ask for structured output later (e.g., JSON)
        
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
}
