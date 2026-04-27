/**
 * Core scoring helpers for rubric dimensions, metrics aggregation, and overall score calculation.
 */
import {
  Submission,
  ScenarioBenchmark,
  RubricScore,
  MetricsResult,
} from '../types';

/**
 * Score owner routing against gold standard.
 * Full match = 1.0, partial keyword match (e.g. "Pricing" vs "Pricing Team") = 0.75.
 */
export function scoreOwnerRouting(
  submission: Submission,
  benchmark: ScenarioBenchmark
): number {
  const submittedOwner = submission.ownerRouting.trim().toLowerCase();
  const goldOwner = benchmark.goldOwner.trim().toLowerCase();

  if (submittedOwner === goldOwner) return 1.0;

  // Check if one contains the other (e.g. "Pricing" matches "Pricing Team")
  if (submittedOwner.includes(goldOwner) || goldOwner.includes(submittedOwner)) return 0.75;

  // Check keyword overlap for cases like "The Pricing Engineering Team" vs "Pricing Team"
  const subTokens = tokenize(submittedOwner);
  const goldTokens = tokenize(goldOwner);
  if (goldTokens.size > 0) {
    let matches = 0;
    for (const token of goldTokens) {
      if (subTokens.has(token)) matches++;
    }
    if (matches / goldTokens.size >= 0.5) return 0.5;
  }

  return 0.0;
}

/**
 * Score dependency trace accuracy.
 * Uses keyword overlap on system names so "Catalog" matches "Catalog API",
 * and "Storefront" matches "Storefront BFF".
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

  const usedGold = new Set<number>();

  for (const submitted of submittedEdges) {
    const subFrom = submitted.from.toLowerCase();
    const subTo = submitted.to.toLowerCase();

    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < goldEdges.length; i++) {
      if (usedGold.has(i)) continue;
      const goldFrom = goldEdges[i].from.toLowerCase();
      const goldTo = goldEdges[i].to.toLowerCase();

      // Exact match or substring containment on both from and to
      const fromMatch = subFrom === goldFrom || subFrom.includes(goldFrom) || goldFrom.includes(subFrom);
      const toMatch = subTo === goldTo || subTo.includes(goldTo) || goldTo.includes(subTo);

      if (fromMatch && toMatch) {
        const score = (subFrom === goldFrom ? 1 : 0.8) + (subTo === goldTo ? 1 : 0.8);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      correctEdges++;
      usedGold.add(bestIdx);
      if (goldEdges[bestIdx].type === submitted.type) {
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
 * Stop words to ignore when comparing free-text answers.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
  'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all',
  'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only',
  'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when',
  'while', 'that', 'this', 'these', 'those', 'it', 'its', 'also', 'about',
  'up', 'which', 'who', 'whom', 'what', 'where', 'how', 'there', 'here',
]);

/**
 * Tokenize text into meaningful keywords (lowercase, no stop words, no short tokens).
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/**
 * Compute keyword overlap between two strings.
 * Returns a score between 0 and 1.
 */
function keywordOverlap(submitted: string, gold: string): number {
  const subTokens = tokenize(submitted);
  const goldTokens = tokenize(gold);
  if (goldTokens.size === 0) return subTokens.size === 0 ? 1.0 : 0.5;
  let matches = 0;
  for (const token of goldTokens) {
    if (subTokens.has(token)) matches++;
  }
  return matches / goldTokens.size;
}

/**
 * Score blast radius completeness using keyword overlap.
 * Each submitted item is matched to its best gold item. A gold item is
 * considered covered if any submitted item overlaps at least 50% of its keywords.
 */
export function scoreBlastRadius(
  submission: Submission,
  benchmark: ScenarioBenchmark
): { completeness: number; quality: number } {
  const submitted = submission.blastRadius;
  const goldSource = benchmark.goldBlastRadius && benchmark.goldBlastRadius.length > 0
    ? benchmark.goldBlastRadius
    : benchmark.goldSafeActions;

  if (goldSource.length === 0) {
    return { completeness: submitted.length === 0 ? 1.0 : 0.5, quality: 1.0 };
  }

  // For each gold item, find the best-matching submitted item
  const goldScores: number[] = goldSource.map((goldItem) => {
    let best = 0;
    for (const subItem of submitted) {
      const overlap = keywordOverlap(subItem, goldItem);
      if (overlap > best) best = overlap;
    }
    return best;
  });

  // A gold item counts as covered if overlap >= 0.5
  const coveredCount = goldScores.filter((s) => s >= 0.5).length;
  const completeness = coveredCount / goldSource.length;

  // Quality: penalize submitted items that don't match anything
  const matchedSubmitted = submitted.filter((subItem) =>
    goldSource.some((goldItem) => keywordOverlap(subItem, goldItem) >= 0.3)
  );
  const falsePositives = submitted.length - matchedSubmitted.length;
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
 * Rubric weight configuration — exposed for tuning and experimentation.
 */
export interface RubricWeights {
  owner: number;
  dependency: number;
  blastRadius: number;
  evidence: number;
}

export const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  owner: 0.25,
  dependency: 0.25,
  blastRadius: 0.25,
  evidence: 0.25,
};

/**
 * Calculate overall score (0-1)
 * Accepts optional custom weights for experimentation; defaults to equal 0.25 each.
 */
export function calculateOverallScore(
  metrics: MetricsResult,
  weights: RubricWeights = DEFAULT_RUBRIC_WEIGHTS
): number {
  return (
    metrics.ownerAccuracy * weights.owner +
    metrics.dependencyAccuracy * weights.dependency +
    metrics.blastRadiusCompleteness * weights.blastRadius +
    metrics.evidenceRelevance * weights.evidence
  );
}
