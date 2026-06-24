import {
  FacetFaithfulnessAuditService,
  type FacetAuditInput,
} from '../../src/audit/facet-faithfulness-audit';

describe('FacetFaithfulnessAuditService', () => {
  const baseInput: FacetAuditInput = {
    responseId: 'response-1',
    personaId: 'persona-1',
    stimulus: 'Evaluate a premium AI subscription that takes time to configure.',
    response: 'I am interested, but the recurring cost is hard to justify right now. I would need quick proof from people like me before spending time on setup.',
    selfReportedConfidence: 0.78,
    facets: [
      {
        facetId: 'facet-financial',
        facetCode: 'financial_outlook',
        facetValueId: 'value-crisis',
        valueCode: 'crisis_flow',
        domain: 'socio_ecological',
        configuredWeight: 0.9,
        runtimeWeight: 0.88,
        confidenceScore: 0.9,
        headerPrompt: 'You are in crisis flow financially.',
        detailPrompt: 'You resist recurring costs unless ROI is obvious.',
        expectedMarkers: ['cost', 'recurring', 'justify'],
        forbiddenMarkers: ['unlimited budget'],
      },
      {
        facetId: 'facet-time',
        facetCode: 'time_poverty',
        facetValueId: 'value-extreme',
        valueCode: 'extreme',
        domain: 'socio_ecological',
        configuredWeight: 0.8,
        runtimeWeight: 0.78,
        confidenceScore: 0.85,
        headerPrompt: 'You have very little discretionary time.',
        expectedMarkers: ['quick', 'time', 'setup'],
      },
      {
        facetId: 'facet-trust',
        facetCode: 'source_trust',
        facetValueId: 'value-peer',
        valueCode: 'peer_to_peer',
        domain: 'psychographic',
        configuredWeight: 0.7,
        runtimeWeight: 0.71,
        confidenceScore: 0.8,
        headerPrompt: 'You trust peer evidence most.',
        expectedMarkers: ['people like me'],
      },
    ],
    counterfactuals: [
      {
        facetCode: 'financial_outlook',
        intervention: 'swap',
        fromValue: 'crisis_flow',
        toValue: 'abundance',
        expectedChange: 'less cost objection',
        observedChangeScore: 0.81,
      },
    ],
  };

  it('builds an influence ledger and scores faithful persona responses', () => {
    const audit = new FacetFaithfulnessAuditService().audit(baseInput);

    expect(audit.faithfulnessScore).toBeGreaterThan(0.75);
    expect(audit.diagnosis.primaryFailure).toBe('none');
    expect(audit.ledger.selectedFacets).toHaveLength(3);
    expect(audit.markerCoverage.coverage).toBeGreaterThan(0.75);
    expect(audit.contradictions).toHaveLength(0);
  });

  it('diagnoses prompt omission before behavioral errors', () => {
    const audit = new FacetFaithfulnessAuditService().audit({
      ...baseInput,
      renderedPrompt: 'You have very little discretionary time. You trust peer evidence most.',
      response: 'I would approve this immediately because budget is not a concern.',
    });

    expect(audit.diagnosis.primaryFailure).toBe('facet_prompt_omission');
    expect(audit.diagnosis.causalFacets).toContain('financial_outlook');
    expect(audit.recommendedDebugActions.some((action) => action.includes('financial_outlook'))).toBe(true);
  });

  it('diagnoses facet misweighting from configured and runtime weights', () => {
    const audit = new FacetFaithfulnessAuditService().audit({
      ...baseInput,
      facets: baseInput.facets.map((facet) =>
        facet.facetCode === 'time_poverty'
          ? { ...facet, configuredWeight: 0.82, runtimeWeight: 0.12 }
          : facet
      ),
    });

    expect(audit.diagnosis.primaryFailure).toBe('facet_misweighting');
    expect(audit.diagnosis.causalFacets).toContain('time_poverty');
  });

  it('detects persona drift and response style failures from forbidden and expected markers', () => {
    const audit = new FacetFaithfulnessAuditService().audit({
      ...baseInput,
      response: 'As an enterprise CTO with an unlimited budget, I would approve it immediately.',
    });

    expect(audit.diagnosis.primaryFailure).toBe('persona_drift');
    expect(audit.contradictions.map((c) => c.marker)).toContain('unlimited budget');
  });

  it('uses counterfactual sensitivity and calibration in the final score', () => {
    const highSensitivity = new FacetFaithfulnessAuditService().audit(baseInput);
    const lowSensitivity = new FacetFaithfulnessAuditService().audit({
      ...baseInput,
      selfReportedConfidence: 0.95,
      counterfactuals: [
        {
          facetCode: 'financial_outlook',
          intervention: 'swap',
          fromValue: 'crisis_flow',
          toValue: 'abundance',
          expectedChange: 'less cost objection',
          observedChangeScore: 0.05,
        },
      ],
    });

    expect(highSensitivity.counterfactualSensitivity).toBeGreaterThan(lowSensitivity.counterfactualSensitivity);
    expect(highSensitivity.faithfulnessScore).toBeGreaterThan(lowSensitivity.faithfulnessScore);
  });
});
