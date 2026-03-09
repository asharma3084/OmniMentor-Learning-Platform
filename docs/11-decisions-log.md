# 11. Decisions Log

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


Use this file to record key technical and process decisions.
For new decisions, prefer creating ADR files in `docs/decisions/`.

## Entry Template

- Date:
- Status: Proposed | Accepted | Superseded
- Context:
- Decision:
- Consequences:

## Initial Decisions

- Monorepo with pnpm workspaces for web/api/core/retrieval consistency.
- Evidence-first gating and rubric scoring as core evaluation model.
- Synthetic-only data policy for learning and verification artifacts.

---

## ADR-001: SQLite as Phase 1 Runtime Database

- **Date:** 2026-03-07
- **Status:** Accepted
- **Context:** The proposal specifies Qdrant (vector) + Neo4j (graph) + PostgreSQL (metadata) as the target data layer. These are not yet integrated. A lightweight local database is needed to run the scoring, submission, and reporting pipeline in Week 1.
- **Decision:** Use SQLite for the Phase 1 runtime. SQLite requires no infrastructure, satisfies the single-user local runtime target, and lets us ship a working end-to-end system in Week 1 with all logic testable.
- **Consequences:** SQLite will be replaced / supplemented in Weeks 3–4 as Qdrant and Neo4j are integrated. No business logic should assume SQLite-specific behavior — query interfaces should stay abstract to allow swap.

---

## ADR-002: K8s Infrastructure Ready but Not Yet Integrated

- **Date:** 2026-03-08
- **Status:** Accepted
- **Context:** Kubernetes pods for Neo4j, Qdrant, and PostgreSQL are running and healthy under the `omni-mentor` namespace. Application code has not yet been wired to these pods.
- **Decision:** Keep pods running and healthy throughout Weeks 2–3. Do not integrate until the retrieval layer design is stable (Week 3). Premature integration adds operational risk with no current evaluation benefit.
- **Consequences:** Integration work begins Week 3 (Qdrant + Ollama) and Week 4 (Neo4j). If pods are unavailable at that point, use SQLite-backed stubs as fallback (see Plan B in ADR-003).

---

## ADR-003: Plan B Fallback for Integration Risk

- **Date:** 2026-03-08
- **Status:** Accepted
- **Context:** Per the proposal, the ablation study requires four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`. These depend on Qdrant, Neo4j, and Ollama being integrated in Weeks 3–6. Integration delays are a documented risk.
- **Decision:** If Neo4j/Qdrant/GraphRAG integration slips, ship vector-only and graph-only baselines with SQLite-backed retrieval stubs. The benchmark, gold labels, and evidence gating are fully operational independent of retrieval backend.
- **Consequences:** The ablation study can still produce results with reduced mode coverage. Report will note which modes completed and which fell back. Full mode coverage is the target; Plan B preserves academic rigor under constraint.

---

## ADR-004: Synthetic-Only Omni-Mart Corpus

- **Date:** 2026-03-07
- **Status:** Accepted
- **Context:** Research requires realistic operational scenarios for evaluation. Using real enterprise data would violate data policy and prevent open-source distribution.
- **Decision:** Build a fully synthetic corpus representing a fictional enterprise (Omni-Mart — a fictional organization, not any real company). All ownership records, dependency maps, runbook content, and incident notes are generated for research purposes only.
- **Consequences:** No data-access restrictions. Repository can be shared publicly. Corpus can be extended without approval workflows.

