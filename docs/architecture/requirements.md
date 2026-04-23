# Requirements


## Research Questions (Driving Requirements)

These research questions define the functional and evaluative scope of OmniMentor. Every capability traces back to one or more of these.

| | Research Question | Drives |
|---|---|---|
| **RQ1** | Does scenario-based practice with a knowledge graph reduce orientation time vs. static documentation? | Scenarios, knowledge graph retrieval, benchmark timing, **API-tracked session timing (start, first evidence, first submit, completion), time-to-competent-submission KPI** |
| **RQ2** | Does a non-judgmental automated assistant reduce self-reported anxiety during onboarding? | Non-judgmental feedback design, uncertainty signaling, provenance display, **pre/post Likert surveys** |
| **RQ3** | Does ownership-visualization scaffolding accelerate transition from peripheral to legitimate participant? | Ownership graph, dependency trace, contribution visualization, **behavioral proxy tracking (hesitation time, attempt counts)** |

## Functional Requirements

- The system must list and serve learning scenarios drawn from the synthetic Omni-Mart corpus.
- The system must expose evidence artifacts (ownership records, dependency traces, runbooks, incident notes) per scenario.
- The system must accept learner submissions with structured fields: owner routing, dependency trace, blast-radius plan, and evidence notes.
- The system must score submissions using evidence gating and rubric metrics across five dimensions.
- The system must flag critical errors explicitly: wrong owner, wrong directionality, unsafe action without verification. This claim-level discrepancy detection serves a pedagogical purpose: it makes reasoning gaps visible to learners, supporting self-explanation and metacognitive awareness (Chi et al., 1989; Azevedo & Cromley, 2004).
- The system must return feedback payloads with score, flags, and gold-aligned explanation.
- The system must support ablation evaluation across four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.
- The system must produce machine-readable benchmark reports (JSON + CSV) for reproducibility.
- The system must track learning session time per scenario (start, first evidence selection, first submission, completion) for RQ1 evaluation.
- The system must administer pre/post 5-item Likert surveys to measure self-reported anxiety and confidence (RQ2 evaluation).
- The system must log behavioral proxy events (first evidence selection, hesitation time) per session for RQ3 evaluation.
- The system must display evidence provenance alongside retrieved context (RQ2 trust design requirement).
- The system must signal uncertainty explicitly — never assert with false confidence (active validation design requirement).
- The system must provide a context-aware AI coaching assistant that responds to learner questions within the scope of the active scenario, without revealing gold-label answers or hallucinating information beyond provided context (RQ2 non-judgmental assistant requirement).
- The AI assistant must enforce guardrails: scope-limited to the current scenario, off-topic rejection, no code generation, concise responses, and evidence-based redirects.
- The system must provide an interactive `System Graph` review surface with filtering, node focus, path review, and provenance-linked node detail.
- The system must provide deeper `Evaluation` analytics (mode deltas, diagnostics, and critical-error category breakdown).
- The system must provide review-ready `Check-in Export` output with copy/download actions and selected-evidence references.

## Non-Functional Requirements

| Requirement | Rationale |
|---|---|
| Reproducible local setup | Evaluators and reviewers must be able to run the system with documented commands |
| Type-safe TypeScript codebase | Strict typecheck gate eliminates a class of runtime errors in scoring logic |
| Deterministic unit tests | Scoring and gating behavior must be verifiable independently of LLM output |
| Synthetic-only data | No personal, internal, or proprietary data in any repository artifact |
| Dependency hygiene | Audit gate; no known vulnerabilities in shipped dependencies |
| Local-first assistant path | LLM coaching runs via Ollama locally — no external data transmission |
| Single-user local operation | Initial runtime target; multi-user is out of scope for current phase |
| Open-source only | No paid feature tiers or commercial dependencies |
| No telemetry | No external user-data collection of any kind |

## Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React + Vite + Tailwind |
| API | Express + Node.js |
| Current persistence | SQLite |
| Core engine | TypeScript + Vitest |
| Current retrieval baseline | Deterministic in-memory retrieval across `vector`, `graph`, `graphrag`, and `graphrag_gating` |
| Local LLM | Ollama (llama3.2) |
| Target vector retrieval | Qdrant |
| Target graph store | Neo4j Community |
| Target graph retrieval | GraphRAG |
| ~~Target local LLM~~ | ~~Ollama~~ — now active (AI Assistant) |

## Acceptance Criteria

**Phase 1 — baseline system:**
- `pnpm lint` passes with zero warnings.
- `pnpm test` passes all 28 tests across 5 suites.
- `pnpm test:e2e` passes the guided new-TPM browser path on isolated ports.
- `pnpm typecheck` passes with strict TypeScript.
- `pnpm build` produces a clean production build.
- `pnpm smoke` passes end-to-end with API running.
- `pnpm eval` generates JSON + CSV ablation outputs.

**Phase 2 — retrieval and evaluation:**
- Vector retrieval (`pnpm eval --mode vector`) produces retrieval metrics.
- Graph retrieval (`pnpm eval --mode graph`) traversal depth ≥ 2 hops.
- GraphRAG mode produces graph-grounded context with provenance.
- Evidence gating mode (`graphrag_gating`) flags unsupported claims.
- All benchmark scenarios score across all 4 modes with reproducible results.
- UI `System Graph` supports interactive path exploration for ownership and downstream impact reasoning.
- UI `Evaluation` supports comparative interpretation across all four retrieval modes.
- UI `Check-in Export` produces review-thread-ready summary content with selected-evidence references.
- Session tracking endpoints (`POST /sessions/start`, `POST /sessions/event`, `GET /analytics/sessions`) return valid responses.
- Survey endpoints (`POST /surveys`, `GET /surveys`, `GET /surveys/status`) correctly store and retrieve pre/post responses.
- Pre-survey modal displays on first visit; post-survey displays after all scenarios are completed.
- Session timing is tracked via API endpoints (start, first evidence, first submit, completion) for RQ1 measurement.
