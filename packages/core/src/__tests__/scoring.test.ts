import { describe, it, expect } from 'vitest';
import {
  scoreOwnerRouting,
  scoreDependencyTrace,
  scoreBlastRadius,
  buildRubricScores,
  calculateOverallScore,
} from '../scoring/index';
import { Submission, ScenarioBenchmark } from '../types';

describe('Scoring Logic', () => {
  const mockSubmission: Partial<Submission> = {
    ownerRouting: 'Platform Team',
    dependencyTrace: [
      { from: 'Auth Service', to: 'API Gateway', type: 'downstream' },
      { from: 'Auth Service', to: 'Web App', type: 'downstream' },
    ],
    blastRadius: ['Notify API team', 'Notify Web team'],
  };

  const mockBenchmark: Partial<ScenarioBenchmark> = {
    goldOwner: 'Platform Team',
    goldDependencyTrace: [
      { from: 'Auth Service', to: 'API Gateway', type: 'downstream' },
      { from: 'Auth Service', to: 'Web App', type: 'downstream' },
    ],
    goldSafeActions: ['Notify API team', 'Notify Web team', 'Plan rollback'],
  };

  it('should score owner routing correctly', () => {
    const score = scoreOwnerRouting(
      mockSubmission as Submission,
      mockBenchmark as ScenarioBenchmark
    );
    expect(score).toBe(1.0); // Perfect match
  });

  it('should match dependencies with correct directionality', () => {
    const result = scoreDependencyTrace(
      mockSubmission as Submission,
      mockBenchmark as ScenarioBenchmark
    );
    expect(result.directionCorrect).toBe(true);
  });

  it('should score blast radius completeness', () => {
    const result = scoreBlastRadius(
      mockSubmission as Submission,
      mockBenchmark as ScenarioBenchmark
    );
    expect(result.completeness).toBeGreaterThan(0.5); // Partial match
  });

  it('should prefer dedicated blast radius gold labels when present', () => {
    const result = scoreBlastRadius(
      {
        ...mockSubmission,
        blastRadius: ['Customer support spike', 'Payment failures for new orders'],
      } as Submission,
      {
        ...mockBenchmark,
        goldBlastRadius: ['Customer support spike', 'Payment failures for new orders'],
      } as ScenarioBenchmark
    );

    expect(result.completeness).toBe(1.0);
    expect(result.quality).toBe(1.0);
  });

  it('should build rubric scores', () => {
    const rubric = buildRubricScores(
      1.0, // ownerScore
      { accuracy: 1.0, directionCorrect: true }, // dependencyScore
      { completeness: 0.67, quality: 0.9 }, // blastRadiusScore
      true, // gatingPass
      0 // unsupportedClaimCount
    );

    expect(rubric.length).toBe(4); // 4 criteria
    expect(rubric[0].criterion).toBe('Owner Routing');
    expect(rubric.every((r) => r.score >= 0 && r.score <= 1)).toBe(true);
  });

  it('should calculate overall score', () => {
    const metrics = {
      ownerAccuracy: 1.0,
      dependencyAccuracy: 1.0,
      directionCorrect: true,
      blastRadiusCompleteness: 0.67,
      evidenceRelevance: 1.0,
      unsupportedClaimCount: 0,
      criticalErrorCount: 0,
    };

    const score = calculateOverallScore(metrics);
    expect(score).toBeGreaterThan(0.8); // Should be high
    expect(score).toBeLessThanOrEqual(1.0);
  });
});
