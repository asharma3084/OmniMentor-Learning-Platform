# 04. Data Model

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

## Data Policy

- Synthetic-only content for learning and benchmarking.
- No personal or company-internal data in repository artifacts.
