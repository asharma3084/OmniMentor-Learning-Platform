import { describe, expect, it } from 'vitest';
import type { Evidence, ScenarioBenchmark } from '@omnimentor/core';
import { scoreAblationScenario, selectEvidenceForAblation } from '../ablation';

const benchmark: ScenarioBenchmark = {
  id: 'scenario-test',
  prompt: 'Determine owner, dependencies, and blast radius.',
  goldOwner: 'Catalog Team',
  goldDependencyTrace: [
    { from: 'Catalog API', to: 'Search Indexer', type: 'downstream' },
  ],
  goldSafeActions: [
    'Coordinate with Search Platform Team on CDC event schema update',
  ],
  goldBlastRadius: [
    'Stale search results on Storefront and Mobile BFF',
  ],
  goldRequiredEvidenceIds: ['ev-owner', 'ev-dependency'],
  rubricExplanations: 'Test benchmark',
};

const retrievedEvidence: Evidence[] = [
  {
    id: 'ev-owner',
    title: 'Catalog API Ownership',
    body: 'Catalog API is owned by the Catalog Team (T1 critical).',
    role: 'primary',
    metadata: { retrievalScore: 0.95 },
  },
  {
    id: 'ev-runbook',
    title: 'Catalog API Deployment Runbook',
    body: 'Coordinate with Search Platform Team on CDC event schema update.',
    role: 'primary',
    metadata: { retrievalScore: 0.91 },
  },
  {
    id: 'ev-dependency',
    title: 'Catalog to Search Dependency',
    body: 'Catalog API publishes events consumed by Search Indexer. Downstream impact: stale search results on Storefront and Mobile BFF.',
    role: 'corroborating',
    metadata: { retrievalScore: 0.74 },
  },
];

describe('Ablation evaluation helpers', () => {
  it('should enforce role diversity for graphrag_gating selections when possible', () => {
    const selected = selectEvidenceForAblation(retrievedEvidence, 'graphrag_gating');

    expect(selected).toHaveLength(3);
    expect(selected.some((item) => item.role === 'primary')).toBe(true);
    expect(selected.some((item) => item.role === 'corroborating')).toBe(true);
  });

  it('should score from retrieved evidence instead of fixed per-mode factors', () => {
    const vector = scoreAblationScenario({
      scenarioId: benchmark.id,
      mode: 'vector',
      retrievedEvidence,
      benchmark,
    });

    const graphragGating = scoreAblationScenario({
      scenarioId: benchmark.id,
      mode: 'graphrag_gating',
      retrievedEvidence,
      benchmark,
    });

    expect(vector.selectedEvidence).toHaveLength(2);
    expect(vector.metrics.criticalErrorCount).toBeGreaterThan(0);
    expect(vector.metrics.evidenceRelevance).toBe(0.5);

    expect(graphragGating.metrics.criticalErrorCount).toBe(0);
    expect(graphragGating.metrics.evidenceRelevance).toBe(1);
    expect(graphragGating.metrics.dependencyAccuracy).toBeGreaterThan(vector.metrics.dependencyAccuracy);
    expect(graphragGating.overallScore).toBeGreaterThan(vector.overallScore);
  });
});