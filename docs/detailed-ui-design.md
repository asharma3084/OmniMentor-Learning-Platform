# OmniMentor Detailed UI Design

Version: 3.1
Last Updated: 2026-03-09

This GUI is based on the Assignment (QQ) and Project Proposal.

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

Primary tabs:
- `Overview`
- `Scenario Workspace`
- `System Graph`
- `Evidence`
- `Evaluation`
- `Check-in Export`

Navigation behavior:
- Persistent top navigation on desktop.
- Collapsible navigation drawer on mobile.
- Current tab and scenario context always visible.

## 4. Global Shell Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ OmniMentor | TPM Onboarding Command Center                             User | Notifications │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Overview | Scenario Workspace | System Graph | Evidence | Evaluation | Check-in Export     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Page Content Area                                                                       Help │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5. Primary Mockup (Design A: TPM Onboarding Command Center)

## 5.1 Overview Mockup

```text
┌─────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│ Progress Snapshot           │ Decision Quality             │ Retrieval Health              │
│ 7 / 12 scenarios complete   │ Unsupported claims: 14%      │ vector | graph | graphrag    │
│ Domain focus: Checkout      │ Critical errors: 2           │ Last run: complete            │
├─────────────────────────────┴──────────────────────────────┴──────────────────────────────┤
│ Recommended Next Scenario: "Payment Retry Storm"                                        │
│ [Resume Scenario] [Open System Graph] [Run Evaluation]                                   │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Scenario Workspace Mockup

```text
┌───────────────────────────────┬─────────────────────────────────┬──────────────────────────────┐
│ Scenario + Selected Evidence  │ Structured Submission           │ Decision Quality Rail        │
│ Scenario: Checkout auth fail  │ Owner Routing [..............]  │ Readiness: 72%               │
│ [x] Ownership Registry        │ Dependency Trace [...........]  │ Missing: policy artifact      │
│ [x] Runbook                   │ Action Plan [.................] │ Warning: C2 unsupported       │
│ [ ] Policy Control            │ Blast-Radius Plan [..........]  │ Suggested next step shown     │
│ [ ] Incident Timeline         │ Evidence Notes [..............] │                               │
│ Coverage 2/4 ██████░░░░       │ [Submit & Score]               │                               │
└───────────────────────────────┴─────────────────────────────────┴──────────────────────────────┘
```

## 5.3 System Graph Mockup

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

## 5.4 Evidence Mockup

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

## 5.5 Evaluation Mockup

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

## 5.6 Check-in Export Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Weekly Status Export                                                                         │
│ Q1 Progress: [auto summary from latest runs]                                                 │
│ Q2 Challenges: [auto draft + edit]                                                           │
│ Q3 Scope/Expectations: [auto draft + edit]                                                   │
│ Q4 Team Responsibilities: [single-user template]                                             │
│ Evidence Links: smoke report, eval report, metrics table                                     │
│ [Copy for Mentor Thread]                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Alternate Mockup B (Guided Stepper Experience)

```text
Tabs: Overview | Guided Workspace | System Graph | Evidence | Evaluation | Check-in Export

Guided Workspace Stepper:
1) Understand Scenario
2) Select Evidence
3) Draft Decision
4) Validate & Submit
5) Review Score
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

A+ freeze requirements:
- Interactive canvas controls: zoom, pan, fit-to-graph, and reset view.
- Visual filtering by team/domain/risk/edge type with immediate graph updates.
- Node and edge highlighting for selected dependency path and blast-radius impact path.
- Side panel with node metadata, ownership, linked evidence, and provenance chips.
- Click-through from graph node to Evidence tab pre-filtered on selected entity.

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

A+ freeze requirements:
- Comparative delta view across modes (best mode highlighted with rationale).
- Critical error breakdown by category (`wrong owner`, `wrong directionality`, `unsafe action`).
- Trend row for unsupported-claim reduction and gating-pass consistency.
- Mode diagnostics panel explaining retrieval behavior and trade-offs.
- Download and copy actions for evaluation summary (mentor-thread ready text + machine-readable artifact links).

## 8.6 Check-in Export

Required sections:
- Progress summary
- Challenges summary
- Scope/deviation statement
- Evidence links (reports/metrics)

A+ freeze requirements:
- Auto-generated mentor-ready narrative block with concise, evidence-backed language.
- Explicit references to latest score, gating status, and critical-error snapshot.
- One-click copy action and downloadable markdown/text export.
- Included links to latest smoke report and ablation summary artifacts.

## 8.7 A+ Freeze Scope

Before coding is considered complete, the following design-scope items are frozen as required:
- Interactive `System Graph` behavior and metadata/provenance panel.
- Deep `Evaluation` analytics and diagnostics across all four retrieval modes.
- Mentor-ready `Check-in Export` generation workflow with copy/download actions.

## 9. AI Assistant UI Contract (Ollama)

Assistant behavior in UI:
- Tone: supportive, neutral, non-judgmental
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

RQ2:
- non-judgmental assistant language
- explicit uncertainty and provenance

RQ3:
- ownership visualization
- dependency contribution visibility
