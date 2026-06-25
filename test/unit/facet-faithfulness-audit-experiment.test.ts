import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MetricRow {
  condition: string;
  diagnosisAccuracy: number;
  meanCounterfactualSensitivity: number;
}

describe('facet faithfulness audit experiment', () => {
  it('shows full AEF beats prompt-only and facet-list audits', () => {
    execFileSync('npx', ['ts-node', '--transpile-only', 'examples/facet-faithfulness-audit-experiment.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    const metrics = JSON.parse(
      readFileSync(join(process.cwd(), 'results/facet-faithfulness-audit-experiment/metrics.json'), 'utf8')
    ) as MetricRow[];
    const byCondition = new Map(metrics.map((row) => [row.condition, row]));
    const full = byCondition.get('full_aef')!;
    const facetList = byCondition.get('facet_list')!;
    const facetWeights = byCondition.get('facet_weights')!;

    expect(full.diagnosisAccuracy).toBeGreaterThan(facetList.diagnosisAccuracy);
    expect(full.meanCounterfactualSensitivity).toBeGreaterThan(facetWeights.meanCounterfactualSensitivity);
  });
});
