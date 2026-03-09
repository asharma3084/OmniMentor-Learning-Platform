# 01. Requirements

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Research Questions (Driving Requirements)

These research questions define the functional and evaluative scope of OmniMentor. Every capability traces back to one or more of these.

| | Research Question | Drives |
|---|---|---|
| **RQ1** | Does scenario-based practice with a knowledge graph reduce orientation time vs. static documentation? | Scenarios, knowledge graph retrieval, benchmark timing |
| **RQ2** | Does a non-judgmental automated assistant reduce self-reported anxiety during onboarding? | Non-judgmental feedback design, uncertainty signaling, provenance display |
| **RQ3** | Does ownership-visualization scaffolding accelerate transition from peripheral to legitimate participant? | Ownership graph, dependency trace, contribution visualization |

## Functional Requirements

- The system must list and serve learning scenarios drawn from the synthetic Omni-Mart corpus.
- The system must expose evidence artifacts (ownership records, dependency traces, runbooks, incident notes) per scenario.
- The system must accept learner submissions with structured fields: owner routing, dependency trace, blast-radius plan, and evidence notes.
- The system must score submissions using evidence gating and rubric metrics across five dimensions.
- The system must flag critical errors explicitly: wrong owner, wrong directionality, unsafe action without verification.
- The system must return feedback payloads with score, flags, and gold-aligned explanation.
- The system must support ablation evaluation across four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.
- The system must produce machine-readable benchmark reports (JSON + CSV) for reproducibility.
- The system must display evidence provenance alongside retrieved context (RQ2 trust design requirement).
- The system must signal uncertainty explicitly — never assert with false confidence (active validation design requirement).
- The system must provide an interactive `System Graph` surface with zoom, pan, filtering, and path highlighting.
- The system must provide deeper `Evaluation` analytics (mode deltas, diagnostics, and critical-error category breakdown).
- The system must provide review-ready `Check-in Export` output with copy/download actions and linked evidence artifacts.

## Non-Functional Requirements

| Requirement | Rationale |
|---|---|
| Reproducible local setup | Evaluators and reviewers must be able to run the system with documented commands |
| Type-safe TypeScript codebase | Strict typecheck gate eliminates a class of runtime errors in scoring logic |
| Deterministic unit tests | Scoring and gating behavior must be verifiable independently of LLM output |
| Synthetic-only data | No personal, internal, or proprietary data in any repository artifact |
| Dependency hygiene | Audit gate; no known vulnerabilities in shipped dependencies |
| Local LLM (Ollama) | No external API calls; privacy-safe, no data leaves the machine |
| Single-user local operation | Initial runtime target; multi-user is out of scope for current phase |
| Open-source only | No paid feature tiers or commercial dependencies |
| No telemetry | No external user-data collection of any kind |

## Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React + Vite + Tailwind |
| API | Express + Node.js |
| Database | SQLite (Phase 1) → Qdrant + Neo4j (Phase 2) |
| Core engine | TypeScript + Vitest |
| Vector retrieval | Qdrant |
| Local LLM | Ollama |
| Graph store | Neo4j Community |
| Graph retrieval | GraphRAG |

## Acceptance Criteria

**Phase 1 — baseline system:**
- `pnpm lint` passes with zero warnings.
- `pnpm test` passes all 20 tests across 4 suites.
- `pnpm typecheck` passes with strict TypeScript.
- `pnpm build` produces a clean production build.
- `pnpm smoke` passes end-to-end with API running.
- `pnpm eval` generates JSON + CSV ablation outputs.

**Phase 2 — retrieval and evaluation:**
- Vector retrieval (`pnpm eval --mode vector`) produces retrieval metrics.
- Graph retrieval (`pnpm eval --mode graph`) traversal depth ≥ 2 hops.
- GraphRAG mode produces graph-grounded context with provenance.
- Evidence gating mode (`graphrag_gating`) flags unsupported claims.
- All 12 benchmark scenarios score across all 4 modes with reproducible results.
- UI `System Graph` supports interactive path exploration for ownership and downstream impact reasoning.
- UI `Evaluation` supports comparative interpretation across all four retrieval modes.
- UI `Check-in Export` produces review-thread-ready summary content with evidence links.
