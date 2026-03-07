import Database from 'better-sqlite3';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      artifacts JSONB NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      owner_routing TEXT,
      dependency_trace JSONB,
      action_plan TEXT,
      blast_radius JSONB,
      evidence_notes TEXT,
      selected_evidence_ids JSONB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
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

    CREATE INDEX IF NOT EXISTS idx_submissions_scenario ON submissions(scenario_id);
    CREATE INDEX IF NOT EXISTS idx_score_reports_submission ON score_reports(submission_id);
    CREATE INDEX IF NOT EXISTS idx_ablation_runs_scenario ON ablation_runs(scenario_id);
  `);

  return db;
}

export function seedSampleData(db: Database.Database): void {
  // Check if sample data already exists
  const existingScenario = db.prepare('SELECT id FROM scenarios WHERE id = ?').get('scenario-1');
  if (existingScenario) {
    return; // Already seeded
  }

  // Sample scenario
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
        content:
          'Authentication Service is owned by Platform Team. Dependencies: User Service, API Gateway.',
        type: 'reference',
      },
      {
        id: 'artifact-2',
        title: 'Deployment Runbook',
        content:
          'Authentication Service deployments require API Gateway downtime awareness. Notify downstream users.',
        type: 'document',
      },
      {
        id: 'artifact-3',
        title: 'Dependency Graph',
        content:
          'Auth Service downstream: Web App, Mobile App, Third-party Integrations. Upstream: Database Service.',
        type: 'document',
      },
    ],
  };

  // Insert scenario
  db.prepare(`
    INSERT INTO scenarios (id, title, prompt, artifacts)
    VALUES (?, ?, ?, ?)
  `).run(
    sampleScenario.id,
    sampleScenario.title,
    sampleScenario.prompt,
    JSON.stringify(sampleScenario.artifacts)
  );

  // Gold labels for the scenario
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
    rubricExplanations:
      'Correct identification of Platform Team as owner, proper dependency mapping, and awareness of blast radius.',
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
