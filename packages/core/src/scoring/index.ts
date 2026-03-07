import {
  Submission,
  ScenarioBenchmark,
  RubricScore,
  MetricsResult,
} from '../types';

/**
 * Score owner routing against gold standard
 */
export function scoreOwnerRouting(
  submission: Submission,
  benchmark: ScenarioBenchmark
): number {
  const submittedOwner = submission.ownerRouting.trim().toLowerCase();
  const goldOwner = benchmark.goldOwner.trim().toLowerCase();

  return submittedOwner === goldOwner ? 1.0 : 0.0;
}

/**
 * Score dependency trace accuracy
 * Check both edges and directionality
 */
export function scoreDependencyTrace(
  submission: Submission,
  benchmark: ScenarioBenchmark
): { accuracy: number; directionCorrect: boolean } {
  const submittedEdges = submission.dependencyTrace;
  const goldEdges = benchmark.goldDependencyTrace;

  if (goldEdges.length === 0) {
    return { accuracy: submittedEdges.length === 0 ? 1.0 : 0.5, directionCorrect: true };
  }

  let correctEdges = 0;
  let correctDirections = 0;

  for (const submitted of submittedEdges) {
    const matches = goldEdges.find(
      (gold) =>
        gold.from.toLowerCase() === submitted.from.toLowerCase() &&
        gold.to.toLowerCase() === submitted.to.toLowerCase()
    );

    if (matches) {
      correctEdges++;
      if (matches.type === submitted.type) {
        correctDirections++;
      }
    }
  }

  const accuracy =
    correctEdges / Math.max(Math.max(submittedEdges.length, goldEdges.length), 1);
  const directionCorrect = correctDirections === correctEdges && correctEdges > 0;

  return { accuracy, directionCorrect };
}

/**
 * Score blast radius completeness
 */
export function scoreBlastRadius(
  submission: Submission,
  benchmark: ScenarioBenchmark
): { completeness: number; quality: number } {
  const submitted = submission.blastRadius.map((s) => s.toLowerCase());
  const gold = benchmark.goldSafeActions.map((g) => g.toLowerCase());

  if (gold.length === 0) {
    return { completeness: submitted.length === 0 ? 1.0 : 0.5, quality: 1.0 };
  }

  const matched = submitted.filter((s) => gold.includes(s));
  const completeness = matched.length / gold.length;

  // Quality: prefer no false positives
  const falsePositives = submitted.length - matched.length;
  const quality = Math.max(0, 1.0 - falsePositives * 0.1);

  return { completeness, quality };
}

/**
 * Build rubric scores
 */
export function buildRubricScores(
  ownerScore: number,
  dependencyScore: {accuracy: number; directionCorrect: boolean},
  blastRadiusScore: {completeness: number; quality: number},
  gatingPass: boolean,
  unsupportedClaimCount: number
): RubricScore[] {
  return [
    {
      criterion: 'Owner Routing',
      score: ownerScore,
      maxScore: 1.0,
      explanation:
        ownerScore === 1.0
          ? 'Correctly identified responsible team/owner'
          : 'Owner routing does not match gold standard',
    },
    {
      criterion: 'Dependency Trace',
      score: dependencyScore.accuracy,
      maxScore: 1.0,
      explanation: dependencyScore.directionCorrect
        ? 'Dependencies correctly mapped with proper directionality'
        : 'Dependencies identified but directionality may be incorrect',
    },
    {
      criterion: 'Blast Radius',
      score: blastRadiusScore.completeness * 0.7 + blastRadiusScore.quality * 0.3,
      maxScore: 1.0,
      explanation: `Blast radius completeness: ${Math.round(
        blastRadiusScore.completeness * 100
      )}%, quality: ${Math.round(blastRadiusScore.quality * 100)}%`,
    },
    {
      criterion: 'Evidence Gating',
      score: gatingPass ? 1.0 : Math.max(0, 1.0 - unsupportedClaimCount * 0.2),
      maxScore: 1.0,
      explanation: gatingPass
        ? 'All claims adequately supported by evidence'
        : `${unsupportedClaimCount} claim(s) lack sufficient evidence support`,
    },
  ];
}

/**
 * Aggregate all metrics into final result
 */
export function aggregateMetrics(
  ownerScore: number,
  dependencyScore: {accuracy: number; directionCorrect: boolean},
  blastRadiusScore: {completeness: number; quality: number},
  gatingPass: boolean,
  unsupportedClaimCount: number
): MetricsResult {
  return {
    ownerAccuracy: ownerScore,
    dependencyAccuracy: dependencyScore.accuracy,
    directionCorrect: dependencyScore.directionCorrect,
    blastRadiusCompleteness: blastRadiusScore.completeness,
    evidenceRelevance: gatingPass ? 1.0 : Math.max(0, 1.0 - unsupportedClaimCount * 0.2),
    unsupportedClaimCount,
    criticalErrorCount: gatingPass ? 0 : 1,
  };
}

/**
 * Calculate overall score (0-1)
 */
export function calculateOverallScore(metrics: MetricsResult): number {
  const weights = {
    owner: 0.25,
    dependency: 0.25,
    blastRadius: 0.25,
    evidence: 0.25,
  };

  return (
    metrics.ownerAccuracy * weights.owner +
    metrics.dependencyAccuracy * weights.dependency +
    metrics.blastRadiusCompleteness * weights.blastRadius +
    metrics.evidenceRelevance * weights.evidence
  );
}
