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
- **Context:** The full stack targets Qdrant (vector) + Neo4j (graph) as the retrieval data layer. A lightweight local database is needed to run the end-to-end scoring and reporting pipeline in Phase 1.
- **Decision:** Use SQLite for Phase 1 runtime. Requires no infrastructure, satisfies the single-user local target, and keeps all scoring logic fully testable.
- **Consequences:** Query interfaces are kept abstract so the data layer can be extended in Phase 2 without changing business logic.

---

## ADR-002: Synthetic-Only Omni-Mart Corpus

- **Date:** 2026-03-07
- **Status:** Accepted
- **Context:** Research requires realistic operational scenarios for evaluation. Using real enterprise data would violate data policy and prevent open-source distribution.
- **Decision:** Build a fully synthetic corpus representing a fictional enterprise (Omni-Mart — a fictional organization, not any real company). All ownership records, dependency maps, runbook content, and incident notes are generated for research purposes only.
- **Consequences:** No data-access restrictions. Repository can be shared publicly. Corpus can be extended without approval workflows.

