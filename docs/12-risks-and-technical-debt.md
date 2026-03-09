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

## Technical Debt

| Item | Severity | What Needs Doing |
|---|---|---|
| Limited scenario volume (12 scenarios) | Medium | Expand each domain to more scenarios for broader benchmark coverage |
| Minimal API contract examples | Low | Expand examples in `03-api-contract.md` |
| No CI pipeline | Medium | Add GitHub Actions with lint + test + typecheck |
| SQLite not multi-user ready | Low | Accepted for Phase 1; Phase 2 moves to Qdrant + Neo4j |
| Retrieval layer is Phase 1 stub | High (for RQ1) | Full retrieval integration required for ablation study |
| No provenance UI component | Medium (for RQ2) | Required for trust design — surface source artifact for every retrieved claim |

