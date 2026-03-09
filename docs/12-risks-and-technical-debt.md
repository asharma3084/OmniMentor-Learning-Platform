# 12. Risks And Technical Debt

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Plan B: Integration Fallback

If Neo4j, Qdrant, or GraphRAG integration slips beyond their scheduled weeks, the following fallback applies:

| Component | Planned Week | Plan B Fallback |
|---|---|---|
| Qdrant (vector store) | Week 3 | SQLite FTS5 stub for vector-like N-gram retrieval |
| Ollama (local LLM) | Week 3 | Static context assembly — no LLM token generation |
| Neo4j (graph store) | Week 4 | SQLite adjacency table + BFS traversal stub |
| GraphRAG | Week 5–6 | Graph-context assembly without LLM-guided graph traversal |

Under Plan B, all four ablation modes can still be defined and compared — they just use simplified backends. The benchmark infrastructure, gold labels, evidence gating, and rubric scoring are fully independent of the retrieval backend and are preserved in all fallback scenarios.

**Trigger criteria for Plan B**: If any integration component is not passing its health check by the Friday of its scheduled week, fall back immediately without attempting further recovery in that sprint.

---

## Current Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Qdrant/Neo4j integration delays | High | Medium | Plan B (see above) — SQLite stubs preserve evaluation |
| Ollama model loading / variability | Medium | Medium | Pin model version; use deterministic prompt template; evaluate for consistency before enabling |
| Neo4j K8s pod stability | Medium | Low | Pods currently healthy; monitor; have restore procedure per ops runbook |
| `better-sqlite3` native module rebuild | Low | Medium | Keep rebuild command in runbook; pin Node version |
| GraphRAG quality variance | High | High | Use rubric scoring as primary signal, not LLM outputs; keep gold labels as ground truth |
| Scope creep from full-stack integration | Medium | Medium | ADR-003 Plan B defines clear fallback trigger; do not extend timelines, fall back and ship |
| Synthetic corpus coverage gaps | Medium | High | Expand incrementally; document coverage per domain in benchmarks/ |

## Existing Mitigations

1. `better-sqlite3` native module sensitivity — keep `node-gyp rebuild` command in operations runbook.
2. Smoke and eval require API runtime — health-check step is mandatory before smoke/eval runs.
3. Retrieval modes architecture is pluggable — fallback stubs keep gating and scoring operational.

## Technical Debt

| Item | Severity | Paydown Plan |
|---|---|---|
| Limited scenario volume (12 scenarios) | Medium | Expand each domain to 8 scenarios in Weeks 3–4 |
| Minimal API contract examples | Low | Expand examples in `03-api-contract.md` during Week 2 |
| No CI pipeline yet | Medium | Add GitHub Actions baseline in Week 3 with lint + test + typecheck |
| SQLite not production-ready for multi-user | Low | Accepted debt — SQLite is Phase 1 only; PostgreSQL in Phase 2 |
| Retrieval layer is stub-only | High (for RQ1) | Integration begins Week 3; Plan B covers fallback |
| No provenance UI component yet | Medium (for RQ2 trust design) | Planned for Week 3 alongside retrieval integration |

