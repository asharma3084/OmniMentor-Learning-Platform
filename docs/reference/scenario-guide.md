# Scenario Guide

This guide describes the six scenarios that currently ship in OmniMentor and how to use them in a mentor walkthrough or product demo.

## What This Guide Covers

The current public baseline is six implemented scenarios across three domains:

- Catalog
- Cart and Checkout
- Risk and Compliance

Each scenario is designed to train the same core TPM skills:

- identifying the right owner
- tracing dependency direction
- estimating blast radius
- supporting decisions with evidence
- avoiding unsafe action under uncertainty

## Standard Walkthrough Flow

For each scenario, the strongest review path is:

1. Read the problem framing in `Brief`.
2. Inspect evidence in `Investigate`.
3. Select one primary and one corroborating artifact.
4. Complete the structured decision in `Decide`.
5. Review score, gating, and diagnostics in `Feedback`.
6. Use the Feedback sub-tabs (System Graph, Evidence Explorer, Check-in Export) for deeper review.

## Current Scenario Set

### Catalog

#### Scenario 1: Catalog Service Ownership Change

- Objective: route ownership correctly after a service-boundary change.
- Strong answer signals:
  - ownership evidence is explicit
  - dependency direction is correct
  - escalation path is justified

#### Scenario 2: Product Feed Latency Escalation

- Objective: identify the upstream source of a customer-facing latency problem and explain the downstream impact.
- Strong answer signals:
  - upstream source is named correctly
  - downstream blast radius is broader than a single system
  - mitigation sequence is safe and evidence-backed

### Cart And Checkout

#### Scenario 3: Checkout Auth Failure

- Objective: route an incident across auth, gateway, and checkout service boundaries.
- Strong answer signals:
  - dependency path is directional and coherent
  - owner routing is specific
  - action plan does not skip validation

#### Scenario 4: Payment Retry Storm

- Objective: contain retry amplification without breaking revenue flow.
- Strong answer signals:
  - blast radius covers customer and operational impact
  - unsafe actions are avoided
  - evidence notes explain why the selected response is safer

### Risk And Compliance

#### Scenario 5: Access Control Exception Request

- Objective: route an approval path with governance and ownership constraints.
- Strong answer signals:
  - policy evidence is used directly
  - ownership and approver routing are distinct when needed
  - uncertainty is stated honestly when evidence is incomplete

#### Scenario 6: Audit Trail Inconsistency

- Objective: identify the accountable service and logging dependencies behind an auditability issue.
- Strong answer signals:
  - dependency direction is correct
  - action plan is safe and reviewable
  - evidence support is strong enough to pass gating

## Recommended Demo Sequence

If the goal is to show both breadth and depth without overwhelming the reviewer:

1. Run one scenario from each domain to show coverage.
2. Use the `System Graph` sub-tab on one graph-heavy scenario to show system review depth.
3. Open `Evaluation` to show four-mode comparison.
4. Open `Check-in Export` to show the mentor-facing summary.

## What A Mentor Should Look For

Across the six-scenario set, the most important review signals are:

- more accurate owner routing
- stronger dependency directionality
- broader and safer blast-radius reasoning
- fewer unsupported claims
- fewer critical errors
- clearer evidence-backed explanation quality

These are the signals that connect product behavior back to the project's learning and evaluation claims.
