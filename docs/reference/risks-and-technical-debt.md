# Risks And Technical Debt


## Current Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `better-sqlite3` native module rebuild | Low | Keep `node-gyp rebuild` command in runbook; pin Node version |
| Ollama model output variability | Medium | Pin model version; use deterministic prompt template with few-shot examples; 8 guardrails in system prompt; iterative testing against known inputs |
| Ollama not running at startup | Low | AI Assistant degrades gracefully (502 error shown in chat); rest of platform unaffected |
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
| Limited scenario volume (12 scenarios) | Low | Expand each domain to more scenarios for broader benchmark coverage |
| Minimal API contract examples | Low | Expand examples in `../architecture/api-contract.md` |
| No CI pipeline | Medium | Add GitHub Actions with lint + test + typecheck |
| SQLite not multi-user ready | Low | Accepted for Phase 1; Phase 2 moves to Qdrant + Neo4j |
| Retrieval layer is Phase 1 stub | High (for RQ1) | Full retrieval integration required for ablation study |
| No provenance UI component | Medium (for RQ2) | Required for trust design — surface source artifact for every retrieved claim |
| Session/survey data not yet exported for analysis | Low | Add CSV/JSON export for learning_sessions and survey_responses tables to support offline statistical analysis |

