# 15. TPM Learning Scenarios User Guide (6-Scenario Baseline + 6 Proposed)

Version: 1.4
Last Updated: 2026-03-22
Status: Guided-first baseline (6 scenarios implemented); expansion path documented to 12

## Purpose

This guide explains how TPMs use the GUI across a scenario-based learning run.
The current baseline implements 6 scenarios (2 per domain). The planned expansion grows each domain to 4 scenarios (12 total).
This guide is written for live demo delivery, guided practice, and reviewer walkthroughs.

Default learner model used in this guide:
- `Brief`
- `Investigate`
- `Decide`
- `Feedback`

Advanced review surfaces remain available behind `Advanced Mode`:
- `Overview`
- `Scenario Workspace`
- `System Graph`
- `Evidence`
- `Evaluation`
- `Check-in Export`

## Standard TPM Workflow (Used For Every Scenario)

1. On first visit, complete the pre-survey (5-item self-assessment). This only appears once.
2. Start in `Brief` and read the scenario objective, constraints, and success criteria.
3. A learning session starts automatically — the elapsed timer begins in the header.
4. Move to `Investigate` and inspect available artifacts.
5. Select at least one primary artifact and one corroborating artifact (first evidence selection is logged as a behavioral proxy).
6. If needed, open `Advanced Mode` for deeper graph or evidence inspection.
7. Move to `Decide` and complete required fields:
   - owner routing
   - dependency trace
  - action plan
   - blast-radius plan
   - evidence notes
8. Optionally open `Show Me A Good Answer` to study a strong answer and its field-by-field coaching.
9. Review uncertainty and unsupported-claim warnings before submit.
10. Submit and inspect `Feedback` outputs. The session timer records completion.
11. Capture progress and observations in `Check-in Export` if deeper review is needed.
12. After completing all scenarios, complete the post-survey (same 5-item self-assessment).

Freeze-scope behavior expectations during this workflow:
- `System Graph` interactions include filter, path-trace, and impact-highlight usage before final submission.
- `Evaluation` review includes mode-delta interpretation, not only top-line score reading.
- `Check-in Export` output must be review-thread ready (concise narrative + evidence links + score/gating snapshot).

## Scenario Set (Current 6 Implemented, Expansion Path to 12)

Note:
- The current baseline implements 6 scenarios (2 per domain) with gold labels, evidence artifacts, and scoring.
- Scenarios 7–12 below are part of the documented expansion path and are included for roadmap visibility.
- Scenario IDs/titles should be mapped to the canonical benchmark corpus identifiers used in evaluation artifacts.

## Domain A: Catalog (Scenarios 1–2 implemented; 3–4 Phase 2)

## Scenario 1: Catalog Service Ownership Change
- TPM objective: route owner correctly after service boundary update.
- Primary checks:
  - ownership evidence alignment
  - dependency direction correctness
- GUI focus:
  - `System Graph` node owner metadata
  - `Scenario Workspace` owner routing field

## Scenario 2: Product Feed Latency Escalation
- TPM objective: identify upstream source and downstream blast radius.
- Primary checks:
  - upstream dependency identification
  - safe mitigation sequence
- GUI focus:
  - directional edges in `System Graph`
  - blast-radius plan quality

## Scenario 3: Metadata Schema Rollout Risk (Phase 2)
- TPM objective: coordinate cross-team rollout with policy guardrails.
- Primary checks:
  - policy evidence usage
  - unsafe action avoidance
- GUI focus:
  - provenance in `Evidence`
  - critical error category monitoring

## Scenario 4: Search Index Drift Incident (Phase 2)
- TPM objective: distinguish symptom owners vs root-cause owners.
- Primary checks:
  - wrong-owner avoidance
  - corroborating evidence use
- GUI focus:
  - evidence role balance
  - unsupported claim list cleanup

## Domain B: Cart And Checkout (Scenarios 5–6 implemented; 7–8 Phase 2)

## Scenario 5: Checkout Auth Failure
- TPM objective: route incident across auth, gateway, and checkout boundaries.
- Primary checks:
  - directional trace quality
  - rollback safety
- GUI focus:
  - `System Graph` traversal
  - action plan verification notes

## Scenario 6: Payment Retry Storm
- TPM objective: contain retry amplification without breaking revenue flow.
- Primary checks:
  - blast-radius completeness
  - unsafe-action flag prevention
- GUI focus:
  - blast-radius plan field
  - critical error panel

## Scenario 7: Cart Session Expiry Regression (Phase 2)
- TPM objective: coordinate owner handoff between cart API and session service.
- Primary checks:
  - owner routing confidence
  - evidence provenance quality
- GUI focus:
  - owner registry artifacts
  - provenance tags in context

## Scenario 8: Third-Party Gateway Degradation (Phase 2)
- TPM objective: separate internal fixes from vendor-managed constraints.
- Primary checks:
  - policy/governance evidence use
  - uncertainty signaling honesty
- GUI focus:
  - uncertainty badges
  - evidence notes with constraint citations

## Domain C: Risk And Compliance (Scenarios 9–10 implemented; 11–12 Phase 2)

## Scenario 9: Access Control Exception Request
- TPM objective: route approval path with governance compliance.
- Primary checks:
  - policy-first evidence usage
  - incorrect-owner risk avoidance
- GUI focus:
  - policy artifacts in `Evidence`
  - owner + approver trace in workspace

## Scenario 10: Audit Trail Inconsistency
- TPM objective: identify accountable service and logging dependencies.
- Primary checks:
  - dependency directionality
  - action plan safety checks
- GUI focus:
  - graph path validation
  - unsafe-action warnings

## Scenario 11: Data Retention Policy Breach (Phase 2)
- TPM objective: build corrective plan with minimal downstream disruption.
- Primary checks:
  - blast-radius realism
  - evidence sufficiency
- GUI focus:
  - blast-radius structure
  - coverage meter and unsupported-claim panel

## Scenario 12: Incident Postmortem Ownership Conflict (Phase 2)
- TPM objective: resolve ownership conflict and produce defensible routing decision.
- Primary checks:
  - corroborated ownership proof
  - transparent uncertainty where evidence conflicts
- GUI focus:
  - provenance comparison
  - confidence/uncertainty signaling

## How To Use This Guide In A Live Demo

Recommended demo sequence:
1. Run one scenario per domain (1, 5, 9) to show breadth.
2. Run one complex graph-heavy scenario (10 or 12) for depth.
3. Open `Evaluation` and show four-mode comparison outputs.
4. Export summary from `Check-in Export` for review-thread readiness.
5. Demonstrate copy/download export actions and show included artifact links.

## What Reviewers Should See

By the end of the scenario run (6 in Phase 1, 12 once Phase 2 expansion is complete), reviewers should observe:
- improved owner-routing consistency
- lower unsupported claim rates
- fewer critical errors
- stronger blast-radius planning quality
- clearer explanation quality with explicit uncertainty/provenance
- **decreasing session duration** across successive attempts (time-to-competent-submission trend)
- **reduced hesitation time** (first evidence selection happening earlier)
- **positive pre/post survey delta** (increased self-reported confidence, decreased anxiety)

## Troubleshooting During Demo

- If score drops unexpectedly:
  - check missing primary evidence
  - re-check directionality in graph trace
  - verify unsafe action was not proposed without validation
- If ownership is unclear:
  - use corroborating ownership artifacts before final routing
  - record uncertainty instead of forced certainty
- If feedback appears too generic:
  - ensure evidence notes explicitly cite artifact IDs and rationale

## Quick Script For Presenter

"This interface trains a new TPM to make defensible architecture decisions.
Each scenario forces evidence-backed owner routing, directional dependency reasoning, and blast-radius planning.
The current prototype teaches through the guided practice loop, example answers, evidence gating, and structured feedback. Proposal-target graph and LLM depth remain future-facing surfaces rather than the center of the current learner flow.
We evaluate across four retrieval modes and export reproducible outputs for review.
The platform tracks session timing and administers matched pre/post surveys to measure orientation-time reduction and anxiety change — directly supporting our three research questions with quantitative KPIs."
