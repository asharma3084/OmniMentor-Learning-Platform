# 15. TPM Learning Scenarios User Guide (12-Scenario Demo)

Version: 1.2
Last Updated: 2026-03-09
Status: Finalized demo guide baseline

## Purpose

This guide explains how TPMs use the GUI across a complete 12-scenario learning run.
It is written for demo delivery and practice sessions.

Tab model used in this guide:
- `Overview`
- `Scenario Workspace`
- `System Graph`
- `Evidence`
- `Evaluation`
- `Check-in Export`

## Standard TPM Workflow (Used For Every Scenario)

1. Open `Overview` and select the next scenario.
2. Read scenario objective, constraints, and expected risk posture.
3. Open `Evidence` and inspect available artifacts.
4. Open `System Graph` to verify ownership and directional dependencies.
5. Move to `Scenario Workspace` and complete required fields:
   - owner routing
   - dependency trace
   - blast-radius plan
   - evidence notes
6. Review uncertainty and unsupported-claim warnings before submit.
7. Submit and inspect `Score & Reflection` outputs.
8. Capture progress and observations in `Check-in Export`.

A+ freeze behavior expectations during this workflow:
- `System Graph` interactions include filter, path-trace, and impact-highlight usage before final submission.
- `Evaluation` review includes mode-delta interpretation, not only top-line score reading.
- `Check-in Export` output must be mentor-thread ready (concise narrative + evidence links + score/gating snapshot).

## 12-Scenario Demo Set

Note:
- This guide defines a complete 12-scenario TPM demo flow aligned with proposal scope.
- Scenario IDs/titles should be mapped to the canonical benchmark corpus identifiers used in evaluation artifacts.

## Domain A: Catalog (Scenarios 1-4)

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

## Scenario 3: Metadata Schema Rollout Risk
- TPM objective: coordinate cross-team rollout with policy guardrails.
- Primary checks:
  - policy evidence usage
  - unsafe action avoidance
- GUI focus:
  - provenance in `Evidence`
  - critical error category monitoring

## Scenario 4: Search Index Drift Incident
- TPM objective: distinguish symptom owners vs root-cause owners.
- Primary checks:
  - wrong-owner avoidance
  - corroborating evidence use
- GUI focus:
  - evidence role balance
  - unsupported claim list cleanup

## Domain B: Cart And Checkout (Scenarios 5-8)

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

## Scenario 7: Cart Session Expiry Regression
- TPM objective: coordinate owner handoff between cart API and session service.
- Primary checks:
  - owner routing confidence
  - evidence provenance quality
- GUI focus:
  - owner registry artifacts
  - provenance tags in context

## Scenario 8: Third-Party Gateway Degradation
- TPM objective: separate internal fixes from vendor-managed constraints.
- Primary checks:
  - policy/governance evidence use
  - uncertainty signaling honesty
- GUI focus:
  - uncertainty badges
  - evidence notes with constraint citations

## Domain C: Risk And Compliance (Scenarios 9-12)

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

## Scenario 11: Data Retention Policy Breach
- TPM objective: build corrective plan with minimal downstream disruption.
- Primary checks:
  - blast-radius realism
  - evidence sufficiency
- GUI focus:
  - blast-radius structure
  - coverage meter and unsupported-claim panel

## Scenario 12: Incident Postmortem Ownership Conflict
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
4. Export summary from `Check-in Export` for mentor-thread readiness.
5. Demonstrate copy/download export actions and show included artifact links.

## What Reviewers Should See

By the end of the 12-scenario run, reviewers should observe:
- improved owner-routing consistency
- lower unsupported claim rates
- fewer critical errors
- stronger blast-radius planning quality
- clearer explanation quality with explicit uncertainty/provenance

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
GraphRAG and Neo4j provide relationship context, Ollama provides bounded coaching, and evidence gating enforces trust.
We evaluate across four retrieval modes and export reproducible outputs for mentor review."
