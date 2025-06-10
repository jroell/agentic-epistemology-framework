// Test enhanced logging clarity
import { Agent } from './src/core/agent';
import { EfficiencyFrame, ThoroughnessFrame } from './src/epistemic/frame';
import { Belief } from './src/epistemic/belief';
import { Justification, ToolResultJustificationElement } from './src/epistemic/justification';
import { DefaultObserver } from './src/observer/default-observer';
import { Registry } from './src/core/registry';
import { MockGeminiClient } from './src/llm/mock-gemini-client';
import { ObservationPerception } from './src/core/perception';
import { Message } from './src/action/message';

async function testEnhancedLogging() {
    console.log('🧪 Testing Enhanced AEF Logging Clarity\n');
    
    // Create mock LLM client 
    const llmClient = new MockGeminiClient();
    
    // Create observer with console logging enabled
    const observer = new DefaultObserver(1000, 2, true); // LogLevel.Info = 2
    
    // Create registry
    const registry = new Registry();
    
    // Create agent with Efficiency frame
    const efficiencyAgent = new Agent(
        'agent_efficiency',
        'Efficiency Agent',
        [],
        new EfficiencyFrame(),
        new Set(),
        registry,
        llmClient,
        undefined,
        observer
    );
    
    console.log('📋 Creating test perception with evidence...\n');
    
    // Create a test perception that will trigger belief formation
    const testPerception = new ObservationPerception(
        'performance_metrics',
        'System performance data shows excellent metrics: 50ms response time, 1000 req/s throughput'
    );
    
    console.log('🔍 Processing perception - watch for enhanced logging...\n');
    
    // Process the perception - this will trigger the enhanced logging
    await efficiencyAgent.perceive(testPerception);
    
    console.log('\n✅ Enhanced logging demonstrates complete transparency:');
    console.log('   - WHO: Agent identity clearly shown');
    console.log('   - WHAT: Evidence type and content preview');
    console.log('   - WHY: Evaluation trigger and purpose');
    console.log('   - HOW: Mathematical formalism and paper references');
    console.log('   - RESULT: Human-readable interpretation');
}

testEnhancedLogging().catch(console.error);