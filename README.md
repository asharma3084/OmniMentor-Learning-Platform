# OmniMentor — Scenario-Based Onboarding with Deliberate Practice

A local-first, academic learning application for evidence-driven, rubric-based scoring of scenario submissions using vector retrieval, graph traversal, and GraphRAG evaluation modes.

## Privacy & Data Policy

⚠️ **HARD STOP**: This is an academic-only repository.
- **NO Walmart data, no company infra details, no personal information**
- Synthetic scenarios and benchmarks only
- `.env` and database files are gitignored and must never be committed

## Prerequisites

- macOS (or Linux/Windows with similar tooling)
- Git, Node.js 20+, pnpm, sqlite3

### Install (Homebrew — macOS)

```bash
brew update
brew install git node pnpm sqlite
```

Verify:
```bash
git --version   # Git 2.50+
node --version  # v24+ or v25+
pnpm --version  # 10.30+
sqlite3 --version  # 3.51+
```

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/asharma3084/OmniMentor-Learning-Solution.git
cd OmniMentor-Learning-Solution
pnpm install
```

### 2. Environment (copy template, never commit)

```bash
cp .env.example .env
# Edit .env locally with your paths/settings
```

### 3. Database (Phase 1)

```bash
mkdir -p data
# Database is created on first run (schema in services/api)
```

## Run (Development)

### API Server

```bash
pnpm --filter @omnimentor/api dev
```

Verify health:
```bash
curl -s http://localhost:3001/health
```

### Web UI

```bash
pnpm --filter @omnimentor/web dev
```

Open the printed localhost URL and verify scenario list loads.

## Verification Gates (Phase 1)

These **must pass** before marking work "done":

```bash
pnpm lint      # Lint all packages
pnpm test      # Run unit tests (gating, scoring, metrics)
pnpm typecheck # TypeScript strict mode
pnpm smoke     # End-to-end smoke test (1 scenario → report)
```

### Quality Checks

```bash
pnpm audit    # Baseline security audit
```

### E2E Smoke Test

```bash
pnpm smoke
```

Expected output (Phase 1):
- Fetch scenarios ✓
- Create a submission ✓
- Score it (gating + rubric) ✓
- sqlite rows persisted ✓
- report written to `reports/week1/` ✓

### Database Inspection (sqlite)

```bash
sqlite3 ./data/omnimentor.db ".tables"
sqlite3 ./data/omnimentor.db "select count(*) from submissions;"
sqlite3 ./data/omnimentor.db "select count(*) from score_reports;"
```

### Reports

```bash
ls -la reports/week1
```

## Benchmark & Evaluation (Phase 1+)

### Run Benchmark (scaffold; Phase 1 => JSON + CSV)

```bash
pnpm eval
```

Outputs:
- `reports/week1/ablation-run-*.json` — detailed results per mode
- `reports/week1/ablation-summary.csv` — metrics table (vector, graph, graphrag, graphrag+gating)

### Metrics Tracked

- Owner routing accuracy
- Dependency trace accuracy (directionality)
- Blast radius completeness
- Evidence relevance
- Unsupported-claim rate
- Critical error rate

## Repo Structure

```
/apps/web                  # React UI (Vite)
/services/api              # Node.js REST API
/packages/core             # Types, scoring, gating, rubric
/packages/retrieval        # Retrieval interfaces (vector, graph, graphrag)
/datasets/synth-corpus     # Synthetic scenarios + graph nodes/edges
/benchmarks                # Gold-labeled scenarios (12 planned; Phase 1: 1)
/reports                   # Generated outputs (gitignored; sample keeper)
/deploy/local              # Local dev/deploy scripts
/deploy/enterprise         # Enterprise overlay (Phase 2+)
/docs                      # architecture.md only
/scripts                   # smoke, eval runners
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed Mermaid diagram and layer explanation.

### Flow A (Phase 1 Spine)

```
Scenario prompt
  ↓
Evidence panel (mark primary/corroborating artifacts)
  ↓
Structured submission (dependencies, action plan, blast radius)
  ↓
Gating check (claims supported by evidence?)
  ↓
Rubric scoring + metrics
  ↓
Report (feedback with gold-aligned explanations)
```

### Evaluation: 4 Retrieval Modes

1. **Vector-only** — embedding-based searches
2. **Graph-only** — neighbor traversal, bounded depth
3. **GraphRAG** — graph + context assembly
4. **GraphRAG + Gating** — graph + evidence requirements

## CI/CD

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

Current: `pnpm lint`, `test`, `typecheck`, `build`, `pnpm audit`, `smoke` on push.

## Verification Log

See [VERIFICATION_LOG.md](VERIFICATION_LOG.md) for session-by-session tracking.

## Phase Plan

### Phase 1 (Week 1) — In Progress ✅
- [x] Repo scaffold + docs
- [x] Flow A spine (1 scenario e2e)
- [ ] sqlite persistence
- [ ] Evidence gating v1 + scoring unit tests
- [ ] Benchmark scaffold (1 scenario + gold labels)
- [ ] scripts/smoke + scripts/eval_run
- [ ] CI green

### Phase 2+ (Later)
- Vector baseline retrieval
- Graph baseline retrieval
- GraphRAG context builder
- GraphRAG + gating regression tests
- UI E2E tests (Playwright)
- Full 12-scenario benchmark

---

**Questions?** See `PROJECT_CONTEXT.md` for continuity notes and `docs/architecture.md` for design details.
