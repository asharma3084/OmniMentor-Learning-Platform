# 14. GUI Justification From QQ And Proposal

Version: 1.2
Last Updated: 2026-03-09
Status: Finalized baseline

## Purpose

This document explains why the selected GUI (`Design 1.1: TPM Onboarding Command Center`) is the strongest fit for:
- Assignment progression (`A1 -> A2 -> A3 -> A4 -> Proposal`)
- Qualifier Question (QQ) expectations
- Proposal research questions (`RQ1`, `RQ2`, `RQ3`)

It is written as a defensible rationale for design review and demo narration.

## Assignment-To-GUI Traceability

## A1: Architecture Blindness Problem Framing

What A1 established:
- New TPMs struggle to see ownership, dependency direction, and governance constraints in complex service ecosystems.

GUI justification:
- `System Graph` tab makes ownership and dependency relationships visually navigable.
- `Scenario Workspace` requires directional dependency trace before submission.
- `Evidence` tab ensures decisions are grounded in visible artifacts, not assumptions.

Why this is correct:
- A1 defines the problem as systems orientation, not just missing docs.
- The GUI therefore centers relationship visibility and decision support.

## A2: Cognitive Load And Onboarding Friction

What A2 established:
- Fragmented knowledge creates high extraneous load and slows onboarding decisions.

GUI justification:
- Dashboard summarizes progress, risk, and readiness so TPMs do not mentally stitch state across screens.
- Workspace uses structured fields (owner, dependency, blast radius, evidence notes) to reduce ambiguity.
- Error and readiness signals are visible in-context to avoid repeated trial-and-error.

Why this is correct:
- A2 calls for cognitive scaffolding.
- Structured, visible workflow reduces recall burden and improves consistency.

## A3: Relational Learning And Information Scent

What A3 established:
- Learners need relational scaffolds, not flat documentation lookup.

GUI justification:
- `System Graph` tab links node/edge navigation to evidence and decision drafting.
- Provenance display shows where each claim came from.
- `Score & Reflection` emphasizes model correction and reasoning improvement.

Why this is correct:
- A3 requires learnable relationships and traceable cues.
- Graph + provenance + reflection forms a relational learning loop.

## A4 (QQ): Balance Automation With Human Guidance Principles

What QQ emphasized:
- Automated assistance should support expertise development, not shortcut learning.
- Trust depends on transparent scaffolding and explainable outputs.

GUI justification:
- Ollama assistant is constrained to supportive coaching and explanation.
- Evidence-gating remains the hard trust boundary; AI cannot override required evidence.
- Uncertainty signaling is explicit, reducing false confidence and over-automation risk.

Why this is correct:
- This preserves learner agency while still offering non-judgmental support.
- The assistant is used to coach reasoning, not replace it.

## Proposal Research Questions Coverage

## RQ1: Orientation Time Reduction

RQ1 target:
- Scenario practice + knowledge graph should reduce orientation time vs static docs.

GUI support:
- `Scenario Workspace` + `System Graph` workflow accelerates owner/dependency resolution.
- `Evaluation` tab compares retrieval modes (`vector`, `graph`, `graphrag`, `graphrag_gating`).
- **Live session timer** in header tracks time-on-task per scenario (start → first evidence → first submit → completion).
- **Learning session API** records `durationSec`, `firstEvidenceAt`, `firstSubmitAt` for time-to-competent-submission analysis.

## RQ2: Anxiety Reduction With Non-Judgmental Assistant

RQ2 target:
- Assistant interaction should reduce anxiety while maintaining learning integrity.

GUI support:
- Non-judgmental coaching tone in assistant responses.
- Clear uncertainty/provenance markers to avoid misleading authority.
- Reflection outputs frame improvement actions without punitive language.
- **Pre/post 5-item Likert survey modals** measure self-reported confidence and anxiety change across the scenario run.

## RQ3: Ownership Visualization And Legitimate Participation

RQ3 target:
- Ownership visualization should accelerate movement from peripheral to active participation.

GUI support:
- `System Graph` gives ownership/dependency visibility.
- Contribution-oriented progress indicators on dashboard and check-in outputs.
- Scenario completion evidence supports practical participation readiness.
- **Behavioral proxy tracking**: hesitation time (session start → first evidence selection) and attempt count per scenario.

## Technical Stack Justification In GUI

The GUI explicitly reflects the proposal stack:
- **Neo4j**: node-edge ownership/dependency exploration (`System Graph`)
- **GraphRAG**: graph-grounded context assembly for retrieval and explanation
- **Ollama**: local assistant for bounded coaching/explanation (no external API dependence)
- **Evidence Gating**: final decision trust boundary

This prevents UI/architecture mismatch and keeps the demo proposal-faithful.

## Why Design 1.1 Is The Best Fit

Compared to alternatives, Design 1.1 gives the strongest combined score on:
- proposal fidelity
- assignment traceability
- measurable evaluation readiness
- review defensibility

It is not only visually strong; it is epistemically aligned with the course outcomes.

## Coverage Statement

Design 1.1 is a **full-coverage baseline** because it explicitly includes:
- Required structured submission fields:
  - owner routing
  - dependency trace
  - blast-radius plan
  - evidence notes
- Explicit critical error categories:
  - wrong owner
  - wrong directionality
  - unsafe action without verification
- Unsupported claim visibility
- Uncertainty signaling and provenance display
- Four-mode evaluation surfaces
- Neo4j/GraphRAG graph visibility
- Ollama assistant with evidence-gated safety boundary
- **Learning session time tracking (timer + session API)**
- **Pre/post survey instrumentation (5-item Likert, matched pre/post)**
- **Behavioral proxy logging (hesitation time, attempt count)**
- **KPI evaluation framework (9 KPIs × 3 RQs, see `docs/16-evaluation-and-kpis.md`)**

This baseline is used as the implementation and review reference for check-in.

## Freeze-Scope Requirements

To meet the quality target, the following are required (not optional):
- Interactive `System Graph` visualization (zoom/pan/filter/path highlight + provenance-linked node detail).
- Deeper `Evaluation` analytics (mode deltas, error-category breakdown, diagnostics panel).
- Review-ready `Check-in Export` generation (structured narrative + score/gating snapshot + copy/download actions).

These requirements are now part of frozen design/architecture scope and must be reflected in implementation.

## Demo-Ready Summary

When presenting to reviewers:
- Start with the problem (Architecture Blindness)
- Show how each tab maps to a research question
- Show that AI is bounded and evidence is mandatory
- Show evaluation comparability across retrieval modes
- End with measurable outcomes and readiness indicators
