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

#### Scenario 1: Deploy Catalog API Schema Migration (Intermediate)

- Objective: coordinate a CDC-impacting schema change with downstream consumers.
- Strong answer signals:
  - owner is Catalog Team
  - Search Indexer mapping must be updated before deployment
  - blast radius includes stale search results on Storefront and Mobile BFF
  - deployment scheduled outside bulk-import window

#### Scenario 2: Thanksgiving Sale — Pricing Engine Slowdown (Beginner)

- Objective: triage a performance incident and trace pricing-related blast radius under production pressure.
- Strong answer signals:
  - owner is Pricing Team
  - upstream source (Promo Service overload) is identified
  - Catalog API fallback to cached base price is acknowledged
  - downstream impact on Cart and Storefront is mapped

### Cart And Checkout

#### Scenario 3: Deploy Checkout Orchestrator Saga Timeout Change (Intermediate)

- Objective: plan a saga timeout change post-incident with full dependency coordination.
- Strong answer signals:
  - owner is Commerce Team
  - all saga participants mapped (Payment Gateway, Inventory Sync, Fulfillment Router, Notification Hub)
  - Payments Team sign-off required
  - circuit breaker thresholds validated with Supply Chain Team

#### Scenario 4: Payment Gateway Security Patch Deployment (Beginner)

- Objective: deploy a critical TLS patch within PCI-DSS constraints under time pressure.
- Strong answer signals:
  - owner is Payments Team
  - PCI compliance requires InfoSec security review
  - blast radius is all checkout transactions
  - zero-downtime rolling strategy required

### Risk And Compliance

#### Scenario 5: Deploy Updated Fraud Detection Model (Intermediate)

- Objective: deploy an ML model with canary validation after a prior false-negative incident.
- Strong answer signals:
  - owner is Risk Engineering Team
  - canary scoring on 24h transactions with drift threshold
  - feature-freshness validation addresses root cause from PIR-2026-042
  - Audit Logger records model version for compliance

#### Scenario 6: Identity Provider Emergency Rotation (Advanced)

- Objective: execute emergency JWT signing key rotation with platform-wide blast radius.
- Strong answer signals:
  - owner is Platform Security Team
  - blast radius is platform-wide (all authenticated operations)
  - dual-key rotation strategy (add new key, then retire old)
  - off-peak deployment window coordinated with SRE

## Recommended Demo Sequence

If the goal is to show both breadth and depth without overwhelming the reviewer:

1. Run one scenario from each domain to show coverage.
2. Use the `System Graph` sub-tab on one graph-heavy scenario to show system review depth.
3. Open `Score & Coaching` to show evaluation scoring and fix-action guidance.
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
