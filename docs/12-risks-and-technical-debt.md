# 12. Risks And Technical Debt

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Current Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `better-sqlite3` native module rebuild | Low | Keep `node-gyp rebuild` command in runbook; pin Node version |
| Ollama model output variability | Medium | Pin model version; use deterministic prompt template; eval for consistency before enabling |
| GraphRAG context quality variance | High | Use rubric scoring as primary signal; keep gold labels as ground truth — do not trust LLM output directly |
| Synthetic corpus coverage gaps | Medium | Expand incrementally; document coverage per domain in benchmarks/ |

## Mitigations

1. `better-sqlite3` native module sensitivity — keep `node-gyp rebuild` command in operations runbook.
2. Smoke and eval require a running API — health-check step is mandatory before running smoke/eval.
3. Retrieval layer interface is pluggable — the scoring and gating pipeline is independent of which retrieval backend is active.

## Research Validity Risks

These risks are distinct from technical risks — they affect the **credibility and generalizability of research findings**, not just system stability.

| Risk | Severity | Mitigation |
|---|---|---|
| Synthetic corpus limited domain coverage | Medium | Expand incrementally; document representativeness per domain; acknowledge scope limitation in write-ups |
| Single-user learner sample (Phase 1) | Medium | RQ1/RQ2/RQ3 validity limited to pilot phase; frame findings as formative, not summative; plan multi-user study for Phase 2 |
| LLM output non-determinism affects eval reproducibility | High | Use deterministic prompt templates + seed control; report variability as part of ablation metrics; keep keyword-based scoring as deterministic baseline |
| Gold labels may not reflect all acceptable solutions | Low | Document rubric as "evidence of acceptable reasoning" not "ground truth"; solicit expert feedback in Phase 2 |
| Observer effect in self-reported anxiety (RQ2) | Medium | Use validated instruments (e.g., adapted STAI); triangulate with behavioral proxies (time-to-first-submission, evidence-selection patterns). **Implemented:** pre/post 5-item Likert surveys + session-level behavioral proxy tracking (first_evidence, first_submit timestamps) now in place |
| Confounding variables in orientation-time measurement (RQ1) | Medium | Control for prior domain experience; use within-subjects design where feasible |

## Technical Debt

| Item | Severity | What Needs Doing |
|---|---|---|
| Limited scenario volume (6 scenarios) | Medium | Expand each domain to more scenarios for broader benchmark coverage |
| Minimal API contract examples | Low | Expand examples in `03-api-contract.md` |
| No CI pipeline | Medium | Add GitHub Actions with lint + test + typecheck |
| SQLite not multi-user ready | Low | Accepted for Phase 1; Phase 2 moves to Qdrant + Neo4j |
| Retrieval layer is Phase 1 stub | High (for RQ1) | Full retrieval integration required for ablation study |
| No provenance UI component | Medium (for RQ2) | Required for trust design — surface source artifact for every retrieved claim |
| Session/survey data not yet exported for analysis | Low | Add CSV/JSON export for learning_sessions and survey_responses tables to support offline statistical analysis |

