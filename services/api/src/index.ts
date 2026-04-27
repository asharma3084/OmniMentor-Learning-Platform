/**
 * Express API entrypoint for scenarios, evidence retrieval, submissions, scoring, and evaluation runs.
 */
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
  parseClaimUnits,
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
  InMemoryGraphStore,
  GraphServiceNode,
} from '@omnimentor/retrieval';
import { AblationMode, scoreAblationScenario, selectEvidenceForAblation } from './ablation';
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
  difficulty: string;
  estimated_minutes: number;
  learning_outcomes: string;
};

type ScenarioArtifact = {
  id: string;
  title: string;
  content: string;
  type: string;
};

type DomainGraphFile = {
  domain: string;
  services?: GraphServiceNode[];
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

const evaluationCompareSchema = z.object({
  scenarioId: z.string().min(1),
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
  // Use all scenario artifacts — a perfect answer leverages all available evidence
  const selectedEvidence = Array.from(input.evidenceMap.values());

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
    evidenceNotes: evidenceNotes,
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

function buildGraphStoreFromDatasets(): InMemoryGraphStore {
  const datasetDir = path.join(PROJECT_ROOT, 'datasets', 'synth-corpus');
  const domainGraphs = new Map<string, GraphServiceNode[]>();

  if (fs.existsSync(datasetDir)) {
    const files = fs.readdirSync(datasetDir).filter((file) => file.endsWith('.json'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(datasetDir, file), 'utf-8');
      const parsed = JSON.parse(raw) as DomainGraphFile;
      if (parsed.domain && parsed.services && parsed.services.length > 0) {
        domainGraphs.set(parsed.domain, parsed.services);
      }
    }
  }

  const scenarios = db.prepare('SELECT id, domain FROM scenarios').all() as Array<{
    id: string;
    domain: string;
  }>;

  const scenarioGraphs = new Map<string, GraphServiceNode[]>();
  for (const scenario of scenarios) {
    const services = domainGraphs.get(scenario.domain) ?? [];
    scenarioGraphs.set(scenario.id, services);
  }

  return new InMemoryGraphStore(scenarioGraphs);
}

const corpusStore = buildCorpusFromDb();
const graphStore = buildGraphStoreFromDatasets();
const retrievers: Record<string, VectorRetriever | GraphRetriever | GraphRAGRetriever> = {
  vector: new VectorRetriever(corpusStore),
  graph: new GraphRetriever(corpusStore, graphStore),
  graphrag: new GraphRAGRetriever(corpusStore, graphStore),
  graphrag_gating: new GraphRAGRetriever(corpusStore, graphStore),
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
      learning_outcomes: parseJson<string[]>(s.learning_outcomes),
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
      learning_outcomes: parseJson<string[]>(scenario.learning_outcomes),
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
    const retrievedEvidence = await retriever.retrieve({
      scenarioId,
      query: scenario.prompt,
      topK,
    });

    const evidence = mode === 'graphrag_gating'
      ? selectEvidenceForAblation(retrievedEvidence, 'graphrag_gating').map((item) => ({
          ...item,
          metadata: {
            ...item.metadata,
            selectionPolicy: 'role-diverse gating support',
          },
        }))
      : retrievedEvidence;

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
    const claims = parseClaimUnits(submissionText);
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
      gatingResults: gatingResults.map((r) => ({
        claimId: r.claimId,
        supported: r.supported,
        citedEvidenceIds: r.citedEvidenceIds,
        reason: r.reason,
      })),
      claims: claims.map((c) => ({ id: c.id, text: c.text })),
      createdAt,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/evaluation/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = evaluationCompareSchema.safeParse(req.query);
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

    const { scenarioId } = parsed.data;
    const scenario = db
      .prepare('SELECT id, title, prompt FROM scenarios WHERE id = ?')
      .get(scenarioId) as Pick<SqlScenarioRow, 'id' | 'title' | 'prompt'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const goldRow = db
      .prepare('SELECT * FROM gold_labels WHERE scenario_id = ?')
      .get(scenario.id) as SqlGoldRow | undefined;

    if (!goldRow) {
      next(new AppError('Gold labels not found for scenario', 400, 'GOLD_LABELS_NOT_FOUND'));
      return;
    }

    const benchmark: ScenarioBenchmark = {
      id: goldRow.id,
      prompt: scenario.prompt,
      goldOwner: goldRow.gold_owner,
      goldDependencyTrace: parseJson<ScenarioBenchmark['goldDependencyTrace']>(goldRow.gold_dependency_trace),
      goldSafeActions: parseJson<string[]>(goldRow.gold_safe_actions),
      goldBlastRadius: parseJson<string[]>(goldRow.gold_blast_radius ?? goldRow.gold_safe_actions),
      goldRequiredEvidenceIds: parseJson<string[]>(goldRow.gold_required_evidence_ids),
      rubricExplanations: goldRow.rubric_explanations ?? '',
    };

    const modes: AblationMode[] = ['vector', 'graph', 'graphrag', 'graphrag_gating'];
    const results = [] as Array<{
      mode: AblationMode;
      overallScore: number;
      gatingPass: boolean;
      criticalErrors: string[];
      evidenceCount: number;
      selectedEvidenceIds: string[];
      selectedEvidenceTitles: string[];
      metrics: MetricsResult;
    }>;

    for (const mode of modes) {
      const retriever = retrievers[mode];
      const evidence = await retriever.retrieve({
        scenarioId: scenario.id,
        query: scenario.prompt,
        topK: 10,
      });

      const scored = scoreAblationScenario({
        scenarioId: scenario.id,
        mode,
        retrievedEvidence: evidence,
        benchmark,
      });

      results.push({
        mode,
        overallScore: scored.overallScore,
        gatingPass: scored.gatingPass,
        criticalErrors: scored.criticalErrors,
        evidenceCount: scored.selectedEvidence.length,
        selectedEvidenceIds: scored.selectedEvidence.map((item) => item.id),
        selectedEvidenceTitles: scored.selectedEvidence.map((item) => item.title),
        metrics: scored.metrics,
      });
    }

    const bestMode = [...results].sort((left, right) => {
      const gatingDelta = Number(right.gatingPass) - Number(left.gatingPass);
      if (gatingDelta !== 0) {
        return gatingDelta;
      }
      return right.overallScore - left.overallScore;
    })[0];

    res.json({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      bestMode: bestMode?.mode ?? 'vector',
      results,
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

// ── AI Assistant (Ollama) ──────────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

const assistSchema = z.object({
  scenarioId: z.string(),
  step: z.enum(['brief', 'investigate', 'decide', 'feedback']),
  selectedEvidence: z.array(z.string()).default([]),
  question: z.string().min(1).max(500),
});

function buildAssistantPrompt(
  scenario: { title: string; domain: string; prompt: string; artifacts: ScenarioArtifact[] },
  step: string,
  selectedEvidenceTitles: string[],
): string {
  const evidenceCtx = selectedEvidenceTitles.length
    ? `The learner has selected these evidence artifacts: ${selectedEvidenceTitles.join(', ')}.`
    : 'The learner has not yet selected any evidence artifacts.';

  const artifactList = scenario.artifacts.map(a => `"${a.title}"`).join(', ');

  // Include artifact bodies so the model can answer questions about teams, services, etc.
  const artifactDetails = scenario.artifacts
    .map(a => `[${a.id}] ${a.title}: ${typeof a.body === 'string' ? a.body.slice(0, 300) : ''}`)
    .join('\n');

  const stepSkills: Record<string, string> = {
    brief: [
      'STEP: BRIEF — The learner is reading the incident brief.',
      'What they see: a scenario description, four mission deliverable cards (Owner Routing, Dependency Trace, Blast Radius, Safe Actions), and a "Start Investigation" button.',
      'What they can do right now: Read the scenario carefully, understand the stakes, then click "Start With Evidence" to move to Investigate.',
      'How to help: Explain what the scenario is about, what the four deliverables mean, and what to look for when they start investigating evidence.',
    ].join(' '),
    investigate: [
      'STEP: INVESTIGATE — The learner is reviewing evidence artifacts.',
      'What they see: evidence cards they can click to select. Each card has a title and body text. They must select at least one "Primary" and one "Corroborating" artifact.',
      'What they can do: Click evidence cards to select/deselect, mark one as Primary (most directly relevant) and another as Corroborating (adds supporting context). Once they have both roles assigned, "Build My Starter Draft" becomes available to auto-fill the form.',
      'How to help: Help them evaluate which evidence is most relevant, point them to specific artifacts by name, explain what makes good primary vs. corroborating evidence.',
    ].join(' '),
    decide: [
      'STEP: DECIDE — The learner is filling out the structured response form.',
      'What they see: five text fields — Owner Routing, Dependency Trace, Action Plan, Blast-Radius Plan, and Evidence Notes. A "Submit & Score" button and optionally a "Show Good Answer" button for an example.',
      'What they can do: Write their answers in each field, use "Fill Template" to get a starter draft from selected evidence, view an example answer, or submit for scoring.',
      'How to help: Guide them to write specific, evidence-backed answers. Owner = which team owns the root cause. Dependency Trace = how failures propagate upstream → downstream. Blast Radius = customer/revenue/operational impact. Safe Actions = immediate mitigation steps. Evidence Notes = which artifacts support their reasoning.',
    ].join(' '),
    feedback: [
      'STEP: FEEDBACK — The learner is reviewing their score and coaching.',
      'What they see: overall score ring, rubric breakdown (Owner Routing, Dependency Trace, Blast Radius, Evidence Support), learning summary, and next actions. Sub-tabs: Score & Coaching, System Graph, Evidence Explorer, Check-in Export.',
      'What they can do: Review their score, explore the system dependency graph, see which evidence they used, look at the rubric breakdown, export a check-in summary, or switch to a new scenario from the dropdown.',
      'How to help: Explain what each scoring dimension means, interpret why they scored high or low, suggest what to improve, encourage them to try another scenario.',
    ].join(' '),
  };

  return [
    'You are the Scenario Coach inside OmniMentor — a supportive, non-judgmental learning coach that trains new Technical Program Managers (TPMs) on incident response and architecture reasoning at a large-scale retailer.',
    '',
    '=== PLATFORM CONTEXT ===',
    'OmniMentor has 12 practice scenarios across 4 domains (Catalog, Checkout & Cart, Risk & Compliance, Fulfillment & Logistics).',
    'Each scenario is an incident brief where the learner must: identify the owning team, trace dependency paths, assess blast radius, and recommend safe actions.',
    'The guided flow has 4 steps: Brief → Investigate → Decide → Feedback.',
    '',
    '=== CURRENT SCENARIO ===',
    `Title: "${scenario.title}"`,
    `Domain: ${scenario.domain}`,
    `Description: ${scenario.prompt}`,
    `Available evidence artifacts: ${artifactList}`,
    evidenceCtx,
    '',
    '=== ARTIFACT DETAILS (use these to answer learner questions) ===',
    artifactDetails,
    '',
    `=== CURRENT STEP ===`,
    stepSkills[step] || '',
    '',
    '=== RULES ===',
    '1. SCOPE: You can discuss this scenario, evidence artifacts, teams/services mentioned in artifacts, incident response concepts, and TPM skills.',
    '2. ON-TOPIC QUESTIONS: When the learner asks about a team, service, system, or concept that appears in the ARTIFACT DETAILS above, answer using those facts. This is NOT off-topic — it\'s exactly what they should be doing. Summarize what the artifacts say about it.',
    '3. OFF-TOPIC: If the learner sends something completely unrelated to the scenario (personal questions, trivia, jokes, coding requests, math, general knowledge), give a SHORT one-sentence reply like: "That falls outside the scope of this scenario — try asking about the evidence or your next step."',
    '4. NO HALLUCINATION: NEVER invent information. Only use facts from the scenario context and artifact details provided above. If the input is unclear, ask the learner to rephrase.',
    '5. NO GOLD ANSWERS: Do not directly reveal the single correct owner assignment, the exact scored dependency path, or the scored blast radius items. But DO discuss teams, services, and dependencies that appear in the evidence — the learner needs that information to reason.',
    '6. REDIRECT: If they ask "who owns this?" or "what\'s the answer?", suggest which evidence artifact to examine rather than giving the gold answer.',
    '7. PLATFORM HELP: If the learner asks "what can I do" or "help", describe 2-3 actions for their current step. Do NOT volunteer this info unprompted.',
    '8. CONCISE: Keep responses to 2-4 sentences. Write plain sentences. Be warm, specific, and brief.',
    '9. EVIDENCE REFERENCES: Name 1-2 specific evidence artifacts when relevant — not all of them.',
    '',
    '=== RESPONSE EXAMPLES (follow these patterns) ===',
    'User: "Arvind" → "That falls outside the scope of this scenario — try asking about the evidence or your next step."',
    'User: "tell me a joke" → "I can only help with this incident scenario. What would you like to explore?"',
    'User: "what is my name" → "I don\'t have that information, but I can help you work through this scenario. Ask about the evidence or what to focus on."',
    'User: "write python code" → "I can\'t help with coding — my role is to coach you through this scenario. What would you like to explore?"',
    'User: "what is the capital of France" → "That\'s outside my scope — I focus on this scenario. Ask about the evidence or next steps."',
    'User: "what can I do?" → [Describe 2-3 actions for the current step in plain sentences — this is the ONLY case where you explain platform actions]',
    'User: "help me understand the scenario" → "This scenario is about [brief 1-sentence summary]. Start by reading the incident brief, then think about which teams and systems might be affected."',
    'User: "who owns this?" → "I can\'t reveal that — it\'s what you\'re here to figure out! Try checking the Service Ownership Registry artifact."',
    'User: "is this evidence relevant?" → "Think about what it tells you about system dependencies. Does it mention upstream or downstream services?"',
    'User: "why did I score low?" → "Check which rubric dimensions scored lowest — that indicates exactly which areas to strengthen in your next attempt."',
    'User: "tell me more about the Catalog Team" → [Look up ARTIFACT DETAILS for mentions of "Catalog Team" and summarize what the artifacts say about that team\'s role and responsibilities in this scenario]',
    'User: "what does the Pricing Engine do?" → [Look up ARTIFACT DETAILS for mentions of "Pricing Engine" and describe its role based on the evidence]',
  ].join('\n');
}

app.post('/assist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = assistSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError('Invalid request', 400, 'VALIDATION_ERROR', parsed.error.flatten()));
      return;
    }

    const { scenarioId, step, selectedEvidence, question } = parsed.data;

    const scenario = db
      .prepare('SELECT id, title, domain, prompt, artifacts FROM scenarios WHERE id = ?')
      .get(scenarioId) as Pick<SqlScenarioRow, 'id' | 'title' | 'domain' | 'prompt' | 'artifacts'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const artifacts = parseJson<ScenarioArtifact[]>(scenario.artifacts);
    const selectedTitles = artifacts
      .filter((a) => selectedEvidence.includes(a.id))
      .map((a) => a.title);

    const systemPrompt = buildAssistantPrompt(
      { ...scenario, artifacts },
      step,
      selectedTitles,
    );

    // Stream response from Ollama
    const ollamaController = new AbortController();
    const ollamaTimeout = setTimeout(() => ollamaController.abort(), 30000);

    let ollamaRes: globalThis.Response;
    try {
      ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: question,
          system: systemPrompt,
          stream: true,
          options: { temperature: 0.7, num_predict: 384 },
        }),
        signal: ollamaController.signal,
      });
    } catch (fetchErr) {
      clearTimeout(ollamaTimeout);
      const msg = (fetchErr as Error).name === 'AbortError' ? 'Ollama request timed out' : `Ollama connection failed: ${(fetchErr as Error).message}`;
      next(new AppError(msg, 502, 'OLLAMA_ERROR'));
      return;
    }
    clearTimeout(ollamaTimeout);

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      next(new AppError(`Ollama error: ${ollamaRes.status}`, 502, 'OLLAMA_ERROR', errText));
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = ollamaRes.body?.getReader();
    if (!reader) {
      next(new AppError('No response body from Ollama', 502, 'OLLAMA_ERROR'));
      return;
    }

    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        // Ollama sends newline-delimited JSON; forward each token
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              res.write(`data: ${JSON.stringify({ token: parsed.response })}\n\n`);
            }
            if (parsed.done) {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }

    res.end();
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
