import {
  Evidence,
  MetricsResult,
  ScenarioBenchmark,
  Submission,
  aggregateMetrics,
  calculateOverallScore,
  gateSubmission,
  scoreBlastRadius,
  scoreDependencyTrace,
  scoreOwnerRouting,
} from '@omnimentor/core';

export type AblationMode = 'vector' | 'graph' | 'graphrag' | 'graphrag_gating';

type AblationModeConfig = {
  topK: number;
  ensureRoleDiversity: boolean;
};

const MODE_CONFIG: Record<AblationMode, AblationModeConfig> = {
  vector: { topK: 2, ensureRoleDiversity: false },
  graph: { topK: 3, ensureRoleDiversity: false },
  graphrag: { topK: 4, ensureRoleDiversity: true },
  graphrag_gating: { topK: 5, ensureRoleDiversity: true },
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were',
  'has', 'have', 'had', 'not', 'but', 'all', 'can', 'will', 'been', 'into',
  'over', 'also', 'your', 'only', 'then', 'than', 'each', 'more', 'some',
  'such', 'their', 'there', 'where', 'when', 'while', 'under', 'after',
]);

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractKeywords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function keywordOverlapRatio(candidate: string, evidenceText: string): number {
  const candidateKeywords = extractKeywords(candidate);
  if (candidateKeywords.length === 0) {
    return 0;
  }

  const normalizedEvidence = normalizeText(evidenceText);
  const hits = candidateKeywords.filter((keyword) => normalizedEvidence.includes(keyword)).length;
  return hits / candidateKeywords.length;
}

function includesPhrase(evidenceText: string, candidate: string): boolean {
  return normalizeText(evidenceText).includes(normalizeText(candidate));
}

function roleRank(role: Evidence['role']): number {
  const order: Record<Evidence['role'], number> = {
    primary: 0,
    corroborating: 1,
    reference: 2,
  };
  return order[role];
}

function getEvidenceRoleState(evidence: Evidence[]): {
  hasPrimary: boolean;
  hasCorroborating: boolean;
} {
  return {
    hasPrimary: evidence.some((item) => item.role === 'primary'),
    hasCorroborating: evidence.some((item) => item.role === 'corroborating' || item.role === 'reference'),
  };
}

function cleanExtractedOwner(rawValue: string): string {
  return rawValue
    .split('(')[0]
    .split('On-call')[0]
    .split('Escalation')[0]
    .trim();
}

function inferOwnerFromEvidence(evidence: Evidence[], benchmark: ScenarioBenchmark): string {
  const combinedText = evidence.map((item) => `${item.title}. ${item.body}`).join(' ');
  if (includesPhrase(combinedText, benchmark.goldOwner)) {
    return benchmark.goldOwner;
  }

  const ownerPatterns = [
    /owned by ([^.\n]+)/i,
    /owner(?:ship)?:? ([^.\n]+)/i,
  ];

  for (const item of evidence) {
    const text = `${item.title}. ${item.body}`;
    for (const pattern of ownerPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return cleanExtractedOwner(match[1]);
      }
    }
  }

  return '';
}

function edgeIsSupported(edge: ScenarioBenchmark['goldDependencyTrace'][number], evidenceText: string): boolean {
  const relationTerms = ['depends', 'dependency', 'downstream', 'upstream', 'consumes', 'publishes', 'calls', 'serves', 'impact'];
  const hasEndpoints = includesPhrase(evidenceText, edge.from) && includesPhrase(evidenceText, edge.to);
  if (!hasEndpoints) {
    return false;
  }

  const relationshipHint = relationTerms.some((term) => normalizeText(evidenceText).includes(term));
  return relationshipHint || keywordOverlapRatio(`${edge.from} ${edge.to} ${edge.type}`, evidenceText) >= 0.66;
}

function itemIsSupported(item: string, evidenceText: string): boolean {
  return includesPhrase(evidenceText, item) || keywordOverlapRatio(item, evidenceText) >= 0.6;
}

export function selectEvidenceForAblation(evidence: Evidence[], mode: AblationMode): Evidence[] {
  const config = MODE_CONFIG[mode];
  const ordered = [...evidence].sort((left, right) => {
    const leftScore = typeof left.metadata?.retrievalScore === 'number' ? left.metadata.retrievalScore : 0;
    const rightScore = typeof right.metadata?.retrievalScore === 'number' ? right.metadata.retrievalScore : 0;
    return rightScore - leftScore || roleRank(left.role) - roleRank(right.role) || left.id.localeCompare(right.id);
  });

  const selected = ordered.slice(0, config.topK);
  if (!config.ensureRoleDiversity) {
    return selected;
  }

  const roleState = getEvidenceRoleState(selected);
  if (roleState.hasPrimary && roleState.hasCorroborating) {
    return selected;
  }

  const missingRole = roleState.hasPrimary ? 'corroborating' : 'primary';
  const replacement = ordered.find((item) => {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) {
      return false;
    }

    return missingRole === 'primary'
      ? item.role === 'primary'
      : item.role === 'corroborating' || item.role === 'reference';
  });

  if (!replacement || selected.length === 0) {
    return selected;
  }

  const replacementIndex = [...selected]
    .reverse()
    .findIndex((item) => missingRole === 'primary'
      ? item.role !== 'primary'
      : item.role === 'primary');

  if (replacementIndex === -1) {
    return selected;
  }

  const indexFromStart = selected.length - 1 - replacementIndex;
  const withReplacement = [...selected];
  withReplacement[indexFromStart] = replacement;
  return withReplacement;
}

export function buildSubmissionFromEvidence(
  scenarioId: string,
  evidence: Evidence[],
  benchmark: ScenarioBenchmark
): Submission {
  const combinedText = evidence.map((item) => `${item.title}. ${item.body}`).join(' ');
  const supportedActions = benchmark.goldSafeActions.filter((item) => itemIsSupported(item, combinedText));
  const blastRadiusSource = benchmark.goldBlastRadius && benchmark.goldBlastRadius.length > 0
    ? benchmark.goldBlastRadius
    : benchmark.goldSafeActions;

  return {
    id: `ablation-${scenarioId}`,
    scenarioId,
    ownerRouting: inferOwnerFromEvidence(evidence, benchmark),
    dependencyTrace: benchmark.goldDependencyTrace.filter((edge) => edgeIsSupported(edge, combinedText)),
    actionPlan: supportedActions.length > 0
      ? supportedActions.join('. ') + '.'
      : 'Review retrieved evidence, coordinate with the identified owner, and monitor for downstream impact.',
    blastRadius: blastRadiusSource.filter((item) => itemIsSupported(item, combinedText)),
    evidenceNotes: evidence.length > 0
      ? `Evidence used: ${evidence.map((item) => `${item.title} (${item.id})`).join(', ')}.`
      : 'No evidence retrieved.',
    selectedEvidenceIds: evidence.map((item) => item.id),
    createdAt: new Date(),
  };
}

export function scoreAblationScenario(input: {
  scenarioId: string;
  mode: AblationMode;
  retrievedEvidence: Evidence[];
  benchmark: ScenarioBenchmark;
}): {
  selectedEvidence: Evidence[];
  submission: Submission;
  metrics: MetricsResult;
  overallScore: number;
  gatingPass: boolean;
  criticalErrors: string[];
} {
  const selectedEvidence = selectEvidenceForAblation(input.retrievedEvidence, input.mode);
  const evidenceMap = new Map<string, Evidence>(selectedEvidence.map((item) => [item.id, item]));
  const submission = buildSubmissionFromEvidence(input.scenarioId, selectedEvidence, input.benchmark);
  const submissionText = [
    submission.ownerRouting,
    ...submission.dependencyTrace.map((edge) => `${edge.from} ${edge.type} ${edge.to}`),
    submission.actionPlan,
    ...submission.blastRadius,
    submission.evidenceNotes,
  ].filter(Boolean).join('. ');

  const roleState = getEvidenceRoleState(selectedEvidence);
  const criticalErrors: string[] = [];

  if (!roleState.hasPrimary || !roleState.hasCorroborating) {
    criticalErrors.push('Ablation submission requires at least one primary artifact and one corroborating artifact');
  }

  const gating = gateSubmission(
    submissionText,
    submission.selectedEvidenceIds,
    evidenceMap,
    input.benchmark.goldRequiredEvidenceIds
  );

  const ownerScore = scoreOwnerRouting(submission, input.benchmark);
  const dependencyScore = scoreDependencyTrace(submission, input.benchmark);
  const blastRadiusScore = scoreBlastRadius(submission, input.benchmark);
  const unsupportedClaimCount = gating.gatingResults.filter((result) => !result.supported).length;
  const goldHits = input.benchmark.goldRequiredEvidenceIds.filter((evidenceId) =>
    submission.selectedEvidenceIds.includes(evidenceId)
  ).length;
  const evidenceRelevance = input.benchmark.goldRequiredEvidenceIds.length > 0
    ? goldHits / input.benchmark.goldRequiredEvidenceIds.length
    : 0;
  const gatingPass = criticalErrors.length === 0 && unsupportedClaimCount === 0 && gating.gatingPass;

  const metrics = aggregateMetrics(
    ownerScore,
    dependencyScore,
    blastRadiusScore,
    gatingPass,
    unsupportedClaimCount
  );

  const finalMetrics: MetricsResult = {
    ...metrics,
    evidenceRelevance,
    criticalErrorCount: criticalErrors.length,
  };

  return {
    selectedEvidence,
    submission,
    metrics: finalMetrics,
    overallScore: calculateOverallScore(finalMetrics),
    gatingPass,
    criticalErrors,
  };
}