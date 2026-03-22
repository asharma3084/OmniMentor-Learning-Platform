import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { initializeDatabase, seedSampleData } from './db';
import {
  Evidence,
  MetricsResult,
  ScenarioBenchmark,
  Submission,
  gateSubmission,
  scoreDependencyTrace,
  scoreOwnerRouting,
  scoreBlastRadius,
  buildRubricScores,
  aggregateMetrics,
  calculateOverallScore,
} from '@omnimentor/core';
import {
  VectorRetriever,
  GraphRetriever,
  GraphRAGRetriever,
  InMemoryCorpusStore,
} from '@omnimentor/retrieval';
import { AblationMode, scoreAblationScenario } from './ablation';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __api_filename = fileURLToPath(import.meta.url);
const __api_dirname = path.dirname(__api_filename);

dotenv.config();

const app = express();
const PORT = parseInt(process.env.API_PORT || '9992');
const DB_PATH = process.env.DATABASE_URL || './data/omnimentor.db';
const PROJECT_ROOT = path.resolve(__api_dirname, '..', '..', '..');
const REPORT_DIR = path.join(PROJECT_ROOT, 'reports', 'week2');

type SqlScenarioRow = {
  id: string;
  title: string;
  domain: string;
  prompt: string;
  artifacts: string;
};

type ScenarioArtifact = {
  id: string;
  title: string;
  content: string;
  type: string;
};

type SqlSubmissionRow = {
  id: string;
  scenario_id: string;
  owner_routing: string;
  dependency_trace: string;
  action_plan: string;
  blast_radius: string;
  evidence_notes: string;
  selected_evidence_ids: string;
};

type SqlGoldRow = {
  id: string;
  scenario_id: string;
  gold_owner: string;
  gold_dependency_trace: string;
  gold_safe_actions: string;
  gold_blast_radius?: string;
  gold_required_evidence_ids: string;
  rubric_explanations?: string;
};

type ErrorResponse = {
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
};

class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 400, code?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const dependencyEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['upstream', 'downstream']),
});

const submissionSchema = z.object({
  scenarioId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  ownerRouting: z.string().min(1),
  dependencyTrace: z.array(dependencyEdgeSchema),
  actionPlan: z.string().min(1),
  blastRadius: z.array(z.string().min(1)),
  evidenceNotes: z.string().min(1),
  selectedEvidenceIds: z.array(z.string().min(1)),
});

const scoreSchema = z.object({
  submissionId: z.string().uuid(),
});

const ablationSchema = z.object({
  modes: z
    .array(z.enum(['vector', 'graph', 'graphrag', 'graphrag_gating']))
    .optional(),
});

const sessionStartSchema = z.object({
  scenarioId: z.string().min(1),
});

const sessionEventSchema = z.object({
  sessionId: z.string().min(1),
  event: z.enum(['first_evidence', 'first_submit', 'completed']),
});

const surveySchema = z.object({
  surveyType: z.enum(['pre', 'post']),
  q1Confidence: z.number().int().min(1).max(5),
  q2Comfort: z.number().int().min(1).max(5),
  q3Clarity: z.number().int().min(1).max(5),
  q4Readiness: z.number().int().min(1).max(5),
  q5Anxiety: z.number().int().min(1).max(5),
});

function parseJson<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return raw as T;
}

function parseScenarioArtifacts(raw: unknown): ScenarioArtifact[] {
  return parseJson<ScenarioArtifact[]>(raw);
}

function buildEvidenceMapFromArtifacts(artifacts: ScenarioArtifact[]): Map<string, Evidence> {
  return new Map<string, Evidence>(
    artifacts.map((artifact) => [
      artifact.id,
      {
        id: artifact.id,
        title: artifact.title,
        body: artifact.content,
        role: artifact.type === 'document' ? 'primary' : 'corroborating',
      },
    ])
  );
}

function getSelectedEvidenceRoleState(
  selectedEvidenceIds: string[],
  evidenceMap: Map<string, Evidence>
): {
  hasPrimary: boolean;
  hasCorroborating: boolean;
  invalidEvidenceIds: string[];
} {
  let hasPrimary = false;
  let hasCorroborating = false;
  const invalidEvidenceIds: string[] = [];

  for (const evidenceId of selectedEvidenceIds) {
    const evidence = evidenceMap.get(evidenceId);
    if (!evidence) {
      invalidEvidenceIds.push(evidenceId);
      continue;
    }

    if (evidence.role === 'primary') {
      hasPrimary = true;
    }

    if (evidence.role === 'corroborating') {
      hasCorroborating = true;
    }
  }

  return {
    hasPrimary,
    hasCorroborating,
    invalidEvidenceIds,
  };
}

function buildScenarioExampleAnswer(input: {
  scenarioId: string;
  benchmark: ScenarioBenchmark;
  evidenceMap: Map<string, Evidence>;
  rubricExplanations?: string;
}) {
  const selectedEvidence = input.benchmark.goldRequiredEvidenceIds
    .map((evidenceId) => input.evidenceMap.get(evidenceId))
    .filter((item): item is Evidence => Boolean(item));

  const blastRadius = input.benchmark.goldBlastRadius && input.benchmark.goldBlastRadius.length > 0
    ? input.benchmark.goldBlastRadius
    : input.benchmark.goldSafeActions;

  const evidenceNotes = selectedEvidence.length > 0
    ? selectedEvidence
        .map((item) => `${item.id}: ${item.title}`)
        .join('. ') + '.'
    : 'Use the selected evidence to justify owner, system connections, and downstream impact.';

  const primaryEvidenceIds = selectedEvidence.filter((item) => item.role === 'primary').map((item) => item.id);
  const corroboratingEvidenceIds = selectedEvidence.filter((item) => item.role === 'corroborating').map((item) => item.id);

  return {
    scenarioId: input.scenarioId,
    ownerRouting: input.benchmark.goldOwner,
    actionPlan: input.benchmark.goldSafeActions.join('\n'),
    dependencyTrace: input.benchmark.goldDependencyTrace,
    blastRadius,
    evidenceNotes: [
      evidenceNotes,
      'Each selected artifact supports the owner, dependency path, or impact assessment.',
    ].join('\n'),
    selectedEvidenceIds: selectedEvidence.map((item) => item.id),
    selectedEvidence,
    whyItWorks: input.rubricExplanations ?? 'This example uses the gold owner, supported dependencies, concrete blast radius, and required evidence.',
    fieldGuidance: {
      ownerRouting: `Uses the exact gold owner and ties it back to ownership evidence${primaryEvidenceIds.length > 0 ? ` (${primaryEvidenceIds.join(', ')})` : ''}.`,
      actionPlan: 'Lists concrete safe actions in execution order, which matches how the scorer and reviewers expect a TPM response to read.',
      dependencyTrace: `Uses the real system names and direction labels from the benchmark path (${input.benchmark.goldDependencyTrace.length} connection${input.benchmark.goldDependencyTrace.length === 1 ? '' : 's'}).`,
      blastRadius: 'Names downstream customer and system impact explicitly instead of vague risk statements.',
      evidenceNotes: `Cites artifact IDs directly so the reasoning is traceable${corroboratingEvidenceIds.length > 0 ? `, including corroborating support from ${corroboratingEvidenceIds.join(', ')}` : ''}.`,
    },
  };
}

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Initialize database
const db = initializeDatabase(DB_PATH);
seedSampleData(db);

// ── Build corpus store for retrievers ──────────────────────────
function buildCorpusFromDb(): InMemoryCorpusStore {
  const scenarios = db.prepare('SELECT id, artifacts FROM scenarios').all() as Array<{
    id: string;
    artifacts: string;
  }>;
  const store = new Map<string, Evidence[]>();
  for (const row of scenarios) {
    const artifacts = parseScenarioArtifacts(row.artifacts);
    store.set(row.id, Array.from(buildEvidenceMapFromArtifacts(artifacts).values()));
  }
  return new InMemoryCorpusStore(store);
}

const corpusStore = buildCorpusFromDb();
const retrievers: Record<string, VectorRetriever | GraphRetriever | GraphRAGRetriever> = {
  vector: new VectorRetriever(corpusStore),
  graph: new GraphRetriever(corpusStore),
  graphrag: new GraphRAGRetriever(corpusStore),
  graphrag_gating: new GraphRAGRetriever(corpusStore),
};

// Middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed =
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
      callback(allowed ? null : new Error('CORS origin not allowed'), allowed);
    },
  })
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      const ip = req.ip ?? '';
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    },
  })
);

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { requestId: string }).requestId = uuidv4();
  next();
});

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'OmniMentor API',
    status: 'ok',
    docs: {
      health: '/health',
      scenarios: '/scenarios',
      evidence: '/evidence?scenarioId=scenario-1',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all scenarios
app.get('/scenarios', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarios = db.prepare('SELECT * FROM scenarios').all() as SqlScenarioRow[];
    const parsed = scenarios.map((s) => ({
      ...s,
      artifacts: parseJson<unknown[]>(s.artifacts),
    }));
    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

// Get single scenario
app.get('/scenarios/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenario = db
      .prepare('SELECT * FROM scenarios WHERE id = ?')
      .get(req.params.id) as SqlScenarioRow | undefined;
    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const parsed = {
      ...scenario,
      artifacts: parseJson<unknown[]>(scenario.artifacts),
    };

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

app.get('/scenarios/:id/example-answer', (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenario = db
      .prepare('SELECT id, artifacts FROM scenarios WHERE id = ?')
      .get(req.params.id) as Pick<SqlScenarioRow, 'id' | 'artifacts'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const gold = db
      .prepare('SELECT * FROM gold_labels WHERE scenario_id = ?')
      .get(req.params.id) as SqlGoldRow | undefined;

    if (!gold) {
      next(new AppError('Gold labels not found for scenario', 404, 'GOLD_LABELS_NOT_FOUND'));
      return;
    }

    const benchmark: ScenarioBenchmark = {
      id: gold.id,
      prompt: '',
      goldOwner: gold.gold_owner,
      goldDependencyTrace: parseJson<ScenarioBenchmark['goldDependencyTrace']>(gold.gold_dependency_trace),
      goldSafeActions: parseJson<string[]>(gold.gold_safe_actions),
      goldBlastRadius: parseJson<string[]>(gold.gold_blast_radius ?? gold.gold_safe_actions),
      goldRequiredEvidenceIds: parseJson<string[]>(gold.gold_required_evidence_ids),
      rubricExplanations: gold.rubric_explanations ?? '',
    };

    const evidenceMap = buildEvidenceMapFromArtifacts(parseScenarioArtifacts(scenario.artifacts));
    const exampleAnswer = buildScenarioExampleAnswer({
      scenarioId: scenario.id,
      benchmark,
      evidenceMap,
      rubricExplanations: gold.rubric_explanations,
    });

    res.json(exampleAnswer);
  } catch (err) {
    next(err);
  }
});

// Get evidence via retrieval pipeline
app.get('/evidence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioId = req.query.scenarioId as string;
    if (!scenarioId) {
      next(new AppError('scenarioId query param required', 400, 'MISSING_SCENARIO_ID'));
      return;
    }

    const scenario = db
      .prepare('SELECT id, prompt FROM scenarios WHERE id = ?')
      .get(scenarioId) as { id: string; prompt: string } | undefined;
    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const mode = (req.query.mode as string) || 'vector';
    const validModes = ['vector', 'graph', 'graphrag', 'graphrag_gating'];
    if (!validModes.includes(mode)) {
      next(new AppError(`Invalid mode. Valid: ${validModes.join(', ')}`, 400, 'INVALID_MODE'));
      return;
    }

    const topK = parseInt(req.query.topK as string) || 10;
    const retriever = retrievers[mode];
    const evidence = await retriever.retrieve({
      scenarioId,
      query: scenario.prompt,
      topK,
    });

    res.json(evidence);
  } catch (err) {
    next(err);
  }
});

// Create submission
app.post('/submissions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          }))
        )
      );
      return;
    }

    const {
      scenarioId,
      sessionId,
      ownerRouting,
      dependencyTrace,
      actionPlan,
      blastRadius,
      evidenceNotes,
      selectedEvidenceIds,
    } = parsed.data;

    const scenario = db
      .prepare('SELECT artifacts FROM scenarios WHERE id = ?')
      .get(scenarioId) as Pick<SqlScenarioRow, 'artifacts'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const evidenceMap = buildEvidenceMapFromArtifacts(parseScenarioArtifacts(scenario.artifacts));
    const selectedEvidenceState = getSelectedEvidenceRoleState(selectedEvidenceIds, evidenceMap);

    if (selectedEvidenceState.invalidEvidenceIds.length > 0) {
      next(
        new AppError(
          'Selected evidence must belong to the scenario',
          400,
          'INVALID_EVIDENCE_SELECTION',
          selectedEvidenceState.invalidEvidenceIds
        )
      );
      return;
    }

    if (!selectedEvidenceState.hasPrimary || !selectedEvidenceState.hasCorroborating) {
      next(
        new AppError(
          'Submission requires at least one primary artifact and one corroborating artifact',
          400,
          'EVIDENCE_ROLE_REQUIREMENT'
        )
      );
      return;
    }

    const submissionId = uuidv4();
    const createdAt = new Date();

    db.prepare(`
      INSERT INTO submissions (
        id, scenario_id, session_id, owner_routing, dependency_trace, action_plan,
        blast_radius, evidence_notes, selected_evidence_ids, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionId,
      scenarioId,
      sessionId ?? null,
      ownerRouting,
      JSON.stringify(dependencyTrace),
      actionPlan,
      JSON.stringify(blastRadius),
      evidenceNotes,
      JSON.stringify(selectedEvidenceIds),
      createdAt.toISOString()
    );

    res.json({
      submissionId,
      createdAt,
      message: 'Submission created',
    });
  } catch (err) {
    next(err);
  }
});

// Score submission
app.post('/score', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          }))
        )
      );
      return;
    }

    const { submissionId } = parsed.data;

    // Fetch submission
    const submission = db
      .prepare('SELECT * FROM submissions WHERE id = ?')
      .get(submissionId) as SqlSubmissionRow | undefined;

    if (!submission) {
      next(new AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND'));
      return;
    }

    // Parse JSON fields
    const dependencyTrace = parseJson<Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>>(
      submission.dependency_trace
    );
    const blastRadius = parseJson<string[]>(submission.blast_radius);
    const selectedEvidenceIds = parseJson<string[]>(submission.selected_evidence_ids);

    // Fetch gold labels
    const goldLabels = db
      .prepare('SELECT * FROM gold_labels WHERE scenario_id = ?')
      .get(submission.scenario_id) as SqlGoldRow | undefined;

    if (!goldLabels) {
      next(new AppError('Gold labels not found for scenario', 400, 'GOLD_LABELS_NOT_FOUND'));
      return;
    }

    // Parse gold labels
    const goldDependencyTrace = parseJson<
      Array<{ from: string; to: string; type: 'upstream' | 'downstream' }>
    >(goldLabels.gold_dependency_trace);
    const goldSafeActions = parseJson<string[]>(goldLabels.gold_safe_actions);
    const goldBlastRadius = parseJson<string[]>(goldLabels.gold_blast_radius ?? goldLabels.gold_safe_actions);
    const goldRequiredEvidenceIds = parseJson<string[]>(goldLabels.gold_required_evidence_ids);

    // Fetch scenario for artifacts/evidence
    const scenario = db
      .prepare('SELECT artifacts FROM scenarios WHERE id = ?')
      .get(submission.scenario_id) as Pick<SqlScenarioRow, 'artifacts'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const artifacts = parseScenarioArtifacts(scenario.artifacts);
    const evidenceMap = buildEvidenceMapFromArtifacts(artifacts);
    const selectedEvidenceState = getSelectedEvidenceRoleState(selectedEvidenceIds, evidenceMap);

    if (selectedEvidenceState.invalidEvidenceIds.length > 0) {
      next(
        new AppError(
          'Submission includes evidence that does not belong to the scenario',
          400,
          'INVALID_EVIDENCE_SELECTION',
          selectedEvidenceState.invalidEvidenceIds
        )
      );
      return;
    }

    if (!selectedEvidenceState.hasPrimary || !selectedEvidenceState.hasCorroborating) {
      next(
        new AppError(
          'Submission must include at least one primary artifact and one corroborating artifact before scoring',
          400,
          'EVIDENCE_ROLE_REQUIREMENT'
        )
      );
      return;
    }

    const submissionText = [
      submission.owner_routing,
      submission.action_plan,
      ...blastRadius,
      submission.evidence_notes,
    ].join('. ');

    // Run gating
    const { gatingPass, gatingResults, criticalErrors } = gateSubmission(
      submissionText,
      selectedEvidenceIds,
      evidenceMap,
      goldRequiredEvidenceIds
    );

    const submissionForScoring: Submission = {
      id: submission.id,
      scenarioId: submission.scenario_id,
      ownerRouting: submission.owner_routing,
      dependencyTrace,
      actionPlan: submission.action_plan,
      blastRadius,
      evidenceNotes: submission.evidence_notes,
      selectedEvidenceIds,
      createdAt: new Date(),
    };

    const benchmarkForScoring: ScenarioBenchmark = {
      id: goldLabels.id,
      prompt: '',
      goldOwner: goldLabels.gold_owner,
      goldDependencyTrace,
      goldSafeActions,
      goldBlastRadius,
      goldRequiredEvidenceIds,
      rubricExplanations: '',
    };

    // Score against gold
    const ownerScore = scoreOwnerRouting(submissionForScoring, benchmarkForScoring);
    const dependencyScore = scoreDependencyTrace(submissionForScoring, benchmarkForScoring);
    const blastRadiusScore = scoreBlastRadius(submissionForScoring, benchmarkForScoring);

    const unsupportedClaimCount = gatingResults.filter((r) => !r.supported).length;

    // Build rubric and metrics
    const rubricScores = buildRubricScores(
      ownerScore,
      dependencyScore,
      blastRadiusScore,
      gatingPass,
      unsupportedClaimCount
    );

    const metrics = aggregateMetrics(
      ownerScore,
      dependencyScore,
      blastRadiusScore,
      gatingPass,
      unsupportedClaimCount
    );

    const overallScore = calculateOverallScore(metrics);

    // Create report
    const reportId = uuidv4();
    const createdAt = new Date();

    db.prepare(`
      INSERT INTO score_reports (
        id, submission_id, gating_passed, critical_errors,
        rubric_scores, metrics, gold_comparison, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      submissionId,
      gatingPass ? 1 : 0,
      JSON.stringify(criticalErrors),
      JSON.stringify(rubricScores),
      JSON.stringify(metrics),
      JSON.stringify({
        ownerMatch: ownerScore === 1.0,
        dependencyMatch: dependencyScore.directionCorrect,
        blastRadiusMatch: blastRadiusScore.completeness === 1.0,
      }),
      createdAt.toISOString()
    );

    res.json({
      reportId,
      submissionId,
      gatingPass,
      overallScore: Math.round(overallScore * 100) / 100,
      criticalErrors,
      rubricScores,
      metrics,
      createdAt,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/ablation/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ablationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      next(
        new AppError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          }))
        )
      );
      return;
    }

    const modes = (parsed.data.modes ?? ['vector', 'graph', 'graphrag', 'graphrag_gating']) as AblationMode[];
    const scenarios = db.prepare('SELECT id, title, prompt FROM scenarios').all() as Array<{
      id: string;
      title: string;
      prompt: string;
    }>;

    const runId = uuidv4();
    const timestamp = new Date().toISOString();
    const results: Array<{
      scenarioId: string;
      scenarioTitle: string;
      mode: string;
      metrics: MetricsResult;
      overallScore: number;
      evidenceCount: number;
    }> = [];

    const csvPath = path.join(REPORT_DIR, 'ablation-summary.csv');
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(
        csvPath,
        [
          'run_id,scenario_id,mode,owner_accuracy,dependency_accuracy,blast_radius_completeness,evidence_relevance,unsupported_claim_count,critical_error_count,overall_score,evidence_count',
        ].join('\n') + '\n'
      );
    }

    for (const scenario of scenarios) {
      // Get gold labels for this scenario
      const goldRow = db
        .prepare('SELECT * FROM gold_labels WHERE scenario_id = ?')
        .get(scenario.id) as SqlGoldRow | undefined;

      for (const mode of modes) {
        const retriever = retrievers[mode];
        const evidence = await retriever.retrieve({
          scenarioId: scenario.id,
          query: scenario.prompt,
          topK: 10,
        });

        if (!goldRow) {
          continue;
        }

        const benchmark: ScenarioBenchmark = {
          id: goldRow.id,
          prompt: scenario.prompt,
          goldOwner: goldRow.gold_owner,
          goldDependencyTrace: parseJson<ScenarioBenchmark['goldDependencyTrace']>(goldRow.gold_dependency_trace),
          goldSafeActions: parseJson<string[]>(goldRow.gold_safe_actions),
          goldBlastRadius: parseJson<string[]>(goldRow.gold_blast_radius ?? goldRow.gold_safe_actions),
          goldRequiredEvidenceIds: parseJson<string[]>(goldRow.gold_required_evidence_ids),
          rubricExplanations: '',
        };

        const scoredScenario = scoreAblationScenario({
          scenarioId: scenario.id,
          mode,
          retrievedEvidence: evidence,
          benchmark,
        });

        const metrics = scoredScenario.metrics;
        const overallScore = scoredScenario.overallScore;
        const evidenceCount = scoredScenario.selectedEvidence.length;
        const rowId = uuidv4();

        db.prepare(
          `INSERT INTO ablation_runs (id, mode, scenario_id, metrics, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(rowId, mode, scenario.id, JSON.stringify(metrics), timestamp);

        results.push({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          mode,
          metrics,
          overallScore,
          evidenceCount,
        });

        fs.appendFileSync(
          csvPath,
          [
            runId,
            scenario.id,
            mode,
            metrics.ownerAccuracy.toFixed(3),
            metrics.dependencyAccuracy.toFixed(3),
            metrics.blastRadiusCompleteness.toFixed(3),
            metrics.evidenceRelevance.toFixed(3),
            metrics.unsupportedClaimCount,
            metrics.criticalErrorCount,
            overallScore.toFixed(3),
            evidenceCount,
          ].join(',') + '\n'
        );
      }
    }

    const jsonPath = path.join(REPORT_DIR, `ablation-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const report = {
      runId,
      timestamp,
      modes,
      scenarioCount: scenarios.length,
      results,
      csvPath,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    res.json({
      runId,
      reportPath: jsonPath,
      csvPath,
      resultCount: results.length,
    });
  } catch (err) {
    next(err);
  }
});

// ── Learning Sessions (Time Tracking) ──────────────────────────

// Start a new learning session for a scenario
app.post('/sessions/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sessionStartSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues));
      return;
    }

    const { scenarioId } = parsed.data;

    // Verify scenario exists
    const scenario = db.prepare('SELECT id FROM scenarios WHERE id = ?').get(scenarioId);
    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    // Calculate attempt number
    const prevAttempts = db
      .prepare('SELECT COUNT(*) as count FROM learning_sessions WHERE scenario_id = ?')
      .get(scenarioId) as { count: number };

    const sessionId = uuidv4();
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO learning_sessions (id, scenario_id, started_at, attempt_number)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, scenarioId, startedAt, prevAttempts.count + 1);

    res.json({ sessionId, scenarioId, startedAt, attemptNumber: prevAttempts.count + 1 });
  } catch (err) {
    next(err);
  }
});

// Record a session event (first evidence selection, first submit, completion)
app.post('/sessions/event', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = sessionEventSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues));
      return;
    }

    const { sessionId, event } = parsed.data;
    const now = new Date().toISOString();

    const session = db.prepare('SELECT * FROM learning_sessions WHERE id = ?').get(sessionId) as
      | { id: string; started_at: string; first_evidence_at: string | null; first_submit_at: string | null; completed_at: string | null }
      | undefined;
    if (!session) {
      next(new AppError('Session not found', 404, 'SESSION_NOT_FOUND'));
      return;
    }

    if (event === 'first_evidence' && !session.first_evidence_at) {
      db.prepare('UPDATE learning_sessions SET first_evidence_at = ? WHERE id = ?').run(now, sessionId);
    } else if (event === 'first_submit' && !session.first_submit_at) {
      db.prepare('UPDATE learning_sessions SET first_submit_at = ? WHERE id = ?').run(now, sessionId);
    } else if (event === 'completed') {
      const startedAt = new Date(session.started_at).getTime();
      const completedAt = new Date(now).getTime();
      const durationSec = (completedAt - startedAt) / 1000;
      db.prepare('UPDATE learning_sessions SET completed_at = ?, duration_sec = ? WHERE id = ?').run(
        now,
        durationSec,
        sessionId
      );
    }

    res.json({ sessionId, event, timestamp: now });
  } catch (err) {
    next(err);
  }
});

// Get learning analytics (time tracking data for all sessions)
app.get('/analytics/sessions', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = db
      .prepare(`
        SELECT ls.*, s.title as scenario_title, s.domain as scenario_domain
        FROM learning_sessions ls
        JOIN scenarios s ON ls.scenario_id = s.id
        ORDER BY ls.created_at ASC
      `)
      .all();
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// ── Pre/Post Confidence Survey ─────────────────────────────────

app.post('/surveys', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = surveySchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues));
      return;
    }

    const { surveyType, q1Confidence, q2Comfort, q3Clarity, q4Readiness, q5Anxiety } = parsed.data;
    const id = uuidv4();

    db.prepare(`
      INSERT INTO survey_responses (id, survey_type, q1_confidence, q2_comfort, q3_clarity, q4_readiness, q5_anxiety)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, surveyType, q1Confidence, q2Comfort, q3Clarity, q4Readiness, q5Anxiety);

    res.json({ id, surveyType, createdAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

app.get('/surveys', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const surveys = db.prepare('SELECT * FROM survey_responses ORDER BY created_at ASC').all();
    res.json(surveys);
  } catch (err) {
    next(err);
  }
});

// Check if a pre/post survey already exists
app.get('/surveys/status', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pre = db.prepare("SELECT COUNT(*) as count FROM survey_responses WHERE survey_type = 'pre'").get() as { count: number };
    const post = db.prepare("SELECT COUNT(*) as count FROM survey_responses WHERE survey_type = 'post'").get() as { count: number };
    res.json({ preCompleted: pre.count > 0, postCompleted: post.count > 0 });
  } catch (err) {
    next(err);
  }
});

// Error handler
app.use((req: Request, res: Response) => {
  const requestId = (req as Request & { requestId?: string }).requestId;
  const response: ErrorResponse = {
    error: 'Not found',
    code: 'NOT_FOUND',
    requestId,
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const appError = err instanceof AppError ? err : new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  if (!(err instanceof AppError)) {
    console.error('Unhandled API error:', err);
  }

  const requestId = (req as Request & { requestId?: string }).requestId;
  const response: ErrorResponse = {
    error: appError.message,
    code: appError.code,
    details: appError.details,
    requestId,
    timestamp: new Date().toISOString(),
  };

  res.status(appError.statusCode).json(response);
});

app.listen(PORT, () => {
  console.log(`✅ API server running on http://localhost:${PORT}`);
  console.log(`📦 Database: ${DB_PATH}`);
});
