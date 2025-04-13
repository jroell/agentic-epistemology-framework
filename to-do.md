# AEF Implementation To-Do List

This plan outlines the next steps for refining the Agentic Epistemology Framework implementation, focusing on enhancing LLM integration, improving core logic, and addressing remaining placeholders.

**Phase 1: Validation and LLM Reliability**

1.  **Add Basic Tests for Core Logic:**
    *   **Goal:** Ensure LLM-driven confidence calculations work reliably.
    *   **Tasks:**
        *   [ ] Create test files (e.g., `frame.test.ts`).
        *   [ ] Write unit tests for `computeInitialConfidence` and `updateConfidence` (e.g., in `EfficiencyFrame`).
        *   [ ] Use mock `JustificationElement`s and potentially mock `GeminiClient` for isolated logic testing.
        *   [ ] Add integration tests calling the actual `GeminiClient` to verify output format/range.
    *   **Files:** New test files, `src/epistemic/frame.ts`.

2.  **Refine LLM Prompts & Error Handling:**
    *   **Goal:** Improve LLM guidance and robustness of response handling.
    *   **Tasks:**
        *   [ ] Review/enhance prompts in `_build...Prompt` methods in `GeminiClient` for clarity and frame-specificity (especially for saliency).
        *   [ ] Improve error handling in `judge...` methods (e.g., add retry logic for transient API errors).
        *   [ ] Refine response parsing (e.g., for `extractRelevantPropositions`) for robustness.
    *   **Files:** `src/llm/gemini-client.ts`.

**Phase 2: Enhancing Epistemic Models**

3.  **Implement Memory-Based Trust Model:**
    *   **Goal:** Reduce LLM calls for trust by implementing learning/memory.
    *   **Tasks:**
        *   [ ] Design storage for trust scores in `Agent` or `Memory`.
        *   [ ] Update `judgeSourceTrust` to use/update stored scores, potentially falling back to LLM for unknown sources.
        *   [ ] Alternatively, implement non-LLM trust update logic based on feedback.
        *   [ ] Update `Frame.updateConfidence` / `evaluateExternalJustification` to use memory trust.
    *   **Files:** `src/core/agent.ts`, `src/core/memory.ts`, `src/llm/gemini-client.ts`, `src/epistemic/frame.ts`.

4.  **Refine Update Model Combination:**
    *   **Goal:** Determine and implement the best way to combine Frame-Weighted (Eq. 1) and Justification-Source (Eq. 2) updates.
    *   **Tasks:**
        *   [ ] Analyze alternative combination formulas (e.g., multiplicative trust modulation).
        *   [ ] Update the `if/else` logic in `Frame.updateConfidence` accordingly.
    *   **Files:** `src/epistemic/frame.ts`.

**Phase 3: Remaining Placeholders and Refinements**

5.  **Refine `interpretPerception` Output:**
    *   **Goal:** Make LLM perception interpretation return more structured/useful data.
    *   **Tasks:**
        *   [ ] Modify `_buildInterpretPerceptionPrompt` to request structured output (e.g., JSON).
        *   [ ] Update `interpretPerceptionData` in `GeminiClient` to parse the structure.
        *   [ ] Update `interpretPerception` in `Frame` classes to handle/store the structured data.
    *   **Files:** `src/llm/gemini-client.ts`, `src/epistemic/frame.ts`.

6.  **Refine `getCompatibility`:**
    *   **Goal:** Replace hardcoded `instanceof` checks with a principled approach.
    *   **Tasks:**
        *   [ ] Design logic (e.g., compare `frame.parameters`, use semantic similarity via LLM).
        *   [ ] Implement the new logic in `getCompatibility` methods.
    *   **Files:** `src/epistemic/frame.ts`.

7.  **Address `Agent.sendMessage`:**
    *   **Goal:** Implement actual inter-agent communication.
    *   **Tasks:**
        *   [ ] Choose communication mechanism (direct calls, events, message bus).
        *   [ ] Implement sending logic in `Agent.sendMessage`.
        *   [ ] Implement receiving logic that triggers `agent.perceive(new MessagePerception(...))`.
    *   **Files:** `src/core/agent.ts`, potentially new communication module.

8.  **Revisit `Belief.contradicts`:**
    *   **Goal:** Implement more sophisticated contradiction detection if needed beyond LLM strength judgment.
    *   **Tasks:** [ ] Integrate logic/semantic checks if necessary.
    *   **Files:** `src/epistemic/belief.ts`.

9.  **Comprehensive Testing:**
    *   **Goal:** Ensure overall correctness and robustness.
    *   **Tasks:** [ ] Add integration tests covering various scenarios.
    *   **Files:** New test files.

*(Note: The temporary fix for the missing `proposition` in `recomputeConfidence` also needs to be addressed, likely by changing its signature to accept the `Belief` object as discussed previously)*
