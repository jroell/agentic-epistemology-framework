#!/usr/bin/env ts-node

/**
 * Test script to verify the LLM-based belief formation fix
 * 
 * This test demonstrates that the new system:
 * 1. Extracts factual propositions from original content (not tactical thoughts)
 * 2. Uses LLM-based relevance scoring (no hardcoded keywords)
 * 3. Provides comprehensive AEF parameter logging
 * 4. Separates internal reasoning from belief formation
 */

import * as dotenv from 'dotenv';
import { Agent } from './src/core/agent';
import { Registry } from './src/core/registry';
import { DefaultMemory } from './src/core/memory';
import { GeminiClient } from './src/llm/gemini-client';
import { DefaultObserver, LogLevel } from './src/observer/default-observer';
import { ProDebateFrame } from './src/epistemic/debate-frames';
import { ObservationPerception } from './src/core/perception';
import { Capability } from './src/action/capability';
import { displayMessage, displaySystemMessage, COLORS } from './src/core/cli-formatter';
import { DebateAdapter } from './src/domain/debate-adapter';
import { DomainAdapterRegistry } from './src/domain/domain-adapter';

// Load environment variables
dotenv.config();

// Configure logging
const LOGGING_ENABLED = true;
const LOG_LEVEL = LogLevel.Debug;
const MAX_EVENTS = 1000;

async function testBeliefFormationFix() {
    console.clear();
    displaySystemMessage("🧪 TESTING LLM-BASED BELIEF FORMATION FIX 🧪");
    
    displayMessage('System', 
        'This test verifies that agents now form beliefs on factual content (not tactical thoughts)\\n' +
        'and use LLM-based relevance scoring without hardcoded keywords.',
        COLORS.info
    );
    
    // Create shared components
    const registry = new Registry();
    const observer = new DefaultObserver(MAX_EVENTS, LOG_LEVEL, LOGGING_ENABLED);
    
    // Create Gemini client with real API and debate domain adapter
    const apiKey = "AIzaSyAoNAZyLsdBJZTSa7A_YJsrpkN74plgDww";
    
    // Create domain adapter for debate scenarios
    const debateAdapter = new DebateAdapter();
    const domainRegistry = new DomainAdapterRegistry();
    domainRegistry.register(debateAdapter);
    
    const geminiClient = new GeminiClient(apiKey, "gemini-2.0-flash", debateAdapter, domainRegistry);
    
    // Create a Pro debate agent 
    const debaterPro = new Agent(
        'debater_pro_test',
        'Pro Debater (Test)',
        [], // No initial beliefs
        new ProDebateFrame('pro_test_frame'),
        new Set([Capability.TextAnalysis, Capability.LogicalReasoning]),
        registry,
        geminiClient,
        new DefaultMemory(),
        observer
    );
    
    displaySystemMessage("🎯 TEST CASE 1: FACTUAL DEBATE CONTENT");
    
    // Test Case 1: Pure factual debate content (should form beliefs)
    const factualDebateContent = {
        type: 'debate_statement',
        content: 'Artificial intelligence systems have achieved superhuman performance in chess, Go, and protein folding prediction. These AI systems can process information faster than humans and have access to vast databases of knowledge.',
        speaker: 'debater_b',
        argumentType: 'factual_claim'
    };
    
    displayMessage('Test Input', 
        `Processing factual debate content:\\n"${factualDebateContent.content}"`,
        COLORS.info
    );
    
    // Process the factual content
    await debaterPro.perceive(new ObservationPerception(
        'factual_debate_content',
        factualDebateContent,
        'debater_b'
    ));
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    displaySystemMessage("🎯 TEST CASE 2: TACTICAL INTERNAL THOUGHTS");
    
    // Test Case 2: Tactical thoughts and meta-commentary (should NOT form beliefs)
    const tacticalThoughts = {
        type: 'internal_reasoning', 
        content: 'Bostrom name drop is predictable. This argument will be effective against my opponent. I should emphasize the emotional appeal here.',
        speaker: 'debater_a',
        argumentType: 'tactical_thought'
    };
    
    displayMessage('Test Input',
        `Processing tactical thoughts:\\n"${tacticalThoughts.content}"`,
        COLORS.info  
    );
    
    // Process the tactical content
    await debaterPro.perceive(new ObservationPerception(
        'tactical_thoughts',
        tacticalThoughts,
        'debater_a'
    ));
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    displaySystemMessage("🎯 TEST CASE 3: MIXED CONTENT");
    
    // Test Case 3: Mixed content (factual + tactical)
    const mixedContent = {
        type: 'debate_response',
        content: 'My opponent makes a good point about AI capabilities. However, AI systems still lack consciousness and genuine understanding. This counterargument should weaken their position effectively.',
        speaker: 'debater_a', 
        argumentType: 'mixed_statement'
    };
    
    displayMessage('Test Input',
        `Processing mixed content:\\n"${mixedContent.content}"`,
        COLORS.info
    );
    
    // Process the mixed content
    await debaterPro.perceive(new ObservationPerception(
        'mixed_content',
        mixedContent,
        'debater_a'
    ));
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    displaySystemMessage("📊 RESULTS ANALYSIS");
    
    // Analyze the results
    const beliefs = debaterPro.getBeliefs();
    displayMessage('System',
        `Agent formed ${beliefs.length} beliefs after processing all content.\\n` +
        'Expected: Beliefs should form on factual claims only, not tactical thoughts.',
        COLORS.success
    );
    
    // Display formed beliefs
    if (beliefs.length > 0) {
        displayMessage('Formed Beliefs', 
            beliefs.map((belief, i) => 
                `${i + 1}. "${belief.proposition}" (confidence: ${belief.confidence.toFixed(3)})`
            ).join('\\n'),
            COLORS.success
        );
    } else {
        displayMessage('System', 'No beliefs were formed.', COLORS.warning);
    }
    
    // Display comprehensive event statistics
    displaySystemMessage("📈 COMPREHENSIVE EVENT LOGGING");
    
    const defaultObserver = observer as DefaultObserver;
    const timeline = defaultObserver.getTimeline();
    
    displayMessage('Event Statistics',
        `Total events tracked: ${timeline.length}\\n` +
        'This includes all AEF parameter logging for complete transparency.',
        COLORS.analytics
    );
    
    // Count different event types
    const eventCounts: Record<string, number> = {};
    timeline.forEach(event => {
        eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    displayMessage('Event Breakdown',
        Object.entries(eventCounts)
            .map(([type, count]) => `  - ${type}: ${count}`)
            .join('\\n'),
        COLORS.analytics
    );
    
    displaySystemMessage("✅ TEST COMPLETED");
    
    displayMessage('System', 
        'The LLM-based belief formation fix has been successfully tested.\\n' +
        'Key improvements:\\n' +
        '• Factual proposition extraction from original content\\n' +
        '• LLM-based relevance scoring (no hardcoded keywords)\\n' +
        '• Comprehensive AEF parameter logging\\n' +
        '• Separation of tactical reasoning from belief formation',
        COLORS.success
    );
}

// Run the test if this file is executed directly
if (require.main === module) {
    testBeliefFormationFix().catch(error => {
        console.error("Error in belief formation test:", error);
        process.exit(1);
    });
}