# OmniMentor Learning Solution

OmniMentor is an evidence-first learning platform for engineering decision quality.
It trains practitioners to make defensible technical decisions under uncertainty, with measurable outcomes instead of subjective feedback.

## Why This Product Exists

Engineering teams lose time and reliability when decisions are based on opinion instead of evidence.
OmniMentor addresses this gap with scenario-based practice that evaluates:
- ownership routing
- dependency impact reasoning
- blast-radius analysis
- evidence-backed justification

The result is a repeatable way to improve incident readiness, change quality, and cross-team decision confidence.

## Value For Organizations

- Reduced decision risk through evidence gating.
- Faster onboarding for engineers into real operational thinking.
- Transparent scoring that explains why a response passed or failed.
- Reproducible evaluation across retrieval and reasoning strategies.

## Product Capabilities

- Scenario workflow from prompt to scored feedback.
- Rubric-based scoring with explicit metrics.
- Retrieval mode comparisons for evaluation depth.
- Machine-readable output artifacts for auditability.

## Current Scope

This repository delivers a working end-to-end baseline:
- React web interface for scenario interaction.
- Express API for submissions, scoring, and evaluation jobs.
- Core scoring engine for evidence gating and rubric metrics.
- Evaluation scripts that generate JSON and CSV reports.

## Architecture

- Web App: `apps/web`
- API Service: `services/api`
- Core Engine: `packages/core`
- Retrieval Layer: `packages/retrieval`
- Synthetic Dataset: `datasets/synth-corpus`
- Benchmarks: `benchmarks`

See `docs/architecture.md` for system and flow details.

## Quick Start

### Prerequisites

- Git
- Node.js 20+
- pnpm
- sqlite3

macOS setup:

```bash
brew update
brew install git node pnpm sqlite
```

### Install

```bash
git clone https://github.com/asharma3084/OmniMentor-Learning-Solution.git
cd OmniMentor-Learning-Solution
pnpm install
cp .env.example .env
```

### Run

```bash
pnpm --filter @omnimentor/api dev
pnpm --filter @omnimentor/web dev
```

Health checks:

```bash
curl -s http://localhost:3001/
curl -s http://localhost:3001/health
```

## Quality Gates

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

## API Endpoints

- `GET /`
- `GET /health`
- `GET /scenarios`
- `GET /scenarios/:id`
- `GET /evidence?scenarioId=:id`
- `POST /submissions`
- `POST /score`
- `POST /ablation/run`

## Evaluation Modes

- `vector`
- `graph`
- `graphrag`
- `graphrag_gating`

## Output Artifacts

- `reports/week1/smoke-*.json`
- `services/api/reports/week1/ablation-run-*.json`
- `services/api/reports/week1/ablation-summary.csv`

## Data And Security Policy

- Synthetic-only learning artifacts.
- No personal or company-internal data.
- No secrets committed to source control.

## Documentation

- `docs/architecture.md`
- `docs/architecture-presentation.md`
- `docs/quickstart.md`
- `docs/verification.md`
- `docs/review-guide.md`
