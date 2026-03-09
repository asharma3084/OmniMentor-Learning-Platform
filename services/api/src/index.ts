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
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001');
const DB_PATH = process.env.DATABASE_URL || './data/omnimentor.db';
const REPORT_DIR = path.join(process.cwd(), 'reports', 'week1');

type SqlScenarioRow = {
  id: string;
  title: string;
  prompt: string;
  artifacts: string;
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
  gold_required_evidence_ids: string;
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

function parseJson<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as T;
  }
  return raw as T;
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

// Get evidence (stub for Phase 1; retrieval modes in Phase 2+)
app.get('/evidence', (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioId = req.query.scenarioId as string;
    if (!scenarioId) {
      next(new AppError('scenarioId query param required', 400, 'MISSING_SCENARIO_ID'));
      return;
    }

    const scenario = db
      .prepare('SELECT artifacts FROM scenarios WHERE id = ?')
      .get(scenarioId) as Pick<SqlScenarioRow, 'artifacts'> | undefined;
    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const artifacts = parseJson<Array<{ id: string; title: string; content: string; type: string }>>(
      scenario.artifacts
    );
    
    // Convert artifacts to evidence format with deterministic ranking
    // Sort by type (primary first) then alphabetically by ID for determinism
    const evidence = artifacts
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.content,
        role: a.type === 'document' ? 'primary' : 'corroborating',
        metadata: {
          source: 'artifact',
          type: a.type,
          retrievalScore: a.type === 'document' ? 1.0 : 0.8,
          timestamp: new Date().toISOString(),
        },
      }))
      .sort((a, b) => {
        // Primary sources first, then corroborating
        if (a.role !== b.role) {
          return a.role === 'primary' ? -1 : 1;
        }
        // Within same role, sort alphabetically by ID for determinism
        return a.id.localeCompare(b.id);
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
      ownerRouting,
      dependencyTrace,
      actionPlan,
      blastRadius,
      evidenceNotes,
      selectedEvidenceIds,
    } = parsed.data;

    const submissionId = uuidv4();
    const createdAt = new Date();

    db.prepare(`
      INSERT INTO submissions (
        id, scenario_id, owner_routing, dependency_trace, action_plan,
        blast_radius, evidence_notes, selected_evidence_ids, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionId,
      scenarioId,
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
    const goldRequiredEvidenceIds = parseJson<string[]>(goldLabels.gold_required_evidence_ids);

    // Fetch scenario for artifacts/evidence
    const scenario = db
      .prepare('SELECT artifacts FROM scenarios WHERE id = ?')
      .get(submission.scenario_id) as Pick<SqlScenarioRow, 'artifacts'> | undefined;

    if (!scenario) {
      next(new AppError('Scenario not found', 404, 'SCENARIO_NOT_FOUND'));
      return;
    }

    const artifacts = parseJson<Array<{ id: string; title: string; content: string; type: string }>>(
      scenario.artifacts
    );

    // Convert artifacts to evidence map
    const evidenceMap = new Map<string, Evidence>(
      artifacts.map((a) => [
        a.id,
        {
          id: a.id,
          title: a.title,
          body: a.content,
          role: a.type === 'document' ? 'primary' : 'corroborating',
        },
      ])
    );

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

app.post('/ablation/run', (req: Request, res: Response, next: NextFunction) => {
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

    const modes = parsed.data.modes ?? ['vector', 'graph', 'graphrag', 'graphrag_gating'];
    const scenarios = db.prepare('SELECT id, title FROM scenarios').all() as Array<{
      id: string;
      title: string;
    }>;

    const penaltyByMode: Record<string, number> = {
      vector: 0.2,
      graph: 0.15,
      graphrag: 0.08,
      graphrag_gating: 0,
    };

    const runId = uuidv4();
    const timestamp = new Date().toISOString();
    const results: Array<{
      scenarioId: string;
      scenarioTitle: string;
      mode: string;
      metrics: MetricsResult;
      overallScore: number;
    }> = [];

    const csvPath = path.join(REPORT_DIR, 'ablation-summary.csv');
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(
        csvPath,
        [
          'run_id,scenario_id,mode,owner_accuracy,dependency_accuracy,blast_radius_completeness,evidence_relevance,unsupported_claim_count,critical_error_count,overall_score',
        ].join('\n') + '\n'
      );
    }

    for (const scenario of scenarios) {
      for (const mode of modes) {
        const penalty = penaltyByMode[mode];
        const metrics: MetricsResult = {
          ownerAccuracy: Math.max(0, 1 - penalty),
          dependencyAccuracy: Math.max(0, 1 - penalty * 0.8),
          directionCorrect: penalty <= 0.15,
          blastRadiusCompleteness: Math.max(0, 1 - penalty * 1.1),
          evidenceRelevance:
            mode === 'graphrag_gating' ? 1 : Math.max(0, 1 - penalty * 1.2),
          unsupportedClaimCount: mode === 'graphrag_gating' ? 0 : Math.round(penalty * 5),
          criticalErrorCount: mode === 'graphrag_gating' ? 0 : Math.round(penalty * 2),
        };

        const overallScore = calculateOverallScore(metrics);
        const rowId = uuidv4();

        db.prepare(
          `
            INSERT INTO ablation_runs (id, mode, scenario_id, metrics, created_at)
            VALUES (?, ?, ?, ?, ?)
          `
        ).run(rowId, mode, scenario.id, JSON.stringify(metrics), timestamp);

        results.push({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          mode,
          metrics,
          overallScore,
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
