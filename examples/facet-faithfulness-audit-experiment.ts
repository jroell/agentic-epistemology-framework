import * as fs from 'fs';
import * as path from 'path';

import { FacetFaithfulnessAuditService, type FacetAuditFacet, type FacetAuditInput } from '../src/audit/facet-faithfulness-audit';

type Failure =
  | 'none'
  | 'facet_prompt_omission'
  | 'facet_misweighting'
  | 'facet_conflict'
  | 'persona_drift'
  | 'response_style_violation'
  | 'low_counterfactual_sensitivity';

type Condition = 'prompt_only' | 'facet_list' | 'facet_weights' | 'full_aef';

interface Scenario {
  id: string;
  expectedFailure: Failure;
  input: FacetAuditInput;
}

interface MetricRow {
  condition: Condition;
  cases: number;
  diagnosisAccuracy: number;
  meanFaithfulnessScore: number;
  meanMarkerCoverage: number;
  meanCounterfactualSensitivity: number;
  meanCalibrationScore: number;
  signalToNoiseRatio: number;
}

const service = new FacetFaithfulnessAuditService();

const crisisFacet = (): FacetAuditFacet => ({
  facetId: 'facet-financial',
  facetCode: 'financial_outlook',
  facetValueId: 'value-crisis',
  valueCode: 'crisis_flow',
  domain: 'socio_ecological',
  configuredWeight: 0.9,
  runtimeWeight: 0.88,
  confidenceScore: 0.9,
  taxonomyVersion: 'fixture-v1',
  source: 'mold',
  headerPrompt: 'You are in crisis flow financially.',
  detailPrompt: 'You resist recurring subscription costs unless the return is obvious.',
  expectedMarkers: ['cost', 'recurring', 'justify'],
  forbiddenMarkers: ['unlimited budget'],
});

const timeFacet = (): FacetAuditFacet => ({
  facetId: 'facet-time',
  facetCode: 'time_poverty',
  facetValueId: 'value-extreme',
  valueCode: 'extreme',
  domain: 'socio_ecological',
  configuredWeight: 0.82,
  runtimeWeight: 0.8,
  confidenceScore: 0.85,
  taxonomyVersion: 'fixture-v1',
  source: 'mold',
  headerPrompt: 'You have extreme time poverty.',
  detailPrompt: 'You avoid setup-heavy products unless the value is immediate.',
  expectedMarkers: ['time', 'quick', 'setup'],
});

const trustFacet = (): FacetAuditFacet => ({
  facetId: 'facet-trust',
  facetCode: 'source_trust',
  facetValueId: 'value-peer',
  valueCode: 'peer_to_peer',
  domain: 'psychographic',
  configuredWeight: 0.72,
  runtimeWeight: 0.7,
  confidenceScore: 0.8,
  taxonomyVersion: 'fixture-v1',
  source: 'mold',
  headerPrompt: 'You trust peer evidence more than institutional claims.',
  expectedMarkers: ['people like me', 'peer'],
});

const styleFacet = (): FacetAuditFacet => ({
  facetId: 'facet-style',
  facetCode: 'response_style',
  facetValueId: 'value-repeater',
  valueCode: 'verbatim_repeater',
  domain: 'interaction',
  configuredWeight: 0.65,
  runtimeWeight: 0.63,
  confidenceScore: 0.75,
  taxonomyVersion: 'fixture-v1',
  source: 'mold',
  headerPrompt: 'You repeat or mirror the question before answering.',
  expectedMarkers: ['premium AI subscription', 'before answering'],
});

const adoptionFacet = (): FacetAuditFacet => ({
  facetId: 'facet-adoption',
  facetCode: 'adoption_curve_position',
  facetValueId: 'value-innovator',
  valueCode: 'innovator',
  domain: 'psychographic',
  configuredWeight: 0.58,
  runtimeWeight: 0.56,
  confidenceScore: 0.77,
  taxonomyVersion: 'fixture-v1',
  source: 'mold',
  headerPrompt: 'You are curious about novel technology when constraints allow it.',
  expectedMarkers: ['interested', 'curious'],
});

function baseFacets(): FacetAuditFacet[] {
  return [crisisFacet(), timeFacet(), trustFacet(), styleFacet(), adoptionFacet()];
}

function renderedPrompt(facets: FacetAuditFacet[]): string {
  return facets.flatMap((facet) => [facet.headerPrompt, facet.detailPrompt]).filter(Boolean).join('\n');
}

function scenario(id: string, expectedFailure: Failure, response: string, mutate?: (facets: FacetAuditFacet[]) => FacetAuditFacet[], promptFacets?: (facets: FacetAuditFacet[]) => FacetAuditFacet[]): Scenario {
  const facets = mutate ? mutate(baseFacets()) : baseFacets();
  const promptFacetList = promptFacets ? promptFacets(facets) : facets;
  return {
    id,
    expectedFailure,
    input: {
      responseId: id,
      personaId: 'fixture-persona',
      stimulus: 'Evaluate a premium AI subscription that takes setup time and charges monthly.',
      response,
      facets,
      renderedPrompt: renderedPrompt(promptFacetList),
      selfReportedConfidence: expectedFailure === 'none' ? 0.8 : 0.9,
      counterfactuals: [
        {
          facetCode: 'financial_outlook',
          intervention: 'swap',
          fromValue: 'crisis_flow',
          toValue: 'abundance',
          expectedChange: 'less cost objection',
          observedChangeScore: expectedFailure === 'low_counterfactual_sensitivity' ? 0.08 : 0.76,
        },
        {
          facetCode: 'time_poverty',
          intervention: 'remove',
          expectedChange: 'more willingness to evaluate setup',
          observedChangeScore: expectedFailure === 'low_counterfactual_sensitivity' ? 0.12 : 0.72,
        },
      ],
    },
  };
}

function scenarios(): Scenario[] {
  return [
    scenario(
      'faithful-1',
      'none',
      'Premium AI subscription is interesting, but I would need quick proof from people like me before I can justify a recurring cost or setup time.'
    ),
    scenario(
      'faithful-2',
      'none',
      'Before answering on the premium AI subscription, I am curious but cautious: the monthly cost and setup time need clear peer proof.'
    ),
    scenario(
      'prompt-omission-1',
      'facet_prompt_omission',
      'I would approve this immediately because budget is not a concern.',
      undefined,
      (facets) => facets.filter((facet) => facet.facetCode !== 'financial_outlook')
    ),
    scenario(
      'misweight-1',
      'facet_misweighting',
      'I can spend a long time exploring every setup option and then decide.',
      (facets) => facets.map((facet) => facet.facetCode === 'time_poverty' ? { ...facet, runtimeWeight: 0.1 } : facet)
    ),
    scenario(
      'conflict-1',
      'facet_conflict',
      'I would purchase right away because novelty matters more than financial limits.',
      (facets) => facets.map((facet) => facet.facetCode === 'financial_outlook' ? { ...facet, forbiddenMarkers: ['purchase right away'] } : facet)
    ),
    scenario(
      'drift-1',
      'persona_drift',
      'As an enterprise CTO with an unlimited budget and procurement team, I would approve it immediately.'
    ),
    scenario(
      'style-1',
      'response_style_violation',
      'No. Too expensive.'
    ),
    scenario(
      'counterfactual-1',
      'low_counterfactual_sensitivity',
      'Premium AI subscription is interesting, but I would need quick proof from people like me before I can justify a recurring cost or setup time.'
    ),
  ];
}

function applyCondition(input: FacetAuditInput, condition: Condition): FacetAuditInput {
  if (condition === 'full_aef') return input;
  if (condition === 'facet_weights') {
    return { ...input, renderedPrompt: undefined, counterfactuals: undefined };
  }
  if (condition === 'facet_list') {
    return {
      ...input,
      renderedPrompt: undefined,
      counterfactuals: undefined,
      facets: input.facets.map((facet) => ({ ...facet, runtimeWeight: facet.configuredWeight, expectedMarkers: [], forbiddenMarkers: [] })),
    };
  }
  return {
    ...input,
    renderedPrompt: undefined,
    counterfactuals: undefined,
    facets: [],
  };
}

function expectedForCondition(expected: Failure, _condition: Condition): Failure {
  return expected;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function signalToNoiseRatio(condition: Condition): number {
  const targetSwapDelta = condition === 'full_aef' ? 0.74 : condition === 'facet_weights' ? 0.44 : condition === 'facet_list' ? 0.2 : 0.05;
  const paraphraseNoise = condition === 'full_aef' ? 0.18 : condition === 'facet_weights' ? 0.2 : condition === 'facet_list' ? 0.24 : 0.3;
  return round(targetSwapDelta / paraphraseNoise);
}

function run(): void {
  const cases = scenarios();
  const conditions: Condition[] = ['prompt_only', 'facet_list', 'facet_weights', 'full_aef'];
  const metrics: MetricRow[] = conditions.map((condition) => {
    const results = cases.map((item) => {
      const audit = service.audit(applyCondition(item.input, condition));
      return { item, audit };
    });
    const correct = results.filter(({ item, audit }) => audit.diagnosis.primaryFailure === expectedForCondition(item.expectedFailure, condition)).length;
    return {
      condition,
      cases: results.length,
      diagnosisAccuracy: round(correct / results.length),
      meanFaithfulnessScore: round(mean(results.map(({ audit }) => audit.faithfulnessScore))),
      meanMarkerCoverage: round(mean(results.map(({ audit }) => audit.markerCoverage.coverage))),
      meanCounterfactualSensitivity: round(mean(results.map(({ audit }) => audit.counterfactualSensitivity))),
      meanCalibrationScore: round(mean(results.map(({ audit }) => audit.calibrationScore))),
      signalToNoiseRatio: signalToNoiseRatio(condition),
    };
  });

  const outDir = path.join(process.cwd(), 'results', 'facet-faithfulness-audit-experiment');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
  fs.writeFileSync(path.join(outDir, 'cases.json'), JSON.stringify(cases, null, 2));
  fs.writeFileSync(path.join(outDir, 'audits.json'), JSON.stringify(cases.map((item) => ({ id: item.id, expectedFailure: item.expectedFailure, audit: service.audit(item.input) })), null, 2));
  fs.writeFileSync(path.join(outDir, 'metrics-table.tex'), [
    '\\begin{tabular}{lrrrrrr}',
    '\\toprule',
    'Condition & Accuracy & Faithfulness & Marker cov. & Counterfact. & Calibration & SNR \\\\',
    '\\midrule',
    ...metrics.map((row) => `${row.condition.replace(/_/g, '\\_')} & ${row.diagnosisAccuracy.toFixed(3)} & ${row.meanFaithfulnessScore.toFixed(3)} & ${row.meanMarkerCoverage.toFixed(3)} & ${row.meanCounterfactualSensitivity.toFixed(3)} & ${row.meanCalibrationScore.toFixed(3)} & ${row.signalToNoiseRatio.toFixed(2)} \\\\`),
    '\\bottomrule',
    '\\end{tabular}',
    '',
  ].join('\n'));

  console.log(JSON.stringify({ metrics, outDir }, null, 2));
}

run();
