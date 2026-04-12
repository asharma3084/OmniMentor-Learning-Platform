# System Architecture


Version: 2.9
Last Updated: 2026-03-15

## 1. Architecture Objectives

OmniMentor targets **Architecture Blindness**: the onboarding challenge where new engineers and TPMs struggle to navigate ownership, dependency direction, and governance constraints in complex systems.

The platform supports deliberate technical practice through:
- Scenario-based problem solving grounded in the synthetic Omni-Mart corpus.
- Evidence-first reasoning: learners must open, cite, and evaluate evidence before submitting claims.
- Claim-level gating: unsupported claims are flagged explicitly, not silently dropped.
- Rubric-driven scoring with transparent metrics and gold-standard comparison.
- Reproducible evaluation across four retrieval modes (ablation study design).

Source-of-truth references for this section:
- `../start-here/overview.md` (problem and research-question framing)
- `requirements.md` (functional and non-functional requirements)

## 2. High-Level System Architecture

Current implemented runtime:
- Web UI: React + Vite guided-first learner flow
- API: Express + Node
- Persistence: SQLite
- Retrieval runtime: deterministic in-memory `vector`, `graph`, `graphrag`, `graphrag_gating`

Proposal-target stack for later milestones:
- Vector store: Qdrant
- Graph store: Neo4j
- Graph retrieval: GraphRAG
- Local LLM: Ollama

The architecture below is proposal-aligned and consistent with `../reference/detailed-ui-design.md`.

```mermaid
flowchart TB
  %% ---------- User + UI ----------
  U["Learner / Reviewer"]
  subgraph UI["Guided-First Web UI (apps/web)"]
    BRIEF["Brief"]
    INVESTIGATE["Investigate"]
    DECIDE["Decide"]
    FEEDBACK["Feedback"]
    ADV["Feedback Sub-tabs\nScore & Coaching | System Graph | Evidence Explorer | Check-in Export"]
  end

  %% ---------- Services ----------
  A["API Service\nservices/api\nNode + Express"]
  C["Core Engine\npackages/core\nEvidence Gating + Rubric Scoring"]
  R["Retrieval Layer\npackages/retrieval\ndeterministic vector | graph | graphrag | graphrag_gating"]

  %% ---------- Infrastructure ----------
  LLM["Ollama\nTarget LLM"]
  NEO[("Neo4j\nTarget Graph Store")]
  QD[("Qdrant\nTarget Vector Store")]

  %% ---------- Data ----------
  DB[("SQLite\n./data/omnimentor.db")]
  DS["Synthetic Corpus\ndatasets/synth-corpus"]
  BM["Benchmark + Gold Labels\nbenchmarks"]

  %% ---------- Outputs ----------
  REP["Reports\nJSON + CSV"]

  U --> BRIEF
  BRIEF --> INVESTIGATE
  INVESTIGATE --> DECIDE
  DECIDE --> FEEDBACK
  FEEDBACK --> ADV

  INVESTIGATE -->|Evidence retrieval| A
  DECIDE -->|Submission| A
  FEEDBACK -->|Score + gate request| A
  ADV -->|Deep review / export| A
  BRIEF -->|Session start / survey| A

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
  class BRIEF,INVESTIGATE,DECIDE,FEEDBACK,ADV ui;
  class A api;
  class C,R core;
  class DB,DS,BM data;
  class QD,NEO,LLM infra;
  class REP output;
```

## 3. Flow A Runtime

Flow A is the primary learning workflow.

```mermaid
sequenceDiagram
  autonumber
  participant L as Learner
  participant UI as Guided-First Web UI
  participant API as API Service
  participant RET as Retrieval Layer
  participant CORE as Core Engine
  participant DB as SQLite

  L->>UI: Open app (pre-survey if first visit)
  UI->>API: GET /surveys/status
  API-->>UI: Survey completion state
  alt Pre-survey not completed
    UI->>L: Show pre-survey modal
    L->>UI: Complete 5-item Likert survey
    UI->>API: POST /surveys (type=pre)
    API->>DB: Persist survey_responses
    API-->>UI: Survey saved
  end
  L->>UI: Start Brief
  UI->>API: POST /sessions/start (scenarioId)
  API->>DB: Create learning_session
  API-->>UI: sessionId + startedAt
  UI->>API: GET /scenarios/:id
  API->>DB: Read scenario + artifacts
  DB-->>API: Scenario payload
  API-->>UI: Scenario + evidence list

  L->>UI: Move to Investigate and select evidence
  UI->>API: GET /evidence?scenarioId=...
  API->>RET: retrieve(mode, scenario)
  RET-->>API: ranked evidence + provenance
  API-->>UI: Evidence bundle + graph context

  L->>UI: Select evidence (first_evidence event logged)
  UI->>API: POST /sessions/event (first_evidence)
  API->>DB: Update learning_session.first_evidence_at
  API-->>UI: ack
  L->>UI: Move to Decide and fill submission fields
  UI->>API: POST /sessions/event (first_submit)
  API->>DB: Update learning_session.first_submit_at
  UI->>API: POST /submissions (includes sessionId)
  API->>DB: Persist submission
  DB-->>API: submissionId
  API-->>UI: submissionId

  L->>UI: Move to Feedback
  UI->>API: POST /score (submissionId, mode)
  API->>DB: Load submission + gold labels
  API->>RET: retrieve(mode, submission context)
  RET-->>API: evidence map + retrieval diagnostics
  API->>CORE: gateSubmission + rubric scoring + critical checks
  CORE-->>API: gating, metrics, overall score
  API->>DB: Persist score_report
  API-->>UI: Feedback response

  UI-->>L: Rubric, critical errors, provenance, uncertainty
  UI->>API: POST /sessions/event (completed)
  API->>DB: Update learning_session completed_at + duration_sec
  API-->>UI: ack
  alt All scenarios completed
    UI->>L: Show post-survey modal
    L->>UI: Complete 5-item Likert survey
    UI->>API: POST /surveys (type=post)
    API->>DB: Persist survey_responses
    API-->>UI: Survey saved
  end
```

## 4. Evaluation And Ablation Pipeline

This aligns to the current mode-comparison design:
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
- Displays score, gating outcome, rubric feedback, connected learning summary, and TPM next-actions.
- Tracks learning session time via API endpoints (start, first evidence, first submit, completion) for RQ1 measurement.
- Presents pre-survey modal on first load and post-survey after all scenarios are completed.
- Logs behavioral proxy events (first evidence selection, first submission) per session.

### 5.1a Frontend Design Architecture
- Design intent: reduce Architecture Blindness by improving visual hierarchy, evidence discoverability, and feedback clarity. This follows scaffolding theory (Wood et al., 1976): external visual structure (ownership graph, dependency arrows, evidence linkage) reduces cognitive load, enabling learners to focus on reasoning rather than information retrieval. Evidence-first interaction design supports self-explanation (Chi et al., 1989), prompting learners to articulate reasoning before receiving feedback.
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
- Result: GUI architecture is defined for a guided-first TPM onboarding flow with advanced review surfaces available when needed.

### 5.1b Guided-First UI Contract
- Default entry is a guided 4-step tabbed flow: `1. Brief`, `2. Investigate`, `3. Decide`, `4. Feedback`.
- Feedback sub-tabs provide deeper review surfaces: `Score & Coaching`, `System Graph`, `Evidence Explorer`, `Check-in Export`.
- Tab navigation is the single UI paradigm — there is no separate "Advanced Mode" toggle.
- Decide step enforces required structured fields: owner routing, dependency trace, action plan, blast-radius plan, evidence notes.
- Score surfaces must explicitly show critical error categories: wrong owner, wrong directionality, unsafe action without verification.
- Uncertainty and provenance are mandatory user-visible signals for trust design.
- Example-answer scaffolding and walkthrough guidance are learner aids, but evidence gating remains the trust boundary.
- System Graph remains an advanced review surface rather than the first interaction for a new TPM.

### 5.1c Freeze-Scope Enhancements
- `System Graph` must provide interactive review operations: node/edge filtering, node focus, path tracing, and provenance-linked node detail.
- `System Graph` node panel must show provenance-linked evidence and ownership/dependency metadata for selected graph entities.
- `Evaluation` must provide deeper mode analytics: per-mode metric table, deltas across modes, unsupported-claim trend, and critical-error category breakdown.
- `Evaluation` must expose mode diagnostics that explain retrieval behavior differences (`vector`, `graph`, `graphrag`, `graphrag_gating`).
- `Check-in Export` must generate review-ready summary output with scenario context, score/gating snapshot, selected-evidence references, and copy/download actions.

### 5.2 API Service (`services/api`)
- Exposes REST contracts for scenario/evidence/submission/score/eval.
- Handles validation, persistence, and report generation.
- Coordinates core scoring and retrieval abstractions.
- Manages learning session lifecycle (start, events, completion) and duration tracking.
- Serves pre/post survey endpoints with Zod-validated request schemas.
- Provides analytics query endpoint for session-level timing and attempt data.

### 5.3 Core Engine (`packages/core`)
- Claim-unit parsing and evidence gating.
- Owner routing, dependency trace, blast radius scoring.
- Rubric construction and aggregate metrics.

### 5.4 Retrieval Layer (`packages/retrieval`)
- Pluggable retrieval interface for ablation modes.
- Canonical retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.
- Current implementation uses deterministic in-memory retrieval over the synthetic corpus.
- Neo4j/GraphRAG/Ollama remain proposal-target infrastructure for later milestone depth.

### 5.6 LLM And Graph Infrastructure (Target Scope)
- **Ollama** is the planned local LLM provider for later generation/explanation depth.
- **Neo4j** is the planned graph-of-record for ownership/dependency traversal.
- **Qdrant** is the planned vector retrieval store for semantic evidence lookup.
- **GraphRAG** remains the proposal-target composition layer for graph and retrieval context.

### 5.5 Data And Benchmarks
- Synthetic corpus in `datasets/synth-corpus`.
- Gold labels and benchmark definitions in `benchmarks`.
- Persistent runtime state in SQLite.

## 6. API Contract Summary

- `GET /`
- `GET /health`
- `GET /scenarios`
- `GET /scenarios/:id`
- `GET /scenarios/:id/example-answer`
- `GET /evidence?scenarioId=:id`
- `POST /submissions`
- `POST /score`
- `POST /ablation/run`
- `POST /sessions/start` — create a learning session for a scenario
- `POST /sessions/event` — log behavioral event (first_evidence, first_submit, completed)
- `GET /analytics/sessions` — retrieve session timing and attempt data
- `POST /surveys` — submit pre or post survey responses (5-item Likert)
- `GET /surveys` — retrieve submitted survey responses
- `GET /surveys/status` — check pre/post survey completion state

## 7. Data Model (Logical)

### Scenario
- `id`, `title`, `prompt`, `artifacts[]`

### Submission
- `scenarioId`
- `sessionId` (FK → learning session)
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

### Learning Session
- `id`
- `scenarioId`
- `startedAt`, `firstEvidenceAt`, `firstSubmitAt`, `completedAt`
- `durationSec`
- `attemptNumber`

### Survey Response
- `id`
- `type` (pre | post)
- `q1Confidence`, `q2Comfort`, `q3Clarity`, `q4Readiness`, `q5Anxiety` (1–5 Likert)
- `submittedAt`

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
- Session notes kept locally outside the public repository narrative
- Reproducible command artifacts under `reports/` and `services/api/reports/`

Runtime artifact evidence:
- `reports/week1/smoke-*.json` (baseline)
- `reports/week2/smoke-*.json` (corpus-backed retrieval)
- `reports/week2/ablation-run-*.json`
- `reports/week2/ablation-summary.csv`

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

This architecture is aligned with `../reference/detailed-ui-design.md`:
- same tab model
- same structured submission contract
- same graph/evidence/evaluation surfaces
- same Ollama assistant and evidence-gating boundaries
- same freeze-scope enhancements for graph interaction and evaluation/export depth

## 12. Evolution Policy

This architecture is intentionally documented as both a current-state reference and a forward-looking design.
If implementation diverges from architectural assumptions, the change process is:
1. Update the architecture and requirements documents.
2. Preserve verification evidence in generated report artifacts.
3. Record important trade-offs in the decisions log or ADRs.
