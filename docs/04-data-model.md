# 04. Data Model

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Core Logical Entities

### Scenario

- `id`
- `title`
- `prompt`
- `artifacts[]`

### Evidence Artifact

- `id`
- `scenarioId`
- `name`
- `content`
- `metadata`

### Submission

- `id`
- `scenarioId`
- `sessionId` (FK → learning session, nullable for backward compat)
- `ownerRouting`
- `dependencyTrace[]`
- `actionPlan`
- `blastRadius[]`
- `evidenceNotes`
- `selectedEvidenceIds[]`

### Score Report

- `submissionId`
- `gatingPassed`
- `criticalErrors[]`
- `rubricScores`
- `metrics`
- `overallScore`

### Ablation Result

- `runId`
- `mode`
- `scenarioId`
- `metrics`

### Learning Session

- `id`
- `scenarioId`
- `startedAt` — session creation timestamp
- `firstEvidenceAt` — when learner first selects evidence (behavioral proxy)
- `firstSubmitAt` — when learner first submits
- `completedAt` — when evaluation completes
- `durationSec` — total seconds from start to completion
- `attemptNumber` — auto-incremented per scenario

### Survey Response

- `id`
- `type` — `pre` or `post`
- `q1Confidence` — "I feel confident navigating architecture decisions" (1–5 Likert)
- `q2Comfort` — "I am comfortable identifying system ownership" (1–5 Likert)
- `q3Clarity` — "Dependency relationships are clear to me" (1–5 Likert)
- `q4Readiness` — "I feel ready to scope blast-radius impact" (1–5 Likert)
- `q5Anxiety` — "I feel anxious about architecture decisions" (1–5 Likert, reverse-scored)
- `submittedAt`

## Data Policy

- Synthetic-only content for learning and benchmarking.
- No personal or company-internal data in repository artifacts.
