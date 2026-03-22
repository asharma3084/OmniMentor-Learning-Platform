# OmniMentor Detailed UI Design

Version: 3.2
Last Updated: 2026-03-15

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

Default learner flow:
- `Brief`
- `Investigate`
- `Decide`
- `Feedback`

Secondary advanced review surfaces:
- `Overview`
- `Scenario Workspace`
- `System Graph`
- `Evidence`
- `Evaluation`
- `Check-in Export`

Navigation behavior:
- Guided mode is the default entry experience for a new TPM.
- Advanced mode is visually secondary and intended for deeper graph, evaluator, and export review.
- Current scenario context and learning progress remain visible in both modes.

## 4. Global Shell Mockup

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎓 OmniMentor | From Architecture Blindness to Fluency              ⏱ 03:42 | User | Help │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Guided Mode: Brief | Investigate | Decide | Feedback         [Advanced Mode]               │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Page Content Area                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

The live elapsed timer (`⏱ mm:ss`) is displayed in the shell header during an active learning session, providing continuous time-on-task awareness for the learner (RQ1 instrumentation).

## 5. Primary Mockup (Design A: Guided-First TPM Practice Studio)

## 5.1 Brief Mockup

```text
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│ Mission Brief                               │ Success Criteria                             │
│ Scenario: Payment Retry Storm               │ - find likely owner                          │
│ Domain: Cart & Checkout                     │ - trace 1-3 critical connections             │
│ Prompt: [scenario statement]                │ - name what could break                      │
│                                             │ - justify with main + supporting evidence    │
├──────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ [Start With Evidence] [Replay Walkthrough] [Open Advanced Mode]                           │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

The Brief step reduces first-run ambiguity by turning the scenario into a bounded mission before the learner sees the full form.

## 5.2 Investigate + Decide Mockup

```text
┌───────────────────────────────┬─────────────────────────────────┬──────────────────────────────┐
│ Evidence + Key Facts          │ Structured Submission           │ Guided Readiness Rail        │
│ Scenario: Checkout auth fail  │ Owner Routing [..............]  │ Readiness: 72%               │
│ ⏱ Session: 04:17               │ Dependency Trace [...........]  │ Missing: policy artifact      │
│ [x] Ownership Registry        │ Action Plan [.................] │ Warning: C2 unsupported       │
│ [x] Runbook                   │ Blast-Radius Plan [..........]  │ Suggested next step shown     │
│ [ ] Policy Control            │ Evidence Notes [..............] │                               │
│ [ ] Incident Timeline         │ [Submit & Score]               │                               │
│ Coverage 2/4 ██████░░░░       │                                 │                               │
└───────────────────────────────┴─────────────────────────────────┴──────────────────────────────┘
```

The Investigate step emphasizes evidence and extracted clues first. The Decide step exposes the full structured form after the learner has enough context to answer concretely.

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

Freeze-scope requirements:
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

Freeze-scope requirements:
- Comparative delta view across modes (best mode highlighted with rationale).
- Critical error breakdown by category (`wrong owner`, `wrong directionality`, `unsafe action`).
- Trend row for unsupported-claim reduction and gating-pass consistency.
- Mode diagnostics panel explaining retrieval behavior and trade-offs.
- Download and copy actions for evaluation summary (review-thread ready text + machine-readable artifact links).

## 8.6 Check-in Export

Required sections:
- Progress summary
- Challenges summary
- Scope/deviation statement
- Evidence links (reports/metrics)

Freeze-scope requirements:
- Auto-generated review-ready narrative block with concise, evidence-backed language.
- Explicit references to latest score, gating status, and critical-error snapshot.
- One-click copy action and downloadable markdown/text export.
- Included links to latest smoke report and ablation summary artifacts.

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
- **live session timer tracking time-to-competent-submission**
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
