# 06. Testing Strategy

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Development Methodology

OmniMentor follows a **Design-Based Research (DBR) + Contract-First TDD** methodology, combining educational technology research rigor with disciplined software engineering practice.

### Design-Based Research (DBR)

DBR is the standard methodology for educational technology research (Barab & Squire, 2004; Wang & Hannafin, 2005). It provides an iterative cycle of design, implementation, evaluation, and refinement in authentic learning contexts.

Each development cycle follows:
1. **Analyze** — identify the learning gap (architecture blindness) and define measurable outcomes.
2. **Design** — create or refine learning scenarios, evidence artifacts, and evaluation rubrics.
3. **Implement** — build the system changes guided by contract-first TDD (see below).
4. **Evaluate** — run ablation study (4 retrieval modes × benchmark scenarios) and collect metrics.
5. **Reflect** — interpret results against research questions, refine for next cycle.

### Contract-First TDD

Engineering implementation within each DBR cycle uses Contract-First Test-Driven Development (Beck, 2002):
1. **Contract** — update API contracts and type definitions to specify new behavior.
2. **Red** — write failing tests that encode the contract expectations.
3. **Green** — write minimal implementation to make tests pass.
4. **Refactor** — improve code quality while tests remain green.
5. **Gate** — run full validation chain: typecheck → lint → build → test → smoke → eval.

### Evaluation Rigor

Reproducible ablation study design provides quantitative evidence:
- Four retrieval modes (`vector`, `graph`, `graphrag`, `graphrag_gating`) tested against the same gold-labeled benchmark.
- Metrics measured per scenario: owner accuracy, dependency accuracy, blast-radius completeness, evidence relevance, unsupported-claim rate.
- Results output as JSON + CSV for transparent analysis and longitudinal comparison across development cycles.

### References

- Barab, S. & Squire, K. (2004). Design-Based Research: Putting a Stake in the Ground. *Journal of the Learning Sciences*, 13(1), 1–14.
- Wang, F. & Hannafin, M. J. (2005). Design-Based Research and Technology-Enhanced Learning Environments. *Educational Technology Research and Development*, 53(4), 5–23.
- Beck, K. (2002). *Test-Driven Development: By Example*. Addison-Wesley.
- Collins, A., Brown, J. S., & Newman, S. E. (1989). Cognitive Apprenticeship. In L. B. Resnick (Ed.), *Knowing, Learning, and Instruction*.
- Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-Explanations. *Cognitive Science*, 13(2), 145–182.
- Sweller, J. (1988). Cognitive Load During Problem Solving. *Cognitive Science*, 12(2), 257–285.

Weekly work cycles map directly to DBR phases: each development week constitutes one analyze-design-implement-evaluate-reflect cycle, with artifacts preserved in `reports/` and `docs/decisions/` for continuity and review.

---

## Test Layers

- Unit tests: core scoring, gating behavior, and retrieval ranking (24 tests across 4 suites).
- Runtime smoke test: end-to-end scenario to scored output across all 6 benchmark scenarios.
- Evaluation run: retrieval-mode ablation (4 modes × 6 scenarios) and report generation.
- Session/survey endpoint validation: start session, log events, submit surveys, check status.

## Commands

```bash
pnpm --dir workspace test
pnpm --dir workspace smoke
pnpm --dir workspace eval
```

## Quality Gates

```bash
pnpm --dir workspace lint
pnpm --dir workspace typecheck
pnpm --dir workspace build
pnpm --dir workspace audit
```

## Exit Criteria For Merge

- All quality gates are green.
- Smoke and eval execute successfully with API running.
- New behavior includes test updates when required.
