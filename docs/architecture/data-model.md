# Data Model


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
