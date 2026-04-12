/**
 * SQLite initialization and seed helpers for scenarios, gold labels, sessions, and survey data.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths relative to the project root (3 levels up from services/api/src/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT 'General',
      prompt TEXT NOT NULL,
      artifacts JSONB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      session_id TEXT,
      owner_routing TEXT,
      dependency_trace JSONB,
      action_plan TEXT,
      blast_radius JSONB,
      evidence_notes TEXT,
      selected_evidence_ids JSONB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id),
      FOREIGN KEY (session_id) REFERENCES learning_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS score_reports (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      gating_passed BOOLEAN,
      critical_errors JSONB,
      rubric_scores JSONB,
      metrics JSONB,
      gold_comparison JSONB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE TABLE IF NOT EXISTS gold_labels (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      gold_owner TEXT,
      gold_dependency_trace JSONB,
      gold_safe_actions JSONB,
      gold_blast_radius JSONB,
      gold_required_evidence_ids JSONB,
      rubric_explanations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
    );

    CREATE TABLE IF NOT EXISTS ablation_runs (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      scenario_id TEXT NOT NULL,
      metrics JSONB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
    );

    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      first_evidence_at DATETIME,
      first_submit_at DATETIME,
      completed_at DATETIME,
      duration_sec REAL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      survey_type TEXT NOT NULL CHECK(survey_type IN ('pre', 'post')),
      q1_confidence INTEGER NOT NULL CHECK(q1_confidence BETWEEN 1 AND 5),
      q2_comfort INTEGER NOT NULL CHECK(q2_comfort BETWEEN 1 AND 5),
      q3_clarity INTEGER NOT NULL CHECK(q3_clarity BETWEEN 1 AND 5),
      q4_readiness INTEGER NOT NULL CHECK(q4_readiness BETWEEN 1 AND 5),
      q5_anxiety INTEGER NOT NULL CHECK(q5_anxiety BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_scenario ON submissions(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_score_reports_submission ON score_reports(submission_id);
    CREATE INDEX IF NOT EXISTS idx_ablation_runs_scenario ON ablation_runs(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_learning_sessions_scenario ON learning_sessions(scenario_id);
  `);

  try {
    db.exec('ALTER TABLE gold_labels ADD COLUMN gold_blast_radius JSONB');
  } catch {
    // Column already exists.
  }

  return db;
}

// ── Corpus + Benchmark loading ─────────────────────────────────

interface CorpusArtifact {
  id: string;
  title: string;
  content: string;
  type: string;
  domain: string;
}

interface CorpusDomain {
  domain: string;
  artifacts: CorpusArtifact[];
}

interface BenchmarkScenario {
  id: string;
  domain: string;
  title: string;
  prompt: string;
  artifacts: string[]; // artifact IDs
  goldOwner: string;
  goldDependencyTrace: Array<{ from: string; to: string; type: string }>;
  goldSafeActions: string[];
  goldBlastRadius?: string[];
  goldRequiredEvidenceIds: string[];
  rubricExplanations: string;
}

interface BenchmarkFile {
  scenarios: BenchmarkScenario[];
}

function loadCorpusArtifacts(): Map<string, CorpusArtifact> {
  const corpusDir = path.join(PROJECT_ROOT, 'datasets', 'synth-corpus');
  const map = new Map<string, CorpusArtifact>();

  if (!fs.existsSync(corpusDir)) return map;

  const files = fs.readdirSync(corpusDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const raw = fs.readFileSync(path.join(corpusDir, file), 'utf-8');
    const domain = JSON.parse(raw) as CorpusDomain;
    for (const art of domain.artifacts) {
      map.set(art.id, art);
    }
  }

  return map;
}

function loadBenchmarkScenarios(): BenchmarkScenario[] {
  const benchFile = path.join(PROJECT_ROOT, 'benchmarks', 'scenarios.json');
  if (!fs.existsSync(benchFile)) return [];
  const raw = fs.readFileSync(benchFile, 'utf-8');
  const data = JSON.parse(raw) as BenchmarkFile;
  return data.scenarios;
}

export function seedSampleData(db: Database.Database): void {
  const corpusArtifacts = loadCorpusArtifacts();
  const benchmarkScenarios = loadBenchmarkScenarios();

  if (benchmarkScenarios.length === 0) {
    // Fallback: seed original Phase 1 scenario if no benchmark exists
    seedLegacyScenario(db);
    return;
  }

  const insertScenario = db.prepare(`
    INSERT OR REPLACE INTO scenarios (id, title, domain, prompt, artifacts)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertGold = db.prepare(`
    INSERT OR IGNORE INTO gold_labels (id, scenario_id, gold_owner, gold_dependency_trace,
                              gold_safe_actions, gold_blast_radius, gold_required_evidence_ids, rubric_explanations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (const scenario of benchmarkScenarios) {
      // Resolve artifacts from corpus
      const resolvedArtifacts = scenario.artifacts
        .map((artId) => {
          const art = corpusArtifacts.get(artId);
          if (!art) return null;
          return { id: art.id, title: art.title, content: art.content, type: art.type };
        })
        .filter(Boolean);

      insertScenario.run(
        scenario.id,
        scenario.title,
        scenario.domain,
        scenario.prompt,
        JSON.stringify(resolvedArtifacts)
      );

      insertGold.run(
        `gold-${scenario.id}`,
        scenario.id,
        scenario.goldOwner,
        JSON.stringify(scenario.goldDependencyTrace),
        JSON.stringify(scenario.goldSafeActions),
        JSON.stringify(scenario.goldBlastRadius ?? scenario.goldSafeActions),
        JSON.stringify(scenario.goldRequiredEvidenceIds),
        scenario.rubricExplanations
      );

      db.prepare(`
        UPDATE gold_labels
        SET gold_blast_radius = ?
        WHERE scenario_id = ? AND (gold_blast_radius IS NULL OR gold_blast_radius = '')
      `).run(
        JSON.stringify(scenario.goldBlastRadius ?? scenario.goldSafeActions),
        scenario.id
      );
    }
  });

  seedAll();
}

function seedLegacyScenario(db: Database.Database): void {
  const existingScenario = db.prepare('SELECT id FROM scenarios WHERE id = ?').get('scenario-1');
  if (existingScenario) return;

  const sampleScenario = {
    id: 'scenario-1',
    title: 'Deploy a Service Change',
    prompt: `Your team needs to deploy a critical authentication service update to production.
             What is the owner responsible? Map dependencies. What is the blast radius?
             Which evidence supports your decision?`,
    artifacts: [
      {
        id: 'artifact-1',
        title: 'Service Ownership Registry',
        content: 'Authentication Service is owned by Platform Team. Dependencies: User Service, API Gateway.',
        type: 'reference',
      },
      {
        id: 'artifact-2',
        title: 'Deployment Runbook',
        content: 'Authentication Service deployments require API Gateway downtime awareness. Notify downstream users.',
        type: 'document',
      },
      {
        id: 'artifact-3',
        title: 'Dependency Graph',
        content: 'Auth Service downstream: Web App, Mobile App, Third-party Integrations. Upstream: Database Service.',
        type: 'document',
      },
    ],
  };

  db.prepare(`INSERT INTO scenarios (id, title, prompt, artifacts) VALUES (?, ?, ?, ?)`).run(
    sampleScenario.id,
    sampleScenario.title,
    sampleScenario.prompt,
    JSON.stringify(sampleScenario.artifacts)
  );

  const goldLabels = {
    id: 'gold-1',
    scenarioId: 'scenario-1',
    goldOwner: 'Platform Team',
    goldDependencyTrace: [
      { from: 'Auth Service', to: 'API Gateway', type: 'downstream' as const },
      { from: 'Auth Service', to: 'Web App', type: 'downstream' as const },
      { from: 'Auth Service', to: 'Mobile App', type: 'downstream' as const },
      { from: 'Database Service', to: 'Auth Service', type: 'upstream' as const },
    ],
    goldSafeActions: [
      'Coordinate with API Gateway team',
      'Notify downstream app teams',
      'Plan rollback procedure',
    ],
    goldRequiredEvidenceIds: ['artifact-1', 'artifact-2', 'artifact-3'],
    rubricExplanations: 'Correct identification of Platform Team as owner, proper dependency mapping, and awareness of blast radius.',
  };

  db.prepare(`
    INSERT INTO gold_labels (id, scenario_id, gold_owner, gold_dependency_trace,
                              gold_safe_actions, gold_required_evidence_ids, rubric_explanations)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    goldLabels.id,
    goldLabels.scenarioId,
    goldLabels.goldOwner,
    JSON.stringify(goldLabels.goldDependencyTrace),
    JSON.stringify(goldLabels.goldSafeActions),
    JSON.stringify(goldLabels.goldRequiredEvidenceIds),
    goldLabels.rubricExplanations
  );
}
