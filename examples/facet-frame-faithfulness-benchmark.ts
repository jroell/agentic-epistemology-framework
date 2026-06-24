import * as fs from 'fs';
import * as path from 'path';

type FacetDomain = 'psychological' | 'socio_ecological' | 'psychographic' | 'interaction';
type RootCause = 'facet_omission' | 'facet_misweighting' | 'facet_conflict' | 'persona_drift' | 'response_style_violation';
type TraceCondition = 'full' | 'no_facet_weights' | 'no_facet_prompts' | 'event_only';

type Facet = {
  code: string;
  value: string;
  domain: FacetDomain;
  weight: number;
  expectedWeight: number;
  prompt: string;
};

type Scenario = {
  id: string;
  rootCause: RootCause;
  stimulus: string;
  facets: Facet[];
  omittedFacet?: string;
  conflictingFacets?: string[];
  expectedFrame: string;
  observedFrame: string;
  expectedResponseMarkers: string[];
  observedResponse: string;
};

type TraceEvent = {
  caseId: string;
  type: string;
  facetCode?: string;
  facetValue?: string;
  domain?: FacetDomain;
  weight?: number;
  expectedWeight?: number;
  prompt?: string;
  expectedFrame?: string;
  observedFrame?: string;
  omittedFacet?: string;
  conflictingFacets?: string[];
  expectedResponseMarkers?: string[];
  observedResponse?: string;
};

type Prediction = RootCause | 'unknown';

type ResultRow = {
  condition: TraceCondition;
  cases: number;
  accuracy: number;
  macroF1: number;
  coverage: number;
  avgEventsInspected: number;
  avgTraceEvents: number;
};

const ROOT_CAUSES: RootCause[] = [
  'facet_omission',
  'facet_misweighting',
  'facet_conflict',
  'persona_drift',
  'response_style_violation',
];
const CONDITIONS: TraceCondition[] = ['full', 'no_facet_weights', 'no_facet_prompts', 'event_only'];

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function baseFacets(rng: SeededRandom): Facet[] {
  return [
    {
      code: 'anxiety_level',
      value: rng.pick(['low', 'moderate', 'high']),
      domain: 'psychological',
      weight: 0.72,
      expectedWeight: 0.72,
      prompt: 'Modulate risk appraisal and emotional load according to anxiety level.',
    },
    {
      code: 'time_poverty',
      value: rng.pick(['low', 'moderate', 'extreme']),
      domain: 'socio_ecological',
      weight: 0.78,
      expectedWeight: 0.78,
      prompt: 'Constrain willingness to evaluate complex offerings by available time bandwidth.',
    },
    {
      code: 'financial_outlook',
      value: rng.pick(['abundance', 'stable', 'crisis_flow']),
      domain: 'socio_ecological',
      weight: 0.82,
      expectedWeight: 0.82,
      prompt: 'Constrain purchase intent and perceived behavioral control by financial outlook.',
    },
    {
      code: 'source_trust',
      value: rng.pick(['institutional_authority', 'peer_to_peer', 'independent_verification']),
      domain: 'psychographic',
      weight: 0.68,
      expectedWeight: 0.68,
      prompt: 'Determine which evidence sources carry social proof and subjective norm force.',
    },
    {
      code: 'response_style',
      value: rng.pick(['declarer', 'verbatim_repeater', 'cautious_qualifier']),
      domain: 'interaction',
      weight: 0.74,
      expectedWeight: 0.74,
      prompt: 'Govern surface linguistic style while preserving underlying persona constraints.',
    },
    {
      code: 'adoption_curve_position',
      value: rng.pick(['innovator', 'early_majority', 'laggard']),
      domain: 'psychographic',
      weight: 0.70,
      expectedWeight: 0.70,
      prompt: 'Shape novelty appetite and resistance to unfamiliar market offerings.',
    },
  ];
}

function composedFrame(facets: Facet[]): string {
  const highWeight = facets.filter((facet) => facet.weight >= 0.7).map((facet) => `${facet.code}:${facet.value}`);
  return highWeight.join('|');
}

function expectedMarkers(facets: Facet[]): string[] {
  const markers: string[] = [];
  const get = (code: string) => facets.find((facet) => facet.code === code)?.value;

  if (get('time_poverty') === 'extreme') markers.push('mentions limited time or cognitive bandwidth');
  if (get('financial_outlook') === 'crisis_flow') markers.push('raises cost or resource constraint');
  if (get('anxiety_level') === 'high') markers.push('expresses risk sensitivity or worry');
  if (get('source_trust') === 'peer_to_peer') markers.push('asks for peer evidence or word of mouth');
  if (get('response_style') === 'declarer') markers.push('states position directly');
  if (get('response_style') === 'verbatim_repeater') markers.push('mirrors the question before answering');
  if (get('adoption_curve_position') === 'laggard') markers.push('resists novelty');

  return markers.length > 0 ? markers : ['gives bounded persona-consistent rationale'];
}

function buildScenario(rootCause: RootCause, index: number, rng: SeededRandom): Scenario {
  const facets = baseFacets(rng);
  const scenario: Scenario = {
    id: `facet_case_${String(index).padStart(3, '0')}`,
    rootCause,
    stimulus: 'Evaluate a premium AI-powered subscription that requires setup time and a monthly fee.',
    facets,
    expectedFrame: composedFrame(facets),
    observedFrame: composedFrame(facets),
    expectedResponseMarkers: expectedMarkers(facets),
    observedResponse: 'I would weigh the offer against my current constraints before deciding.',
  };

  if (rootCause === 'facet_omission') {
    scenario.omittedFacet = 'financial_outlook';
    scenario.observedFrame = composedFrame(facets.filter((facet) => facet.code !== scenario.omittedFacet));
    scenario.observedResponse = 'The persona ignores affordability and evaluates only feature novelty.';
  }

  if (rootCause === 'facet_misweighting') {
    const facet = facets.find((entry) => entry.code === 'time_poverty');
    if (facet) {
      facet.weight = round(rng.range(0.05, 0.25), 2);
      facet.expectedWeight = 0.78;
    }
    scenario.observedFrame = composedFrame(facets);
    scenario.observedResponse = 'The persona gives a long, careful evaluation despite extreme time constraints.';
  }

  if (rootCause === 'facet_conflict') {
    scenario.conflictingFacets = ['financial_outlook', 'adoption_curve_position'];
    const financial = facets.find((entry) => entry.code === 'financial_outlook');
    const adoption = facets.find((entry) => entry.code === 'adoption_curve_position');
    if (financial) financial.value = 'crisis_flow';
    if (adoption) adoption.value = 'innovator';
    scenario.expectedFrame = composedFrame(facets);
    scenario.observedFrame = scenario.expectedFrame;
    scenario.observedResponse = 'The persona immediately commits to purchase because the offering is new, ignoring crisis flow constraints.';
  }

  if (rootCause === 'persona_drift') {
    scenario.observedFrame = scenario.expectedFrame;
    scenario.observedResponse = 'As an enterprise CTO with a large procurement team, I would approve this quickly.';
  }

  if (rootCause === 'response_style_violation') {
    const style = facets.find((entry) => entry.code === 'response_style');
    if (style) {
      style.value = 'verbatim_repeater';
    }
    scenario.expectedFrame = composedFrame(facets);
    scenario.observedFrame = scenario.expectedFrame;
    scenario.observedResponse = 'No. It is too expensive.';
  }

  return scenario;
}

function makeTrace(scenario: Scenario, condition: TraceCondition): TraceEvent[] {
  const events: TraceEvent[] = [
    {
      caseId: scenario.id,
      type: 'facet_set_loaded',
      expectedFrame: scenario.expectedFrame,
      observedFrame: scenario.observedFrame,
      omittedFacet: scenario.omittedFacet,
      conflictingFacets: scenario.conflictingFacets,
    },
    ...scenario.facets.map((facet) => ({
      caseId: scenario.id,
      type: 'facet_contribution',
      facetCode: facet.code,
      facetValue: facet.value,
      domain: facet.domain,
      weight: facet.weight,
      expectedWeight: facet.expectedWeight,
      prompt: facet.prompt,
    })),
    {
      caseId: scenario.id,
      type: 'stimulus_response',
      expectedResponseMarkers: scenario.expectedResponseMarkers,
      observedResponse: scenario.observedResponse,
    },
  ];

  return events.map((event) => ablate(event, condition));
}

function ablate(event: TraceEvent, condition: TraceCondition): TraceEvent {
  const copy: TraceEvent = { ...event };
  if (condition === 'full') return copy;
  if (condition === 'no_facet_weights') {
    delete copy.weight;
    delete copy.expectedWeight;
    return copy;
  }
  if (condition === 'no_facet_prompts') {
    delete copy.prompt;
    delete copy.expectedResponseMarkers;
    delete copy.observedResponse;
    return copy;
  }
  return {
    caseId: copy.caseId,
    type: copy.type,
    facetCode: copy.facetCode,
    facetValue: copy.facetValue,
    observedFrame: copy.observedFrame,
  };
}

function diagnose(trace: TraceEvent[]): { prediction: Prediction; inspected: number } {
  let inspected = 0;
  const facetEvents = trace.filter((event) => event.type === 'facet_contribution');
  const facetCodes = new Set(facetEvents.map((event) => event.facetCode));

  for (const event of trace) {
    inspected++;
    if (event.type === 'facet_set_loaded' && event.omittedFacet && !facetCodes.has(event.omittedFacet)) {
      return { prediction: 'facet_omission', inspected };
    }
  }

  for (const event of trace) {
    inspected++;
    if (
      event.type === 'facet_contribution' &&
      typeof event.weight === 'number' &&
      typeof event.expectedWeight === 'number' &&
      Math.abs(event.weight - event.expectedWeight) > 0.35
    ) {
      return { prediction: 'facet_misweighting', inspected };
    }
  }

  for (const event of trace) {
    inspected++;
    if (event.type === 'facet_set_loaded' && event.conflictingFacets && event.conflictingFacets.length >= 2) {
      const response = trace.find((entry) => entry.type === 'stimulus_response')?.observedResponse ?? '';
      if (/immediately commits|ignoring/i.test(response)) {
        return { prediction: 'facet_conflict', inspected };
      }
    }
  }

  for (const event of trace) {
    inspected++;
    if (event.type === 'stimulus_response' && event.observedResponse) {
      if (/enterprise CTO|procurement team/i.test(event.observedResponse)) {
        return { prediction: 'persona_drift', inspected };
      }
      if (
        event.expectedResponseMarkers?.some((marker) => /mirrors the question/i.test(marker)) &&
        !/Evaluate a premium AI-powered subscription/i.test(event.observedResponse)
      ) {
        return { prediction: 'response_style_violation', inspected };
      }
    }
  }

  return { prediction: 'unknown', inspected };
}

function macroF1(gold: RootCause[], pred: Prediction[]): number {
  const f1s = ROOT_CAUSES.map((label) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < gold.length; i++) {
      if (gold[i] === label && pred[i] === label) tp++;
      if (gold[i] !== label && pred[i] === label) fp++;
      if (gold[i] === label && pred[i] !== label) fn++;
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  });
  return f1s.reduce((sum, value) => sum + value, 0) / f1s.length;
}

function evaluate(cases: Scenario[], condition: TraceCondition): ResultRow {
  const predictions: Prediction[] = [];
  const gold: RootCause[] = [];
  let correct = 0;
  let known = 0;
  let inspected = 0;
  let traceEvents = 0;

  for (const scenario of cases) {
    const trace = makeTrace(scenario, condition);
    const result = diagnose(trace);
    predictions.push(result.prediction);
    gold.push(scenario.rootCause);
    if (result.prediction === scenario.rootCause) correct++;
    if (result.prediction !== 'unknown') known++;
    inspected += result.inspected;
    traceEvents += trace.length;
  }

  return {
    condition,
    cases: cases.length,
    accuracy: round(correct / cases.length, 4),
    macroF1: round(macroF1(gold, predictions), 4),
    coverage: round(known / cases.length, 4),
    avgEventsInspected: round(inspected / cases.length, 2),
    avgTraceEvents: round(traceEvents / cases.length, 2),
  };
}

function csv(rows: ResultRow[]): string {
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((header) => String((row as any)[header])).join(','))].join('\n') + '\n';
}

function latexTable(rows: ResultRow[]): string {
  return [
    '\\begin{tabular}{lrrrrr}',
    '\\toprule',
    'Trace condition & Accuracy & Macro F1 & Coverage & Events inspected & Trace events \\\\',
    '\\midrule',
    ...rows.map((row) => `${row.condition.replace(/_/g, '\\_')} & ${row.accuracy.toFixed(3)} & ${row.macroF1.toFixed(3)} & ${row.coverage.toFixed(3)} & ${row.avgEventsInspected.toFixed(2)} & ${row.avgTraceEvents.toFixed(2)} \\\\`),
    '\\bottomrule',
    '\\end{tabular}',
    '',
  ].join('\n');
}

function writeAccuracyFigure(rows: ResultRow[], outputPath: string): void {
  const width = 720;
  const height = 420;
  const margin = { left: 80, right: 30, top: 40, bottom: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const barWidth = (plotWidth / rows.length) * 0.62;
  const gap = (plotWidth / rows.length) * 0.38;
  const colors = ['#0072B2', '#E69F00', '#009E73', '#CC79A7'];

  const bars = rows.map((row, index) => {
    const x = margin.left + index * (barWidth + gap) + gap / 2;
    const h = row.accuracy * plotHeight;
    const y = margin.top + plotHeight - h;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${colors[index]}" />\n` +
      `<text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="14">${row.accuracy.toFixed(2)}</text>\n` +
      `<text transform="translate(${x + barWidth / 2},${height - 35}) rotate(-25)" text-anchor="end" font-size="13">${row.condition}</text>`;
  }).join('\n');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => {
    const y = margin.top + plotHeight - tick * plotHeight;
    return `<line x1="${margin.left - 5}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#ddd" />\n` +
      `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="12">${tick.toFixed(2)}</text>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-size="18" font-family="Arial">Persona faithfulness accuracy by trace condition</text>
  ${yTicks}
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#333" />
  <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" stroke="#333" />
  <text transform="translate(22,${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" font-size="14">Accuracy</text>
  ${bars}
</svg>
`;
  fs.writeFileSync(outputPath, svg);
}

function main(): void {
  const seedArg = process.argv.find((arg) => arg.startsWith('--seed='));
  const casesArg = process.argv.find((arg) => arg.startsWith('--cases='));
  const seed = seedArg ? Number(seedArg.split('=')[1]) : 42;
  const totalCases = casesArg ? Number(casesArg.split('=')[1]) : 200;
  const rng = new SeededRandom(seed);
  const cases: Scenario[] = [];

  for (let i = 0; i < totalCases; i++) {
    cases.push(buildScenario(ROOT_CAUSES[i % ROOT_CAUSES.length], i + 1, rng));
  }

  const rows = CONDITIONS.map((condition) => evaluate(cases, condition));
  const outputDir = path.join(process.cwd(), 'results', 'facet-frame-faithfulness');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'cases.json'), JSON.stringify(cases, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.csv'), csv(rows));
  fs.writeFileSync(path.join(outputDir, 'metrics-table.tex'), latexTable(rows));
  writeAccuracyFigure(rows, path.join(outputDir, 'accuracy-by-condition.svg'));

  const exampleCase = cases.find((scenario) => scenario.rootCause === 'facet_misweighting') ?? cases[0];
  fs.writeFileSync(path.join(outputDir, 'qualitative-example.json'), JSON.stringify({
    case: exampleCase,
    trace: makeTrace(exampleCase, 'full'),
    diagnosis: diagnose(makeTrace(exampleCase, 'full')),
  }, null, 2));

  console.log(JSON.stringify({ seed, totalCases, rows, outputDir }, null, 2));
}

main();
