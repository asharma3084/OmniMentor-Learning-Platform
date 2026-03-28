# Project Overview


## Purpose

OmniMentor is an intelligence platform that turns **institutional memory into a learnable skill**. Built around the Omni-Mart enterprise context, it transforms the way new engineers and program managers orient to complex systems — not through documentation lookup, but through scenario-based practice grounded in real evidence.

Operating model in current scope:
- Local single-user web application.
- macOS-first runtime target.
- Open source only — no paid version, no telemetry, no external data collection.

## Problem: Architecture Blindness

Enterprise software systems accumulate vast operational knowledge — ownership boundaries, dependency chains, runbook decisions, incident patterns — but this knowledge lives mostly in the heads of a few senior engineers. When those engineers are perpetually interrupted by newcomers who lack the tools to self-orient, an organization's institutional memory becomes a bottleneck rather than an asset.

We call this **Architecture Blindness**: the inability to see the full functional picture of a complex system — overwhelmed by the technical trees, unable to see the forest.

Architecture Blindness operates across three reinforcing dimensions. Research on cognitive load (Sweller, 1988) demonstrates that concurrent processing of system topology and uncertainty about social authority creates sustained performance anxiety, beyond what documentation alone can address. Situated cognition research (Brown et al., 1989) further suggests that this knowledge cannot be transferred through static artifacts — it must be constructed through authentic practice in context.

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
5. Tracks learning session timing and behavioral proxies to measure orientation-time reduction (RQ1).
6. Administers matched pre/post surveys to capture self-reported confidence and anxiety change (RQ2).

The focus is not to answer questions. It is to build the capacity to ask them — to transform Nancy from an **information seeker** into a **strategic coordinator**.

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
- Synthetic Omni-Mart corpus and gold-labeled benchmark (6 scenarios × 3 domains, expandable).
- Ablation evaluation across four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`.
- Learning session time tracking for RQ1 orientation-time measurement.
- Pre/post 5-item Likert surveys for RQ2 self-reported anxiety evaluation.
- Behavioral proxy instrumentation (hesitation time, attempt tracking) for RQ3 participation measurement.
- KPI framework with 9 indicators mapped to 3 research questions (see `../research/evaluation-and-kpis.md`).

## Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React + Vite + Tailwind |
| API | Express + Node.js |
| Current persistence | SQLite |
| Core scoring + gating | TypeScript |
| Current retrieval baseline | Deterministic in-memory ranking across `vector`, `graph`, `graphrag`, and `graphrag_gating` |
| Target vector retrieval | Qdrant |
| Target graph store | Neo4j Community |
| Target graph retrieval | GraphRAG |
| Target local LLM | Ollama |

## Out Of Scope (Current)

- Production identity and access management.
- Multi-user tenancy controls.
- Real customer data ingestion.
