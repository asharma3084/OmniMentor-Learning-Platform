# OmniMentor Architecture

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


Version: 2.7
Last Updated: 2026-03-09

## 1. Architecture Objectives

Per the approved project proposal and requirements docs, OmniMentor targets **Architecture Blindness**: the onboarding challenge where new engineers and TPMs struggle to navigate ownership, dependency direction, and governance constraints in complex systems.

The platform supports deliberate technical practice through:
- Scenario-based problem solving grounded in the synthetic Omni-Mart corpus.
- Evidence-first reasoning: learners must open, cite, and evaluate evidence before submitting claims.
- Claim-level gating: unsupported claims are flagged explicitly, not silently dropped.
- Rubric-driven scoring with transparent metrics and gold-standard comparison.
- Reproducible evaluation across four retrieval modes (ablation study design).

Source-of-truth references for this section:
- `docs/00-overview.md` (Problem and RQ framing)
- `docs/01-requirements.md` (functional/non-functional requirements)
- `personal/A4-QQ-SUBMIT.pdf` (qualifier-question framing)
- `personal/Project-Proposal-SUBMIT.pdf` (proposal baseline)

## 2. High-Level System Architecture

Canonical proposal-aligned stack:
- Vector store: Qdrant
- Graph store: Neo4j
- Graph retrieval: GraphRAG
- Local LLM: Ollama

The architecture below is proposal-aligned and consistent with `docs/detailed-ui-design.md`.

```mermaid
flowchart TB
  %% ---------- User + UI ----------
  U["Learner / Reviewer"]
  subgraph UI["TPM Command Center UI (apps/web)"]
    DASH["Overview Dashboard"]
    WS["Scenario Workspace"]
    SG["System Graph"]
    EV["Evidence"]
    EVAL["Evaluation"]
    EXP["Check-in Export"]
  end

  %% ---------- Services ----------
  A["API Service\nservices/api\nNode + Express"]
  C["Core Engine\npackages/core\nEvidence Gating + Rubric Scoring"]
  R["Retrieval Layer\npackages/retrieval\nvector | graph | graphrag | graphrag_gating"]

  %% ---------- Infrastructure ----------
  LLM["Ollama\nLocal LLM"]
  NEO[("Neo4j\nGraph Store")]
  QD[("Qdrant\nVector Store")]

  %% ---------- Data ----------
  DB[("SQLite\n./data/omnimentor.db")]
  DS["Synthetic Corpus\ndatasets/synth-corpus"]
  BM["Benchmark + Gold Labels\nbenchmarks"]

  %% ---------- Outputs ----------
  REP["Reports\nJSON + CSV"]

  U --> DASH
  DASH --> WS
  DASH --> SG
  DASH --> EV
  DASH --> EVAL
  DASH --> EXP

  WS -->|REST| A
  SG -->|Graph queries| A
  EV -->|Evidence retrieval| A
  EVAL -->|Score + gate request| A
  EXP -->|Export request| A

  A --> C
  A --> R
  A --> DB

  R --> QD
  R --> NEO
  R --> LLM
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
  classDef infra fill:#E0F2F1,stroke:#00695C,color:#004D40,stroke-width:2px;

  class U client;
  class DASH,WS,SG,EV,EVAL,EXP ui;
  class A api;
  class C,R core;
  class DB,DS,BM data;
  class QD,NEO,LLM infra;
  class REP output;
```

## 3. Flow A Runtime (Proposal Spine)

Flow A is the primary learning workflow.

```mermaid
sequenceDiagram
  autonumber
  participant L as Learner
  participant UI as TPM Command Center UI
  participant API as API Service
  participant RET as Retrieval Layer
  participant NEO as Neo4j
  participant QD as Qdrant
  participant OLL as Ollama
  participant CORE as Core Engine
  participant DB as SQLite

  L->>UI: Open dashboard and select Scenario Workspace
  UI->>API: GET /scenarios/:id
  API->>DB: Read scenario + artifacts
  DB-->>API: Scenario payload
  API-->>UI: Scenario + evidence list

  L->>UI: Open System Graph and Evidence tabs
  UI->>API: GET /evidence?scenarioId=...
  API->>RET: retrieve(mode, scenario)
  RET->>NEO: graph traversal / subgraph fetch
  RET->>QD: vector similarity search
  RET->>OLL: graph-context synthesis (graphrag modes)
  RET-->>API: ranked evidence + provenance
  API-->>UI: Evidence bundle + graph context

  L->>UI: Select evidence + fill submission
  UI->>API: POST /submissions
  API->>DB: Persist submission
  DB-->>API: submissionId
  API-->>UI: submissionId

  L->>UI: Run Evaluation tab
  UI->>API: POST /score (submissionId, mode)
  API->>DB: Load submission + gold labels
  API->>RET: retrieve(mode, submission context)
  RET-->>API: evidence map + retrieval diagnostics
  API->>CORE: gateSubmission + rubric scoring + critical checks
  CORE-->>API: gating, metrics, overall score
  API->>DB: Persist score_report
  API-->>UI: Feedback response

  UI-->>L: Rubric, critical errors, provenance, uncertainty
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

  M1 --> VPATH["Vector Path\nQdrant retrieval"]
  M2 --> GPATH["Graph Path\nNeo4j traversal"]
  M3 --> GRPATH["GraphRAG Path\nNeo4j + Ollama"]
  M4 --> GGPATH["GraphRAG + Gating Path\nNeo4j + Ollama + claim gate"]

  VPATH --> RUN["Run Scenario Set\n(benchmark + gold labels)"]
  GPATH --> RUN
  GRPATH --> RUN
  GGPATH --> RUN

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
  class RUN,VPATH,GPATH,GRPATH,GGPATH run;
  class SCORE score;
  class OUTJSON,OUTCSV out;
```

## 5. Component Responsibilities

### 5.1 Web App (`apps/web`)
- Renders scenario prompts and evidence artifacts.
- Captures structured submission fields.
- Displays score, gating outcome, and rubric feedback.

### 5.1a Frontend Design Architecture
- Design intent: reduce Architecture Blindness by improving visual hierarchy, evidence discoverability, and feedback clarity.
- Visual system:
  - Typography: `Space Grotesk` (primary) + `IBM Plex Mono` (kicker/status labels).
  - Tokenized palette in CSS variables (`--bg-*`, `--surface-*`, `--text-*`, `--accent`, `--warn`, `--ok`, `--danger`).
  - Atmosphere: layered radial + linear gradients to separate product surface from ambient background.
- Interaction model:
  - Boot states: branded loading and explicit failure/retry screens.
  - Submission flow: progressive validation with inline messaging and disabled-state guardrails.
  - Score feedback: circular score ring + gating badge + critical-issue list.
- Motion model:
  - `revealUp` staggered section entry for first-load readability.
  - `floatPulse` subtle logo movement for brand presence without distraction.
- Responsive model:
  - Mobile-first single column.
  - Two-panel layout at large breakpoints (`lg:grid-cols-2`) for evidence/form parallel work.
- Result: GUI architecture is defined for a TPM-first onboarding command center with evidence-first reasoning and transparent feedback.

### 5.1b TPM Command Center UI Contract
- Post-login dashboard is the entry point with required tabs: `Overview`, `Scenario Workspace`, `System Graph`, `Evidence`, `Evaluation`, `Check-in Export`.
- Scenario Workspace enforces required structured fields: owner routing, dependency trace, blast-radius plan, evidence notes.
- Score surfaces must explicitly show critical error categories: wrong owner, wrong directionality, unsafe action without verification.
- Uncertainty and provenance are mandatory user-visible signals for trust design.
- System Graph is a first-class UI surface for Neo4j/GraphRAG node-edge navigation.
- AI assistant surface uses local Ollama guidance and remains bounded by evidence-gating policy.

### 5.1c Freeze-Scope Enhancements
- `System Graph` must provide interactive graph operations: zoom, pan, node/edge filtering, path tracing, and impact highlighting.
- `System Graph` node panel must show provenance-linked evidence and ownership/dependency metadata for selected graph entities.
- `Evaluation` must provide deeper mode analytics: per-mode metric table, deltas across modes, unsupported-claim trend, and critical-error category breakdown.
- `Evaluation` must expose mode diagnostics that explain retrieval behavior differences (`vector`, `graph`, `graphrag`, `graphrag_gating`).
- `Check-in Export` must generate review-ready summary output with scenario context, score/gating snapshot, evidence links, and copy/download actions.

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
- Canonical retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.
- Graph retrieval and context assembly are architecturally tied to Neo4j/GraphRAG.
- LLM-augmented explanations are architecturally tied to Ollama, bounded by evidence-gating policy.

### 5.6 LLM And Graph Infrastructure (Canonical)
- **Ollama** is the local LLM provider for generation/explanation surfaces.
- **Neo4j** is the graph-of-record for ownership/dependency traversal.
- **Qdrant** is the vector retrieval store for semantic evidence lookup.
- **GraphRAG** composes graph and retrieval context before LLM assistance.

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
pnpm --dir workspace lint
pnpm --dir workspace test
pnpm --dir workspace typecheck
pnpm --dir workspace build
pnpm --dir workspace smoke
pnpm --dir workspace eval
pnpm --dir workspace audit
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

## 10. Architecture Scope

Architecture scope:
- Multi-page TPM-first GUI (Dashboard + Workspace + Reflection + Architecture View + Evaluation Lab + Check-in Export).
- Retrieval and evaluation surfaces designed around the four-mode ablation contract.
- Neo4j/GraphRAG/Ollama included as explicit architectural systems.
- Evidence gating remains mandatory as the final trust and scoring boundary.

## 11. Detailed UI Alignment

This architecture is aligned with `docs/detailed-ui-design.md`:
- same tab model
- same structured submission contract
- same graph/evidence/evaluation surfaces
- same Ollama assistant and evidence-gating boundaries
- same freeze-scope enhancements for graph interaction and evaluation/export depth

## 12. Proposal Alignment Statement

This architecture is intentionally proposal-first. If implementation diverges from proposal assumptions, the change process is:
1. Record rationale and impact in local session notes.
2. Preserve verification evidence in generated report artifacts.
3. Disclose deviation in weekly check-in.
