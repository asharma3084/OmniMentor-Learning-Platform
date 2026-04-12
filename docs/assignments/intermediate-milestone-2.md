# Intermediate Milestone 2 — Delivery Summary

**Engineering Complete:** April 8, 2026  
**Submission Due:** April 13, 2026  
**Focus:** Three new visualization and analysis features, 16× test coverage growth, and validated ablation results

---

## What Changed from IM1

IM1 proved the guided flow works. IM2 added the surfaces that make the system's reasoning transparent — learners can now see *why* the system scores the way it does, trace evidence back to the knowledge graph, and compare retrieval modes quantitatively.

| Area | IM1 | IM2 |
|------|-----|-----|
| Visualization | None (placeholder tabs) | Interactive SVG force-directed graph |
| Mode analysis | Single mode scoring | Four-mode forensic comparison with delta bars |
| Evidence context | Flat artifact cards | Provenance badges linking evidence to graph topology |
| E2E tests | Initial suite | Comprehensive multi-suite coverage across all scenarios |
| Ablation data | Not yet collected | Full sweep across all scenarios and retrieval modes |

## Three Engineering Features

### 1. Interactive SVG Force-Directed Graph

A zero-dependency force-directed graph visualization built entirely in-house using spring simulation physics.

**Technical details:**
- `ForceGraph` component in `apps/web/src/App.tsx`
- No external visualization libraries — custom spring simulation with 120 force iterations
- Renders as SVG with circles (nodes) and lines (edges)
- 10 nodes per scenario, 5 directed edges, seed-node highlighting for the incident origin
- Clickable nodes with path filtering — click a node to see only its direct connections
- Provenance-linked node detail panel showing which evidence items reference each service

**Visible in:** System Graph tab (Feedback sub-tabs)

### 2. Evaluation Forensics ("Why This Mode Wins")

A four-mode side-by-side comparison that explains quantitatively why the best retrieval mode outperforms the others on each scoring dimension.

**Technical details:**
- Compares four retrieval modes: `vector`, `graph`, `graphrag`, `graphrag_gating`
- Per-criterion delta bars showing accuracy gain/loss vs the vector baseline
- Dimensions compared: `owner_accuracy`, `dependency_accuracy`, `blast_radius_completeness`, `evidence_relevance`
- Visual layout: four columns, one per mode, with colored delta indicators
- Explains not just *what* scored highest, but *why* each mode gained or lost accuracy on each dimension

**Visible in:** Score & Coaching tab (Feedback sub-tabs), "Why This Mode Wins" section

### 3. Evidence Provenance Badges

Inline graph-connection pills on every evidence card showing how each piece of evidence connects through the knowledge graph to the broader service topology.

**Technical details:**
- Small colored badges/pills appended to each evidence card
- Show which services the evidence item connects to in the graph
- Visible in both the guided Investigate step and the advanced Evidence Explorer tab
- Bridges the gap between flat artifact selection and graph-aware reasoning

**Visible in:** Investigate tab (guided flow), Evidence Explorer tab (Feedback sub-tabs)

## Test Progression

| Metric | IM1 | IM2 |
|--------|-----|-----|
| E2E test count | Initial suite | Comprehensive coverage |
| Playwright suites | Single file | Multiple suites |
| Scenario coverage | One representative | All six scenarios |
| Comprehensive suite | — | Covers buttons, tabs, forms, scoring, graph, forensics |
| Run time | ~10s | ~56s |

All tests pass consistently. The comprehensive suite (`comprehensive-buttons.spec.ts`) covers both guided and advanced surfaces across all six scenario domains.

## Ablation Results

Four retrieval modes tested across all six scenarios, with multiple independent runs per configuration:

| Mode | Owner Accuracy | Dependency Accuracy | Blast Radius | Evidence Relevance | **Overall Score** |
|------|---------------|--------------------|--------------|--------------------|-------------------|
| vector | 0.850 | 0.807 | 0.765 | 1.000 | **0.856** |
| graph | 0.900 | 0.855 | 0.810 | 1.000 | **0.891** |
| graphrag | 0.950 | 0.902 | 0.855 | 1.000 | **0.927** |
| graphrag_gating | 1.000 | 0.950 | 0.900 | 1.000 | **0.963** |

**Key finding:** Each retrieval enhancement adds ~3.5 percentage points. The progression is consistent across all six scenarios and all test runs. GraphRAG with gating achieves near-perfect owner accuracy (1.000) and the highest scores on every non-evidence dimension.

Raw data: `reports/week2/ablation-summary.csv`

## Artifact Inventory

### Submission Documents

| File | Purpose |
|------|---------|
| `OmniMentor_IM2_JDF.docx` | Main submission — 20-section JDF format academic document |
| `MASTER_OMNIMENTOR_DECK_FINAL.pptx` | Slide deck with updated Slide 8 (IM2 features + speaker notes) |
| `IM2_TALK_TRACK.docx` | Narration script for demo video (~5–7 min) |
| `IM2_VIDEO_RECORDING_INSTRUCTIONS.docx` | Local recording checklist and gesture sequence |
| `IM2_RECORDING_PRACTICE_GUIDE.docx` | Practice guide for narration delivery |

### Screenshots (12 captures, all fresh as of April 8)

| # | Screenshot | What It Shows |
|---|-----------|---------------|
| 01 | Walkthrough modal | Initial onboarding overlay explaining the four-step flow |
| 02 | Investigate tab | Guided evidence selection with primary and corroborating artifacts |
| 03 | Example answer | Example answer reveal for learning scaffolding |
| 04 | Decision filled | Completed decision form with all five fields populated |
| 05 | Feedback overview | Score output with per-dimension coaching |
| 06 | Advanced overview | Full advanced mode with all sub-tabs visible |
| 07 | System graph | **Force-directed SVG graph** — service nodes, directed edges, seed highlighting |
| 08 | Evaluation comparison | **Forensics** — four-mode delta bars per criterion |
| 09 | Check-in export | Export view with evidence provenance badges visible |
| 10–12 | Additional captures | Scenario variations and edge-case states |

### Build and Test Evidence

| File | Purpose |
|------|---------|
| `build.log` | Clean production build output (zero warnings) |
| `im2-demo-path-capture.webm` | Automated walkthrough video (supporting asset, not the narrated demo) |
| Playwright HTML report | Full E2E test report with pass/fail details for the complete suite |

## Submission Status

- [x] Engineering complete (all three features functional and tested)
- [x] Screenshots captured (12 fresh images)
- [x] JDF document written (20 sections)
- [x] Slide deck updated (Slide 8 with IM2 features)
- [x] Talk track written
- [ ] Narrated video recorded (~5–7 min using talk track)
- [ ] Video hosted on GT-accessible platform
- [ ] Video link inserted into JDF
- [ ] JDF exported as PDF
- [ ] Submitted by April 13, 8:00 AM

## Cross-References

- [Detailed UI Design](../reference/detailed-ui-design.md) — Current UI mockups including all IM2 surfaces
- [Evaluation and KPIs](../research/evaluation-and-kpis.md) — KPI framework and research question mapping
- [System Architecture](../architecture/system-architecture.md) — Component diagram with feedback sub-tabs
- [Scenario Guide](../reference/scenario-guide.md) — All six scenario domains used in testing
- [IM1 Summary](intermediate-milestone-1.md) — What was delivered before IM2
