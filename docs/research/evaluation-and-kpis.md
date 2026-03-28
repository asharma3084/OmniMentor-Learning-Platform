# Evaluation Framework And KPIs

> Maps every Key Performance Indicator to a Research Question, defines success
> thresholds, and describes how the platform instruments each measurement.

---

## 1. Research Questions (Canonical)

| # | Research Question |
|---|---|
| **RQ1** | Does scenario-based practice with a knowledge graph reduce orientation time compared to static documentation access? |
| **RQ2** | Does interacting with a non-judgmental automated assistant measurably reduce self-reported anxiety during system onboarding? |
| **RQ3** | Does ownership-visualization scaffolding accelerate transition from peripheral to legitimate participant, as measured by contribution patterns? |

---

## 2. KPI Matrix

### RQ1 — Orientation Time Reduction

| KPI | Instrument | Data Source | Success Threshold |
|-----|-----------|-------------|-------------------|
| **Time-to-competent-submission** | Timer: scenario open → first submission scoring ≥ 70% | `learning_sessions.started_at` → `first_submit_at`, joined with `score_reports.metrics` | ≤ 15 min avg by scenario 4 (down from ~30 min on scenario 1) |
| **Score progression curve** | Overall rubric score per scenario across sequence | `score_reports.metrics` ordered by `learning_sessions.created_at` | Positive slope across 6 scenarios (linear regression β > 0, p < 0.05) |
| **Critical error drop-off** | Count of critical errors flagged per scenario | `score_reports.critical_errors` | Zero critical errors by scenario 5+ |

### RQ2 — Anxiety Reduction

| KPI | Instrument | Data Source | Success Threshold |
|-----|-----------|-------------|-------------------|
| **Pre/post confidence delta** | 5-item Likert survey (adapted from STAI short form) | `survey_responses` table (pre vs. post) | Mean increase ≥ 0.8 on 5-point scale for Q1–Q4; decrease for Q5 (anxiety item) |
| **Hesitation time** | Time from scenario load → first evidence selection | `learning_sessions.started_at` → `first_evidence_at` | Decreasing trend across scenarios = growing comfort |
| **Revision count** | Number of submission attempts per scenario | `learning_sessions.attempt_number` per scenario | Decreasing across sequence = less second-guessing |

### RQ3 — Legitimate Participation

| KPI | Instrument | Data Source | Success Threshold |
|-----|-----------|-------------|-------------------|
| **Evidence breadth** | Unique evidence artifacts selected per scenario | `submissions.selected_evidence_ids` | Increasing count = exploring more of the system |
| **Cross-domain completion** | Scenarios completed across all 3 domains | `completedScenarios` ∩ `scenarios.domain` | ≥ 5 of 6 scenarios (not stuck in one domain) |
| **Session duration trend** | Total time per scenario | `learning_sessions.duration_sec` | Decreasing = increased efficiency / familiarity |

---

## 3. Instrumentation Summary

### 3a. Learning Sessions (Time Tracking)

Every scenario interaction creates a `learning_session` record tracking:

| Event | Column | When Recorded |
|-------|--------|--------------|
| Session start | `started_at` | User selects / loads a scenario |
| First evidence interaction | `first_evidence_at` | First checkbox selection in Evidence panel |
| First submission | `first_submit_at` | First "Submit & Score" click |
| Completion | `completed_at`, `duration_sec` | Scoring returns successfully |
| Attempt number | `attempt_number` | Auto-incremented per scenario |

**API endpoints:**
- `POST /sessions/start` — creates session, returns `sessionId`
- `POST /sessions/event` — records `first_evidence`, `first_submit`, or `completed`
- `GET /analytics/sessions` — returns all sessions with scenario metadata

### 3b. Pre/Post Confidence Survey

A 5-item Likert scale (1 = Strongly Disagree, 5 = Strongly Agree) adapted from
the State-Trait Anxiety Inventory (STAI) short form (Marteau & Bekker, 1992):

| # | Item | Construct |
|---|------|-----------|
| Q1 | I feel confident identifying the correct service owner for an incident. | Self-efficacy (Bandura, 1977) |
| Q2 | I feel comfortable tracing upstream and downstream dependencies. | Comfort with complexity |
| Q3 | I can clearly assess the blast radius of a system change. | Competence perception |
| Q4 | I feel ready to make architecture decisions in a real team meeting. | Transfer readiness |
| Q5 | Thinking about making architecture decisions makes me anxious. | Anxiety (reverse-scored) |

**Timing:**
- **Pre-survey:** Shown on first app load (before any scenario practice)
- **Post-survey:** Triggered after completing all 6 scenarios

**API endpoints:**
- `POST /surveys` — submit a survey response
- `GET /surveys` — retrieve all responses
- `GET /surveys/status` — check whether pre/post already completed

---

## 4. Analysis Plan

### 4a. Within-Subjects Comparison (RQ1)

Compare time-to-competent-submission and score for scenarios 1–2 vs. 5–6 using
paired t-test (or Wilcoxon signed-rank for small n). Ablation data provides
between-mode comparison (vector vs. graphrag_gating).

### 4b. Pre/Post Paired Analysis (RQ2)

Paired t-test on survey items Q1–Q5 (pre vs. post). Effect size reported as
Cohen's d. Q5 is reverse-scored: a decrease indicates reduced anxiety.

### 4c. Trajectory Analysis (RQ3)

Plot evidence breadth and cross-domain coverage over the 6-scenario sequence.
Visual inspection + Spearman rank correlation for monotonic trend.

---

## 5. Limitations & Mitigations

| Limitation | Mitigation |
|------------|------------|
| Small sample size (single-user DBR iteration) | Report effect sizes alongside p-values; use pilot data language |
| No control group | Within-subjects design (early scenarios = baseline, later = intervention effect) |
| Hawthorne effect | Note in discussion; behavioral proxies (hesitation time) triangulate self-report |
| Practice effect confound | Scenarios increase in complexity across the sequence |
| Heuristic ablation scoring | Acknowledged as Phase 1; planned for real retrieval in Phase 2 |

---

## 6. How This Sells the Tool

### To Faculty
> "Every KPI maps to an RQ. Every RQ has an automated instrument collecting data.
> The pre/post survey produces publishable effect sizes. The time tracking produces
> learning curves. This is a research instrument, not just a prototype."

### To Engineering Leadership
> "We can show exactly when a new TPM becomes competent — measured in minutes, not
> weeks. The score progression curve tells you if onboarding is working. The time
> data tells you what it costs."

### To Other Teams
> "Swap the scenario corpus and evidence artifacts. The scoring engine, survey
> instrument, and analytics pipeline are domain-agnostic. Any team with a complex
> system and an onboarding problem can deploy OmniMentor."
