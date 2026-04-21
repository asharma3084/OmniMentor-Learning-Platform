# Scenario Guide

This guide describes the twelve scenarios that ship in OmniMentor and how to use them in a mentor walkthrough or product demo.

## What This Guide Covers

The current public baseline is twelve implemented scenarios across four domains:

- Catalog
- Cart and Checkout
- Risk and Compliance
- Fulfillment and Logistics (First Mile, Middle Mile, Last Mile)

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

#### Scenario 2: Thanksgiving Sale — Pricing Engine Slowdown (Beginner) ★ Demo

- Objective: triage a performance incident and trace pricing-related blast radius under production pressure.
- Demo note: universally relatable — everyone understands wrong prices on Thanksgiving deals. Short dependency chain, one required evidence artifact.
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

### Fulfillment And Logistics — First Mile

#### Scenario 7: Supplier Feed Ingestion Failure During Holiday Ramp (Beginner)

- Objective: triage a supplier EDI ingestion failure that blocks warehouse receiving and stales inventory counts before the holiday rush.
- Strong answer signals:
  - owner is Vendor Management Team
  - ASN rejection root cause identified (EDI parsing error)
  - blast radius includes idle receiving docks and stale ATP for thousands of SKUs
  - top-volume suppliers contacted directly

#### Scenario 8: Warehouse Management System Patch During Peak Receiving (Intermediate)

- Objective: evaluate the deploy-vs-delay tradeoff for a WMS bug fix during peak holiday receiving (duplicate scan entries inflating inventory).
- Strong answer signals:
  - owner is Warehouse Ops Team
  - canary deployment on single low-volume DC first with 30-minute observation
  - blast radius is bidirectional: deploying risks receiving disruption, not deploying risks overselling
  - Inventory Sync alerted that ATP counts will correct downward post-patch

### Fulfillment And Logistics — Middle Mile

#### Scenario 9: Cross-Dock Routing Misconfig Sends Freight to Wrong DC (Beginner)

- Objective: trace how a TMS routing rule misconfiguration silently redirects freight to the wrong facility, causing regional store stockouts.
- Strong answer signals:
  - owner is Transportation Team
  - routing rule reverted immediately to stop further misdirected freight
  - manual freight redirect initiated from Chicago DC to Atlanta DC
  - 48-hour recovery delay and added shipping cost acknowledged

#### Scenario 10: Middle-Mile Carrier Delay Cascading to Store Stockouts (Advanced)

- Objective: make a cost-vs-revenue rerouting decision under Thanksgiving deadline pressure when a middle-mile carrier is 20+ hours late.
- Strong answer signals:
  - owner is Transportation Team
  - revised ETA obtained from carrier before deciding
  - reroute-vs-accept-stockout tradeoff analyzed ($2-5/unit reroute cost vs revenue loss)
  - VP Supply Chain escalation triggered if revenue impact exceeds $50k
  - Store Ops in affected region alerted for shelf signage

### Fulfillment And Logistics — Last Mile

#### Scenario 11: Last-Mile Carrier API Timeout During Peak Delivery Window (Beginner) ★ Demo

- Objective: triage a carrier tracking API outage that leaves customers unable to see delivery status and spikes support calls.
- Demo note: universally relatable — everyone understands "where is my package?" Short dependency chain, one required evidence artifact.
- Strong answer signals:
  - owner is Logistics Operations Team
  - carrier technical support contacted for outage status
  - cached last-known tracking fallback enabled
  - Customer Support team alerted with talking points for WISMO calls

#### Scenario 12: Fulfillment Router Capacity Breach During Order Surge (Beginner)

- Objective: triage a capacity breach in the fulfillment routing service during Black Friday order surge.
- Strong answer signals:
  - owner is Supply Chain Team
  - horizontal scaling initiated
  - fallback: default all orders to ship-from-DC to reduce routing complexity
  - queue depth and latency thresholds monitored (queue > 10k, latency > 5s)

## Recommended Demo Sequence

For a quick and impactful demo, use the two demo scenarios:

1. **Thanksgiving Sale** (Scenario 2) — pricing incident everyone understands. Show how the learner reads the brief, finds the right evidence, identifies the Pricing Team as owner, and traces the blast radius through the system.
2. **Last-Mile Carrier API Timeout** (Scenario 11) — shipping tracking outage everyone relates to. Show the same decision flow but in the logistics domain, with external carrier dependency.
3. Use the `System Graph` sub-tab on one of these to show the dependency visualization.
4. Open `Score & Coaching` to show evaluation scoring and fix-action guidance.
5. Open `Check-in Export` to show the mentor-facing summary.

For a deeper review, run one scenario from each of the four domains to show coverage breadth.

## What A Mentor Should Look For

Across the twelve-scenario set, the most important review signals are:

- more accurate owner routing
- stronger dependency directionality
- broader and safer blast-radius reasoning
- fewer unsupported claims
- fewer critical errors
- clearer evidence-backed explanation quality

These are the signals that connect product behavior back to the project's learning and evaluation claims.
