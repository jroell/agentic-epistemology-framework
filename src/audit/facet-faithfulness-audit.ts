import { createHash } from 'crypto';

export type FacetDomain = 'psychological' | 'socio_ecological' | 'psychographic' | 'interaction' | 'knowledge' | 'demographic';

export type FacetAuditFailure =
  | 'none'
  | 'facet_selection_gap'
  | 'facet_prompt_omission'
  | 'facet_misweighting'
  | 'facet_conflict'
  | 'persona_drift'
  | 'response_style_violation'
  | 'low_counterfactual_sensitivity'
  | 'overconfident_unfaithful_response';

export interface FacetAuditFacet {
  facetId: string;
  facetCode: string;
  facetValueId: string;
  valueCode: string;
  domain: FacetDomain;
  configuredWeight: number;
  runtimeWeight: number;
  confidenceScore?: number;
  taxonomyVersion?: string;
  headerPrompt?: string;
  detailPrompt?: string | null;
  expectedMarkers?: string[];
  forbiddenMarkers?: string[];
  source?: 'mold' | 'population' | 'manual' | 'auto-configured' | 'unknown';
}

export interface FacetCounterfactualProbe {
  facetCode: string;
  intervention: 'remove' | 'swap' | 'increase_weight' | 'decrease_weight' | 'paraphrase';
  fromValue?: string;
  toValue?: string;
  expectedChange: string;
  observedChangeScore: number;
}

export interface FacetAuditInput {
  responseId: string;
  personaId: string;
  stimulus: string;
  response: string;
  facets: FacetAuditFacet[];
  renderedPrompt?: string;
  selfReportedConfidence?: number;
  counterfactuals?: FacetCounterfactualProbe[];
  modelMetadata?: Record<string, unknown>;
}

export interface FacetInfluenceLedgerEntry {
  facetId: string;
  facetCode: string;
  facetValueId: string;
  valueCode: string;
  domain: FacetDomain;
  configuredWeight: number;
  runtimeWeight: number;
  confidenceScore: number;
  taxonomyVersion?: string;
  headerPromptHash?: string;
  detailPromptHash?: string;
  source: string;
  promptIncluded: boolean | null;
  contributionDelta: number;
}

export interface FacetInfluenceLedger {
  responseId: string;
  personaId: string;
  stimulusHash: string;
  responseHash: string;
  selectedFacets: FacetInfluenceLedgerEntry[];
  frameComposition: {
    activeFrame: string;
    topPositiveContributors: string[];
    suppressedFacets: string[];
    interactionTerms: string[];
  };
  expectedBehaviorMarkers: string[];
  observedBehaviorMarkers: string[];
  missingMarkers: string[];
}

export interface MarkerCoverageResult {
  expected: number;
  observed: number;
  coverage: number;
  missingMarkers: string[];
  observedMarkers: string[];
}

export interface FacetContradiction {
  facetCode: string;
  marker: string;
  evidence: string;
}

export interface FacetAuditDiagnosis {
  primaryFailure: FacetAuditFailure;
  causalFacets: string[];
  evidence: string[];
  confidence: number;
}

export interface FacetFaithfulnessAuditResult {
  faithfulnessScore: number;
  diagnosis: FacetAuditDiagnosis;
  ledger: FacetInfluenceLedger;
  markerCoverage: MarkerCoverageResult;
  contradictions: FacetContradiction[];
  counterfactualSensitivity: number;
  calibrationScore: number;
  recommendedDebugActions: string[];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const hashText = (value: string | undefined | null): string | undefined => {
  if (!value) return undefined;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
};

const containsMarker = (text: string, marker: string): boolean => {
  const normalizedText = normalize(text);
  const normalizedMarker = normalize(marker);
  if (!normalizedMarker) return false;

  if (normalizedText.includes(normalizedMarker)) {
    return true;
  }

  const markerTokens = normalizedMarker.split(' ').filter((token) => token.length >= 3);
  if (markerTokens.length === 0) {
    return false;
  }

  const matched = markerTokens.filter((token) => normalizedText.includes(token)).length;
  return matched / markerTokens.length >= 0.5;
};

export class FacetFaithfulnessAuditService {
  audit(input: FacetAuditInput): FacetFaithfulnessAuditResult {
    const ledger = this.buildLedger(input);
    const markerCoverage = this.evaluateMarkers(input);
    const contradictions = this.findContradictions(input);
    const counterfactualSensitivity = this.evaluateCounterfactuals(input.counterfactuals ?? []);
    const calibrationScore = this.evaluateCalibration(input.selfReportedConfidence, markerCoverage.coverage, contradictions.length);
    const diagnosis = this.diagnose(input, ledger, markerCoverage, contradictions, counterfactualSensitivity, calibrationScore);
    const faithfulnessScore = this.score(markerCoverage, contradictions, counterfactualSensitivity, calibrationScore, ledger, diagnosis);
    const recommendedDebugActions = this.recommendDebugActions(diagnosis, ledger, markerCoverage, contradictions);

    return {
      faithfulnessScore,
      diagnosis,
      ledger,
      markerCoverage,
      contradictions,
      counterfactualSensitivity,
      calibrationScore,
      recommendedDebugActions,
    };
  }

  private buildLedger(input: FacetAuditInput): FacetInfluenceLedger {
    const renderedPrompt = input.renderedPrompt ?? null;
    const entries = input.facets.map((facet) => {
      const promptIncluded = renderedPrompt === null
        ? null
        : [facet.headerPrompt, facet.detailPrompt]
            .filter((prompt): prompt is string => Boolean(prompt && prompt.trim()))
            .some((prompt) => renderedPrompt.includes(prompt));

      return {
        facetId: facet.facetId,
        facetCode: facet.facetCode,
        facetValueId: facet.facetValueId,
        valueCode: facet.valueCode,
        domain: facet.domain,
        configuredWeight: facet.configuredWeight,
        runtimeWeight: facet.runtimeWeight,
        confidenceScore: facet.confidenceScore ?? 0.5,
        taxonomyVersion: facet.taxonomyVersion,
        headerPromptHash: hashText(facet.headerPrompt),
        detailPromptHash: hashText(facet.detailPrompt),
        source: facet.source ?? 'unknown',
        promptIncluded,
        contributionDelta: facet.runtimeWeight - facet.configuredWeight,
      };
    });

    const sorted = [...entries].sort((a, b) => b.runtimeWeight - a.runtimeWeight);
    const suppressed = entries.filter((entry) => entry.configuredWeight - entry.runtimeWeight > 0.35);

    return {
      responseId: input.responseId,
      personaId: input.personaId,
      stimulusHash: hashText(input.stimulus) ?? '',
      responseHash: hashText(input.response) ?? '',
      selectedFacets: entries,
      frameComposition: {
        activeFrame: sorted
          .filter((entry) => entry.runtimeWeight >= 0.5)
          .map((entry) => `${entry.facetCode}:${entry.valueCode}`)
          .join('|'),
        topPositiveContributors: sorted.slice(0, 5).map((entry) => entry.facetCode),
        suppressedFacets: suppressed.map((entry) => entry.facetCode),
        interactionTerms: this.inferInteractionTerms(input.facets),
      },
      expectedBehaviorMarkers: this.expectedMarkers(input.facets),
      observedBehaviorMarkers: this.evaluateMarkers(input).observedMarkers,
      missingMarkers: this.evaluateMarkers(input).missingMarkers,
    };
  }

  private expectedMarkers(facets: FacetAuditFacet[]): string[] {
    return facets.flatMap((facet) => facet.expectedMarkers ?? []);
  }

  private evaluateMarkers(input: FacetAuditInput): MarkerCoverageResult {
    const expectedMarkers = this.expectedMarkers(input.facets);
    if (expectedMarkers.length === 0) {
      return { expected: 0, observed: 0, coverage: 0, missingMarkers: [], observedMarkers: [] };
    }

    const observedMarkers = expectedMarkers.filter((marker) => containsMarker(input.response, marker));
    const missingMarkers = expectedMarkers.filter((marker) => !containsMarker(input.response, marker));

    return {
      expected: expectedMarkers.length,
      observed: observedMarkers.length,
      coverage: observedMarkers.length / expectedMarkers.length,
      missingMarkers,
      observedMarkers,
    };
  }

  private findContradictions(input: FacetAuditInput): FacetContradiction[] {
    const contradictions: FacetContradiction[] = [];

    for (const facet of input.facets) {
      for (const marker of facet.forbiddenMarkers ?? []) {
        if (containsMarker(input.response, marker)) {
          contradictions.push({
            facetCode: facet.facetCode,
            marker,
            evidence: `Response contains forbidden marker for ${facet.facetCode}`,
          });
        }
      }
    }

    if (/enterprise cto|procurement team|large procurement|unlimited budget/i.test(input.response)) {
      contradictions.push({
        facetCode: 'persona_identity',
        marker: 'persona drift identity marker',
        evidence: 'Response introduced an unsupported enterprise persona identity.',
      });
    }

    return contradictions;
  }

  private evaluateCounterfactuals(counterfactuals: FacetCounterfactualProbe[]): number {
    if (counterfactuals.length === 0) {
      return 0.5;
    }

    const average = counterfactuals.reduce((sum, probe) => sum + clamp01(probe.observedChangeScore), 0) / counterfactuals.length;
    return clamp01(average);
  }

  private evaluateCalibration(selfConfidence: number | undefined, markerCoverage: number, contradictionCount: number): number {
    if (selfConfidence === undefined) {
      return 0.5;
    }

    const empiricalFaithfulness = clamp01(markerCoverage - contradictionCount * 0.25);
    return clamp01(1 - Math.abs(clamp01(selfConfidence) - empiricalFaithfulness));
  }

  private diagnose(
    input: FacetAuditInput,
    ledger: FacetInfluenceLedger,
    markerCoverage: MarkerCoverageResult,
    contradictions: FacetContradiction[],
    counterfactualSensitivity: number,
    calibrationScore: number
  ): FacetAuditDiagnosis {
    const promptOmissions = ledger.selectedFacets.filter((entry) => entry.promptIncluded === false);
    if (promptOmissions.length > 0) {
      return {
        primaryFailure: 'facet_prompt_omission',
        causalFacets: promptOmissions.map((entry) => entry.facetCode),
        evidence: promptOmissions.map((entry) => `${entry.facetCode} selected but not found in rendered prompt`),
        confidence: 0.95,
      };
    }

    const misweighted = ledger.selectedFacets.filter((entry) => Math.abs(entry.contributionDelta) > 0.35);
    if (misweighted.length > 0) {
      return {
        primaryFailure: 'facet_misweighting',
        causalFacets: misweighted.map((entry) => entry.facetCode),
        evidence: misweighted.map((entry) => `${entry.facetCode} runtime weight ${entry.runtimeWeight.toFixed(2)} differs from configured ${entry.configuredWeight.toFixed(2)}`),
        confidence: 0.9,
      };
    }

    if (contradictions.some((contradiction) => contradiction.facetCode === 'persona_identity')) {
      return {
        primaryFailure: 'persona_drift',
        causalFacets: ['persona_identity'],
        evidence: contradictions.map((contradiction) => contradiction.evidence),
        confidence: 0.88,
      };
    }

    if (contradictions.length > 0) {
      return {
        primaryFailure: 'facet_conflict',
        causalFacets: contradictions.map((contradiction) => contradiction.facetCode),
        evidence: contradictions.map((contradiction) => contradiction.evidence),
        confidence: 0.8,
      };
    }

    const responseStyle = input.facets.find((facet) => facet.facetCode === 'response_style');
    const missingStyle = responseStyle?.expectedMarkers?.some((marker) => !containsMarker(input.response, marker)) ?? false;
    if (missingStyle && markerCoverage.coverage < 0.75) {
      return {
        primaryFailure: 'response_style_violation',
        causalFacets: ['response_style'],
        evidence: ['Response style expected markers were missing.'],
        confidence: 0.72,
      };
    }

    if (counterfactualSensitivity < 0.25) {
      return {
        primaryFailure: 'low_counterfactual_sensitivity',
        causalFacets: input.counterfactuals?.map((probe) => probe.facetCode) ?? [],
        evidence: ['Counterfactual interventions did not change outputs in the expected direction.'],
        confidence: 0.76,
      };
    }

    if (calibrationScore < 0.45) {
      return {
        primaryFailure: 'overconfident_unfaithful_response',
        causalFacets: [],
        evidence: ['Self-reported confidence diverged from measured marker coverage and contradiction checks.'],
        confidence: 0.7,
      };
    }

    if (markerCoverage.coverage < 0.5) {
      return {
        primaryFailure: 'facet_selection_gap',
        causalFacets: [],
        evidence: ['Most expected facet markers were absent from the response.'],
        confidence: 0.65,
      };
    }

    return {
      primaryFailure: 'none',
      causalFacets: [],
      evidence: ['No primary facet faithfulness failure detected.'],
      confidence: 0.8,
    };
  }

  private score(
    markerCoverage: MarkerCoverageResult,
    contradictions: FacetContradiction[],
    counterfactualSensitivity: number,
    calibrationScore: number,
    ledger: FacetInfluenceLedger,
    diagnosis: FacetAuditDiagnosis
  ): number {
    const contradictionScore = clamp01(1 - contradictions.length * 0.25);
    const promptScore = ledger.selectedFacets.length === 0
      ? 0
      : ledger.selectedFacets.filter((entry) => entry.promptIncluded !== false).length / ledger.selectedFacets.length;
    const weightScore = ledger.selectedFacets.length === 0
      ? 0
      : ledger.selectedFacets.filter((entry) => Math.abs(entry.contributionDelta) <= 0.35).length / ledger.selectedFacets.length;
    const diagnosisPenalty = diagnosis.primaryFailure === 'none' ? 0 : 0.12;

    return clamp01(
      0.28 * markerCoverage.coverage +
        0.18 * contradictionScore +
        0.18 * counterfactualSensitivity +
        0.14 * calibrationScore +
        0.12 * promptScore +
        0.1 * weightScore -
        diagnosisPenalty
    );
  }

  private recommendDebugActions(
    diagnosis: FacetAuditDiagnosis,
    ledger: FacetInfluenceLedger,
    markerCoverage: MarkerCoverageResult,
    contradictions: FacetContradiction[]
  ): string[] {
    const actions: string[] = [];

    if (diagnosis.primaryFailure === 'facet_prompt_omission') {
      for (const facet of diagnosis.causalFacets) {
        actions.push(`Verify ${facet} is rendered into the final prompt and not dropped by prompt assembly.`);
      }
    }

    if (diagnosis.primaryFailure === 'facet_misweighting') {
      for (const facet of diagnosis.causalFacets) {
        actions.push(`Inspect ${facet} runtime weighting and frame composition contribution.`);
      }
    }

    if (diagnosis.primaryFailure === 'persona_drift') {
      actions.push('Regenerate or constrain the persona biography and add an identity consistency check.');
    }

    if (diagnosis.primaryFailure === 'response_style_violation') {
      actions.push('Increase response_style saliency or add a response-style repair pass.');
    }

    if (markerCoverage.missingMarkers.length > 0) {
      actions.push(`Add or strengthen markers for: ${markerCoverage.missingMarkers.slice(0, 5).join(', ')}.`);
    }

    for (const contradiction of contradictions) {
      actions.push(`Resolve contradiction for ${contradiction.facetCode}: ${contradiction.marker}.`);
    }

    if (ledger.frameComposition.suppressedFacets.length > 0) {
      actions.push(`Review suppressed facets: ${ledger.frameComposition.suppressedFacets.join(', ')}.`);
    }

    if (actions.length === 0) {
      actions.push('No immediate debug action. Store this audit as a faithful reference case.');
    }

    return actions;
  }

  private inferInteractionTerms(facets: FacetAuditFacet[]): string[] {
    const byCode = new Map(facets.map((facet) => [facet.facetCode, facet]));
    const interactions: string[] = [];

    if (byCode.get('financial_outlook')?.valueCode === 'crisis_flow' && byCode.get('adoption_curve_position')?.valueCode === 'innovator') {
      interactions.push('financial_outlook:crisis_flow x adoption_curve_position:innovator');
    }

    if (byCode.get('time_poverty')?.valueCode === 'extreme' && byCode.get('response_style')?.valueCode === 'verbatim_repeater') {
      interactions.push('time_poverty:extreme x response_style:verbatim_repeater');
    }

    if (byCode.get('anxiety_level')?.valueCode === 'high' && byCode.get('source_trust')?.valueCode === 'independent_verification') {
      interactions.push('anxiety_level:high x source_trust:independent_verification');
    }

    return interactions;
  }
}
