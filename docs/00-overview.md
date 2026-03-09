# 00. Overview

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)


## Purpose

OmniMentor is an intelligence platform that turns **institutional memory into a learnable skill**. Built around the Omni-Mart enterprise context, it transforms the way new engineers and program managers orient to complex systems — not through documentation lookup, but through scenario-based practice grounded in real evidence.

Operating model in current scope:
- Local single-user web application.
- macOS-first runtime target.
- Open source only — no paid version, no telemetry, no external data collection.

## Problem: Architecture Blindness

Enterprise software systems accumulate vast operational knowledge — ownership boundaries, dependency chains, runbook decisions, incident patterns — but this knowledge lives mostly in the heads of a few senior engineers. When those engineers are perpetually interrupted by newcomers who lack the tools to self-orient, an organization's institutional memory becomes a bottleneck rather than an asset.

We call this **Architecture Blindness**: the inability to see the full functional picture of a complex system — overwhelmed by the technical trees, unable to see the forest.

Architecture Blindness operates across three reinforcing dimensions:

| Dimension | What It Looks Like |
|---|---|
| **Cognitive Load** | Too many systems, too many names — no mental model for what owns what |
| **Emotional Anxiety** | Fear of asking "obvious" questions; reluctance to make ownership decisions under uncertainty |
| **Social Isolation** | Peripheral participation — attending meetings without knowing enough to contribute |

The canonical persona is **Nancy**: a new Technical Program Manager at Omni-Mart, technically capable, genuinely motivated, but unable to navigate the ownership graph — a newcomer who needs to sit in a meeting, explain key dependencies, and predict how a change might ripple through the system.

## Solution Direction

OmniMentor is a **non-judgmental relational tutor** that:
1. Presents realistic operational scenarios drawn from the synthetic Omni-Mart corpus.
2. Surfaces evidence — ownership records, dependency traces, runbooks, incident notes — without pre-selecting the right answer.
3. Scores learner responses on five rubric dimensions (owner routing, dependency trace, blast radius, evidence relevance, unsupported claims).
4. Returns feedback that names what was missing, explains why it matters, and points to the gap in the learner's mental model.

The goal is not to answer questions. It is to build the capacity to ask them — to transform Nancy from an **information seeker** into a **strategic coordinator**.

## Research Questions

| | Research Question |
|---|---|
| **RQ1** | Does scenario-based practice with a knowledge graph reduce orientation time compared to static documentation access? |
| **RQ2** | Does interacting with a non-judgmental automated assistant measurably reduce self-reported anxiety during system onboarding? |
| **RQ3** | Does ownership-visualization scaffolding accelerate transition from peripheral to legitimate participant, as measured by contribution patterns? |

## Scope Baseline

- Web interface for learner workflow.
- API for scenario retrieval, submissions, scoring, and evaluation.
- Core gating and scoring engine with evidence gating.
- Synthetic Omni-Mart corpus and gold-labeled benchmark (12 scenarios × 3 domains).
- Ablation evaluation across four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.

## Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React + Vite + Tailwind |
| API | Express + Node.js |
| Database | SQLite (Phase 1) → Qdrant + Neo4j (Phase 2) |
| Core scoring + gating | TypeScript |
| Vector retrieval | Qdrant |
| Local LLM | Ollama |
| Graph store | Neo4j Community |
| Graph retrieval | GraphRAG |

## Out Of Scope (Current)

- Production identity and access management.
- Multi-user tenancy controls.
- Real customer data ingestion.
