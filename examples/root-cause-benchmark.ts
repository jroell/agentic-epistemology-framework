import * as fs from 'fs';
import * as path from 'path';

type RootCause =
  | 'frame_misweighting'
  | 'source_trust_error'
  | 'threshold_miscalibration'
  | 'justification_gap';

type TraceCondition = 'full' | 'no_frame' | 'no_justification' | 'event_only';

type Decision = 'act' | 'delay';

type Evidence = {
  id: string;
  supports: boolean;
  strength: number;
  source: string;
  type: 'speed' | 'quality' | 'security' | 'testimony';
};

type BenchmarkCase = {
  id: string;
  rootCause: RootCause;
  proposition: string;
  initialConfidence: number;
  expectedDecision: Decision;
  actualDecision: Decision;
  frame?: string;
  frameWeight?: number;
  expectedFrameWeight?: number;
  sourceTrust?: number;
  expectedSourceTrust?: number;
  threshold?: number;
  expectedThreshold?: number;
  evidence: Evidence[];
  justificationCount: number;
  minJustifications: number;
};

type TraceEvent = {
  caseId: string;
  type: string;
  proposition?: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
  frame?: string;
  frameWeight?: number;
  expectedFrameWeight?: number;
  source?: string;
  sourceTrust?: number;
  expectedSourceTrust?: number;
  threshold?: number;
  expectedThreshold?: number;
  decision?: Decision;
  evidenceId?: string;
  justificationCount?: number;
  minJustifications?: number;
};

type Prediction = RootCause | 'unknown';

type ResultRow = {
  condition: TraceCondition;
  cases: number;
  accuracy: number;
  macroF1: number;
  coverage: number;
  avgEvidenceInspected: number;
  avgTraceEvents: number;
};

const ROOT_CAUSES: RootCause[] = [
  'frame_misweighting',
  'source_trust_error',
  'threshold_miscalibration',
  'justification_gap',
];

const CONDITIONS: TraceCondition[] = ['full', 'no_frame', 'no_justification', 'event_only'];

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

function confidenceUpdate(oldConfidence: number, weight: number, target: number): number {
  return (1 - weight) * oldConfidence + weight * target;
}

function buildCase(rootCause: RootCause, index: number, rng: SeededRandom): BenchmarkCase {
  const proposition = `case_${index}_recommend_action`;
  const initialConfidence = round(rng.range(0.42, 0.58), 3);
  const evidence: Evidence[] = [
    {
      id: `e_${index}_primary`,
      supports: true,
      strength: round(rng.range(0.82, 0.95), 3),
      source: 'verified_tool',
      type: rng.pick(['quality', 'security', 'speed']),
    },
    {
      id: `e_${index}_secondary`,
      supports: true,
      strength: round(rng.range(0.68, 0.84), 3),
      source: 'peer_agent',
      type: 'testimony',
    },
  ];

  const base: BenchmarkCase = {
    id: `case_${String(index).padStart(3, '0')}`,
    rootCause,
    proposition,
    initialConfidence,
    expectedDecision: 'act',
    actualDecision: 'delay',
    frame: 'Balanced',
    frameWeight: 0.7,
    expectedFrameWeight: 0.7,
    sourceTrust: 0.82,
    expectedSourceTrust: 0.82,
    threshold: 0.7,
    expectedThreshold: 0.7,
    evidence,
    justificationCount: 2,
    minJustifications: 1,
  };

  if (rootCause === 'frame_misweighting') {
    base.frame = rng.pick(['Efficiency', 'Thoroughness', 'Security']);
    base.expectedFrameWeight = round(rng.range(0.72, 0.9), 2);
    base.frameWeight = round(rng.range(0.05, 0.28), 2);
    const updated = confidenceUpdate(initialConfidence, base.frameWeight, evidence[0].strength);
    base.actualDecision = updated >= base.threshold! ? 'act' : 'delay';
    base.expectedDecision = 'act';
  }

  if (rootCause === 'source_trust_error') {
    base.sourceTrust = round(rng.range(0.08, 0.3), 2);
    base.expectedSourceTrust = round(rng.range(0.74, 0.92), 2);
    base.frameWeight = 0.7;
    const trustUpdated = confidenceUpdate(initialConfidence, 0.7, base.sourceTrust);
    base.actualDecision = trustUpdated >= base.threshold! ? 'act' : 'delay';
    base.expectedDecision = 'act';
  }

  if (rootCause === 'threshold_miscalibration') {
    base.threshold = round(rng.range(0.86, 0.95), 2);
    base.expectedThreshold = round(rng.range(0.62, 0.72), 2);
    base.frameWeight = 0.75;
    const updated = confidenceUpdate(initialConfidence, base.frameWeight, evidence[0].strength);
    base.actualDecision = updated >= base.threshold ? 'act' : 'delay';
    base.expectedDecision = updated >= base.expectedThreshold ? 'act' : 'delay';
  }

  if (rootCause === 'justification_gap') {
    base.justificationCount = 0;
    base.minJustifications = 1;
    base.frameWeight = 0.72;
    const updated = confidenceUpdate(initialConfidence, base.frameWeight, evidence[0].strength);
    base.actualDecision = updated >= base.threshold! ? 'act' : 'delay';
    base.expectedDecision = 'delay';
  }

  return base;
}

function makeTrace(testCase: BenchmarkCase, condition: TraceCondition): TraceEvent[] {
  const confidenceAfterFrame = confidenceUpdate(
    testCase.initialConfidence,
    testCase.frameWeight ?? 0.5,
    testCase.evidence[0]?.strength ?? 0.5,
  );
  const confidenceAfterTrust = confidenceUpdate(
    testCase.initialConfidence,
    0.7,
    testCase.sourceTrust ?? 0.5,
  );
  const confidenceAfter = testCase.rootCause === 'source_trust_error'
    ? confidenceAfterTrust
    : confidenceAfterFrame;

  const events: TraceEvent[] = [
    {
      caseId: testCase.id,
      type: 'belief_formation',
      proposition: testCase.proposition,
      confidenceBefore: testCase.initialConfidence,
      confidenceAfter: testCase.initialConfidence,
      justificationCount: testCase.justificationCount,
      minJustifications: testCase.minJustifications,
    },
    {
      caseId: testCase.id,
      type: 'evidence_processed',
      proposition: testCase.proposition,
      confidenceBefore: testCase.initialConfidence,
      confidenceAfter: round(confidenceAfter, 3),
      frame: testCase.frame,
      frameWeight: testCase.frameWeight,
      expectedFrameWeight: testCase.expectedFrameWeight,
      evidenceId: testCase.evidence[0]?.id,
      source: testCase.evidence[0]?.source,
      sourceTrust: testCase.sourceTrust,
      expectedSourceTrust: testCase.expectedSourceTrust,
    },
    {
      caseId: testCase.id,
      type: 'threshold_check',
      proposition: testCase.proposition,
      confidenceAfter: round(confidenceAfter, 3),
      threshold: testCase.threshold,
      expectedThreshold: testCase.expectedThreshold,
      decision: testCase.actualDecision,
    },
    {
      caseId: testCase.id,
      type: 'action_outcome',
      proposition: testCase.proposition,
      decision: testCase.actualDecision,
    },
  ];

  return events.map(event => ablateEvent(event, condition));
}

function ablateEvent(event: TraceEvent, condition: TraceCondition): TraceEvent {
  const copy: TraceEvent = { ...event };

  if (condition === 'full') {
    return copy;
  }

  if (condition === 'no_frame') {
    delete copy.frame;
    delete copy.frameWeight;
    delete copy.expectedFrameWeight;
    return copy;
  }

  if (condition === 'no_justification') {
    delete copy.source;
    delete copy.sourceTrust;
    delete copy.expectedSourceTrust;
    delete copy.evidenceId;
    delete copy.justificationCount;
    delete copy.minJustifications;
    return copy;
  }

  return {
    caseId: copy.caseId,
    type: copy.type,
    proposition: copy.proposition,
    confidenceAfter: copy.confidenceAfter,
    threshold: copy.type === 'threshold_check' ? copy.threshold : undefined,
    decision: copy.decision,
  };
}

function diagnose(trace: TraceEvent[]): { prediction: Prediction; inspected: number } {
  let inspected = 0;

  for (const event of trace) {
    inspected++;
    if (
      event.type === 'belief_formation' &&
      typeof event.justificationCount === 'number' &&
      typeof event.minJustifications === 'number' &&
      event.justificationCount < event.minJustifications
    ) {
      return { prediction: 'justification_gap', inspected };
    }
  }

  for (const event of trace) {
    inspected++;
    if (
      event.type === 'evidence_processed' &&
      typeof event.frameWeight === 'number' &&
      typeof event.expectedFrameWeight === 'number' &&
      event.frameWeight + 0.25 < event.expectedFrameWeight
    ) {
      return { prediction: 'frame_misweighting', inspected };
    }
  }

  for (const event of trace) {
    inspected++;
    if (
      event.type === 'evidence_processed' &&
      typeof event.sourceTrust === 'number' &&
      typeof event.expectedSourceTrust === 'number' &&
      Math.abs(event.sourceTrust - event.expectedSourceTrust) > 0.35
    ) {
      return { prediction: 'source_trust_error', inspected };
    }
  }

  for (const event of trace) {
    inspected++;
    if (
      event.type === 'threshold_check' &&
      typeof event.threshold === 'number' &&
      typeof event.expectedThreshold === 'number' &&
      Math.abs(event.threshold - event.expectedThreshold) > 0.15
    ) {
      return { prediction: 'threshold_miscalibration', inspected };
    }
  }

  return { prediction: 'unknown', inspected };
}

function macroF1(gold: RootCause[], pred: Prediction[]): number {
  const f1s = ROOT_CAUSES.map(label => {
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

function evaluate(cases: BenchmarkCase[], condition: TraceCondition): ResultRow {
  const predictions: Prediction[] = [];
  const gold: RootCause[] = [];
  let correct = 0;
  let known = 0;
  let inspected = 0;
  let traceEvents = 0;

  for (const testCase of cases) {
    const trace = makeTrace(testCase, condition);
    const result = diagnose(trace);
    predictions.push(result.prediction);
    gold.push(testCase.rootCause);
    if (result.prediction === testCase.rootCause) correct++;
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
    avgEvidenceInspected: round(inspected / cases.length, 2),
    avgTraceEvents: round(traceEvents / cases.length, 2),
  };
}

function confusionMatrix(cases: BenchmarkCase[], condition: TraceCondition): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const label of ROOT_CAUSES) {
    matrix[label] = {};
    for (const pred of [...ROOT_CAUSES, 'unknown']) {
      matrix[label][pred] = 0;
    }
  }
  for (const testCase of cases) {
    const prediction = diagnose(makeTrace(testCase, condition)).prediction;
    matrix[testCase.rootCause][prediction] += 1;
  }
  return matrix;
}

function csv(rows: ResultRow[]): string {
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map(row => headers.map(header => String((row as any)[header])).join(','))].join('\n') + '\n';
}

function latexTable(rows: ResultRow[]): string {
  const lines = [
    '\\begin{tabular}{lrrrrr}',
    '\\toprule',
    'Trace condition & Accuracy & Macro F1 & Coverage & Evidence inspected & Trace events \\\\',
    '\\midrule',
    ...rows.map(row => `${row.condition.replace(/_/g, '\\_')} & ${row.accuracy.toFixed(3)} & ${row.macroF1.toFixed(3)} & ${row.coverage.toFixed(3)} & ${row.avgEvidenceInspected.toFixed(2)} & ${row.avgTraceEvents.toFixed(2)} \\\\`),
    '\\bottomrule',
    '\\end{tabular}',
    '',
  ];
  return lines.join('\n');
}

function writeAccuracyFigure(rows: ResultRow[], outputPath: string): void {
  const width = 720;
  const height = 420;
  const margin = { left: 80, right: 30, top: 40, bottom: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const barWidth = plotWidth / rows.length * 0.62;
  const gap = plotWidth / rows.length * 0.38;
  const colors = ['#0072B2', '#E69F00', '#009E73', '#CC79A7'];

  const bars = rows.map((row, index) => {
    const x = margin.left + index * (barWidth + gap) + gap / 2;
    const h = row.accuracy * plotHeight;
    const y = margin.top + plotHeight - h;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${colors[index]}" />\n` +
      `<text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="14">${row.accuracy.toFixed(2)}</text>\n` +
      `<text transform="translate(${x + barWidth / 2},${height - 35}) rotate(-25)" text-anchor="end" font-size="13">${row.condition}</text>`;
  }).join('\n');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(tick => {
    const y = margin.top + plotHeight - tick * plotHeight;
    return `<line x1="${margin.left - 5}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#ddd" />\n` +
      `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="12">${tick.toFixed(2)}</text>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  <text x="${width / 2}" y="24" text-anchor="middle" font-size="18" font-family="Arial">Root-cause accuracy by trace condition</text>
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
  const seedArg = process.argv.find(arg => arg.startsWith('--seed='));
  const casesArg = process.argv.find(arg => arg.startsWith('--cases='));
  const seed = seedArg ? Number(seedArg.split('=')[1]) : 42;
  const totalCases = casesArg ? Number(casesArg.split('=')[1]) : 160;

  if (!Number.isInteger(totalCases) || totalCases <= 0) {
    throw new Error('--cases must be a positive integer');
  }

  const rng = new SeededRandom(seed);
  const cases: BenchmarkCase[] = [];
  for (let i = 0; i < totalCases; i++) {
    cases.push(buildCase(ROOT_CAUSES[i % ROOT_CAUSES.length], i + 1, rng));
  }

  const rows = CONDITIONS.map(condition => evaluate(cases, condition));
  const outputDir = path.join(process.cwd(), 'results', 'root-cause-benchmark');
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'cases.json'), JSON.stringify(cases, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.json'), JSON.stringify(rows, null, 2));
  fs.writeFileSync(path.join(outputDir, 'metrics.csv'), csv(rows));
  fs.writeFileSync(path.join(outputDir, 'metrics-table.tex'), latexTable(rows));
  fs.writeFileSync(path.join(outputDir, 'confusion-full.json'), JSON.stringify(confusionMatrix(cases, 'full'), null, 2));
  fs.writeFileSync(path.join(outputDir, 'confusion-event-only.json'), JSON.stringify(confusionMatrix(cases, 'event_only'), null, 2));
  writeAccuracyFigure(rows, path.join(outputDir, 'accuracy-by-condition.svg'));

  const exampleCase = cases.find(testCase => testCase.rootCause === 'frame_misweighting') ?? cases[0];
  const exampleTrace = makeTrace(exampleCase, 'full');
  const exampleDiagnosis = diagnose(exampleTrace);
  fs.writeFileSync(path.join(outputDir, 'qualitative-example.json'), JSON.stringify({
    case: exampleCase,
    trace: exampleTrace,
    diagnosis: exampleDiagnosis,
  }, null, 2));

  console.log(JSON.stringify({ seed, totalCases, rows, outputDir }, null, 2));
}

main();
