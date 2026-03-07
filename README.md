# OmniMentor Learning Solution

> A proposal-aligned, scenario-based learning platform for evidence-first technical decision making.

OmniMentor helps learners practice the exact skills that matter in real engineering work: ownership routing, dependency reasoning, blast-radius planning, and evidence-backed claims.

## Why This Repo Stands Out

- **Evidence-first by design**: unsupported claims are detected and penalized.
- **Transparent scoring**: rubric and metrics are explicit, not hidden.
- **Reproducible evaluation**: smoke/eval outputs are generated as machine-readable artifacts.
- **Proposal-aligned execution**: current scope tracks Phase 1 goals, with deviations logged when needed.

## Week 1 Snapshot

- Flow A spine implemented and running end-to-end.
- Core quality/runtime gates repeatedly passing.
- API root (`GET /`) now returns service metadata for immediate browser validation.
- Week 1 report artifacts generated and tracked in verification logs.

## First 5 Minutes

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

API:

```bash
pnpm --filter @omnimentor/api dev
```

Web:

```bash
pnpm --filter @omnimentor/web dev
```

Quick checks:

```bash
curl -s http://localhost:3001/
curl -s http://localhost:3001/health
```

## Verification (Proof, Not Claims)

Run all core gates:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm smoke
pnpm eval
pnpm audit
```

Interpretation:
- `lint`, `test`, `typecheck`, `build`: static/build integrity.
- `smoke`: runtime end-to-end flow.
- `eval`: ablation report generation.
- `audit`: dependency risk baseline.

## Current User Flow (Flow A)

1. Open scenario.
2. Inspect evidence artifacts.
3. Submit owner routing, dependency trace, action plan, blast radius, and evidence notes.
4. Run scoring with evidence gating + rubric + metrics.
5. Persist and review report output.

## API Surface

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

## Safety And Data Policy

Academic-only and synthetic-only usage:
- No personal data
- No company/internal data
- No secrets in source control
- No real production logs

## Documentation

- `docs/architecture.md`: architecture and design
- `docs/architecture-presentation.md`: condensed architecture for demos and walkthroughs
- `docs/quickstart.md`: setup + first successful run
- `docs/verification.md`: test/verification playbook
- `docs/review-guide.md`: structured review checklist

## Repository Map

```text
apps/web                  # React UI
services/api              # REST API + sqlite persistence
packages/core             # types, gating, scoring, metrics
packages/retrieval        # retrieval interfaces + scaffolds
datasets/synth-corpus     # synthetic artifacts and graph data
benchmarks                # scenarios + gold labels
reports                   # generated outputs
deploy/local              # local deployment assets
deploy/enterprise         # future enterprise overlays
docs                      # architecture + quickstart + verification guides
scripts                   # smoke + evaluation runners
```

## Roadmap

- Expand benchmarks toward full 12-scenario coverage.
- Deepen retrieval-mode validation across all ablation modes.
- Add stronger integration/UI checks for stable learning journeys.
- Continue tightening explainability and reproducibility.

## Contribution Standard

- Keep changes focused and traceable.
- Prefer reproducibility and clarity over complexity.
