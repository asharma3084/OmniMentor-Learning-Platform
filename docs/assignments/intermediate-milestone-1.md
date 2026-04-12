# Intermediate Milestone 1 — Delivery Summary

**Delivered:** March 23, 2026  
**Score:** 8/10  
**Focus:** Prove the guided learning flow is real, usable, and produces structured feedback

---

## What Was Built

IM1 delivered the core guided-flow experience — the four-step pipeline that a learner walks through for every scenario:

1. **Brief** — Incident context, deliverable expectations, scenario queue
2. **Investigate** — Evidence cards with primary and corroborating artifacts
3. **Decide** — Structured submission (owner routing, dependency trace, blast radius, evidence notes)
4. **Feedback** — Automated scoring with field-level coaching

The system enforces an evidence-first decision process: learners must back every claim with artifacts before submitting. There are no free-text-only paths — every response maps to a rubric dimension.

## Core Features Delivered

### Five Rubric Dimensions

Each submission is scored across five dimensions, with automated coaching per field:

| Dimension | What It Measures | Coaching Output |
|-----------|-----------------|-----------------|
| **Owner Routing** | Correct ownership identification with justification | "Strong" / "Needs work" / "High risk" |
| **Dependency Trace** | Accurate bidirectional service relationships | Direction accuracy, missing edges flagged |
| **Blast Radius** | Complete downstream impact + safe remediation sequence | Coverage gaps, unsafe action warnings |
| **Evidence Relevance** | Primary + corroborating artifact use | Missing evidence types surfaced |
| **Unsupported Claims** | No reasoning beyond what evidence supports | Overclaimed impact flagged |

### Auto-Gating

Critical errors trigger hard gates before scoring proceeds:

- Wrong owner identified
- Inverted dependency direction
- Unsafe action risk (rollback, data loss)
- Missing corroborating evidence
- Overclaimed customer/revenue impact

### Structured Feedback

Feedback is not a single number — each dimension gets a score, a tone label, and a specific coaching message explaining what to fix and why. The gating check runs first; if it fails, the learner sees exactly which gate tripped before seeing dimension scores.

## Technical Proof

| Metric | Result |
|--------|--------|
| E2E tests | 3/3 passing |
| Smoke tests | All scenarios pass |
| Eval runs | Scoring pipeline verified against synthetic corpus |
| Build | Clean TypeScript compilation, no warnings |

## Demo Coverage

The IM1 demo walked through one representative scenario — **Catalog Service Ownership** — showing:

- Incident Brief with context and deliverable expectations
- Evidence investigation with primary and corroborating artifact selection
- Structured decision form with all five submission fields
- Feedback output: per-dimension scores, coaching messages, gating results
- How "Strong," "Needs work," and "High risk" labels map to specific claim quality

## Architecture Decisions Active at IM1

These foundational decisions were already in place and validated:

- **Contract-First TDD** — API contract defined before implementation; tests written against contract
- **Design-Based Research (DBR)** — Iterative methodology; each milestone is a design cycle
- **Synthetic Corpus (Omni-Mart)** — Fictional enterprise data; no real production or customer data
- **SQLite Phase 1** — Lightweight local storage for session state and scenario data

See [decisions-log.md](../architecture/decisions-log.md) for full ADR details.

## What Was Deferred to IM2

These features existed as tab placeholders but were not functional at IM1:

- **Interactive system graph** — Service topology visualization (placeholder tab only)
- **Evaluation forensics** — Mode comparison and delta analysis (not yet built)
- **Evidence provenance badges** — Graph-connection indicators on evidence cards (not yet built)
- **Advanced Mode surfaces** — Graph, evaluation, and export tabs labeled as "next-phase work"

## Scope Notes

IM1 proved the core hypothesis: a structured, evidence-first guided flow can produce meaningful per-dimension feedback without requiring live instructor evaluation. The scoring pipeline, gating logic, and coaching engine were all functional and tested. Everything beyond the guided flow was explicitly scoped for IM2.

## Cross-References

- [Project Overview](../start-here/overview.md) — Vision, problem statement, and current state
- [Decisions Log](../architecture/decisions-log.md) — Architecture Decision Records for all foundational choices
- [Requirements](../architecture/requirements.md) — Research questions and functional requirements
- [Scenario Guide](../reference/scenario-guide.md) — All six scenario domains and their evidence sets
