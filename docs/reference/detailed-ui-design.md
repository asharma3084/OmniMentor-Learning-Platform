# OmniMentor Detailed UI Design

Version: 4.0
Last Updated: 2026-04-11

This document captures the product's UI design rationale and detailed interaction model.

## 1. Product UI Objective

Design a TPM onboarding interface that improves architecture fluency through:
- scenario-based decision practice
- evidence-backed reasoning
- ownership/dependency visibility
- explicit uncertainty and provenance
- rubric feedback with critical-error visibility

## 2. Core Design Principles

- Evidence first: no claim should feel detached from supporting artifacts.
- Directional clarity: dependency reasoning is always upstream -> downstream.
- Trust by transparency: show uncertainty, provenance, and gating outcomes explicitly.
- Cognitive load control: progressive structure, visible status, concise copy.
- Non-judgmental support: assistant language should coach, not penalize.

## 3. Information Architecture (Post-Login)

Primary tabbed flow (always visible in the top navigation bar):
- `1. Brief` — scenario context, mission framing, deliverable cards
- `2. Investigate` — evidence retrieval, artifact selection, key fact extraction
- `3. Decide` — structured submission form with guided readiness indicators
- `4. Feedback` — scoring, coaching, learning summary, next actions

Feedback sub-tabs (second row, visible when Feedback tab is active):
- `Score & Coaching` — overall score, rubric breakdown, metric coaching, connected learning summary
- `System Graph` — interactive dependency map with node detail and evidence linking
- `Evidence Explorer` — full artifact review with role tags, provenance, and claim support verification
- `Check-in Export` — structured mentor check-in summary with copy/download actions

Navigation behavior:
- Tab-based navigation is the single entry experience. There is no separate "advanced mode" toggle.
- The scenario selector sits on the right side of the tab bar with a domain badge.
- Progress indicators (scenarios done, evidence count) are visible in the tab bar.
- Feedback sub-tabs provide deeper review surfaces without leaving the main flow.
- Current scenario context and learning progress remain visible across all tabs.

## 4. Global Shell Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎓 OmniMentor  ARCHITECTURE FLUENCY PLATFORM        ● ● ●    [How It Works]  [?]          │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 1. Brief  🔍 2. Investigate  ✍️ 3. Decide  📊 4. Feedback    1/6 done  [Catalog] ▾      │
│   Score & Coaching | System Graph | Evidence Explorer | Check-in Export  (sub-tabs)        │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Page Content Area                                                                           │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🎓 OmniMentor · Architecture Fluency Platform         6 scenarios · 1 completed            │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

The header uses a gradient brand line, status dots for service health, and a help icon that provides in-app guidance. The footer is pinned to the viewport bottom with scenario progress and branding. Session timing is tracked via the API (start, first evidence, first submit, completion) for RQ1 instrumentation.

## 5. Primary Mockup (Design A: Guided-First TPM Practice Studio)

## 5.1 Brief Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● Incident Brief                                      📦 Catalog  │  1/6 complete          │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Deploy Catalog API Schema Migration                    (gradient title)                     │
│ [scenario prompt text — full width, no max-width cap]                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ YOUR MISSION — NAVIGATE THE SYSTEM & RESPOND                                                │
│ You're a TPM onboarding onto a new team inside one of the world's largest retailers.        │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐                             │
│ │ 👤 Owner                    │ │ 🔗 Dependency path          │                             │
│ │ Identify which team owns    │ │ Trace how failures propagate│                             │
│ │ the root cause              │ │ through distributed arch    │                             │
│ ├─────────────────────────────┤ ├─────────────────────────────┤                             │
│ │ 💥 Blast radius             │ │ 🛡️ Safe actions              │                             │
│ │ Assess impact on customers, │ │ Recommend immediate, safe   │                             │
│ │ revenue, stores, partners   │ │ mitigation steps            │                             │
│ └─────────────────────────────┘ └─────────────────────────────┘                             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⚠ [scenario-specific stakes line]                                                           │
│ [Start Investigation →]  [How this works]                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Scenario Queue: 6 scenarios listed with domain badges and score pills                       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

The Brief step frames each scenario as an incident brief with four concrete deliverables (Owner, Dependency path, Blast radius, Safe actions). The TPM context paragraph explains they are onboarding onto a new team in a large-scale retail environment with massive interconnected systems. This reduces first-run ambiguity by turning the scenario into a bounded mission before the learner sees the full form.

## 5.2 Investigate + Decide Mockup

```text
┌───────────────────────────┬─────────────────────────────────┬──────────────────────────────┐
│ Evidence + Key Facts      │ Structured Submission           │ Guided Readiness Rail        │
│ Scenario: Checkout auth   │ Owner Routing [..............]  │ ● Primary  ● Corroborating  │
│ [x] Ownership Registry    │ Dependency Trace [...........]  │ ● Trace    ● Blast          │
│ [x] Runbook               │ Action Plan [.................] │ Warning: C2 unsupported      │
│ [ ] Policy Control        │ Blast-Radius Plan [..........]  │ Suggested next step shown    │
│ [ ] Incident Timeline     │ Evidence Notes [..............] │                              │
│ Coverage 2/4 ██████░░░░   │ [Submit & Score]                │                              │
└───────────────────────────┴─────────────────────────────────┴──────────────────────────────┘
```

The Investigate step emphasizes evidence and extracted clues first. Readiness indicators show pill badges for Primary, Corroborating, Trace, and Blast coverage. The Decide step exposes the full structured form after the learner has enough context. Fill Template is disabled until at least one primary and one corroborating artifact are selected.

## 5.3 Feedback Mockup (Score & Coaching)

```text
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Overall Score                                │ What the app is checking                     │
│ [ScoreRing 100%]                             │ Owner Match         ████████████ 100%        │
│ Strong                                       │ System Connections  ████████████ 100%        │
│ ✓ Evidence Gate: Passed                      │ Blast Radius        ████████████ 100%        │
│ Every sentence traced to an artifact.        │ Evidence Support    ████████████ 100%        │
├──────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ 🎯 The Challenge: [scenario-specific problem + TPM motivation]                              │
│ 📎 Evidence You Used: [artifacts with Primary/Corr. badges and body preview]                │
│ ⛓️ Your Decision Chain: Evidence read → Your answer → Score % per rubric dimension           │
│ 🧠 What This Taught You: Architectural Insight + TPM Skill Practiced                       │
│ 🚀 What a TPM Does Next: 5 scenario-specific real-world actions                            │
│ 📋 Your Next Step: progress + button to next scenario or check-in export                   │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Rubric Breakdown: Owner Routing | Dependency Trace | Blast Radius | Evidence Gating        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

The Feedback step provides a connected learning summary linking scenario → evidence → answer → score. After a passing score, the TPM sees real-world actions they would take next (notify teams, coordinate response, staged rollout, post-incident review) and a platform next-step CTA to continue practicing.

## 5.4 System Graph Mockup

```text
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Graph Canvas (Neo4j/GraphRAG context)       │ Node Detail + Evidence                       │
│                                              │ Selected Node: Auth Service                  │
│ [Gateway] -> [Auth] -> [Checkout]            │ Owner: Platform Team                         │
│      |                   |                    │ Upstream: Database Service                   │
│   [Policy]           [Cart API]              │ Downstream: Web, Mobile, Integrations       │
│                                              │ Linked evidence: artifact-1, artifact-3     │
│ Filters: Team | Domain | Risk                │ [Trace Path] [Open in Evidence Tab]          │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

## 5.5 Evidence Mockup

```text
┌──────────────────────────┬───────────────────────────────────────────────────────────────────┐
│ Filter Panel             │ Evidence List                                                     │
│ Role: all/primary/...    │ [Primary] Service Ownership Registry                              │
│ Type: runbook/policy/... │ Provenance: source=db, score=0.92, timestamp=...                 │
│ Team/domain filters      │ ------------------------------------------------------------------ │
│                          │ [Corroborating] Deployment Runbook                                │
│                          │ Provenance: source=doc, score=0.81, timestamp=...                │
└──────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

## 5.6 Evaluation Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Mode Comparison: vector | graph | graphrag | graphrag_gating                                │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Mode              OwnerAcc   DepAcc   UnsupportedRate   CriticalErrorRate                    │
│ vector            0.72       0.61     0.24              0.19                                 │
│ graph             0.76       0.70     0.18              0.14                                 │
│ graphrag          0.82       0.77     0.11              0.09                                 │
│ graphrag_gating   0.84       0.79     0.00              0.04                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Run Evaluation] [Export JSON] [Export CSV]                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.7 Check-in Export Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Weekly Status Export                                                                         │
│ Q1 Progress: [auto summary from latest runs]                                                 │
│ Q2 Challenges: [auto draft + edit]                                                           │
│ Q3 Scope/Expectations: [auto draft + edit]                                                   │
│ Q4 Team Responsibilities: [single-user template]                                             │
│ Evidence References: selected evidence, retrieval comparison, current score snapshot         │
│ [Copy for Review Thread]                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Alternate Mockup B (Advanced Review Workspace)

```text
Tabs: Overview | Scenario Workspace | System Graph | Evidence | Evaluation | Check-in Export

Use case:
- deeper graph review
- evaluator comparison
- export and reviewer-facing narrative work
```

## 7. Alternate Mockup C (Graph-First Workbench)

```text
Tabs: Overview | Graph Workbench | Evidence | Decision Draft | Evaluation | Check-in Export

Graph Workbench split:
- Left: interactive graph topology
- Right: draft form + gating checks
- Bottom: provenance-linked evidence drawer
```

## 8. Page Specifications

## 8.1 Overview

Purpose:
- orient TPM quickly to current learning status and next recommended action.

Required panels:
- Milestone/learning progress summary
- Recent scenario results
- Critical-error trend snapshot
- Unsupported-claim trend snapshot
- Next scenario recommendation

Primary actions:
- `Resume Scenario`
- `Open System Graph`
- `Run Evaluation`

## 8.2 Scenario Workspace

Purpose:
- complete structured TPM decision submission with evidence support.

Required input fields:
- Owner routing
- Dependency trace (directional)
- Action plan
- Blast-radius plan
- Evidence notes

Required result output:
- Score summary
- Rubric breakdown
- Critical errors by type:
  - wrong owner
  - wrong directionality
  - unsafe action without verification
- Unsupported claim list
- Improvement guidance for next attempt

## 8.3 System Graph

Graph requirements:
- Node types: services, teams, policies, systems
- Edge types: owns, depends-on, governed-by, escalates-to
- Direction arrows always visible
- Path trace from selected source to downstream impact

Current shipped Week 4 state:
- Filtering by service text
- Clickable node focus
- Focused path review
- Node detail panel with provenance-linked evidence context

Future-depth target beyond current Week 4 shipped state:
- Canvas controls such as zoom, pan, fit-to-graph, and reset view
- Richer visual filtering by team/domain/risk/edge type with immediate graph updates
- Stronger node and edge highlighting for selected dependency path and blast-radius impact path
- Click-through from graph node to Evidence tab pre-filtered on selected entity

Backend alignment:
- Graph data source aligns with Neo4j structures.
- GraphRAG context assembly references this topology.

## 8.4 Evidence

Required behavior:
- Artifact list with role tags (primary/corroborating/reference)
- Provenance metadata visible per item
- Search/filter by type, owner, domain
- Opened-artifact history visible to support recognition

## 8.5 Evaluation

Required mode coverage:
- `vector`
- `graph`
- `graphrag`
- `graphrag_gating`

Required outputs:
- Per-mode metric table
- Scenario coverage count
- Unsupported-claim rate by mode
- Critical-error rate by mode
- Export controls (JSON/CSV)

Freeze-scope requirements:
- Comparative delta view across modes (best mode highlighted with rationale).
- Critical error breakdown by category (`wrong owner`, `wrong directionality`, `unsafe action`).
- Trend row for unsupported-claim reduction and gating-pass consistency.
- Mode diagnostics panel explaining retrieval behavior and trade-offs.
- Download and copy actions for evaluation summary when a review-thread-ready export path requires them.

## 8.6 Check-in Export

Required sections:
- Progress summary
- Challenges summary
- Scope/deviation statement
- Selected-evidence references plus current evaluation summary

Freeze-scope requirements:
- Auto-generated review-ready narrative block with concise, evidence-backed language.
- Explicit references to latest score, gating status, and critical-error snapshot.
- One-click copy action and downloadable markdown/text export.

Current shipped Week 4 state:
- Structured mentor-facing narrative snapshot
- Copy action and downloadable text export
- Selected-evidence references, retrieval comparison summary, and next-review focus

Future-depth target beyond current Week 4 shipped state:
- Included links to latest smoke report and ablation summary artifacts

## 8.7 Freeze Scope

Before coding is considered complete, the following design-scope items are frozen as required:
- Interactive `System Graph` behavior and metadata/provenance panel.
- Deep `Evaluation` analytics and diagnostics across all four retrieval modes.
- Review-ready `Check-in Export` generation workflow with copy/download actions.

## 9. AI Assistant UI Contract (Ollama)

Assistant behavior in UI:
- Tone: supportive, neutral, non-judgmental. Non-judgmental framing directly serves RQ2 (anxiety reduction): learners reporting fear of asking "obvious" questions need feedback that acknowledges effort and redirects to evidence, not feedback that penalizes incomplete reasoning (Dweck, 2006).
- Function: explain reasoning gaps, suggest next evidence checks
- Constraint: assistant output never bypasses evidence gating

Assistant display requirements:
- Confidence/uncertainty indicator
- Source provenance references
- Warning when recommendation has low evidence support

## 10. Evidence Gating UI Contract

Before submission:
- visible readiness indicator
- unsupported-claim pre-check warnings
- missing-evidence warnings

After submission:
- gating pass/fail status
- unsupported claims listed with evidence gaps
- critical error categories explicitly labeled

## 11. Visual System

Typography:
- Primary: `Space Grotesk`
- Technical/meta labels: `IBM Plex Mono`

Component primitives:
- `card`
- `form-input`
- `status-chip`
- `metric-tile`
- `error-summary`
- `score-ring`

## 12. Responsive + Accessibility

Responsive:
- Desktop: multi-panel workspace
- Tablet: two-panel + collapsible rail
- Mobile: single-column with sticky anchors

Accessibility:
- keyboard navigation
- focus-visible styles
- field-linked error summary
- non-color-only status signals
- graph text alternatives for key relationships

## 13. Research Question UI Coverage

RQ1:
- scenario workflow + graph-assisted dependency reasoning
- retrieval-mode comparison in evaluation
- **API-tracked session timing (start, first evidence selection, first submission, completion) for time-to-competent-submission measurement**
- **learning session API recording start, first evidence, first submit, and completion timestamps**

RQ2:
- non-judgmental assistant language
- explicit uncertainty and provenance
- **pre/post 5-item Likert survey modals measuring self-reported confidence and anxiety**

RQ3:
- ownership visualization
- dependency contribution visibility
- **behavioral proxy tracking (hesitation time = start → first evidence selection)**
- **attempt count tracking per scenario**

## 14. Pre/Post Survey UI Specification

Pre-survey modal:
- Displayed on first application load when no pre-survey response exists.
- Current prototype auto-opens it before practice starts, but the learner may dismiss it and continue.
- Title: "Before You Begin — Quick Self-Assessment"
- 5 Likert items (1 = Strongly Disagree to 5 = Strongly Agree):
  1. I feel confident navigating architecture decisions.
  2. I am comfortable identifying system ownership.
  3. Dependency relationships are clear to me.
  4. I feel ready to scope blast-radius impact.
  5. I feel anxious about architecture decisions. (reverse-scored)

Post-survey modal:
- Displayed after all scenarios have been completed and scored.
- Same 5 items as pre-survey to enable paired comparison.
- Title: "After Completing All Scenarios — Final Self-Assessment"
- Includes a brief thank-you message and confirmation of successful submission.
