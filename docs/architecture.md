# OmniMentor Architecture

Version: 2.0
Last Updated: 2026-03-07
Scope: Proposal-aligned baseline (Phase 1 complete, Phase 2+ planned)

## 1. Architecture Goals

OmniMentor is designed to support deliberate technical practice through:
- Scenario-based problem solving.
- Evidence-first reasoning and claim validation.
- Rubric-driven scoring with transparent metrics.
- Reproducible evaluation across retrieval strategies.

This architecture follows the project proposal as the baseline. Any future deviations must be documented in local session notes and summarized in weekly check-ins.

## 2. High-Level System Architecture

```mermaid
flowchart TB
  %% ---------- Clients ----------
  U["Learner / Reviewer"]
  W["Web App\napps/web\nReact + Vite"]

  %% ---------- API ----------
  A["API Service\nservices/api\nNode + Express"]

  %% ---------- Core ----------
  C["Core Engine\npackages/core\nGating + Scoring + Metrics"]
  R["Retrieval Layer\npackages/retrieval\nVector | Graph | GraphRAG | GraphRAG+Gating"]

  %% ---------- Data ----------
  DB[("SQLite\n./data/omnimentor.db")]
  DS["Synthetic Corpus\ndatasets/synth-corpus"]
  BM["Benchmark + Gold Labels\nbenchmarks"]

  %% ---------- Outputs ----------
  REP["Reports\nreports/week1\nservices/api/reports/week1\nJSON + CSV"]

  U --> W
  W -->|REST| A

  A --> C
  A --> R
  A --> DB

  R --> DS
  C --> BM
  C --> DB

  A --> REP
  C --> REP

  %% ---------- Class styling ----------
  classDef client fill:#FFF3E0,stroke:#E65100,color:#3E2723,stroke-width:2px;
  classDef ui fill:#E3F2FD,stroke:#1565C0,color:#0D47A1,stroke-width:2px;
  classDef api fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20,stroke-width:2px;
  classDef core fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C,stroke-width:2px;
  classDef data fill:#FFFDE7,stroke:#F9A825,color:#5D4037,stroke-width:2px;
  classDef output fill:#FCE4EC,stroke:#C2185B,color:#880E4F,stroke-width:2px;

  class U client;
  class W ui;
  class A api;
  class C,R core;
  class DB,DS,BM data;
  class REP output;
```

## 3. Flow A Runtime (Proposal Spine)

Flow A is the primary implementation path for Week 1.

```mermaid
sequenceDiagram
  autonumber
  participant L as Learner
  participant UI as Web App
  participant API as API Service
  participant CORE as Core Engine
  participant DB as SQLite

  L->>UI: Open scenario
  UI->>API: GET /scenarios/:id
  API->>DB: Read scenario + artifacts
  DB-->>API: Scenario payload
  API-->>UI: Scenario + evidence list

  L->>UI: Select evidence + fill submission
  UI->>API: POST /submissions
  API->>DB: Persist submission
  DB-->>API: submissionId
  API-->>UI: submissionId

  UI->>API: POST /score (submissionId)
  API->>DB: Load submission + gold labels
  API->>CORE: gateSubmission + rubric scoring
  CORE-->>API: gating, metrics, overall score
  API->>DB: Persist score_report
  API-->>UI: Feedback response

  UI-->>L: Rubric, critical errors, explanations
```

## 4. Evaluation And Ablation Pipeline

This aligns to proposal requirement for mode comparison:
- `vector`
- `graph`
- `graphrag`
- `graphrag_gating`

```mermaid
flowchart LR
  START([Start Eval Run]) --> MODES{"Select Modes"}
  MODES --> M1["vector"]
  MODES --> M2["graph"]
  MODES --> M3["graphrag"]
  MODES --> M4["graphrag_gating"]

  M1 --> RUN["Run Scenario Set\n(benchmark + gold labels)"]
  M2 --> RUN
  M3 --> RUN
  M4 --> RUN

  RUN --> SCORE["Compute Metrics\nowner/dependency/blast/evidence/critical"]
  SCORE --> OUTJSON["Write JSON\nablation-run-*.json"]
  SCORE --> OUTCSV["Append CSV\nablation-summary.csv"]
  OUTJSON --> END([Done])
  OUTCSV --> END

  classDef start fill:#E0F7FA,stroke:#00838F,color:#004D40,stroke-width:2px;
  classDef mode fill:#EDE7F6,stroke:#5E35B1,color:#311B92,stroke-width:2px;
  classDef run fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20,stroke-width:2px;
  classDef score fill:#FFF3E0,stroke:#EF6C00,color:#4E342E,stroke-width:2px;
  classDef out fill:#FCE4EC,stroke:#AD1457,color:#880E4F,stroke-width:2px;

  class START,END start;
  class M1,M2,M3,M4 mode;
  class RUN run;
  class SCORE score;
  class OUTJSON,OUTCSV out;
```

## 5. Component Responsibilities

### 5.1 Web App (`apps/web`)
- Renders scenario prompts and evidence artifacts.
- Captures structured submission fields.
- Displays score, gating outcome, and rubric feedback.

### 5.2 API Service (`services/api`)
- Exposes REST contracts for scenario/evidence/submission/score/eval.
- Handles validation, persistence, and report generation.
- Coordinates core scoring and retrieval abstractions.

### 5.3 Core Engine (`packages/core`)
- Claim-unit parsing and evidence gating.
- Owner routing, dependency trace, blast radius scoring.
- Rubric construction and aggregate metrics.

### 5.4 Retrieval Layer (`packages/retrieval`)
- Pluggable retrieval interface for ablation modes.
- Baseline/stub in Phase 1, expanded behavior in later phases.

### 5.5 Data And Benchmarks
- Synthetic corpus in `datasets/synth-corpus`.
- Gold labels and benchmark definitions in `benchmarks`.
- Persistent runtime state in SQLite.

## 6. API Contract Summary

- `GET /`
- `GET /health`
- `GET /scenarios`
- `GET /scenarios/:id`
- `GET /evidence?scenarioId=:id`
- `POST /submissions`
- `POST /score`
- `POST /ablation/run`

## 7. Data Model (Logical)

### Scenario
- `id`, `title`, `prompt`, `artifacts[]`

### Submission
- `scenarioId`
- `ownerRouting`
- `dependencyTrace[]` (`from`, `to`, `type`)
- `actionPlan`
- `blastRadius[]`
- `evidenceNotes`
- `selectedEvidenceIds[]`

### Score Report
- `gatingPassed`
- `criticalErrors[]`
- `rubricScores`
- `metrics`
- `goldComparison`

### Ablation Output
- `runId`
- `mode`
- `scenarioId`
- `metrics`
- JSON + CSV artifacts

## 8. Quality And Reproducibility Model

Required command gates:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

Traceability:
- Session notes kept locally (outside GitHub check-in)
- Reproducible command artifacts under `reports/` and `services/api/reports/`

Runtime artifact evidence:
- `reports/week1/smoke-*.json`
- `services/api/reports/week1/ablation-run-*.json`
- `services/api/reports/week1/ablation-summary.csv`

## 9. Security And Data Constraints

- Synthetic-only educational content.
- No secrets committed (`.env` stays local).
- Input validation and centralized error handling.
- Localhost-scoped CORS and baseline rate limiting.

## 10. Phase Mapping

### Phase 1 (Current)
- Flow A end-to-end path.
- SQLite persistence.
- Evidence gating v1.
- Rubric + metrics + smoke/eval artifacts.

### Phase 2+
- Retrieval-depth behavior and stronger context assembly.
- Expanded benchmark scenarios and robustness tests.
- Incremental integration/E2E hardening.

## 11. Proposal Alignment Statement

This architecture is intentionally proposal-first. If implementation diverges from proposal assumptions, the change process is:
1. Record rationale and impact in local session notes.
2. Preserve verification evidence in generated report artifacts.
3. Disclose deviation in weekly check-in.
