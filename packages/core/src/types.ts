// OmniMentor Core Types

export interface Evidence {
  id: string;
  title: string;
  body: string;
  role: 'primary' | 'corroborating' | 'reference';
  metadata?: {
    source?: string;
    type?: string;
    retrievalScore?: number;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface Artifact {
  id: string;
  title: string;
  content: string;
  type: 'document' | 'code' | 'reference';
}

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  artifacts: Artifact[];
  createdAt: Date;
}

// Submission data structure
export interface Submission {
  id: string;
  scenarioId: string;
  ownerRouting: string;
  dependencyTrace: {
    from: string;
    to: string;
    type: 'upstream' | 'downstream';
  }[];
  actionPlan: string;
  blastRadius: string[];
  evidenceNotes: string;
  selectedEvidenceIds: string[];
  createdAt: Date;
}

// Claim-level units for gating
export interface ClaimUnit {
  id: string;
  text: string;
  startIdx: number;
  endIdx: number;
}

// Gating result
export interface GatingResult {
  claimId: string;
  supported: boolean;
  citedEvidenceIds: string[];
  matchesGold: boolean;
  reason: string;
}

// Rubric score for a criterion
export interface RubricScore {
  criterion: string;
  score: number; // 0-1
  maxScore: number;
  explanation: string;
}

// Aggregated metrics
export interface MetricsResult {
  ownerAccuracy: number;
  dependencyAccuracy: number;
  directionCorrect: boolean;
  blastRadiusCompleteness: number;
  evidenceRelevance: number;
  unsupportedClaimCount: number;
  criticalErrorCount: number;
}

// Full submission result
export interface SubmissionResult {
  submissionId: string;
  gatingPass: boolean;
  criticalErrors: string[];
  rubricScores: RubricScore[];
  metrics: MetricsResult;
  goldComparison: {
    ownerMatch: boolean;
    dependencyMatch: boolean;
    blastRadiusMatch: boolean;
  };
}

// Gold labels for benchmarking
export interface ScenarioBenchmark {
  id: string;
  prompt: string;
  goldOwner: string;
  goldDependencyTrace: {
    from: string;
    to: string;
    type: 'upstream' | 'downstream';
  }[];
  goldSafeActions: string[];
  goldRequiredEvidenceIds: string[];
  rubricExplanations: string;
}

// Retrieval and evaluation contracts (Phase 1 contract-first)
export interface Retriever {
  retrieve(input: {
    scenarioId: string;
    query: string;
    topK: number;
  }): Promise<Evidence[]>;
}

export interface ContextBuilder {
  buildContext(input: {
    scenarioId: string;
    evidence: Evidence[];
  }): Promise<string>;
}

export interface Scorer {
  score(input: {
    submission: Submission;
    benchmark: ScenarioBenchmark;
    evidenceMap: Map<string, Evidence>;
  }): SubmissionResult;
}

export interface AblationRunner {
  run(input: {
    scenarioIds: string[];
    modes: Array<'vector' | 'graph' | 'graphrag' | 'graphrag_gating'>;
  }): Promise<{
    runId: string;
    jsonReportPath: string;
    csvPath: string;
  }>;
}

// Gating policy configuration
export interface GatingPolicy {
  requirePrimaryEvidence: boolean;
  allowCorroboratingOnly: boolean;
  goldEvidenceThreshold: number; // 0.0 - 1.0
  criticalErrorOnUnsupported: boolean;
}

export const DEFAULT_GATING_POLICY: GatingPolicy = {
  requirePrimaryEvidence: true,
  allowCorroboratingOnly: false,
  goldEvidenceThreshold: 0.7,
  criticalErrorOnUnsupported: true,
};
