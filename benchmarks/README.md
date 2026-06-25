# AEF Public Benchmarks

This directory documents the reproducible benchmark harnesses included with the Agentic Epistemology Framework.

The benchmark code lives in `examples/` so it can run directly against the TypeScript source without a package publish step.

## Benchmarks

### 1. Generic root-cause benchmark

Tests whether structured epistemic traces expose fields needed to localize injected agent failure labels in a deterministic harness.

```bash
npx ts-node --transpile-only examples/root-cause-benchmark.ts --seed=42 --cases=160
```

Outputs:

```text
results/root-cause-benchmark/
├── cases.json
├── metrics.json
├── metrics.csv
├── metrics-table.tex
├── confusion-full.json
├── confusion-event-only.json
├── qualitative-example.json
└── accuracy-by-condition.svg
```

Primary metric: diagnosis accuracy by trace condition.

### 2. Facet-frame faithfulness benchmark

Tests whether facet-aware traces improve diagnosis of synthetic persona failures such as facet omission, facet misweighting, facet conflict, persona drift, and response-style violation.

```bash
npx ts-node --transpile-only examples/facet-frame-faithfulness-benchmark.ts --seed=42 --cases=200
```

Outputs:

```text
results/facet-frame-faithfulness/
├── cases.json
├── metrics.json
├── metrics.csv
├── metrics-table.tex
├── qualitative-example.json
└── accuracy-by-condition.svg
```

Primary metric: diagnosis accuracy and macro F1 by trace condition.

### 3. Facet faithfulness audit service experiment

Tests the implemented `FacetFaithfulnessAuditService` on Vurvey-style persona cases with prompt provenance, marker coverage, contradictions, counterfactual sensitivity, calibration, and signal-to-noise scoring.

```bash
npx ts-node --transpile-only examples/facet-faithfulness-audit-experiment.ts
```

Outputs:

```text
results/facet-faithfulness-audit-experiment/
├── cases.json
├── audits.json
├── metrics.json
├── metrics-table.tex
└── diagnosis-accuracy.svg
```

Primary metric: diagnosis accuracy by evidence condition.

## Reproducibility notes

- All public benchmark inputs are synthetic fixtures.
- The harnesses require no Vurvey credentials, no private database, and no model API calls.
- The Vurvey real-generation counterfactual results included in the paper are reported only as sanitized aggregates under `results/vurvey-*`; raw persona text and raw database fixture rows are intentionally excluded.

## Current reference results

### Generic root-cause benchmark

| Condition | Accuracy | Macro F1 | Coverage |
|---|---:|---:|---:|
| full | 1.000 | 1.000 | 1.000 |
| no_frame | 0.750 | 0.750 | 0.750 |
| no_justification | 0.500 | 0.500 | 0.500 |
| event_only | 0.000 | 0.000 | 0.000 |

### Facet-frame faithfulness benchmark

| Condition | Accuracy | Macro F1 | Coverage |
|---|---:|---:|---:|
| full | 0.865 | 0.898 | 0.865 |
| no_facet_weights | 0.665 | 0.678 | 0.735 |
| no_facet_prompts | 0.400 | 0.400 | 0.400 |
| event_only | 0.000 | 0.000 | 0.000 |

### Facet faithfulness audit service experiment

| Condition | Accuracy | Faithfulness | Marker Coverage | Counterfactual |
|---|---:|---:|---:|---:|
| prompt_only | 0.125 | 0.162 | 0.000 | 0.500 |
| facet_list | 0.125 | 0.382 | 0.000 | 0.500 |
| facet_weights | 0.750 | 0.526 | 0.281 | 0.500 |
| full_aef | 1.000 | 0.536 | 0.281 | 0.660 |

## How to add a new benchmark

1. Add a new `examples/<benchmark-name>.ts` runner.
2. Make it deterministic by accepting `--seed`.
3. Write outputs under `results/<benchmark-name>/`.
4. Include at least `cases.json`, `metrics.json`, and a qualitative example.
5. Add a short section to this README with the command and expected outputs.


## Reviewer caveat

These public harnesses are deterministic trace-sensitivity tests. They are not external-validity estimates for deployed personas. Use them to check that a trace schema carries enough information for a diagnoser, then validate real persona behavior with independent labels, noisy traces, and live model outputs.
