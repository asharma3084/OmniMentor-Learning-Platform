# Review Guide

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


This guide helps reviewers and instructors quickly evaluate progress quality and reproducibility.

## What To Look For

- Is the project aligned with proposal scope?
- Are claims backed by reproducible command evidence?
- Are outputs generated from synthetic-only data?
- Is verification discipline consistent across sessions?

## Fast Review Checklist

1. Open `README.md` for mission, run path, and verification commands.
2. Open `docs/architecture.md` for module boundaries and data flow.
3. Confirm latest artifacts exist in `reports/week2/` (smoke + ablation reports).
4. Open `docs/16-evaluation-and-kpis.md` for KPI framework and research instrumentation.

## Minimum Week 1 Signals

- `pnpm lint` passes
- `pnpm test` passes
- `pnpm typecheck` passes
- `pnpm smoke` passes
- `pnpm eval` passes
- Artifact files are present and timestamped

## Academic Integrity Signals

- No personal data in repository artifacts
- No company/internal datasets
- No secrets in source control
- Synthetic benchmark/evidence usage only

## Suggested Review Questions

- Which blockers were encountered, and how were they resolved?
- What evidence shows reproducibility beyond a single run?
- How does current implementation map to proposal outcomes?
- What is the highest-priority risk for the next phase?

## Academic Review Checklist (CS6460)

This section helps CS6460 faculty and EdTech reviewers evaluate research quality alongside engineering quality.

### Research Design Signals

- [ ] Research questions (RQ1, RQ2, RQ3) are explicitly stated and traceable to functional requirements
- [ ] Design-Based Research methodology is named and cycle boundaries are clear (analyze → design → implement → evaluate → reflect)
- [ ] Evaluation metrics align with RQs: RQ1 (timing + mode comparison), RQ2 (uncertainty/provenance design + pre/post survey), RQ3 (ownership visualization + behavioral proxies)
- [ ] Learning analytics instrumentation is in place: session tracking, pre/post surveys, behavioral proxy logging
- [ ] KPI framework (9 KPIs × 3 RQs) is documented in `docs/16-evaluation-and-kpis.md`
- [ ] Rubric/gating design reflects learning scaffolding rationale, not just engineering correctness
- [ ] Sampling and reproducibility risks are documented (single-user limitation, synthetic corpus scope)
- [ ] Quality gates document research validity alongside engineering quality
- [ ] Weekly check-in notes reference DBR cycle position and key evidence artifacts

### Academic Review Questions

- Which DBR cycle (analyze/design/implement/evaluate/reflect) is this checkpoint addressing?
- What evidence shows that evaluation metrics distinguish between retrieval modes meaningfully?
- Does unsupported-claim detection serve both engineering AND pedagogical purposes (self-explanation + metacognitive awareness)?
- What are the Phase 2 research threats (generalizability, reproducibility) and how are they mitigated?
- Are gold labels transparent about what they measure (evidence alignment, not reasoning correctness)?
- How does the non-judgmental feedback design connect to RQ2 (anxiety reduction)?

### Learning Theory Alignment

| Theory | Where Applied | Evidence |
|---|---|---|
| Cognitive Apprenticeship (Collins et al., 1989) | Scenario-based practice loop | Learners observe expert reasoning via gold labels, then practice and receive coaching |
| Scaffolding (Wood et al., 1976) | System Graph, Evidence tab, structured submission | External visual structure reduces cognitive load during reasoning |
| Self-Explanation (Chi et al., 1989) | Evidence gating, claim-level feedback | Learners must articulate reasoning before receiving feedback |
| Cognitive Load Theory (Sweller, 1988) | Architecture Blindness framing, UI design | Externalizing system topology reduces working memory burden |

## Suggested Grading Confidence Indicators

- High confidence: repeated green gates with clear logs and artifact trail.
- Medium confidence: single green run but weak continuity notes.
- Low confidence: unverifiable claims, missing artifacts, or inconsistent logs.
